import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';

import { TreeActionButtons } from '../TreeActionButtons';

const mockTheme = {
    background: {
        secondary: '#F5F5F5',
        tertiary: '#EEEEEE',
    },
    font: {
        color: {
            primary: '#333333',
        },
    },
    border: {
        radius: {
            sm: '4px',
        },
        color: {
            light: '#E0E0E0',
        },
    },
};

describe('TreeActionButtons', () => {
    const defaultProps = {
        treeCode: 'TREE-001',
    };

    const renderComponent = (props = {}) => {
        return render(
            <ThemeProvider theme={mockTheme as any}>
                <TreeActionButtons {...defaultProps} {...props} />
            </ThemeProvider>
        );
    };

    it('should render all action buttons', () => {
        renderComponent();

        expect(screen.getByTestId('tree-action-buttons')).toBeInTheDocument();
        expect(screen.getByText('Chia sẻ')).toBeInTheDocument();
        expect(screen.getByText('Tải báo cáo PDF')).toBeInTheDocument();
        expect(screen.getByText('Liên hệ hỗ trợ')).toBeInTheDocument();
    });

    it('should call onShare when share button is clicked', () => {
        const onShare = jest.fn();
        renderComponent({ onShare });

        fireEvent.click(screen.getByText('Chia sẻ'));

        expect(onShare).toHaveBeenCalled();
    });

    it('should call onDownloadReport when download button is clicked', () => {
        const onDownloadReport = jest.fn();
        renderComponent({ onDownloadReport });

        fireEvent.click(screen.getByText('Tải báo cáo PDF'));

        expect(onDownloadReport).toHaveBeenCalled();
    });

    it('should call onContactSupport when contact button is clicked', () => {
        const onContactSupport = jest.fn();
        renderComponent({ onContactSupport });

        fireEvent.click(screen.getByText('Liên hệ hỗ trợ'));

        expect(onContactSupport).toHaveBeenCalled();
    });
});
