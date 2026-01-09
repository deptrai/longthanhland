import { useState, useCallback, useEffect } from 'react';

export enum HarvestDecision {
    CASH_OUT = 'CASH_OUT',
    REPLANT = 'REPLANT',
    CONTINUE = 'CONTINUE',
}

export interface HarvestOption {
    id: HarvestDecision;
    title: string;
    description: string;
    estimatedPayout?: string;
    benefit?: string;
}

export interface HarvestInfo {
    tree: {
        id: string;
        treeCode: string;
        plantingDate: string;
        ageMonths: number;
        status: string;
        location?: string;
        lotName?: string;
    };
    harvest: {
        isApproaching: boolean;
        isReady: boolean;
        notificationSentAt?: string;
        decision?: HarvestDecision;
        decisionDate?: string;
    };
    options: HarvestOption[];
}

export const useHarvestDecision = (treeCode: string) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [harvestInfo, setHarvestInfo] = useState<HarvestInfo | null>(null);
    const [selectedOption, setSelectedOption] = useState<HarvestDecision | null>(null);

    const fetchHarvestInfo = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/harvest/${treeCode}`);

            if (!response.ok) {
                throw new Error('Failed to fetch harvest info');
            }

            const data = await response.json();
            setHarvestInfo(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load harvest information');
        } finally {
            setLoading(false);
        }
    }, [treeCode]);

    const submitDecision = useCallback(async (decision: HarvestDecision, notes?: string) => {
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/harvest/${treeCode}/decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ decision, notes }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit decision');
            }

            const result = await response.json();

            if (result.success) {
                // Refresh harvest info
                await fetchHarvestInfo();
                return true;
            } else {
                throw new Error(result.error || 'Submission failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit decision');
            return false;
        } finally {
            setSubmitting(false);
        }
    }, [treeCode, fetchHarvestInfo]);

    useEffect(() => {
        fetchHarvestInfo();
    }, [fetchHarvestInfo]);

    return {
        harvestInfo,
        loading,
        submitting,
        error,
        selectedOption,
        setSelectedOption,
        submitDecision,
        refresh: fetchHarvestInfo,
    };
};
