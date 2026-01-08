import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import {
    TreeService,
    type TreeEntity,
    type CreateTreeDto,
    type UpdateTreeDto,
} from './tree.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

describe('TreeService', () => {
    let service: TreeService;
    let mockGlobalWorkspaceOrmManager: jest.Mocked<GlobalWorkspaceOrmManager>;
    let mockTreeRepository: {
        save: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
        findAndCount: jest.Mock;
        update: jest.Mock;
        softDelete: jest.Mock;
        count: jest.Mock;
    };

    const workspaceId = 'test-workspace-id';

    beforeEach(async () => {
        mockTreeRepository = {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
        };

        mockGlobalWorkspaceOrmManager = {
            getRepository: jest.fn().mockResolvedValue(mockTreeRepository),
            executeInWorkspaceContext: jest
                .fn()
                .mockImplementation((_authContext, fn) => fn()),
        } as unknown as jest.Mocked<GlobalWorkspaceOrmManager>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TreeService,
                {
                    provide: GlobalWorkspaceOrmManager,
                    useValue: mockGlobalWorkspaceOrmManager,
                },
            ],
        }).compile();

        service = module.get<TreeService>(TreeService);
    });

    describe('calculateTreeAgeMonths', () => {
        it('should return 0 for future planting date', () => {
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 1);
            expect(service.calculateTreeAgeMonths(futureDate)).toBe(0);
        });

        it('should calculate correct months for past date', () => {
            const pastDate = new Date();
            pastDate.setMonth(pastDate.getMonth() - 6);
            // Allow ±1 month variance due to floating point and month length differences
            const result = service.calculateTreeAgeMonths(pastDate);
            expect(result).toBeGreaterThanOrEqual(5);
            expect(result).toBeLessThanOrEqual(7);
        });

        it('should handle 12 months correctly', () => {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const result = service.calculateTreeAgeMonths(oneYearAgo);
            expect(result).toBeGreaterThanOrEqual(11);
            expect(result).toBeLessThanOrEqual(13);
        });

        it('should return 0 for today', () => {
            const today = new Date();
            expect(service.calculateTreeAgeMonths(today)).toBe(0);
        });
    });

    describe('determineTreeStatus', () => {
        it('should return SEEDLING for 0-2 months', () => {
            expect(service.determineTreeStatus(0)).toBe('SEEDLING');
            expect(service.determineTreeStatus(1)).toBe('SEEDLING');
            expect(service.determineTreeStatus(2)).toBe('SEEDLING');
        });

        it('should return PLANTED for 3-8 months', () => {
            expect(service.determineTreeStatus(3)).toBe('PLANTED');
            expect(service.determineTreeStatus(5)).toBe('PLANTED');
            expect(service.determineTreeStatus(8)).toBe('PLANTED');
        });

        it('should return GROWING for 9-47 months', () => {
            expect(service.determineTreeStatus(9)).toBe('GROWING');
            expect(service.determineTreeStatus(24)).toBe('GROWING');
            expect(service.determineTreeStatus(47)).toBe('GROWING');
        });

        it('should return MATURE for 48-59 months', () => {
            expect(service.determineTreeStatus(48)).toBe('MATURE');
            expect(service.determineTreeStatus(54)).toBe('MATURE');
            expect(service.determineTreeStatus(59)).toBe('MATURE');
        });

        it('should return READY_HARVEST for 60+ months', () => {
            expect(service.determineTreeStatus(60)).toBe('READY_HARVEST');
            expect(service.determineTreeStatus(72)).toBe('READY_HARVEST');
            expect(service.determineTreeStatus(100)).toBe('READY_HARVEST');
        });
    });

    describe('needsRealPhoto', () => {
        it('should return false for trees under 9 months', () => {
            expect(service.needsRealPhoto(0)).toBe(false);
            expect(service.needsRealPhoto(8)).toBe(false);
        });

        it('should return true for trees 9 months and older', () => {
            expect(service.needsRealPhoto(9)).toBe(true);
            expect(service.needsRealPhoto(24)).toBe(true);
        });
    });

    describe('isApproachingHarvest', () => {
        it('should return false for trees under 57 months', () => {
            expect(service.isApproachingHarvest(56)).toBe(false);
        });

        it('should return true for trees 57-59 months', () => {
            expect(service.isApproachingHarvest(57)).toBe(true);
            expect(service.isApproachingHarvest(58)).toBe(true);
            expect(service.isApproachingHarvest(59)).toBe(true);
        });

        it('should return false for trees 60+ months', () => {
            expect(service.isApproachingHarvest(60)).toBe(false);
            expect(service.isApproachingHarvest(72)).toBe(false);
        });
    });

    describe('isReadyForHarvest', () => {
        it('should return false for trees under 60 months', () => {
            expect(service.isReadyForHarvest(59)).toBe(false);
        });

        it('should return true for trees 60+ months', () => {
            expect(service.isReadyForHarvest(60)).toBe(true);
            expect(service.isReadyForHarvest(72)).toBe(true);
        });
    });

    describe('createTree', () => {
        it('should create a tree with auto-generated code', async () => {
            const createDto: CreateTreeDto = {
                gpsLocation: '10.123,106.456',
                plantingDate: new Date().toISOString(),
                height: 50,
                lotId: 'lot-1',
                ownerId: 'owner-1',
            };

            // Mock no existing trees
            mockTreeRepository.find.mockResolvedValue([]);
            mockTreeRepository.save.mockImplementation((tree) => ({
                id: 'new-tree-id',
                ...tree,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }));

            const result = await service.createTree(workspaceId, createDto);

            expect(result).toBeDefined();
            expect(result.treeCode).toMatch(/^TREE-\d{4}-\d{5}$/);
            expect(mockTreeRepository.save).toHaveBeenCalled();
        });

        it('should set status based on planting date', async () => {
            const pastDate = new Date();
            pastDate.setMonth(pastDate.getMonth() - 12); // 12 months ago

            const createDto: CreateTreeDto = {
                plantingDate: pastDate.toISOString(),
            };

            mockTreeRepository.find.mockResolvedValue([]);
            mockTreeRepository.save.mockImplementation((tree) => ({
                id: 'new-tree-id',
                ...tree,
            }));

            const result = await service.createTree(workspaceId, createDto);

            expect(result.status).toBe('GROWING'); // 12 months = GROWING
        });

        // Note: Error handling with retry is tested via integration tests
        // Unit tests with mocked repo cannot reliably test async retry timing
    });

    describe('findTreeById', () => {
        it('should return tree when found', async () => {
            const mockTree: Partial<TreeEntity> = {
                id: 'tree-1',
                treeCode: 'TREE-2026-00001',
                status: 'GROWING',
            };

            mockTreeRepository.findOne.mockResolvedValue(mockTree);

            const result = await service.findTreeById(workspaceId, 'tree-1');

            expect(result).toEqual(mockTree);
            expect(mockTreeRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'tree-1' },
            });
        });

        it('should return null when not found', async () => {
            mockTreeRepository.findOne.mockResolvedValue(null);

            const result = await service.findTreeById(workspaceId, 'non-existent');

            expect(result).toBeNull();
        });

        it('should propagate errors', async () => {
            mockTreeRepository.findOne.mockRejectedValue(new Error('Query failed'));

            await expect(service.findTreeById(workspaceId, 'tree-1')).rejects.toThrow('Query failed');
        });
    });

    describe('findTreeByCode', () => {
        it('should find tree by code', async () => {
            const mockTree: Partial<TreeEntity> = {
                id: 'tree-1',
                treeCode: 'TREE-2026-00001',
            };

            mockTreeRepository.findOne.mockResolvedValue(mockTree);

            const result = await service.findTreeByCode(
                workspaceId,
                'TREE-2026-00001',
            );

            expect(result).toEqual(mockTree);
        });
    });

    describe('findAllTrees', () => {
        it('should return paginated results', async () => {
            const mockTrees: Partial<TreeEntity>[] = [
                { id: 'tree-1', treeCode: 'TREE-2026-00001' },
                { id: 'tree-2', treeCode: 'TREE-2026-00002' },
            ];

            mockTreeRepository.findAndCount.mockResolvedValue([mockTrees, 10]);

            const result = await service.findAllTrees(
                workspaceId,
                {},
                { page: 1, limit: 2 },
            );

            expect(result.trees).toHaveLength(2);
            expect(result.total).toBe(10);
        });

        it('should apply filters correctly', async () => {
            mockTreeRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.findAllTrees(
                workspaceId,
                { status: 'GROWING', lotId: 'lot-1' },
                { page: 1, limit: 20 },
            );

            expect(mockTreeRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: 'GROWING', lotId: 'lot-1' },
                }),
            );
        });

        it('should cap limit at max value', async () => {
            mockTreeRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.findAllTrees(
                workspaceId,
                {},
                { page: 1, limit: 5000 }, // Exceeds max
            );

            expect(mockTreeRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 1000, // Should be capped
                }),
            );
        });
    });

    describe('updateTree', () => {
        it('should update tree and return updated entity', async () => {
            const existingTree: Partial<TreeEntity> = {
                id: 'tree-1',
                treeCode: 'TREE-2026-00001',
                status: 'GROWING',
                height: 100,
            };

            const updateDto: UpdateTreeDto = {
                height: 150,
                co2Absorbed: 25,
            };

            mockTreeRepository.findOne
                .mockResolvedValueOnce(existingTree)
                .mockResolvedValueOnce({ ...existingTree, ...updateDto });
            mockTreeRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.updateTree(workspaceId, 'tree-1', updateDto);

            expect(result?.height).toBe(150);
            expect(mockTreeRepository.update).toHaveBeenCalledWith(
                'tree-1',
                updateDto,
            );
        });

        it('should throw NotFoundException when tree not found', async () => {
            mockTreeRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateTree(workspaceId, 'non-existent', { height: 150 }),
            ).rejects.toThrow(NotFoundException);

            expect(mockTreeRepository.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteTree', () => {
        it('should soft delete tree and return true', async () => {
            mockTreeRepository.findOne.mockResolvedValue({ id: 'tree-1' });
            mockTreeRepository.softDelete.mockResolvedValue({ affected: 1 });

            const result = await service.deleteTree(workspaceId, 'tree-1');

            expect(result).toBe(true);
            expect(mockTreeRepository.softDelete).toHaveBeenCalledWith('tree-1');
        });

        it('should return false when tree not found', async () => {
            mockTreeRepository.findOne.mockResolvedValue(null);

            const result = await service.deleteTree(workspaceId, 'non-existent');

            expect(result).toBe(false);
            expect(mockTreeRepository.softDelete).not.toHaveBeenCalled();
        });
    });

    describe('generateTreeCode', () => {
        it('should generate first code of year as TREE-YYYY-00001', async () => {
            mockTreeRepository.find.mockResolvedValue([]);

            const result = await service.generateTreeCode(workspaceId);

            const year = new Date().getFullYear();
            expect(result).toBe(`TREE-${year}-00001`);
        });

        it('should increment sequence from existing trees', async () => {
            const year = new Date().getFullYear();
            mockTreeRepository.find.mockResolvedValue([
                { treeCode: `TREE-${year}-00005` },
            ]);

            const result = await service.generateTreeCode(workspaceId);

            expect(result).toBe(`TREE-${year}-00006`);
        });

        it('should handle malformed tree codes gracefully', async () => {
            const year = new Date().getFullYear();
            mockTreeRepository.find.mockResolvedValue([
                { treeCode: 'INVALID-CODE' },
            ]);

            const result = await service.generateTreeCode(workspaceId);

            // Should fall back to sequence 1
            expect(result).toBe(`TREE-${year}-00001`);
        });

        // Note: Retry logic is tested via integration tests
        // Unit tests with mocked repo cannot reliably test async retry timing
    });

    describe('countTreesByStatus', () => {
        it('should return counts for all statuses in parallel', async () => {
            mockTreeRepository.count.mockImplementation(({ where }) => {
                const counts: Record<string, number> = {
                    SEEDLING: 10,
                    PLANTED: 20,
                    GROWING: 50,
                    MATURE: 15,
                    READY_HARVEST: 5,
                };
                return Promise.resolve(counts[where.status] || 0);
            });

            const result = await service.countTreesByStatus(workspaceId);

            expect(result).toEqual({
                SEEDLING: 10,
                PLANTED: 20,
                GROWING: 50,
                MATURE: 15,
                READY_HARVEST: 5,
            });

            // Should have called count 5 times (once per status)
            expect(mockTreeRepository.count).toHaveBeenCalledTimes(5);
        });
    });

    describe('getTreesByOwner', () => {
        it('should delegate to findAllTrees with owner filter', async () => {
            mockTreeRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.getTreesByOwner(workspaceId, 'owner-123', { page: 1, limit: 10 });

            expect(mockTreeRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { ownerId: 'owner-123' },
                }),
            );
        });
    });

    describe('getTreesByLot', () => {
        it('should return all trees for a lot', async () => {
            const mockTrees = [
                { id: 'tree-1', lotId: 'lot-1' },
                { id: 'tree-2', lotId: 'lot-1' },
            ];
            mockTreeRepository.findAndCount.mockResolvedValue([mockTrees, 2]);

            const result = await service.getTreesByLot(workspaceId, 'lot-1');

            expect(result).toHaveLength(2);
        });
    });
});
