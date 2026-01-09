import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShareCardPreview } from './ShareCardPreview';

describe('ShareCardPreview', () => {
    const defaultProps = {
        svgUrl: '/share-card/svg?name=Test&trees=5&co2=50',
        userName: 'Test User',
        treeCount: 5,
        co2Absorbed: 50,
    };

    it('renders share card image', () => {
        render(
            <MemoryRouter>
                <ShareCardPreview {...defaultProps} />
            </MemoryRouter>
        );

        const image = screen.getByAltText('Test User share card');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', defaultProps.svgUrl);
    });

    it('displays tree count stat', () => {
        render(
            <MemoryRouter>
                <ShareCardPreview {...defaultProps} />
            </MemoryRouter>
        );

        expect(screen.getByText(/5/)).toBeInTheDocument();
        expect(screen.getByText('Cây đã trồng')).toBeInTheDocument();
    });

    it('displays CO2 absorption stat', () => {
        render(
            <MemoryRouter>
                <ShareCardPreview {...defaultProps} />
            </MemoryRouter>
        );

        expect(screen.getByText(/50.0/)).toBeInTheDocument();
        expect(screen.getByText('kg CO₂/năm')).toBeInTheDocument();
    });
});
