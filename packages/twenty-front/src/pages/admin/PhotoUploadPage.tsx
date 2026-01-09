import styled from '@emotion/styled';
import React, { useState } from 'react';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { Button } from 'twenty-ui/input';
import { usePhotoUpload } from '../../modules/dainganxanh/admin/hooks/usePhotoUpload';
import { FileSelector } from './components/FileSelector';
import { PhotoPreview } from './components/PhotoPreview';
import { LotTreeSelector } from './components/LotTreeSelector';

const Container = styled.div`
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
`;

const Section = styled.div`
    margin-bottom: 32px;
`;

const Title = styled.h2`
    font-size: 18px;
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
    margin-bottom: 4px;

    strong {
        color: #1e293b;
    }
`;

export const PhotoUploadPage = () => {
    const {
        photos,
        uploading,
        error,
        addPhotos,
        removePhoto,
        updatePhoto,
        uploadPhotos,
        clearAll,
        getQuarterString,
    } = usePhotoUpload();

    const [globalLotId, setGlobalLotId] = useState<string>('');
    const [globalTreeIds, setGlobalTreeIds] = useState<string[]>([]);

    const handleFilesSelected = async (files: FileList) => {
        await addPhotos(files);
    };

    const handleUpdateCaption = (id: string, caption: string) => {
        updatePhoto(id, { caption });
    };

    const handleUpload = async () => {
        // Update all photos with global lot/tree selection
        photos.forEach((photo) => {
            updatePhoto(photo.id, {
                lotId: globalLotId,
                treeIds: globalTreeIds,
            });
        });

        await uploadPhotos();
    };

    const canUpload = photos.length > 0 && globalLotId && !uploading;
    const currentQuarter = getQuarterString();

    return (
        <PageContainer>
            <SubMenuTopBarContainer title="Photo Upload" />
            <Container>
                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Section>
                    <Title>1. Select Photos</Title>
                    <FileSelector onFilesSelected={handleFilesSelected} />
                </Section>

                {photos.length > 0 && (
                    <>
                        <Section>
                            <Title>2. Assign to Lot & Trees</Title>
                            <LotTreeSelector
                                selectedLotId={globalLotId}
                                selectedTreeIds={globalTreeIds}
                                photoGPS={
                                    photos[0]?.gpsLat && photos[0]?.gpsLng
                                        ? { lat: photos[0].gpsLat, lng: photos[0].gpsLng }
                                        : undefined
                                }
                                onLotChange={setGlobalLotId}
                                onTreesChange={setGlobalTreeIds}
                            />
                        </Section>

                        <Section>
                            <Title>3. Review & Edit</Title>
                            <Summary>
                                <SummaryItem>
                                    <strong>Photos:</strong> {photos.length}
                                </SummaryItem>
                                <SummaryItem>
                                    <strong>Quarter:</strong> {currentQuarter}
                                </SummaryItem>
                                {globalLotId && (
                                    <SummaryItem>
                                        <strong>Lot:</strong> Selected
                                    </SummaryItem>
                                )}
                                {globalTreeIds.length > 0 && (
                                    <SummaryItem>
                                        <strong>Tagged Trees:</strong> {globalTreeIds.length}
                                    </SummaryItem>
                                )}
                            </Summary>

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
        </PageContainer>
    );
};
