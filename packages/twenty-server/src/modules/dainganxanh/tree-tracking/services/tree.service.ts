import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type FindOptionsWhere, Like } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

/**
 * Constants for time calculations and limits
 */
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const AVERAGE_DAYS_PER_MONTH = 30.44; // More accurate than 30
const MAX_CODE_GENERATION_RETRIES = 3;
const DEFAULT_PAGE_SIZE = 20;
const MAX_TREES_PER_LOT_QUERY = 1000;

/**
 * Tree entity interface matching custom object fields in Twenty CRM
 */
export interface TreeEntity {
    id: string;
    treeCode: string;
    status: 'SEEDLING' | 'PLANTED' | 'GROWING' | 'MATURE' | 'READY_HARVEST';
    gpsLocation: string | null;
    plantingDate: string | null;
    estimatedHarvestDate: string | null;
    height: number | null;
    co2Absorbed: number | null;
    lotId: string | null;
    ownerId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

/**
 * DTO for creating a tree
 */
export interface CreateTreeDto {
    gpsLocation?: string;
    plantingDate?: string;
    estimatedHarvestDate?: string;
    height?: number;
    co2Absorbed?: number;
    lotId?: string;
    ownerId?: string;
}

/**
 * DTO for updating a tree
 */
export interface UpdateTreeDto {
    status?: TreeEntity['status'];
    gpsLocation?: string;
    plantingDate?: string;
    estimatedHarvestDate?: string;
    height?: number;
    co2Absorbed?: number;
    lotId?: string;
    ownerId?: string;
}

/**
 * Filter options for finding trees
 */
export interface TreeFilters {
    status?: TreeEntity['status'];
    lotId?: string;
    ownerId?: string;
    plantingDateFrom?: Date;
    plantingDateTo?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    page?: number;
    limit?: number;
}

/**
 * TreeService handles CRUD operations for Tree objects
 * in the Đại Ngàn Xanh tree planting platform.
 * 
 * Trees are tracked from seedling stage through harvest (5 years).
 * Each tree has a unique code: TREE-YYYY-XXXXX
 */
@Injectable()
export class TreeService {
    private readonly logger = new Logger(TreeService.name);

    constructor(
        private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    ) { }

    /**
     * Create a new tree with auto-generated code
     * AC: #2.1 - createTree(data)
     */
    async createTree(
        workspaceId: string,
        data: CreateTreeDto,
    ): Promise<TreeEntity> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    // Generate unique tree code with retry logic (avoid nested context)
                    const treeCode = await this.generateTreeCodeInternal(treeRepository);

                    // Calculate estimated harvest date (5 years from planting)
                    let estimatedHarvestDate = data.estimatedHarvestDate;
                    if (!estimatedHarvestDate && data.plantingDate) {
                        const plantingDate = new Date(data.plantingDate);
                        plantingDate.setFullYear(plantingDate.getFullYear() + 5);
                        estimatedHarvestDate = plantingDate.toISOString();
                    }

                    // Determine initial status based on planting date
                    const status = data.plantingDate
                        ? this.determineTreeStatus(
                            this.calculateTreeAgeMonths(new Date(data.plantingDate)),
                        )
                        : 'SEEDLING';

                    const newTree = {
                        treeCode,
                        status,
                        gpsLocation: data.gpsLocation || null,
                        plantingDate: data.plantingDate || null,
                        estimatedHarvestDate: estimatedHarvestDate || null,
                        height: data.height ?? null,
                        co2Absorbed: data.co2Absorbed ?? 0,
                        lotId: data.lotId || null,
                        ownerId: data.ownerId || null,
                    };

