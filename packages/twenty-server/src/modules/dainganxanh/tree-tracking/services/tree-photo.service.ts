import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import * as ExifReader from 'exifreader';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

/**
 * TreePhoto entity interface
 */
export interface TreePhotoEntity {
    id: string;
    photoUrl: string;
    thumbnailUrl: string | null;
    capturedAt: string;
    gpsLat: number | null;
    gpsLng: number | null;
    quarter: string;
    isPlaceholder: boolean;
    caption: string | null;
    treeId: string;
    uploadedById: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * DTO for creating a tree photo
 */
export interface CreateTreePhotoDto {
    photoUrl: string;
    thumbnailUrl?: string;
    capturedAt: string;
    gpsLat?: number;
    gpsLng?: number;
    quarter: string;
    isPlaceholder?: boolean;
    caption?: string;
    treeId: string;
    uploadedById?: string;
}

/**
 * TreePhotoService handles photo uploads, compression, and GPS extraction
 * for tree progress tracking.
 * 
 * Photos are uploaded quarterly and tagged with GPS from EXIF data.
 */
@Injectable()
export class TreePhotoService {
    private readonly logger = new Logger(TreePhotoService.name);

    constructor(
        private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    ) { }
    /**
     * Extract GPS coordinates from photo EXIF data
     * Returns null if GPS data is not available
     */
    async extractGpsFromExif(
        buffer: Buffer,
    ): Promise<{ lat: number; lng: number } | null> {
        try {
            const tags = ExifReader.load(buffer);

            if (!tags.GPSLatitude || !tags.GPSLongitude) {
                return null;
            }

            const lat = this.convertDmsToDecimal(
                tags.GPSLatitude.description,
                tags.GPSLatitudeRef?.value?.[0] ?? 'N',
            );

            const lng = this.convertDmsToDecimal(
                tags.GPSLongitude.description,
                tags.GPSLongitudeRef?.value?.[0] ?? 'E',
            );

            return { lat, lng };
        } catch (error) {
            console.error('Failed to extract GPS from EXIF:', error);
            return null;
        }
    }

    /**
     * Convert degrees/minutes/seconds to decimal degrees
     */
    private convertDmsToDecimal(dmsString: string, ref: string): number {
        // Parse DMS format: "16° 28' 57.36""
        const parts = dmsString.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"/);
        if (!parts) return 0;

        const degrees = parseFloat(parts[1]);
        const minutes = parseFloat(parts[2]);
        const seconds = parseFloat(parts[3]);

        let decimal = degrees + minutes / 60 + seconds / 3600;

        if (ref === 'S' || ref === 'W') {
            decimal = -decimal;
        }

        return Math.round(decimal * 1000000) / 1000000;
    }

    /**
     * Determine quarter from date (Q1-2026 format)
     */
    getQuarterString(date: Date): string {
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        const year = date.getFullYear();
        return `Q${quarter}-${year}`;
    }

    /**
     * Generate S3 key for tree photo
     */
    generateS3Key(
        treeCode: string,
        quarter: string,
        filename: string,
    ): string {
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `trees/${treeCode}/${quarter}/${Date.now()}-${sanitizedFilename}`;
    }

    /**
     * Generate thumbnail S3 key
     */
    generateThumbnailS3Key(originalKey: string): string {
        return originalKey.replace('/trees/', '/trees/thumbnails/');
    }

    /**
     * Validate file is an acceptable image type
     * Supports JPEG, PNG, WebP, HEIC
     */
    isValidImageType(mimeType: string): boolean {
        const validTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
        ];
        return validTypes.includes(mimeType.toLowerCase());
    }

    /**
     * Validate quarter format Q[1-4]-YYYY
     * AC: #3
     */
    isValidQuarter(quarter: string): boolean {
        return /^Q[1-4]-\d{4}$/.test(quarter);
    }

    /**
     * Maximum file size in bytes (10MB)
     */
    getMaxFileSizeBytes(): number {
        return 10 * 1024 * 1024;
    }

    /**
     * Target compressed size in bytes (2MB)
     */
    getTargetCompressedSizeBytes(): number {
        return 2 * 1024 * 1024;
    }
    /**
     * Create a new tree photo record
     * AC: #1.4 - Create TreePhoto object
     */
    async createPhoto(
        workspaceId: string,
        data: CreateTreePhotoDto,
    ): Promise<TreePhotoEntity> {
        // AC #3: Quarter format validation
        if (!this.isValidQuarter(data.quarter)) {
            throw new BadRequestException(`Invalid quarter format: ${data.quarter}. Expected Q[1-4]-YYYY.`);
        }

        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const photoRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreePhotoEntity>(
                            workspaceId,
                            'treePhoto',
                        );

                    const newPhoto = {
                        photoUrl: data.photoUrl,
                        thumbnailUrl: data.thumbnailUrl || null,
                        capturedAt: data.capturedAt,
                        gpsLat: data.gpsLat || null,
                        gpsLng: data.gpsLng || null,
                        quarter: data.quarter,
                        isPlaceholder: data.isPlaceholder || false,
                        caption: data.caption || null,
                        treeId: data.treeId,
                        uploadedById: data.uploadedById || null,
                    };

                    const result = await photoRepository.save(newPhoto);
                    this.logger.log(`Created tree photo for tree ${data.treeId}`);
                    return result as TreePhotoEntity;
                } catch (error) {
                    this.logger.error(`Failed to create tree photo: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }

    /**
     * Find photos by tree ID with optional quarter filter
     */
    async findPhotosByTree(
        workspaceId: string,
        treeId: string,
        quarter?: string,
    ): Promise<TreePhotoEntity[]> {
        const authContext = buildSystemAuthContext(workspaceId);

        return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
            authContext,
            async () => {
                try {
                    const photoRepository =
                        await this.globalWorkspaceOrmManager.getRepository<TreePhotoEntity>(
                            workspaceId,
                            'treePhoto',
                        );

                    const where: FindOptionsWhere<TreePhotoEntity> = {
                        treeId,
                    };

                    if (quarter) {
                        where.quarter = quarter;
                    }

                    return photoRepository.find({
                        where,
                        order: { capturedAt: 'DESC' } as any,
                    });
                } catch (error) {
                    this.logger.error(`Failed to find photos for tree ${treeId}: ${error.message}`, error.stack);
                    throw error;
                }
            },
        );
    }
}
