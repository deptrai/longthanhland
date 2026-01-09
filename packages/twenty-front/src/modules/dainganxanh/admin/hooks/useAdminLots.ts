import { useState, useEffect } from 'react';

export const useAdminLots = () => {
    const [lots, setLots] = useState<any[]>([]);
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
            console.error('Error fetching lots:', err);
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
            console.error('Error reassigning tree:', err);
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
            console.error('Error assigning operator:', err);
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
