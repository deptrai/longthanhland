import { useMemo } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

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
    // Build filter to find tree by treeCode
    const filter = useMemo(() => {
        if (!treeCode) return undefined;
        return {
            treeCode: {
                eq: treeCode,
            },
        };
    }, [treeCode]);

    // Use useFindManyRecords with filter to find tree by code
    const {
        records,
        loading,
        error,
    } = useFindManyRecords<Tree>({
        objectNameSingular: 'tree',
        filter,
        limit: 1,
    });

    // Get the first (and only) record
    const tree = records?.[0] || null;

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

        // Add status changes based on tree status
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

        if (tree.status === 'MATURE' || tree.status === 'HARVESTED') {
            const matureDate = new Date(tree.plantingDate);
            matureDate.setFullYear(matureDate.getFullYear() + 3);
            timelineEvents.push({
                date: matureDate.toISOString(),
                title: 'Cây trưởng thành',
                description: 'Cây đạt giai đoạn trưởng thành, hấp thụ CO₂ tối đa',
                type: 'milestone',
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

