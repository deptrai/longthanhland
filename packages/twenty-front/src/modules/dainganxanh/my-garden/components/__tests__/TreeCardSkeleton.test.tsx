import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';

import { TreeCardSkeleton } from '../TreeCardSkeleton';

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
};

describe('TreeCardSkeleton', () => {
    it('should render skeleton card', () => {
        render(
            <ThemeProvider theme={mockTheme as any}>
                <TreeCardSkeleton />
            </ThemeProvider>
        );
        expect(screen.getByTestId('tree-card-skeleton')).toBeInTheDocument();
    });
});
