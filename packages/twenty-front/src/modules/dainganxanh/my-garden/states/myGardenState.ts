import { atom } from 'recoil';

import { TreeStatus } from '../components/TreeCard';

export type SortOption = 'plantingDate' | 'status' | 'treeCode';
export type SortDirection = 'asc' | 'desc';

export const myGardenFilterState = atom<TreeStatus | 'ALL'>({
    key: 'myGardenFilterState',
    default: 'ALL',
});

export const myGardenSortState = atom<{ field: SortOption; direction: SortDirection }>({
    key: 'myGardenSortState',
    default: { field: 'plantingDate', direction: 'desc' },
});

export const myGardenPageCursorState = atom<string | null>({
    key: 'myGardenPageCursorState',
    default: null,
});
