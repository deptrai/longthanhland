/**
 * CarbonCalculatorUtils - Frontend port of CarbonCalculatorService
 * Calculates CO2 absorption for Aquilaria (Dó) trees
 */

interface AbsorptionRate {
    maxAgeMonths: number;
    kgPerYear: number;
}

interface CO2Equivalent {
    label: string;
    value: number;
    icon: string;
}

const ABSORPTION_RATES: AbsorptionRate[] = [
    { maxAgeMonths: 12, kgPerYear: 5 },
    { maxAgeMonths: 36, kgPerYear: 10 },
    { maxAgeMonths: 60, kgPerYear: 15 },
    { maxAgeMonths: Infinity, kgPerYear: 20 },
];

export const getAgeInMonths = (fromDate: Date | string, toDate: Date = new Date()): number => {
    const from = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const to = toDate;
    const months =
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth());
    return Math.max(0, months);
};

export const calculateTotalCO2Absorbed = (plantingDate: Date | string): number => {
    const ageMonths = getAgeInMonths(plantingDate);

    let totalCO2 = 0;
    let currentMonth = 0;

    for (const rate of ABSORPTION_RATES) {
        const monthsInThisRange = Math.min(
            rate.maxAgeMonths - currentMonth,
            ageMonths - currentMonth,
        );

        if (monthsInThisRange <= 0) break;

        const monthlyRate = rate.kgPerYear / 12;
        totalCO2 += monthlyRate * monthsInThisRange;

        currentMonth += monthsInThisRange;
        if (currentMonth >= ageMonths) break;
    }

    return Math.round(totalCO2 * 100) / 100;
};

export const getCurrentAbsorptionRate = (ageMonths: number): number => {
    for (const rate of ABSORPTION_RATES) {
        if (ageMonths <= rate.maxAgeMonths) {
            return rate.kgPerYear;
        }
    }
    return ABSORPTION_RATES[ABSORPTION_RATES.length - 1].kgPerYear;
};

export const formatCO2Display = (co2Kg: number): string => {
    if (co2Kg >= 1000) {
        return `${(co2Kg / 1000).toFixed(2)} tấn`;
    }
    return `${co2Kg.toFixed(1)} kg`;
};

export const getCO2Equivalents = (co2Kg: number): CO2Equivalent[] => [
    {
        label: 'Km lái xe ô tô',
        value: Math.round(co2Kg * 5),
        icon: '🚗',
    },
    {
        label: 'Giờ sử dụng máy tính',
        value: Math.round(co2Kg * 20),
        icon: '💻',
    },
    {
        label: 'Chai nhựa tái chế',
        value: Math.round(co2Kg * 40),
        icon: '♻️',
    },
];

export const calculateProgressPercent = (plantingDate: Date | string, targetMonths: number = 60): number => {
    const ageMonths = getAgeInMonths(plantingDate);
    return Math.min(100, Math.round((ageMonths / targetMonths) * 100));
};

export const formatAge = (ageMonths: number): string => {
    if (ageMonths < 12) {
        return `${ageMonths} tháng`;
    }
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    if (months === 0) {
        return `${years} năm`;
    }
    return `${years} năm ${months} tháng`;
};
