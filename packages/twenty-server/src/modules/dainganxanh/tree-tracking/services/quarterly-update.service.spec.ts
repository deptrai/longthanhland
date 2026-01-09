import { Test, TestingModule } from '@nestjs/testing';
import { QuarterlyUpdateService } from './quarterly-update.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';

describe('QuarterlyUpdateService', () => {
    let service: QuarterlyUpdateService;
    let mockOrmManager: Partial<GlobalWorkspaceOrmManager>;

    beforeEach(async () => {
        mockOrmManager = {
            executeInWorkspaceContext: jest.fn(),
            getRepository: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QuarterlyUpdateService,
                {
                    provide: GlobalWorkspaceOrmManager,
                    useValue: mockOrmManager,
                },
            ],
        }).compile();

        service = module.get<QuarterlyUpdateService>(QuarterlyUpdateService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Date Helpers', () => {
        it('should get correct quarter info', () => {
            const result = service.getCurrentQuarter();
            expect(result).toHaveProperty('quarter');
            expect(result).toHaveProperty('year');
            expect(result).toHaveProperty('label');
        });

        it('should calculate correct date range for Q1', () => {
            const { start, end } = service.getQuarterDateRange(1, 2024);
            expect(start.getMonth()).toBe(0); // Jan
            expect(end.getMonth()).toBe(2); // Match
            expect(end.getDate()).toBe(31);
        });
    });

    describe('isInReportingWindow', () => {
        it('should return boolean', () => {
            const result = service.isInReportingWindow();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Email Generation', () => {
        it('should generate quarterly report', () => {
            const trees = [{
                treeCode: 'TREE-001',
                status: 'HEALTHY',
                co2Absorbed: 12.5
            }];

            const result = service.generateQuarterlyReportEmail('User', trees);

            expect(result.subject).toContain('Báo cáo Quý');
            expect(result.body).toContain('1 cây');
            expect(result.body).toContain('12.5 kg');
        });

        it('should generate harvest reminder', () => {
            const result = service.generateHarvestReminderEmail(
                'User',
                'TREE-001',
                new Date('2020-01-01'),
                100.5
            );

            expect(result.subject).toContain('thu hoạch');
            expect(result.body).toContain('5 năm tuổi');
            expect(result.body).toContain('100.5 kg');
        });
    });

    describe('handleQuarterlyUpdate', () => {
        it('should skip if not in reporting window', async () => {
            jest.spyOn(service, 'isInReportingWindow').mockReturnValue(false);
            const spyLog = jest.spyOn((service as any).logger, 'log');

            await service.handleQuarterlyUpdate();

            expect(spyLog).toHaveBeenCalledWith('Not in reporting window, skipping quarterly update');
            expect(mockOrmManager.executeInWorkspaceContext).not.toHaveBeenCalled();
        });

        it('should execute update if in reporting window', async () => {
            jest.spyOn(service, 'isInReportingWindow').mockReturnValue(true);
            const spyLog = jest.spyOn((service as any).logger, 'log');

            (service as any).EMAIL_DELAY_MS = 0; // Disable delay for tests

            const mockRepo = {
                find: jest.fn()
                    .mockResolvedValueOnce([
                        {
                            code: 'TREE-1',
                            owner: { email: 'test@example.com', name: { first: 'John' } },
                            status: 'HEALTHY'
                        }
                    ])
                    .mockResolvedValueOnce([])
            };

            // Mock nested implementation of executeInWorkspaceContext 
            // since the service calls it with a callback
            (mockOrmManager.getRepository as jest.Mock).mockResolvedValue(mockRepo);
            (mockOrmManager.executeInWorkspaceContext as jest.Mock).mockImplementation(async (ctx, cb) => {
                return cb();
            });

            await service.handleQuarterlyUpdate();

            expect(mockOrmManager.executeInWorkspaceContext).toHaveBeenCalled();
            expect(mockRepo.find).toHaveBeenCalled();
            expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('[MOCK EMAIL] To: test@example.com'));
        });
    });
});
