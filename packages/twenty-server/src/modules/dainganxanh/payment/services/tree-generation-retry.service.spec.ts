import { Test, type TestingModule } from '@nestjs/testing';

import { TreeGenerationRetryService } from './tree-generation-retry.service';

describe('TreeGenerationRetryService', () => {
    let service: TreeGenerationRetryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TreeGenerationRetryService],
        }).compile();

        service = module.get<TreeGenerationRetryService>(TreeGenerationRetryService);
    });

    describe('generateTreeCodesWithRetry', () => {
        it('should generate all tree codes successfully', async () => {
            let callCount = 0;
            const generateFn = async () => `TREE-${++callCount}`;

            const result = await service.generateTreeCodesWithRetry(
                generateFn,
                3,
                'order-1',
                'corr-1',
            );

            expect(result.generated).toHaveLength(3);
            expect(result.failed).toBe(0);
            expect(result.success).toBe(true);
        });

        it('should track generated codes correctly', async () => {
            const codes = ['CODE-A', 'CODE-B'];
            let index = 0;
            const generateFn = async () => codes[index++];

            const result = await service.generateTreeCodesWithRetry(
                generateFn,
                2,
                'order-1',
                'corr-1',
            );

            expect(result.generated).toEqual(['CODE-A', 'CODE-B']);
            expect(result.success).toBe(true);
        });
    });
});
