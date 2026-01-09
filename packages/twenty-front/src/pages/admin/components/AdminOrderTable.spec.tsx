import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminOrderTable } from './AdminOrderTable';
import { OrderEntity } from '@/modules/dainganxanh/orders/types/OrderEntity'; // Interface needed

// Mock order data
const mockOrders: any[] = [
    { id: '1', status: 'PENDING', amount: 1000, createdAt: new Date().toISOString(), buyer: { email: 'test@example.com' } },
    { id: '2', status: 'PAID', amount: 2000, createdAt: new Date().toISOString(), buyer: { email: 'user2@example.com' } },
];

describe('AdminOrderTable', () => {
    it('should render order list', () => {
        render(<AdminOrderTable orders={mockOrders} loading={false} selectedIds={[]} onSelect={() => { }} onVerify={() => { }} onAssign={() => { }} />);
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        render(<AdminOrderTable orders={[]} loading={true} selectedIds={[]} onSelect={() => { }} onVerify={() => { }} onAssign={() => { }} />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle selection', () => {
        const onSelect = jest.fn();
        render(<AdminOrderTable orders={mockOrders} loading={false} selectedIds={[]} onSelect={onSelect} onVerify={() => { }} onAssign={() => { }} />);

        // Find checkbox for first row
        const checkbox = screen.getAllByRole('checkbox')[1]; // 0 is likely header
        fireEvent.click(checkbox);
        expect(onSelect).toHaveBeenCalledWith('1', true);
    });
});
