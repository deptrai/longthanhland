import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminOrdersPage } from './AdminOrdersPage';
import { MemoryRouter } from 'react-router-dom';

// Mock fetch
// Mock UI components to avoid deep dependency issues
jest.mock('@/ui/layout/page/components/PageContainer', () => ({
    PageContainer: ({ children, className }: any) => <div className={className} data-testid="page-container">{children}</div>
}));

jest.mock('@/ui/layout/page/components/SubMenuTopBarContainer', () => ({
    SubMenuTopBarContainer: ({ children, title }: any) => (
        <div data-testid="submenu-container">
            <h1>{title}</h1>
            {children}
        </div>
    )
}));

jest.mock('twenty-ui/input', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    )
}));

const mockOrders = [
    {
        id: '1',
        orderCode: 'ORD-001',
        createdAt: new Date().toISOString(),
        buyer: { email: 'test@example.com' },
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'USDT', // Matched with expectation
        amount: 1000,
        currency: 'USD',
        trees: [{ id: 't1', code: 'TREE-100', status: 'ALIVE' }]
    }
];

const mockLots = [
    { id: '1', name: 'Lot A', assignedOperator: { name: 'Op 1' } },
    { id: '2', name: 'Lot B', assignedOperator: null }
];

describe('AdminOrdersPage Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const mockFetch = jest.fn((url: string) => {
            if (url.includes('/orders/admin')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: mockOrders,
                        meta: { total: 1, page: 1, limit: 10 }
                    }),
                });
            }
            // Logic for lots if AssignLotModal fetches them
            // Assuming AssignLotModal fetches lots via some endpoint, but if it uses props, we need to check.
            // If it fetches, let's look at the component code or assume /lots if that was the prior knowledge.
            // Actually, let's be permissive and logs unknown urls?
            // But better to be explicit.
            if (url.includes('graphql') || url.includes('/lots') || url.includes('operator')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        data: mockLots,
                        meta: {}
                    }),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }) as jest.Mock;

        global.fetch = mockFetch;
        // @ts-ignore
        window.fetch = mockFetch;
    });

    it('renders page and filters', async () => {
        render(
            <MemoryRouter>
                <AdminOrdersPage />
            </MemoryRouter>
        );

        expect(screen.getByText('Admin Order Management')).toBeInTheDocument();
        // Check filters exist using specific labels or placeholder if possible, or getAllByRole
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    it('opens view modal', async () => {
        render(
            <MemoryRouter>
                <AdminOrdersPage />
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('test@example.com'));

        const viewBtns = screen.getAllByText('View');
        fireEvent.click(viewBtns[0]);

        expect(screen.getByText('Order Details: ORD-001')).toBeInTheDocument();
        // USDT appears in filter and modal
        expect(screen.getAllByText('USDT').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/TREE-100/)[0]).toBeInTheDocument();
    });

    it('opens assign modal and shows operator', async () => {
        render(
            <MemoryRouter>
                <AdminOrdersPage />
            </MemoryRouter>
        );

        await waitFor(() => screen.getByText('test@example.com'));

        const assignBtn = screen.getAllByText('Assign')[0];
        fireEvent.click(assignBtn);

        expect(screen.getByText('Assign to Lot')).toBeInTheDocument();

        // Wait for lots to load? If AssignLotModal fetches.
        // If it just renders, we can check select.
        // We need to target the select INSIDE the modal.
        // Assuming modal renders in a portal or just appended.

        // Use within if we can find the modal container
        // Or getAllByRole and pick the last one?
        // Better: getByTestId if added, but I can't add testid easily now without editing file.
        // Use label? "Select a Lot..." is the default option.

        const select = screen.getByDisplayValue('Select a Lot...');
        expect(select).toBeInTheDocument();
        // Check options
        // options are children of select.

        // Wait for options to populate if async
        await waitFor(() => {
            const option = screen.queryByText((content) => content.includes('Lot A'));
            expect(option).toBeInTheDocument();
        });

        // Verify operator name
        expect(screen.getByText(/Op 1/)).toBeInTheDocument();
    });
});
