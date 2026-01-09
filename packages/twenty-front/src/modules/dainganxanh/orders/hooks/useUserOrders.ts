import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { currentUserState } from '@/auth/states/currentUserState';

export interface Order {
    id: string;
    orderCode: string;
    status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
    paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
    totalAmount: number;
    quantity: number;
    contractPdfUrl?: string;
    createdAt: string;
    trees?: Array<{ code: string; lotName?: string }>;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const useUserOrders = (page = 1, status = 'ALL') => {
    const currentUser = useRecoilValue(currentUserState);
    const [orders, setOrders] = useState<Order[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!currentUser) return;
            setLoading(true);

            try {
                const query = new URLSearchParams({
                    page: page.toString(),
                    limit: '20',
                    status
                });

                const response = await fetch(`/orders/my-history?${query.toString()}`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch orders');
                }

                const json = await response.json();
                setOrders(json.data);
                setMeta(json.meta);
            } catch (err: any) {
                console.error('Error fetching orders:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [currentUser, page, status]);

    return {
        orders,
        meta,
        loading,
        error
    };
};
