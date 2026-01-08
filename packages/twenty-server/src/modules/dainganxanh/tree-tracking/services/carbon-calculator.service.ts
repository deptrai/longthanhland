import { Injectable } from '@nestjs/common';

/**
 * CarbonCalculatorService calculates CO2 absorption for Aquilaria (Dó) trees.
 * 
 * Aquilaria trees are known to absorb approximately:
 * - Year 1: ~5 kg CO2
 * - Year 2-3: ~10 kg CO2/year
 * - Year 4-5: ~15 kg CO2/year
 * - Mature (5+ years): ~20 kg CO2/year
 * 
 * These are estimates based on research data.
 */
@Injectable()
export class CarbonCalculatorService {
    /**
     * CO2 absorption rates in kg per year based on tree age
     */
    private readonly absorptionRates: { maxAgeMonths: number; kgPerYear: number }[] = [
        { maxAgeMonths: 12, kgPerYear: 5 },
        { maxAgeMonths: 36, kgPerYear: 10 },
        { maxAgeMonths: 60, kgPerYear: 15 },
        { maxAgeMonths: Infinity, kgPerYear: 20 },
    ];

    /**
     * Calculate total CO2 absorbed by a tree from planting date to now
     */
    calculateTotalCO2Absorbed(plantingDate: Date): number {
        const now = new Date();
        const ageMonths = this.getAgeInMonths(plantingDate, now);

        let totalCO2 = 0;
        let currentMonth = 0;

        for (const rate of this.absorptionRates) {
            const monthsInThisRange = Math.min(
                rate.maxAgeMonths - currentMonth,
                ageMonths - currentMonth,
            );

            if (monthsInThisRange <= 0) break;

            // Convert yearly rate to monthly and multiply by months in range
            const monthlyRate = rate.kgPerYear / 12;
            totalCO2 += monthlyRate * monthsInThisRange;

            currentMonth += monthsInThisRange;
            if (currentMonth >= ageMonths) break;
        }

        return Math.round(totalCO2 * 100) / 100;
    }

    /**
     * Calculate projected CO2 absorption for a tree's lifetime (60 months)
     */
    calculateProjectedLifetimeCO2(): number {
        // Sum up CO2 for each growth stage
        return this.absorptionRates.reduce((total, rate, index) => {
            const prevMonths = index === 0 ? 0 : this.absorptionRates[index - 1].maxAgeMonths;
            const monthsInRange = Math.min(rate.maxAgeMonths, 60) - prevMonths;

            if (monthsInRange <= 0) return total;

            return total + (rate.kgPerYear / 12) * monthsInRange;
        }, 0);
    }

    /**
     * Calculate carbon credit value in VND
     * Average carbon credit price: ~$10-30 per ton of CO2
     * Using conservative estimate: $15/ton = 375,000 VND/ton
     */
    calculateCarbonCreditValue(co2Kg: number): number {
        const pricePerTonVND = 375000;
        const tons = co2Kg / 1000;
        return Math.round(tons * pricePerTonVND);
    }

    /**
     * Format CO2 for display
     */
    formatCO2Display(co2Kg: number): string {
        if (co2Kg >= 1000) {
            return `${(co2Kg / 1000).toFixed(2)} tấn`;
        }
        return `${co2Kg.toFixed(1)} kg`;
    }

    /**
     * Calculate CO2 equivalent in everyday terms
     */
    getCO2Equivalents(co2Kg: number): { label: string; value: number }[] {
        return [
            {
                label: 'Km lái xe ô tô',
                value: Math.round(co2Kg * 5), // ~200g CO2 per km
            },
            {
                label: 'Giờ sử dụng máy tính',
                value: Math.round(co2Kg * 20), // ~50g CO2 per hour
            },
            {
                label: 'Số chai nhựa tái chế',
                value: Math.round(co2Kg * 40), // ~25g CO2 saved per bottle recycled
            },
        ];
    }

    /**
     * Get current absorption rate based on tree age
     */
    getCurrentAbsorptionRate(ageMonths: number): number {
        for (const rate of this.absorptionRates) {
            if (ageMonths <= rate.maxAgeMonths) {
                return rate.kgPerYear;
            }
        }
        return this.absorptionRates[this.absorptionRates.length - 1].kgPerYear;
    }

    private getAgeInMonths(from: Date, to: Date): number {
        const months =
            (to.getFullYear() - from.getFullYear()) * 12 +
            (to.getMonth() - from.getMonth());
        return Math.max(0, months);
    }
}
