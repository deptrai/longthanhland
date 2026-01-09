import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
    TreeHealthService,
    TreeHealthStatus,
    type TreeHealthUpdateDto,
    type TreeHealthLogEntity,
} from './tree-health.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

describe('TreeHealthService', () => {
    let service: TreeHealthService;
    let mockGlobalWorkspaceOrmManager: jest.Mocked<GlobalWorkspaceOrmManager>;
    let mockHealthRepository: {
        save: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
    };

    const workspaceId = 'test-workspace-id';

    beforeEach(async () => {
        mockHealthRepository = {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
        };

        mockGlobalWorkspaceOrmManager = {
            getRepository: jest.fn().mockResolvedValue(mockHealthRepository),
            executeInWorkspaceContext: jest
                .fn()
                .mockImplementation((_authContext, fn) => fn()),
        } as unknown as jest.Mocked<GlobalWorkspaceOrmManager>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TreeHealthService,
                {
                    provide: GlobalWorkspaceOrmManager,
                    useValue: mockGlobalWorkspaceOrmManager,
                },
            ],
        }).compile();

        service = module.get<TreeHealthService>(TreeHealthService);
    });

    describe('isValidStatusTransition', () => {
        it('should allow valid transitions', () => {
            expect(service.isValidStatusTransition(TreeHealthStatus.HEALTHY, TreeHealthStatus.SICK)).toBe(true);
            expect(service.isValidStatusTransition(TreeHealthStatus.SICK, TreeHealthStatus.HEALTHY)).toBe(true);
            expect(service.isValidStatusTransition(TreeHealthStatus.SICK, TreeHealthStatus.DEAD)).toBe(true);
            expect(service.isValidStatusTransition(TreeHealthStatus.DEAD, TreeHealthStatus.REPLANTED)).toBe(true);
            expect(service.isValidStatusTransition(TreeHealthStatus.REPLANTED, TreeHealthStatus.HEALTHY)).toBe(true);
        });

        it('should block invalid transitions from DEAD', () => {
            expect(service.isValidStatusTransition(TreeHealthStatus.DEAD, TreeHealthStatus.HEALTHY)).toBe(false);
            expect(service.isValidStatusTransition(TreeHealthStatus.DEAD, TreeHealthStatus.SICK)).toBe(false);
        });
    });

    describe('getRequiredActions', () => {
        it('should return correct actions for SICK', () => {
            const actions = service.getRequiredActions(TreeHealthStatus.SICK);
            expect(actions).toContain('LOG_TREATMENT');
            expect(actions).toContain('SCHEDULE_FOLLOWUP');
        });

        it('should return correct actions for DEAD', () => {
            const actions = service.getRequiredActions(TreeHealthStatus.DEAD);
            expect(actions).toContain('CREATE_REPLANT_TASK');
        });

        it('should return empty for HEALTHY', () => {
            const actions = service.getRequiredActions(TreeHealthStatus.HEALTHY);
            expect(actions).toHaveLength(0);
        });
    });

    describe('calculateHealthScore', () => {
        it('should return 100 for empty history', () => {
            expect(service.calculateHealthScore([])).toBe(100);
        });

        it('should calculate weighted average correctly', () => {
            // Recent HEALTHY (wt 2), Old SICK (wt 1)
            // (100*2 + 40*1) / (2+1) = 240/3 = 80
            const history = [TreeHealthStatus.HEALTHY, TreeHealthStatus.SICK];
            expect(service.calculateHealthScore(history)).toBe(80);
        });
    });

    describe('generateOwnerNotificationMessage', () => {
        it('should respond with correct subject for SICK', () => {
            const msg = service.generateOwnerNotificationMessage('Tree1', TreeHealthStatus.SICK);
            expect(msg.subject).toContain('Cập nhật về cây Tree1');
            expect(msg.body).toContain('chăm sóc đặc biệt');
        });
    });

    describe('createHealthLog', () => {
        it('should create a health log', async () => {
            const dto: TreeHealthUpdateDto = {
                treeId: 'tree-1',
                status: TreeHealthStatus.SICK,
                notes: 'Yellow leaves',
            };

            const expectedLog = {
                id: 'log-1',
                ...dto,
                loggedAt: expect.any(String),
                createdAt: new Date().toISOString(),
                // ... other fields
            };

            mockHealthRepository.findOne.mockResolvedValue(null); // No previous logs
            mockHealthRepository.findOne.mockResolvedValue(null); // No previous logs
            mockHealthRepository.save.mockResolvedValue(expectedLog);

            const result = await service.createHealthLog(workspaceId, dto);

            expect(result).toBe(expectedLog);
            expect(mockHealthRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                status: TreeHealthStatus.SICK,
                treeId: 'tree-1',
                loggedAt: expect.any(String),
            }));
        });

        it('should throw BadRequestException for invalid transition', async () => {
            const dto: TreeHealthUpdateDto = {
                treeId: 'tree-1',
                status: TreeHealthStatus.HEALTHY,
                notes: 'Recovered miraculously',
            };

            // Previous status was DEAD
            mockHealthRepository.findOne.mockResolvedValue({
                status: TreeHealthStatus.DEAD,
                treeId: 'tree-1',
            });

            await expect(service.createHealthLog(workspaceId, dto))
                .rejects
                .toThrow(BadRequestException);

            expect(mockHealthRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('findHealthLogsByTree', () => {
        it('should find logs by tree id', async () => {
            mockHealthRepository.find.mockResolvedValue([]);
            await service.findHealthLogsByTree(workspaceId, 'tree-1');
            expect(mockHealthRepository.find).toHaveBeenCalledWith({
                where: { treeId: 'tree-1' },
                order: { createdAt: 'DESC' },
            });
        });
    });
});
