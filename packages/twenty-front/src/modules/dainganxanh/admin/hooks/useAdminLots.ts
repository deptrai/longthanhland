import { useState, useEffect } from 'react';
import { TreeLot } from '../types/lot-management.types';

export const useAdminLots = () => {
    const [lots, setLots] = useState<TreeLot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLots = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/lots/admin', {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch lots');
            }

            const data = await response.json();
            setLots(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLots();
    }, []);

    const reassignTree = async (treeId: string, newLotId: string) => {
        try {
            const response = await fetch(`/lots/trees/${treeId}/reassign`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newLotId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to reassign tree');
            }

            // Optimistic update: refetch lots
            await fetchLots();
            return await response.json();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    const assignOperator = async (lotId: string, operatorId: string) => {
        try {
            const response = await fetch(`/lots/${lotId}/assign-operator`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ operatorId }),
            });

            if (!response.ok) {
                throw new Error('Failed to assign operator');
            }

            await fetchLots();
            return await response.json();
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    return {
        lots,
        loading,
        error,
        refetch: fetchLots,
        reassignTree,
        assignOperator,
    };
};
