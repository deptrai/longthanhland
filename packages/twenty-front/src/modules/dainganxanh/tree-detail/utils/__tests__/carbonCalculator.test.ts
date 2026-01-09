import {
    getAgeInMonths,
    calculateTotalCO2Absorbed,
    getCurrentAbsorptionRate,
    formatCO2Display,
    getCO2Equivalents,
    calculateProgressPercent,
    formatAge,
} from '../carbonCalculator';

describe('carbonCalculator', () => {
    describe('getAgeInMonths', () => {
        it('should calculate age in months correctly', () => {
            const fromDate = new Date('2024-01-01');
            const toDate = new Date('2024-07-01');
            expect(getAgeInMonths(fromDate, toDate)).toBe(6);
        });

        it('should return 0 for future dates', () => {
            const fromDate = new Date('2025-01-01');
            const toDate = new Date('2024-01-01');
            expect(getAgeInMonths(fromDate, toDate)).toBe(0);
        });

        it('should handle string dates', () => {
            const fromDate = '2024-01-01';
            const toDate = new Date('2024-12-01');
            expect(getAgeInMonths(fromDate, toDate)).toBe(11);
        });
    });

    describe('calculateTotalCO2Absorbed', () => {
        it('should calculate CO2 for 6-month old tree', () => {
            const plantingDate = new Date();
            plantingDate.setMonth(plantingDate.getMonth() - 6);

            const co2 = calculateTotalCO2Absorbed(plantingDate);
            // 6 months at 5kg/year = 6 * (5/12) = 2.5 kg
            expect(co2).toBeCloseTo(2.5, 1);
        });

        it('should calculate CO2 for 2-year old tree', () => {
            const plantingDate = new Date();
            plantingDate.setFullYear(plantingDate.getFullYear() - 2);

            const co2 = calculateTotalCO2Absorbed(plantingDate);
            // 12 months at 5kg/year = 5 kg
            // 12 months at 10kg/year = 10 kg
            // Total = 15 kg
            expect(co2).toBeCloseTo(15, 1);
        });
    });

    describe('getCurrentAbsorptionRate', () => {
        it('should return 5kg/year for trees under 12 months', () => {
            expect(getCurrentAbsorptionRate(6)).toBe(5);
            expect(getCurrentAbsorptionRate(12)).toBe(5);
        });

        it('should return 10kg/year for trees 13-36 months', () => {
            expect(getCurrentAbsorptionRate(24)).toBe(10);
        });

        it('should return 15kg/year for trees 37-60 months', () => {
            expect(getCurrentAbsorptionRate(48)).toBe(15);
        });

        it('should return 20kg/year for mature trees (60+ months)', () => {
            expect(getCurrentAbsorptionRate(72)).toBe(20);
        });
    });

    describe('formatCO2Display', () => {
        it('should format kg values correctly', () => {
            expect(formatCO2Display(5.5)).toBe('5.5 kg');
            expect(formatCO2Display(100)).toBe('100.0 kg');
        });

        it('should format values over 1000 as tons', () => {
            expect(formatCO2Display(1500)).toBe('1.50 tấn');
        });
    });

    describe('getCO2Equivalents', () => {
        it('should return array of equivalents', () => {
            const equivalents = getCO2Equivalents(10);

            expect(equivalents).toHaveLength(3);
            expect(equivalents[0].label).toBe('Km lái xe ô tô');
            expect(equivalents[0].value).toBe(50); // 10 * 5
            expect(equivalents[1].label).toBe('Giờ sử dụng máy tính');
            expect(equivalents[2].label).toBe('Chai nhựa tái chế');
        });
    });

    describe('calculateProgressPercent', () => {
        it('should calculate progress correctly', () => {
            const plantingDate = new Date();
            plantingDate.setMonth(plantingDate.getMonth() - 30);

            const progress = calculateProgressPercent(plantingDate);
            expect(progress).toBe(50); // 30/60 = 50%
        });

        it('should cap at 100%', () => {
            const plantingDate = new Date();
            plantingDate.setFullYear(plantingDate.getFullYear() - 10);

            const progress = calculateProgressPercent(plantingDate);
            expect(progress).toBe(100);
        });
    });

    describe('formatAge', () => {
        it('should format months correctly', () => {
            expect(formatAge(6)).toBe('6 tháng');
        });

        it('should format years correctly', () => {
            expect(formatAge(24)).toBe('2 năm');
        });

        it('should format years and months correctly', () => {
            expect(formatAge(26)).toBe('2 năm 2 tháng');
        });
    });
});
