import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';

import { TreeCard, TreeCardData } from '../TreeCard';

// Simple mock theme for testing
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
    boxShadow: {
        light: '0 2px 4px rgba(0,0,0,0.1)',
    },
};

const mockTree: TreeCardData = {
    id: 'test-1',
    treeCode: 'DGX-2026-001',
    status: 'GROWING',
    co2Absorbed: 15.5,
    plantingDate: '2025-06-15',
    nextMilestoneDate: '2026-03-15',
};

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={mockTheme as any}>{component}</ThemeProvider>
    );
};

describe('TreeCard', () => {
    it('should render tree code', () => {
        renderWithTheme(<TreeCard tree={mockTree} />);
        expect(screen.getByText('DGX-2026-001')).toBeInTheDocument();
    });

    it('should render status badge', () => {
        renderWithTheme(<TreeCard tree={mockTree} />);
        expect(screen.getByText('GROWING')).toBeInTheDocument();
    });

    it('should render CO2 absorbed', () => {
        renderWithTheme(<TreeCard tree={mockTree} />);
        expect(screen.getByText(/15\.5 kg CO₂/)).toBeInTheDocument();
    });

    it('should render planting date in Vietnamese format', () => {
        renderWithTheme(<TreeCard tree={mockTree} />);
        expect(screen.getByText(/15\/06\/2025/)).toBeInTheDocument();
    });

    it('should render tree emoji when no photo', () => {
        renderWithTheme(<TreeCard tree={mockTree} />);
        expect(screen.getByText('🌳')).toBeInTheDocument();
    });

    it('should call onClick when clicked', async () => {
        const handleClick = jest.fn();
        renderWithTheme(<TreeCard tree={mockTree} onClick={handleClick} />);

        await userEvent.click(screen.getByTestId('tree-card-test-1'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render milestone countdown when available', () => {
        renderWithTheme(<TreeCard tree={mockTree} />);
        expect(screen.getByText(/ngày đến milestone/)).toBeInTheDocument();
    });

    it('should not render milestone when not available', () => {
        const treeWithoutMilestone = { ...mockTree, nextMilestoneDate: undefined };
        renderWithTheme(<TreeCard tree={treeWithoutMilestone} />);
        expect(screen.queryByText(/ngày đến milestone/)).not.toBeInTheDocument();
    });
});
