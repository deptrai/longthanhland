import { useCallback, useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

import type { TreeCardData, TreeStatus } from '../components/TreeCard';
import { myGardenFilterState, myGardenSortState, myGardenPageCursorState } from '../states/myGardenState';

interface UseUserTreesOptions {
    pageSize?: number;
}

interface UseUserTreesResult {
    trees: TreeCardData[];
    isLoading: boolean;
    error: Error | null;
    hasNextPage: boolean;
    loadMore: () => void;
    refresh: () => void;
    filter: TreeStatus | 'ALL';
    setFilter: (filter: TreeStatus | 'ALL') => void;
    sortField: string;
    sortDirection: 'asc' | 'desc';
    setSort: (field: string, direction: 'asc' | 'desc') => void;
}

// [MOCK] In production, this would use Twenty's GraphQL API
const mockTrees: TreeCardData[] = [
    {
        id: '1',
        treeCode: 'DGX-2026-001',
        status: 'SEEDLING',
        co2Absorbed: 2.5,
        plantingDate: '2026-01-01',
        nextMilestoneDate: '2026-02-01',
    },
    {
        id: '2',
        treeCode: 'DGX-2026-002',
        status: 'GROWING',
        co2Absorbed: 12.3,
        plantingDate: '2025-06-15',
        nextMilestoneDate: '2026-03-15',
    },
    {
        id: '3',
        treeCode: 'DGX-2026-003',
        status: 'MATURE',
        co2Absorbed: 45.8,
        plantingDate: '2024-01-01',
    },
];

export const useUserTrees = (options: UseUserTreesOptions = {}): UseUserTreesResult => {
    const { pageSize = 20 } = options;

    const [trees, setTrees] = useState<TreeCardData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [hasNextPage, setHasNextPage] = useState(false);

    const [filter, setFilter] = useRecoilState(myGardenFilterState);
    const [sort, setSort] = useRecoilState(myGardenSortState);
    const [cursor, setCursor] = useRecoilState(myGardenPageCursorState);

    const fetchTrees = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // [MOCK] Simulate API call - replace with Twenty GraphQL query
            await new Promise(resolve => setTimeout(resolve, 500));

            let filteredTrees = [...mockTrees];

            // Apply filter
            if (filter !== 'ALL') {
                filteredTrees = filteredTrees.filter(tree => tree.status === filter);
            }

            // Apply sort
            filteredTrees.sort((a, b) => {
                const aValue = a[sort.field as keyof TreeCardData];
                const bValue = b[sort.field as keyof TreeCardData];

                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sort.direction === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
            });

            setTrees(filteredTrees);
            setHasNextPage(filteredTrees.length >= pageSize);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch trees'));
        } finally {
            setIsLoading(false);
        }
    }, [filter, sort.field, sort.direction, pageSize]);

    useEffect(() => {
        fetchTrees();
    }, [fetchTrees]);

    const loadMore = useCallback(() => {
        // [TODO] Implement cursor-based pagination
        console.log('Load more trees...');
    }, []);

    const refresh = useCallback(() => {
        setCursor(null);
        fetchTrees();
    }, [fetchTrees, setCursor]);

    const handleSetSort = useCallback((field: string, direction: 'asc' | 'desc') => {
        setSort({ field: field as any, direction });
    }, [setSort]);

    return {
        trees,
        isLoading,
        error,
        hasNextPage,
        loadMore,
        refresh,
        filter,
        setFilter,
        sortField: sort.field,
        sortDirection: sort.direction,
        setSort: handleSetSort,
    };
};
