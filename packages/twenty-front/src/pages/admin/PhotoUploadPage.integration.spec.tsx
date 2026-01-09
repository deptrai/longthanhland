import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import { PhotoUploadPage } from './PhotoUploadPage';

// Mock components
jest.mock('./components/FileSelector', () => ({
    FileSelector: ({ onFilesSelected }: any) => (
        <div data-testid="file-selector">
            <button onClick={() => {
                const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
                const fileList = {
                    0: mockFile,
                    length: 1,
                    item: () => mockFile,
                    [Symbol.iterator]: function* () { yield mockFile; }
                } as FileList;
                onFilesSelected(fileList);
            }}>
                Select Files
            </button>
        </div>
    ),
}));

jest.mock('./components/PhotoPreview', () => ({
    PhotoPreview: ({ photos, onRemove }: any) => (
        <div data-testid="photo-preview">
            {photos.map((photo: any) => (
                <div key={photo.id} data-testid={`photo-${photo.id}`}>
                    <button onClick={() => onRemove(photo.id)}>Remove</button>
                </div>
            ))}
        </div>
    ),
}));

jest.mock('./components/LotTreeSelector', () => ({
    LotTreeSelector: ({ onLotChange }: any) => (
        <div data-testid="lot-selector">
            <button onClick={() => onLotChange('lot-123')}>Select Lot</button>
        </div>
    ),
}));

jest.mock('../../modules/dainganxanh/admin/hooks/useAdminLots', () => ({
    useAdminLots: () => ({
        lots: [
            { id: 'lot-123', lotName: 'Lot A', lotCode: 'LOT-A', capacity: 100, trees: [] },
        ],
        loading: false,
        error: null,
    }),
}));

describe('PhotoUploadPage', () => {
    const renderPage = () => {
        return render(
            <MemoryRouter>
                <MockedProvider mocks={[]} addTypename={false}>
                    <PhotoUploadPage />
                </MockedProvider>
            </MemoryRouter>
        );
    };

    it('renders photo upload page', () => {
        renderPage();
        expect(screen.getByText('1. Select Photos')).toBeInTheDocument();
        expect(screen.getByTestId('file-selector')).toBeInTheDocument();
    });

    it('shows lot selector and preview after files selected', async () => {
        renderPage();

        const selectButton = screen.getByText('Select Files');
        fireEvent.click(selectButton);

        await waitFor(() => {
            expect(screen.getByText('2. Assign to Lot & Trees')).toBeInTheDocument();
            expect(screen.getByText('3. Review & Edit')).toBeInTheDocument();
            expect(screen.getByTestId('lot-selector')).toBeInTheDocument();
            expect(screen.getByTestId('photo-preview')).toBeInTheDocument();
        });
    });

    it('enables upload button when lot is selected', async () => {
        renderPage();

        // Select files
        const selectFilesButton = screen.getByText('Select Files');
        fireEvent.click(selectFilesButton);

        await waitFor(() => {
            expect(screen.getByTestId('lot-selector')).toBeInTheDocument();
        });

        // Select lot
        const selectLotButton = screen.getByText('Select Lot');
        fireEvent.click(selectLotButton);

        await waitFor(() => {
            const uploadButton = screen.getByText(/Upload \d+ Photo/);
            expect(uploadButton).not.toBeDisabled();
        });
    });

    it('clears all photos when clear button clicked', async () => {
        renderPage();

        // Select files
        const selectFilesButton = screen.getByText('Select Files');
        fireEvent.click(selectFilesButton);

        await waitFor(() => {
            expect(screen.getByText('Clear All')).toBeInTheDocument();
        });

        // Clear all
        const clearButton = screen.getByText('Clear All');
        fireEvent.click(clearButton);

        await waitFor(() => {
            expect(screen.queryByTestId('photo-preview')).not.toBeInTheDocument();
        });
    });
});
