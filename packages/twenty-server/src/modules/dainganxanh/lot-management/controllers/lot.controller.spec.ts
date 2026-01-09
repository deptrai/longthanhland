import { Test, TestingModule } from '@nestjs/testing';
import { LotController } from './lot.controller';
import { LotService } from '../services/lot.service';

// Mock JwtAuthGuard
jest.mock('src/engine/guards/jwt-auth.guard', () => ({
    JwtAuthGuard: jest.fn().mockImplementation(() => ({
        canActivate: () => true,
    })),
}));

describe('LotController', () => {
    let controller: LotController;
    let service: jest.Mocked<LotService>;

    const mockRequest = {
        user: { workspaceId: 'test-workspace' },
    };

    beforeEach(async () => {
        const mockService = {
            getAllLots: jest.fn(),
            assignOperator: jest.fn(),
            reassignTree: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LotController],
            providers: [
                {
                    provide: LotService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<LotController>(LotController);
        service = module.get(LotService);
    });

    describe('getAllLots', () => {
        it('should return all lots', async () => {
            const mockLots = [
                { id: 'lot1', lotName: 'Lot A', treeCount: 10 },
                { id: 'lot2', lotName: 'Lot B', treeCount: 5 },
            ];

            service.getAllLots.mockResolvedValue(mockLots);

            const result = await controller.getAllLots(mockRequest);

            expect(result).toEqual(mockLots);
            expect(service.getAllLots).toHaveBeenCalledWith('test-workspace');
        });

        it('should use default workspaceId if not in request', async () => {
            const reqWithoutWorkspace = { user: {} };
            service.getAllLots.mockResolvedValue([]);

            await controller.getAllLots(reqWithoutWorkspace);

            expect(service.getAllLots).toHaveBeenCalledWith('3b8e6458-5fc1-4e63-8563-008ccddaa6db');
        });
    });

    describe('assignOperator', () => {
        it('should assign operator to lot', async () => {
            const lotId = 'lot1';
            const operatorId = 'op1';
            const updatedLot = {
                id: lotId,
                assignedOperator: { id: operatorId },
            };

            service.assignOperator.mockResolvedValue(updatedLot);

            const result = await controller.assignOperator(
                lotId,
                operatorId,
                mockRequest,
            );

            expect(result).toEqual(updatedLot);
            expect(service.assignOperator).toHaveBeenCalledWith(
                lotId,
                operatorId,
                'test-workspace',
            );
        });
    });

    describe('reassignTree', () => {
        it('should reassign tree to new lot', async () => {
            const treeId = 't1';
            const newLotId = 'lot2';
            const updatedTree = { id: treeId, treeLotId: newLotId };

            service.reassignTree.mockResolvedValue(updatedTree);

            const result = await controller.reassignTree(
                treeId,
                newLotId,
                mockRequest,
            );

            expect(result).toEqual(updatedTree);
            expect(service.reassignTree).toHaveBeenCalledWith(
                treeId,
                newLotId,
                'test-workspace',
            );
        });
    });
});
