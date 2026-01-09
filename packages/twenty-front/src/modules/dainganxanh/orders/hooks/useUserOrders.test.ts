import { renderHook } from '@testing-library/react';
import { useUserOrders } from './useUserOrders';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import React from 'react';

jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
    useFindManyRecords: jest.fn(),
}));
jest.mock('recoil', () => ({
    useRecoilValue: jest.fn(),
    atom: jest.fn(),
}));

describe('useUserOrders', () => {
    it('should fetch orders for current user', () => {
        const { useRecoilValue } = require('recoil');
        useRecoilValue.mockReturnValue({ id: 'user-1' });

        (useFindManyRecords as jest.Mock).mockReturnValue({
            records: [{ id: '1', totalAmount: 100 }],
            loading: false,
        });

        const { result } = renderHook(() => useUserOrders());

        expect(result.current.orders).toHaveLength(1);
        expect(result.current.loading).toBe(false);
        expect(useFindManyRecords).toHaveBeenCalledWith(expect.objectContaining({
            filter: { createdBy: { eq: 'user-1' } },
        }));
    });
});
