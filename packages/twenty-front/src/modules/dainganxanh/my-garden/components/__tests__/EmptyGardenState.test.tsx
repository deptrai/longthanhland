import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@emotion/react';

import { EmptyGardenState } from '../EmptyGardenState';

const mockTheme = {
    font: {
        size: { md: '16px', lg: '20px' },
        color: { primary: '#333', secondary: '#666' },
    },
    border: {
        radius: { sm: '4px' },
    },
};

const renderWithTheme = (component: React.ReactElement) => {
    return render(
        <ThemeProvider theme={mockTheme}>{component}</ThemeProvider>
    );
};

describe('EmptyGardenState', () => {
    it('should render empty state message', () => {
        renderWithTheme(<EmptyGardenState />);
        expect(screen.getByText('Vườn của bạn đang trống')).toBeInTheDocument();
    });

    it('should render seedling emoji', () => {
        renderWithTheme(<EmptyGardenState />);
        expect(screen.getByText('🌱')).toBeInTheDocument();
    });

    it('should render CTA button when onBuyTree provided', () => {
        const handleBuy = jest.fn();
        renderWithTheme(<EmptyGardenState onBuyTree={handleBuy} />);
        expect(screen.getByText('🛒 Mua Cây Ngay')).toBeInTheDocument();
    });

    it('should not render CTA button when onBuyTree not provided', () => {
        renderWithTheme(<EmptyGardenState />);
        expect(screen.queryByText('🛒 Mua Cây Ngay')).not.toBeInTheDocument();
    });

    it('should call onBuyTree when CTA clicked', async () => {
        const handleBuy = jest.fn();
        renderWithTheme(<EmptyGardenState onBuyTree={handleBuy} />);

        await userEvent.click(screen.getByText('🛒 Mua Cây Ngay'));
        expect(handleBuy).toHaveBeenCalledTimes(1);
    });
});
