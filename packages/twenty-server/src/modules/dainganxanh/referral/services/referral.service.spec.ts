import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferralService } from './referral.service';
import { ReferralStatus } from '../objects/referral.object';

describe('ReferralService', () => {
    let service: ReferralService;
    let mockRepository: any;

    beforeEach(async () => {
        mockRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReferralService,
                {
                    provide: getRepositoryToken('Referral'),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<ReferralService>(ReferralService);
    });

    describe('generateReferralCode', () => {
        it('should generate 6-character code', () => {
            const code = service.generateReferralCode();
            expect(code).toHaveLength(6);
            expect(code).toMatch(/^[A-Z2-9]+$/);
        });

        it('should not contain confusing characters', () => {
            const code = service.generateReferralCode();
            expect(code).not.toMatch(/[01OI]/);
        });
    });

    describe('getOrCreateReferralCode', () => {
        it('should return existing code if found', async () => {
            mockRepository.findOne.mockResolvedValue({
                referralCode: 'ABC123',
            });

            const code = await service.getOrCreateReferralCode('user-1');
            expect(code).toBe('ABC123');
        });

        it('should generate new code if not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const code = await service.getOrCreateReferralCode('user-1');
            expect(code).toHaveLength(6);
        });
    });

    describe('calculateCommission', () => {
        it('should calculate 26,000 VND per tree', () => {
            const commission = service.calculateCommission(1);
            expect(commission).toBe(26000);
        });

        it('should calculate for multiple trees', () => {
            const commission = service.calculateCommission(5);
            expect(commission).toBe(130000);
        });
    });

    describe('trackReferral', () => {
        it('should create referral with PENDING status', async () => {
            const data = {
                referralCode: 'ABC123',
                referrerId: 'user-1',
                refereeId: 'user-2',
            };

            mockRepository.create.mockReturnValue(data);
            mockRepository.save.mockResolvedValue({ id: 'ref-1', ...data });

            const result = await service.trackReferral(data);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: ReferralStatus.PENDING,
                    commission: 0,
                }),
            );
        });
    });

    describe('convertReferral', () => {
        it('should update status to CONVERTED and calculate commission', async () => {
            await service.convertReferral('ref-1', 'order-1', 3);

            expect(mockRepository.update).toHaveBeenCalledWith('ref-1', {
                status: ReferralStatus.CONVERTED,
                orderId: 'order-1',
                commission: 78000, // 3 trees * 26,000
                updatedAt: expect.any(Date),
            });
        });
    });
});
