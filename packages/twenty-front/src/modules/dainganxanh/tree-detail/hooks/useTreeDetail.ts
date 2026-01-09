import { useMemo } from 'react';

import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';

import type { Tree } from '@/dainganxanh/my-garden/types/Tree';
import type { TimelineEvent } from '../components/TreeTimelineSection';
import { calculateTotalCO2Absorbed } from '../utils/carbonCalculator';

interface UseTreeDetailOptions {
    treeCode: string;
}

interface TreeDetailData extends Tree {
    calculatedCO2: number;
    timelineEvents: TimelineEvent[];
}

interface UseTreeDetailResult {
    tree: TreeDetailData | null;
    isLoading: boolean;
    error: Error | null;
    notFound: boolean;
}

export const useTreeDetail = ({ treeCode }: UseTreeDetailOptions): UseTreeDetailResult => {
    // Use Twenty's findOneRecord to fetch tree by code
    const {
        record: tree,
        loading,
        error,
    } = useFindOneRecord<Tree>({
        objectNameSingular: 'tree',
        objectRecordId: treeCode, // This should be the ID, but we're using code
        // TODO: Need to implement filter by treeCode instead of ID
    });

    // Calculate derived data
    const treeDetailData = useMemo(() => {
        if (!tree) return null;

        const calculatedCO2 = tree.co2Absorbed || calculateTotalCO2Absorbed(tree.plantingDate);

        // Generate timeline events from tree data
        const timelineEvents: TimelineEvent[] = [];

        // Add planting event
        if (tree.plantingDate) {
            timelineEvents.push({
                date: tree.plantingDate,
                title: 'Cây được trồng',
                description: `Cây ${tree.treeCode} đã được trồng tại lô trồng`,
                type: 'milestone',
            });
        }

        // Add status changes (mock for now)
        if (tree.status === 'GROWING' || tree.status === 'MATURE' || tree.status === 'HARVESTED') {
            const growingDate = new Date(tree.plantingDate);
            growingDate.setMonth(growingDate.getMonth() + 3);
            timelineEvents.push({
                date: growingDate.toISOString(),
                title: 'Chuyển sang giai đoạn phát triển',
                description: 'Cây đã vượt qua giai đoạn non yếu',
                type: 'status',
            });
        }

        // Sort by date descending (newest first)
        timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            ...tree,
            calculatedCO2,
            timelineEvents,
        };
    }, [tree]);

    return {
        tree: treeDetailData,
        isLoading: loading,
        error: error || null,
        notFound: !loading && !tree && !error,
    };
};
