import { useCallback, useMemo } from 'react';
import { useRecoilState } from 'recoil';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

import type { TreeCardData, TreeStatus } from '../components/TreeCard';
import type { Tree } from '../types/Tree';
import { myGardenFilterState, myGardenSortState } from '../states/myGardenState';

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
    totalCount: number;
    filter: TreeStatus | 'ALL';
    setFilter: (filter: TreeStatus | 'ALL') => void;
    sortField: string;
    sortDirection: 'asc' | 'desc';
    setSort: (field: string, direction: 'asc' | 'desc') => void;
}

// Map Twenty sort direction to GraphQL format
const mapSortDirection = (direction: 'asc' | 'desc') =>
    direction === 'asc' ? 'AscNullsLast' : 'DescNullsFirst';

// Map Tree record to TreeCardData
const mapTreeToCardData = (tree: Tree): TreeCardData => ({
    id: tree.id,
    treeCode: tree.treeCode || `TREE-${tree.id.slice(0, 6)}`,
    status: (tree.status as TreeStatus) || 'SEEDLING',
    co2Absorbed: tree.co2Absorbed || 0,
    plantingDate: tree.plantingDate || tree.createdAt,
    photoUrl: tree.lastPhotoUrl,
    nextMilestoneDate: tree.nextMilestoneDate,
});

export const useUserTrees = (options: UseUserTreesOptions = {}): UseUserTreesResult => {
    const { pageSize = 50 } = options;

    const [filter, setFilter] = useRecoilState(myGardenFilterState);
    const [sort, setSort] = useRecoilState(myGardenSortState);

    // Build filter object for GraphQL
    const graphqlFilter = useMemo(() => {
        if (filter === 'ALL') {
            return undefined;
        }
        return {
            status: { eq: filter },
        };
    }, [filter]);

    // Build orderBy for GraphQL
    const orderBy = useMemo(() => {
        const fieldMap: Record<string, string> = {
            plantingDate: 'plantingDate',
            treeCode: 'treeCode',
            status: 'status',
        };
        const field = fieldMap[sort.field] || 'createdAt';
        return [{ [field]: mapSortDirection(sort.direction) }];
    }, [sort.field, sort.direction]);

    // Use Twenty's useFindManyRecords hook
    const {
        records,
        loading,
        error,
        totalCount,
        fetchMoreRecords,
    } = useFindManyRecords<Tree>({
        objectNameSingular: 'tree',
        filter: graphqlFilter,
        orderBy: orderBy as any,
        limit: pageSize,
    });

    // Map Tree records to TreeCardData
    const trees = useMemo(() =>
        (records || []).map(mapTreeToCardData),
        [records]
    );

    const loadMore = useCallback(() => {
        if (fetchMoreRecords) {
            fetchMoreRecords();
        }
    }, [fetchMoreRecords]);

    const refresh = useCallback(() => {
        // The hook auto-refetches when filter/sort changes
        // For manual refresh, we could invalidate Apollo cache
        console.log('[useUserTrees] Refresh requested');
    }, []);

    const handleSetSort = useCallback((field: string, direction: 'asc' | 'desc') => {
        setSort({ field: field as any, direction });
    }, [setSort]);

    return {
        trees,
        isLoading: loading,
        error: error || null,
        hasNextPage: (records?.length || 0) < (totalCount || 0),
        loadMore,
        refresh,
        totalCount: totalCount || 0,
        filter,
        setFilter,
        sortField: sort.field,
        sortDirection: sort.direction,
        setSort: handleSetSort,
    };
};
