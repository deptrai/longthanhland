import styled from '@emotion/styled';
import React, { Suspense, lazy } from 'react';
import { PhotoFile } from '../../../modules/dainganxanh/admin/types/photo-upload.types';
import { Button } from 'twenty-ui/input';

const TreeLocationMap = lazy(() =>
    import('../../../modules/dainganxanh/tree-detail/components/TreeLocationMap').then(module => ({
        default: module.TreeLocationMap
    }))
);

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
    margin-top: 24px;
`;

const PhotoCard = styled.div`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
`;

const ImageContainer = styled.div`
    position: relative;
    width: 100%;
    padding-top: 75%; // 4:3 aspect ratio
    background: #f1f5f9;
`;

const Image = styled.img`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const RemoveButton = styled.button`
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background: rgba(0, 0, 0, 0.8);
    }
`;

const Content = styled.div`
    padding: 12px;
`;

const CaptionInput = styled.input`
    width: 100%;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 14px;
    margin-bottom: 8px;

    &:focus {
        outline: none;
        border-color: #3b82f6;
    }
`;

const GPSInfo = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-bottom: 8px;
`;

const MapContainer = styled.div`
    height: 150px;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
`;

const ProgressBar = styled.div<{ progress: number }>`
    width: 100%;
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    overflow: hidden;
    margin-top: 8px;

    &::after {
        content: '';
        display: block;
        width: ${({ progress }) => progress}%;
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s;
    }
`;

interface PhotoPreviewProps {
    photos: PhotoFile[];
    onRemove: (id: string) => void;
    onUpdateCaption: (id: string, caption: string) => void;
}

export const PhotoPreview = ({
    photos,
    onRemove,
    onUpdateCaption,
}: PhotoPreviewProps) => {
    if (photos.length === 0) {
        return null;
    }

    return (
        <Grid>
            {photos.map((photo) => (
                <PhotoCard key={photo.id}>
                    <ImageContainer>
                        <Image src={photo.preview} alt="Preview" />
                        <RemoveButton onClick={() => onRemove(photo.id)}>
                            ×
                        </RemoveButton>
                    </ImageContainer>

                    <Content>
                        <CaptionInput
                            type="text"
                            placeholder="Add caption..."
                            value={photo.caption || ''}
                            onChange={(e) =>
                                onUpdateCaption(photo.id, e.target.value)
                            }
                        />

                        {photo.gpsLat && photo.gpsLng && (
                            <>
                                <GPSInfo>
                                    📍 {photo.gpsLat.toFixed(6)}, {photo.gpsLng.toFixed(6)}
                                </GPSInfo>
                                <MapContainer>
                                    <Suspense fallback={<div>Loading map...</div>}>
                                        <TreeLocationMap
                                            latitude={photo.gpsLat}
                                            longitude={photo.gpsLng}
                                            treeCode={`Photo-${photo.id.slice(0, 8)}`}
                                        />
                                    </Suspense>
                                </MapContainer>
                            </>
                        )}

                        {photo.uploadProgress !== undefined && photo.uploadProgress > 0 && (
                            <ProgressBar progress={photo.uploadProgress} />
                        )}
                    </Content>
                </PhotoCard>
            ))}
        </Grid>
    );
};
