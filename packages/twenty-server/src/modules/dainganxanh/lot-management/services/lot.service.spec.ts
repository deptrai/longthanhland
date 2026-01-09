import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LotService } from './lot.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

describe('LotService', () => {
    let service: LotService;
    let mockOrmManager: jest.Mocked<GlobalWorkspaceOrmManager>;
    let mockDataSource: any;
    let mockQuery: jest.Mock;

    const mockWorkspaceId = 'test-workspace';

    beforeEach(async () => {
        mockQuery = jest.fn();
        mockDataSource = {
            query: mockQuery,
        };

        const mockRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
        };

        mockOrmManager = {
            executeInWorkspaceContext: jest.fn((authContext, callback) =>
                callback(),
            ),
            getRepository: jest.fn().mockResolvedValue(mockRepository),
            getGlobalWorkspaceDataSource: jest.fn().mockResolvedValue(mockDataSource),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LotService,
                {
                    provide: GlobalWorkspaceOrmManager,
                    useValue: mockOrmManager,
                },
            ],
        }).compile();

        service = module.get<LotService>(LotService);
    });

    describe('getAllLots', () => {
        it('should return lots with tree counts', async () => {
            const mockLots = [
                {
                    id: 'lot1',
                    name: 'Lot A',
                    capacity: 100,
                },
                {
                    id: 'lot2',
                    name: 'Lot B',
                    capacity: 50,
                },
            ];

            // Mock schema lookup query
            mockQuery.mockResolvedValueOnce([{ schema: 'workspace_testschema' }]);
            // Mock lots query
            mockQuery.mockResolvedValueOnce(mockLots);

            const result = await service.getAllLots(mockWorkspaceId);

            expect(result).toHaveLength(2);
            expect(mockOrmManager.getGlobalWorkspaceDataSource).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });
    });

    describe('assignOperator', () => {
        it('should assign operator to lot', async () => {
            const lotId = 'lot1';
            const operatorId = 'op1';
            const mockLot = { id: lotId, lotName: 'Lot A' };
            const updatedLot = {
                ...mockLot,
                assignedOperator: { id: operatorId },
            };

            const mockRepo = await mockOrmManager.getRepository(
                mockWorkspaceId,
                'treeLot',
            );
            (mockRepo.findOne as jest.Mock)
                .mockResolvedValueOnce(mockLot)
                .mockResolvedValueOnce(updatedLot);

            const result = await service.assignOperator(
                lotId,
                operatorId,
                mockWorkspaceId,
            );

            expect(result).toEqual(updatedLot);
            expect(mockRepo.update).toHaveBeenCalledWith(lotId, {
                assignedOperatorId: operatorId,
            });
        });

        it('should throw NotFoundException if lot not found', async () => {
            const mockRepo = await mockOrmManager.getRepository(
                mockWorkspaceId,
                'treeLot',
            );
            (mockRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                service.assignOperator('invalid', 'op1', mockWorkspaceId),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('reassignTree', () => {
        it('should reassign tree to new lot', async () => {
            const treeId = 't1';
            const oldLotId = 'lot1';
            const newLotId = 'lot2';

            const mockTree = { id: treeId, treeLotId: oldLotId };
            const mockNewLot = {
                id: newLotId,
                lotName: 'Lot B',
                capacity: 100,
                trees: Array(50).fill({}), // 50 trees
            };

            const treeRepo = {
                findOne: jest
                    .fn()
                    .mockResolvedValueOnce(mockTree)
                    .mockResolvedValueOnce({
                        ...mockTree,
                        treeLotId: newLotId,
                    }),
                update: jest.fn(),
            };

            const lotRepo = {
                findOne: jest.fn().mockResolvedValue(mockNewLot),
                increment: jest.fn(),
                decrement: jest.fn(),
            };

            (mockOrmManager.getRepository as jest.Mock)
                .mockResolvedValueOnce(treeRepo)
                .mockResolvedValueOnce(lotRepo);

            const result = await service.reassignTree(
                treeId,
                newLotId,
                mockWorkspaceId,
            );

            expect(treeRepo.update).toHaveBeenCalledWith(treeId, {
                treeLotId: newLotId,
            });
            expect(lotRepo.decrement).toHaveBeenCalledWith(
                { id: oldLotId },
                'plantedCount',
                1,
            );
            expect(lotRepo.increment).toHaveBeenCalledWith(
                { id: newLotId },
                'plantedCount',
                1,
            );
        });

        it('should throw BadRequestException if lot at capacity', async () => {
            const mockTree = { id: 't1', treeLotId: 'lot1' };
            const mockFullLot = {
                id: 'lot2',
                lotName: 'Lot B',
                capacity: 50,
                trees: Array(50).fill({}), // Full capacity
            };

            const treeRepo = {
                findOne: jest.fn().mockResolvedValue(mockTree),
            };

            const lotRepo = {
                findOne: jest.fn().mockResolvedValue(mockFullLot),
            };

            (mockOrmManager.getRepository as jest.Mock)
                .mockResolvedValueOnce(treeRepo)
                .mockResolvedValueOnce(lotRepo);

            await expect(
                service.reassignTree('t1', 'lot2', mockWorkspaceId),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if tree not found', async () => {
            const treeRepo = {
                findOne: jest.fn().mockResolvedValue(null),
            };

            (mockOrmManager.getRepository as jest.Mock).mockResolvedValue(
                treeRepo,
            );

            await expect(
                service.reassignTree('invalid', 'lot2', mockWorkspaceId),
            ).rejects.toThrow(NotFoundException);
        });
    });
});
