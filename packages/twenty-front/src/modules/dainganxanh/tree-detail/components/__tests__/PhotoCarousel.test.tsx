import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';

import { PhotoCarousel } from '../PhotoCarousel';

const mockTheme = {
    background: {
        tertiary: '#EEEEEE',
    },
    font: {
        color: {
            tertiary: '#999999',
        },
    },
    border: {
        radius: {
            sm: '4px',
            md: '8px',
        },
    },
};

describe('PhotoCarousel', () => {
    const mockPhotos = [
        { id: '1', url: 'https://example.com/photo1.jpg', caption: 'First photo', date: '2024-06-01' },
        { id: '2', url: 'https://example.com/photo2.jpg', caption: 'Second photo', date: '2024-07-01' },
        { id: '3', url: 'https://example.com/photo3.jpg' },
    ];

    const renderComponent = (props = {}) => {
        const defaultProps = {
            photos: mockPhotos,
        };

        return render(
            <ThemeProvider theme={mockTheme as any}>
                <PhotoCarousel {...defaultProps} {...props} />
            </ThemeProvider>
        );
    };

    it('should render carousel with photos', () => {
        renderComponent();

        expect(screen.getByTestId('photo-carousel')).toBeInTheDocument();
        expect(screen.getByAltText('First photo')).toBeInTheDocument();
    });

    it('should show counter when multiple photos', () => {
        renderComponent();

        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should navigate to next photo', () => {
        renderComponent();

        const nextButton = screen.getByText('›');
        fireEvent.click(nextButton);

        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should navigate to previous photo', () => {
        renderComponent();

        const nextButton = screen.getByText('›');
        fireEvent.click(nextButton);

        const prevButton = screen.getByText('‹');
        fireEvent.click(prevButton);

        expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should show placeholder when no photos', () => {
        renderComponent({ photos: [] });

        expect(screen.getByText('Chưa có ảnh')).toBeInTheDocument();
    });

    it('should show thumbnails', () => {
        renderComponent();

        const thumbnails = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('img')
        );

        expect(thumbnails).toHaveLength(3);
    });

    it('should click thumbnail to change photo', () => {
        renderComponent();

        const thumbnails = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('img')
        );

        fireEvent.click(thumbnails[1]);

        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should show caption when available', () => {
        renderComponent();

        expect(screen.getByText('First photo')).toBeInTheDocument();
    });
});
