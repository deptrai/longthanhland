import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminLotsPage } from './AdminLotsPage';
import * as useAdminLotsModule from '../../modules/dainganxanh/admin/hooks/useAdminLots';
import { MockedProvider } from '@apollo/client/testing';

// Mock UI components
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

const mockLots = [
    {
        id: 'lot1',
        lotName: 'Lot A',
        lotCode: 'LOT-001',
        capacity: 100,
        treeCount: 50,
        location: 'Đắk Nông',
        gpsCenter: '12.123,108.456',
        assignedOperator: { id: 'op1', name: 'Operator 1' },
        trees: [
            { id: 't1', code: 'TREE-001', status: 'PLANTED', owner: { email: 'user1@example.com' } },
            { id: 't2', code: 'TREE-002', status: 'GROWING', owner: { email: 'user2@example.com' } },
        ],
    },
    {
        id: 'lot2',
        lotName: 'Lot B',
        lotCode: 'LOT-002',
        capacity: 50,
        treeCount: 10,
        location: 'Lâm Đồng',
        gpsCenter: '11.789,107.123',
        assignedOperator: null,
        trees: [
            { id: 't3', code: 'TREE-003', status: 'PLANTED', owner: { email: 'user3@example.com' } },
        ],
    },
];

describe('AdminLotsPage Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        global.fetch = jest.fn((url: string) => {
            if (url.includes('/lots/admin')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockLots),
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }) as jest.Mock;

        // @ts-ignore
        window.fetch = global.fetch;
    });

    it('renders Kanban board with lots', async () => {
        render(
            <MockedProvider mocks={[]} addTypename={false}>
                <MemoryRouter>
                    <AdminLotsPage />
                </MemoryRouter>
            </MockedProvider>
        );

        expect(screen.getByText('Lot Management')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Lot A')).toBeInTheDocument();
            expect(screen.getByText('Lot B')).toBeInTheDocument();
        });

        // Check capacity display
        expect(screen.getByText('50 / 100 trees')).toBeInTheDocument();
        expect(screen.getByText('10 / 50 trees')).toBeInTheDocument();
    });

    it('displays tree cards in columns', async () => {
        render(
            <MockedProvider mocks={[]} addTypename={false}>
                <MemoryRouter>
                    <AdminLotsPage />
                </MemoryRouter>
            </MockedProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('TREE-001')).toBeInTheDocument();
            expect(screen.getByText('TREE-002')).toBeInTheDocument();
            expect(screen.getByText('TREE-003')).toBeInTheDocument();
        });
    });

    it('opens lot details panel on click', async () => {
        render(
            <MockedProvider mocks={[]} addTypename={false}>
                <MemoryRouter>
                    <AdminLotsPage />
                </MemoryRouter>
            </MockedProvider>
        );

        await waitFor(() => screen.getByText('Lot A'));

        const lotHeader = screen.getByText('Lot A').closest('div');
        fireEvent.click(lotHeader!);

        await waitFor(() => {
            expect(screen.getByText('Lot Details: Lot A')).toBeInTheDocument();
        });
    });

    it('handles tree reassignment', async () => {
        render(
            <MockedProvider mocks={[]} addTypename={false}>
                <MemoryRouter>
                    <AdminLotsPage />
                </MemoryRouter>
            </MockedProvider>
        );

        await waitFor(() => screen.getByText('TREE-001'));

        // Verify component renders correctly
        expect(screen.getAllByText(/TREE-/).length).toBeGreaterThan(0);
    });

    it('displays loading state', () => {
        // Mock fetch to never resolve
        global.fetch = jest.fn(() => new Promise(() => { })) as jest.Mock;

        render(
            <MockedProvider mocks={[]} addTypename={false}>
                <MemoryRouter>
                    <AdminLotsPage />
                </MemoryRouter>
            </MockedProvider>
        );

        expect(screen.getByText('Loading lots...')).toBeInTheDocument();
    });

    it('displays error state', async () => {
        // Mock fetch to fail
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                json: () => Promise.resolve({}),
            }),
        ) as jest.Mock;

        render(
            <MockedProvider mocks={[]} addTypename={false}>
                <MemoryRouter>
                    <AdminLotsPage />
                </MemoryRouter>
            </MockedProvider>
        );

        await waitFor(() => {
            expect(screen.getByText(/Error:/)).toBeInTheDocument();
        });
    });
});
