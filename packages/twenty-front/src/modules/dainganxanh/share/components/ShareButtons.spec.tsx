import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareButtons } from './ShareButtons';

describe('ShareButtons', () => {
    const mockOnShare = jest.fn();
    const mockOnCopyLink = jest.fn();
    const mockOnDownload = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders all buttons', () => {
        render(
            <ShareButtons
                onShare={mockOnShare}
                onCopyLink={mockOnCopyLink}
                onDownload={mockOnDownload}
            />
        );

        expect(screen.getByText(/Chia sẻ/)).toBeInTheDocument();
        expect(screen.getByText(/Copy Link/)).toBeInTheDocument();
        expect(screen.getByText(/Tải về/)).toBeInTheDocument();
    });

    it('calls onShare when share button clicked', () => {
        render(
            <ShareButtons
                onShare={mockOnShare}
                onCopyLink={mockOnCopyLink}
                onDownload={mockOnDownload}
            />
        );

        fireEvent.click(screen.getByText(/Chia sẻ/));
        expect(mockOnShare).toHaveBeenCalledTimes(1);
    });

    it('shows toast when copy link succeeds', async () => {
        mockOnCopyLink.mockResolvedValue(true);

        render(
            <ShareButtons
                onShare={mockOnShare}
                onCopyLink={mockOnCopyLink}
                onDownload={mockOnDownload}
            />
        );

        fireEvent.click(screen.getByText(/Copy Link/));

        await waitFor(() => {
            expect(screen.getByText(/Đã copy link!/)).toBeInTheDocument();
        });
    });

    it('calls onDownload when download button clicked', () => {
        render(
            <ShareButtons
                onShare={mockOnShare}
                onCopyLink={mockOnCopyLink}
                onDownload={mockOnDownload}
            />
        );

        fireEvent.click(screen.getByText(/Tải về/));
        expect(mockOnDownload).toHaveBeenCalledTimes(1);
    });
});
