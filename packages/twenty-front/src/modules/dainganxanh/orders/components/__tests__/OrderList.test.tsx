import React from 'react';
import { render, screen } from '@testing-library/react';
import { OrderList } from '../OrderList';
import { ThemeProvider } from '@emotion/react';

// Mock OrderCard to avoid complex imports
// Mock OrderCard to avoid complex imports
jest.mock('../OrderCard', () => ({
    OrderCard: ({ order }: { order: any }) => <div data-testid="order-card">{order.orderCode}</div>
}));

// Mock Theme
const mockTheme = {
    font: { color: { primary: '#000', secondary: '#333', tertiary: '#666' } },
    background: { color: { secondary: '#eee' } },
    border: { color: { medium: '#ccc' } },
    boxShadow: { light: '0 1px 2px rgba(0,0,0,0.1)' },
    color: {
        green10: '#e6fffa', green100: '#006644',
        yellow10: '#fffbea', yellow100: '#996600',
        red10: '#fff5f5', red100: '#cc0000',
        gray10: '#f7fafc', gray100: '#4a5568',
    }
};

const renderWithTheme = (component: React.ReactNode) => {
    return render(
        <ThemeProvider theme={mockTheme as any}>
            {component}
        </ThemeProvider>
    );
};

describe('OrderList', () => {
    it('should render loading state', () => {
        renderWithTheme(<OrderList orders={[]} loading={true} />);
        expect(screen.getByText('Đang tải danh sách đơn hàng...')).toBeInTheDocument();
    });

    it('should render empty state', () => {
        renderWithTheme(<OrderList orders={[]} loading={false} />);
        expect(screen.getByText('Bạn chưa có đơn hàng nào')).toBeInTheDocument();
    });

    it('should render orders', () => {
        const orders = [
            { id: '1', orderCode: 'ORD-001', totalAmount: 500000, status: 'COMPLETED', createdAt: '2024-01-01' },
            { id: '2', orderCode: 'ORD-002', totalAmount: 1200000, status: 'PENDING', createdAt: '2024-02-01' }
        ];
        renderWithTheme(<OrderList orders={orders} loading={false} />);

        expect(screen.getByText('ORD-001')).toBeInTheDocument();
        expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });
});