                    const result = await treeRepository.save(newTree);
                    this.logger.log(`Created tree with code: ${treeCode}`);
                    return result as TreeEntity;
                } catch (error) {
                    this.logger.error(`Failed to create tree: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Find all trees with filters and pagination
     * AC: #2.2 - findAllTrees(filters)
     */
    async findAllTrees(
        workspaceId: string,
        filters?: TreeFilters,
        pagination?: PaginationOptions,
    ): Promise<{ trees: TreeEntity[]; total: number }> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    const where: FindOptionsWhere<TreeEntity> = {};

                    if (filters?.status) {
                        where.status = filters.status;
                    }
                    if (filters?.lotId) {
                        where.lotId = filters.lotId;
                    }
                    if (filters?.ownerId) {
                        where.ownerId = filters.ownerId;
                    }

                    const page = pagination?.page || 1;
                    const limit = Math.min(pagination?.limit || DEFAULT_PAGE_SIZE, MAX_TREES_PER_LOT_QUERY);
                    const skip = (page - 1) * limit;

                    const [trees, total] = await treeRepository.findAndCount({
                        where,
                        skip,
                        take: limit,
                        order: { createdAt: 'DESC' } as any,
                    });

                    return { trees, total };
                } catch (error) {
                    this.logger.error(`Failed to find trees: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Find a single tree by ID
     * AC: #2.3 - findTreeById(id)
     */
    async findTreeById(
        workspaceId: string,
        treeId: string,
    ): Promise<TreeEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    return treeRepository.findOne({
                        where: { id: treeId },
                    });
                } catch (error) {
                    this.logger.error(`Failed to find tree by ID ${treeId}: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Find a tree by its unique code
     * AC: #2.4 - findTreeByCode(code)
     */
    async findTreeByCode(
        workspaceId: string,
        treeCode: string,
    ): Promise<TreeEntity | null> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    return treeRepository.findOne({
                        where: { treeCode },
                    });
                } catch (error) {
                    this.logger.error(`Failed to find tree by code ${treeCode}: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Update tree information
     * AC: #2.5 - updateTree(id, data)
     */
    async updateTree(
        workspaceId: string,
        treeId: string,
        data: UpdateTreeDto,
    ): Promise<TreeEntity> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    const existingTree = await treeRepository.findOne({
                        where: { id: treeId },
                    });

                    if (!existingTree) {
                        throw new NotFoundException(`Tree with ID ${treeId} not found`);
                    }

                    await treeRepository.update(treeId, data);

                    const updatedTree = await treeRepository.findOne({
                        where: { id: treeId },
                    });

                    this.logger.log(`Updated tree ${treeId}`);
                    return updatedTree as TreeEntity;
                } catch (error) {
                    if (error instanceof NotFoundException) {
                        throw error;
                    }
                    this.logger.error(`Failed to update tree ${treeId}: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Soft delete a tree
     * AC: #2.6 - deleteTree(id)
     */
    async deleteTree(workspaceId: string, treeId: string): Promise<boolean> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    const existingTree = await treeRepository.findOne({
                        where: { id: treeId },
                    });

                    if (!existingTree) {
                        this.logger.warn(`Attempted to delete non-existent tree ${treeId}`);
                        return false;
                    }

                    await treeRepository.softDelete(treeId);
                    this.logger.log(`Soft deleted tree ${treeId}`);
                    return true;
                } catch (error) {
                    this.logger.error(`Failed to delete tree ${treeId}: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Generate a unique tree code (public method for standalone use)
     * Format: TREE-2026-00001
     * AC: #3 - generateTreeCode()
     */
    async generateTreeCode(workspaceId: string): Promise<string> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                const treeRepository =
                    await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                        workspaceId,
                        'tree',
                    );
                return this.generateTreeCodeInternal(treeRepository);
            },
        );
    }

    /**
     * Internal method to generate tree code within existing repository context
     * Includes retry logic for race condition handling
     */
    private async generateTreeCodeInternal(
        treeRepository: WorkspaceRepository<TreeEntity>,
    ): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `TREE-${year}-`;

