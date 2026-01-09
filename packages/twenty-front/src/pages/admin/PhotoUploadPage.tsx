import styled from '@emotion/styled';
import React, { useState } from 'react';
import { usePhotoUpload } from '../../modules/dainganxanh/admin/hooks/usePhotoUpload';
import { FileSelector } from './components/FileSelector';
import { PhotoPreview } from './components/PhotoPreview';
import { LotTreeSelector } from './components/LotTreeSelector';

const PageWrapper = styled.div`
    min-height: 100vh;
    background: #f8fafc;
`;

const Header = styled.div`
    background: white;
    padding: 16px 24px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
`;

const Container = styled.div`
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
`;

const Section = styled.div`
    margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px;
    color: #1e293b;
`;

const Actions = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #e2e8f0;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary'; disabled?: boolean }>`
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 500;
    cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
    opacity: ${({ disabled }) => disabled ? 0.5 : 1};
    border: none;
    transition: all 0.2s;
    
    ${({ variant }) => variant === 'primary' ? `
        background: #10b981;
        color: white;
        &:hover:not(:disabled) { background: #059669; }
    ` : `
        background: #e2e8f0;
        color: #475569;
        &:hover:not(:disabled) { background: #cbd5e1; }
    `}
`;

const ErrorMessage = styled.div`
    padding: 12px 16px;
    background: #fef2f2;
    border-left: 3px solid #ef4444;
    border-radius: 4px;
    color: #991b1b;
    margin-bottom: 16px;
`;

const Summary = styled.div`
    padding: 16px;
    background: #f8fafc;
    border-radius: 8px;
    margin-bottom: 24px;
`;

const SummaryItem = styled.div`
    font-size: 14px;
    color: #64748b;
    margin-bottom: 8px;
    
    strong {
        color: #1e293b;
    }
`;

export const PhotoUploadPage = () => {
    const [globalLotId, setGlobalLotId] = useState<string>('');
    const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>([]);

    const {
        photos,
        addPhotos,
        removePhoto,
        updatePhoto,
        uploadPhotos,
        clearAll,
        uploading,
        error,
        getQuarterString,
    } = usePhotoUpload();

    const handleFilesSelected = (files: FileList) => {
        addPhotos(Array.from(files));
    };

    const handleUpdateCaption = (id: string, caption: string) => {
        updatePhoto(id, { caption });
    };

    const handleUpload = async () => {
        if (!globalLotId) {
            return;
        }
        await uploadPhotos();
    };

    const canUpload = photos.length > 0 && globalLotId && !uploading;
    const currentQuarter = getQuarterString();

    return (
        <PageWrapper>
            <Header>Photo Upload</Header>
            <Container>
                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Section>
                    <SectionTitle>Select Lot</SectionTitle>
                    <LotTreeSelector
                        onLotChange={(lotId: string) => setGlobalLotId(lotId)}
                        onTreesChange={(treeIds: string[]) => setSelectedTreeIds(treeIds)}
                        selectedLotId={globalLotId}
                        selectedTreeIds={selectedTreeIds}
                    />
                </Section>

                <Summary>
                    <SummaryItem><strong>Quarter:</strong> {currentQuarter}</SummaryItem>
                    <SummaryItem><strong>Photos:</strong> {photos.length} selected</SummaryItem>
                    <SummaryItem><strong>Lot:</strong> {globalLotId || 'Not selected'}</SummaryItem>
                </Summary>

                <Section>
                    <SectionTitle>Select Photos</SectionTitle>
                    <FileSelector onFilesSelected={handleFilesSelected} />
                </Section>

                {photos.length > 0 && (
                    <>
                        <Section>
                            <SectionTitle>Preview ({photos.length} photos)</SectionTitle>
                            <PhotoPreview
                                photos={photos}
                                onRemove={removePhoto}
                                onUpdateCaption={handleUpdateCaption}
                            />
                        </Section>

                        <Actions>
                            <Button variant="secondary" onClick={clearAll} disabled={uploading}>
                                Clear All
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleUpload}
                                disabled={!canUpload}
                            >
                                {uploading ? 'Uploading...' : `Upload ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
                            </Button>
                        </Actions>
                    </>
                )}
            </Container>
        </PageWrapper>
    );
};
