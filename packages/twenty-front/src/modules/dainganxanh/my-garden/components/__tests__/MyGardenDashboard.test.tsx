import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

// Must mock before importing to avoid decorator issues
jest.mock('@/object-record/hooks/useFindManyRecords', () => ({
    useFindManyRecords: jest.fn(() => ({
        records: [],
        loading: false,
        error: null,
        totalCount: 0,
        fetchMoreRecords: jest.fn(),
    })),
}));

import { MyGardenDashboard } from '../MyGardenDashboard';
import * as useUserTreesModule from '../../hooks/useUserTrees';

// Mock useUserTrees hook
jest.mock('../../hooks/useUserTrees');

// Mock ReferralWidget
jest.mock('../../../referral/components/ReferralWidget', () => ({
    ReferralWidget: () => <div data-testid="referral-widget">Referral Widget</div>,
}));

const mockTheme = {
    background: {
        primary: '#fff',
        secondary: '#f5f5f5',
        tertiary: '#e0e0e0',
    },
    border: {
        color: { light: '#e0e0e0' },
        radius: { sm: '4px', md: '8px' },
    },
    font: {
        size: { xs: '12px', sm: '14px', md: '16px' },
        color: { primary: '#333', secondary: '#666' },
    },
    color: {
        red: '#f44336',
    },
    boxShadow: {
        light: '0 2px 4px rgba(0,0,0,0.1)',
    },
};

const mockTrees = [
    {
        id: 'tree-1',
        treeCode: 'DGX-2026-001',
        status: 'GROWING' as const,
        co2Absorbed: 15.5,
        plantingDate: '2025-06-15',
        nextMilestoneDate: '2026-03-15',
    },
    {
        id: 'tree-2',
        treeCode: 'DGX-2026-002',
        status: 'SEEDLING' as const,
        co2Absorbed: 5.0,
        plantingDate: '2026-01-01',
    },
];

const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <RecoilRoot>
            <MemoryRouter>
                <ThemeProvider theme={mockTheme as any}>{component}</ThemeProvider>
            </MemoryRouter>
        </RecoilRoot>
    );
};

describe('MyGardenDashboard', () => {
    const mockSetFilter = jest.fn();
    const mockSetSort = jest.fn();
    const mockRefresh = jest.fn();
    const mockLoadMore = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useUserTreesModule.useUserTrees as jest.Mock).mockReturnValue({
            trees: mockTrees,
            isLoading: false,
            error: null,
            hasNextPage: false,
            loadMore: mockLoadMore,
            refresh: mockRefresh,
            totalCount: 2,
            filter: 'ALL',
            setFilter: mockSetFilter,
            sortField: 'plantingDate',
            sortDirection: 'desc',
            setSort: mockSetSort,
        });
    });

    it('should render dashboard with title', () => {
        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByText('🌿 Vườn Của Tôi')).toBeInTheDocument();
    });

    it('should display summary bar with correct stats', () => {
        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByText('2')).toBeInTheDocument(); // Total trees
        expect(screen.getByText('Tổng số cây')).toBeInTheDocument();
        expect(screen.getByText('20.5')).toBeInTheDocument(); // Total CO2
        expect(screen.getByText('kg CO₂/năm')).toBeInTheDocument();
    });

    it('should render filter tabs', () => {
        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByText('Tất cả')).toBeInTheDocument();
        expect(screen.getByText('🌱 Cây con')).toBeInTheDocument();
        expect(screen.getByText('🌿 Đang lớn')).toBeInTheDocument();
        expect(screen.getByText('🌳 Trưởng thành')).toBeInTheDocument();
        expect(screen.getByText('🍃 Thu hoạch')).toBeInTheDocument();
    });

    it('should call setFilter when filter tab clicked', () => {
        renderWithProviders(<MyGardenDashboard />);
        fireEvent.click(screen.getByText('🌱 Cây con'));
        expect(mockSetFilter).toHaveBeenCalledWith('SEEDLING');
    });

    it('should render sort dropdown', () => {
        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByDisplayValue('Mới nhất')).toBeInTheDocument();
    });

    it('should call setSort when sort changed', () => {
        renderWithProviders(<MyGardenDashboard />);
        const sortSelect = screen.getByDisplayValue('Mới nhất');
        fireEvent.change(sortSelect, { target: { value: 'plantingDate-asc' } });
        expect(mockSetSort).toHaveBeenCalledWith('plantingDate', 'asc');
    });

    it('should render tree cards', () => {
        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByText('DGX-2026-001')).toBeInTheDocument();
        expect(screen.getByText('DGX-2026-002')).toBeInTheDocument();
    });

    it('should render loading skeletons when loading', () => {
        (useUserTreesModule.useUserTrees as jest.Mock).mockReturnValue({
            trees: [],
            isLoading: true,
            error: null,
            hasNextPage: false,
            loadMore: mockLoadMore,
            refresh: mockRefresh,
            totalCount: 0,
            filter: 'ALL',
            setFilter: mockSetFilter,
            sortField: 'plantingDate',
            sortDirection: 'desc',
            setSort: mockSetSort,
        });

        renderWithProviders(<MyGardenDashboard />);
        // Should render 8 skeleton cards
        const skeletons = document.querySelectorAll('[data-testid^="tree-card-skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render empty state when no trees', () => {
        (useUserTreesModule.useUserTrees as jest.Mock).mockReturnValue({
            trees: [],
            isLoading: false,
            error: null,
            hasNextPage: false,
            loadMore: mockLoadMore,
            refresh: mockRefresh,
            totalCount: 0,
            filter: 'ALL',
            setFilter: mockSetFilter,
            sortField: 'plantingDate',
            sortDirection: 'desc',
            setSort: mockSetSort,
        });

        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByTestId('empty-garden-state')).toBeInTheDocument();
    });

    it('should render error state with retry button', () => {
        const mockError = new Error('Fetch failed');
        (useUserTreesModule.useUserTrees as jest.Mock).mockReturnValue({
            trees: [],
            isLoading: false,
            error: mockError,
            hasNextPage: false,
            loadMore: mockLoadMore,
            refresh: mockRefresh,
            totalCount: 0,
            filter: 'ALL',
            setFilter: mockSetFilter,
            sortField: 'plantingDate',
            sortDirection: 'desc',
            setSort: mockSetSort,
        });

        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByText(/Đã xảy ra lỗi/)).toBeInTheDocument();
        expect(screen.getByText('Thử lại')).toBeInTheDocument();
    });

    it('should call refresh when retry clicked', () => {
        const mockError = new Error('Fetch failed');
        (useUserTreesModule.useUserTrees as jest.Mock).mockReturnValue({
            trees: [],
            isLoading: false,
            error: mockError,
            hasNextPage: false,
            loadMore: mockLoadMore,
            refresh: mockRefresh,
            totalCount: 0,
            filter: 'ALL',
            setFilter: mockSetFilter,
            sortField: 'plantingDate',
            sortDirection: 'desc',
            setSort: mockSetSort,
        });

        renderWithProviders(<MyGardenDashboard />);
        fireEvent.click(screen.getByText('Thử lại'));
        expect(mockRefresh).toHaveBeenCalled();
    });

    it('should render referral widget', () => {
        renderWithProviders(<MyGardenDashboard />);
        expect(screen.getByTestId('referral-widget')).toBeInTheDocument();
    });
});