        for (let attempt = 1; attempt <= MAX_CODE_GENERATION_RETRIES; attempt++) {
            try {
                // Find max sequence for current year
                const existingTrees = await treeRepository.find({
                    where: { treeCode: Like(`${prefix}%`) } as any,
                    order: { treeCode: 'DESC' } as any,
                    take: 1,
                });

                let sequence = 1;
                if (existingTrees.length > 0) {
                    const lastCode = existingTrees[0].treeCode;
                    const parts = lastCode.split('-');
                    if (parts.length === 3) {
                        const lastSequence = parseInt(parts[2], 10);
                        if (!isNaN(lastSequence)) {
                            sequence = lastSequence + 1;
                        }
                    }
                }

                const paddedSequence = String(sequence).padStart(5, '0');
                return `TREE-${year}-${paddedSequence}`;
            } catch (error) {
                if (attempt === MAX_CODE_GENERATION_RETRIES) {
                    this.logger.error(`Failed to generate tree code after ${MAX_CODE_GENERATION_RETRIES} attempts`);
                    throw error;
                }
                this.logger.warn(`Tree code generation attempt ${attempt} failed, retrying...`);
                // Add small delay before retry to handle race condition
                await new Promise(resolve => setTimeout(resolve, 50 * attempt));
            }
        }

        throw new Error('Failed to generate tree code');
    }

    /**
     * Calculate tree age in months from planting date
     * AC: #4 - calculateTreeAgeMonths()
     * Uses more accurate month calculation
     */
    calculateTreeAgeMonths(plantingDate: Date): number {
        const now = new Date();
        const diffTime = now.getTime() - plantingDate.getTime();
        const diffDays = diffTime / MILLISECONDS_PER_DAY;
        const diffMonths = Math.floor(diffDays / AVERAGE_DAYS_PER_MONTH);
        return Math.max(0, diffMonths);
    }

    /**
     * Determine tree status based on age
     * AC: #5 - determineTreeStatus()
     * - SEEDLING: 0-3 months
     * - PLANTED: 3-9 months
     * - GROWING: 9-48 months
     * - MATURE: 48-60 months
     * - READY_HARVEST: 60+ months
     */
    determineTreeStatus(
        ageMonths: number,
    ): 'SEEDLING' | 'PLANTED' | 'GROWING' | 'MATURE' | 'READY_HARVEST' {
        if (ageMonths < 3) return 'SEEDLING';
        if (ageMonths < 9) return 'PLANTED';
        if (ageMonths < 48) return 'GROWING';
        if (ageMonths < 60) return 'MATURE';
        return 'READY_HARVEST';
    }

    /**
     * Check if tree is ready for quarterly photo update
     * Trees >= 9 months old get real photos
     * Trees < 9 months use placeholder photos
     */
    needsRealPhoto(ageMonths: number): boolean {
        return ageMonths >= 9;
    }

    /**
     * Check if tree is approaching harvest time (5 years)
     * Returns true if within 3 months of 60-month mark
     */
    isApproachingHarvest(ageMonths: number): boolean {
        return ageMonths >= 57 && ageMonths < 60;
    }

    /**
     * Check if tree is ready for harvest notification
     */
    isReadyForHarvest(ageMonths: number): boolean {
        return ageMonths >= 60;
    }

    /**
     * Get trees by owner for dashboard
     */
    async getTreesByOwner(
        workspaceId: string,
        ownerId: string,
        pagination?: PaginationOptions,
    ): Promise<{ trees: TreeEntity[]; total: number }> {
        return this.findAllTrees(workspaceId, { ownerId }, pagination);
    }

    /**
     * Get trees by lot
     */
    async getTreesByLot(
        workspaceId: string,
        lotId: string,
    ): Promise<TreeEntity[]> {
        const result = await this.findAllTrees(
            workspaceId,
            { lotId },
            { limit: MAX_TREES_PER_LOT_QUERY },
        );
        return result.trees;
    }

    /**
     * Count trees by status for statistics
     * Optimized to use fewer queries
     */
    async countTreesByStatus(
        workspaceId: string,
    ): Promise<Record<string, number>> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const treeRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreeEntity>(
                            workspaceId,
                            'tree',
                        );

                    // Get all counts in parallel for better performance
                    const statuses = [
                        'SEEDLING',
                        'PLANTED',
                        'GROWING',
                        'MATURE',
                        'READY_HARVEST',
                    ] as const;

                    const countPromises = statuses.map(async (status) => {
                        const count = await treeRepository.count({
                            where: { status },
                        });
                        return [status, count] as const;
                    });

                    const results = await Promise.all(countPromises);
                    return Object.fromEntries(results);
                } catch (error) {
                    this.logger.error(`Failed to count trees by status: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }
}
