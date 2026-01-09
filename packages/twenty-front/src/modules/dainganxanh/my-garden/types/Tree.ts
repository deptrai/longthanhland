import type { ObjectRecord } from '@/object-record/types/ObjectRecord';

/**
 * Tree type for Đại Ngàn Xanh
 * Maps to the Tree custom object in Twenty CRM
 */
export interface Tree extends ObjectRecord {
    treeCode: string;
    status: 'SEEDLING' | 'GROWING' | 'MATURE' | 'HARVESTED';
    co2Absorbed: number;
    plantingDate: string;
    latitude: number;
    longitude: number;
    lastPhotoUrl?: string;
    nextMilestoneDate?: string;
    createdAt: string;
    updatedAt: string;
    // Relations
    owner?: {
        id: string;
        name: {
            firstName: string;
            lastName: string;
        };
    };
    treeLot?: {
        id: string;
        name: string;
    };
}
