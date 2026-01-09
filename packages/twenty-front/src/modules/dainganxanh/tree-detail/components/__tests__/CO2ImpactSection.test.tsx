import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';

import { CO2ImpactSection } from '../CO2ImpactSection';

const mockTheme = {
    background: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
        tertiary: '#EEEEEE',
    },
    font: {
        color: {
            primary: '#333333',
            secondary: '#666666',
            tertiary: '#999999',
        },
    },
    border: {
        radius: {
            sm: '4px',
            md: '8px',
        },
        color: {
            light: '#E0E0E0',
        },
    },
};

describe('CO2ImpactSection', () => {
    const renderComponent = (props = {}) => {
        const defaultProps = {
            plantingDate: '2024-01-01',
        };

        return render(
            <ThemeProvider theme={mockTheme}>
                <CO2ImpactSection {...defaultProps} {...props} />
            </ThemeProvider>
        );
    };

    it('should render section with title', () => {
        renderComponent();

        expect(screen.getByTestId('co2-impact-section')).toBeInTheDocument();
        expect(screen.getByText('🌍 Tác động CO₂')).toBeInTheDocument();
    });

    it('should display CO2 stats', () => {
        renderComponent();

        expect(screen.getByText('Tổng CO₂ đã hấp thụ')).toBeInTheDocument();
        expect(screen.getByText('CO₂/năm (tốc độ hiện tại)')).toBeInTheDocument();
    });

    it('should display equivalents section', () => {
        renderComponent();

        expect(screen.getByText('Tương đương với:')).toBeInTheDocument();
        expect(screen.getByText('Km lái xe ô tô')).toBeInTheDocument();
        expect(screen.getByText('Giờ sử dụng máy tính')).toBeInTheDocument();
        expect(screen.getByText('Chai nhựa tái chế')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
        renderComponent();

        expect(screen.getByText('Cây non')).toBeInTheDocument();
        expect(screen.getByText('Trưởng thành')).toBeInTheDocument();
    });

    it('should use provided co2Absorbed value', () => {
        renderComponent({ co2Absorbed: 25 });

        expect(screen.getByText('25.0 kg')).toBeInTheDocument();
    });
});
