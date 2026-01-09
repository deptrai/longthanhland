// Type definitions for Lot Management
export interface TreeLot {
    id: string;
    lotName: string;
    lotCode: string;
    capacity: number;
    treeCount: number;
    location?: string;
    gpsCenter?: string;
    plantedCount?: number;
    assignedOperator?: {
        id: string;
        name: string;
    };
    trees?: Tree[];
}

export interface Tree {
    id: string;
    code?: string;
    treeCode?: string;
    status: 'PLANTED' | 'GROWING' | 'MATURE' | 'HARVESTED';
    owner?: {
        email: string;
    };
    treeLotId?: string;
}

export interface WorkspaceMember {
    id: string;
    name: {
        firstName: string;
        lastName: string;
    };
}
