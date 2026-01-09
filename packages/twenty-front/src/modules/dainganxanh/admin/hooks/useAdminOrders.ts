import { useState, useEffect } from 'react';

interface UseAdminOrdersParams {
    page: number;
    status: string;
    paymentMethod: string;
    startDate?: string;
    endDate?: string;
}

export const useAdminOrders = (page: number, status: string, paymentMethod: string, startDate?: string, endDate?: string) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError(null);

            try {
                const queryParams: any = {
                    page: page.toString(),
                    limit: '20',
                };

                if (status && status !== 'ALL') queryParams.status = status;
                if (paymentMethod && paymentMethod !== 'ALL') queryParams.paymentMethod = paymentMethod;
                if (startDate) queryParams.startDate = startDate;
                if (endDate) queryParams.endDate = endDate;

                const query = new URLSearchParams(queryParams);

                // Assuming authenticated user is admin
                const response = await fetch(`/orders/admin?${query.toString()}`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch admin orders');
                }

                const json = await response.json();
                setOrders(json.data);
                setMeta(json.meta);
            } catch (err: any) {
                console.error('Error fetching admin orders:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [page, status, paymentMethod, startDate, endDate]);

    return {
        orders,
        meta,
        loading,
        error,
        setOrders // Exposed for optimistic updates
    };
};
