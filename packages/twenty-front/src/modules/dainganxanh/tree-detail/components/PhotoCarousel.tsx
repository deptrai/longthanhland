import { useState, useCallback } from 'react';
import styled from '@emotion/styled';

interface PhotoItem {
    id: string;
    url: string;
    caption?: string;
    date?: string;
}

interface PhotoCarouselProps {
    photos: PhotoItem[];
    title?: string;
}

const StyledCarousel = styled.div`
  position: relative;
  width: 100%;
`;

const StyledMainPhoto = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  overflow: hidden;
  position: relative;
`;

const StyledPhoto = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const StyledPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const StyledNavButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ direction }) => direction === 'left' ? 'left: 8px;' : 'right: 8px;'}
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const StyledThumbnails = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
  padding: 4px 0;
`;

const StyledThumbnail = styled.button<{ isActive: boolean }>`
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  border: 2px solid ${({ isActive }) => isActive ? '#2D5016' : 'transparent'};
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;

  &:hover {
    border-color: #8BC34A;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const StyledCaption = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  font-size: 12px;
`;

const StyledCounter = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
`;

export const PhotoCarousel = ({ photos, title }: PhotoCarouselProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    }, [photos.length]);

    const goToNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }, [photos.length]);

    if (photos.length === 0) {
        return (
            <StyledCarousel data-testid="photo-carousel">
                <StyledMainPhoto>
                    <StyledPlaceholder>
                        <div style={{ fontSize: 48 }}>📷</div>
                        <div>Chưa có ảnh</div>
                    </StyledPlaceholder>
                </StyledMainPhoto>
            </StyledCarousel>
        );
    }

    const currentPhoto = photos[currentIndex];

    return (
        <StyledCarousel data-testid="photo-carousel">
            <StyledMainPhoto>
                <StyledPhoto src={currentPhoto.url} alt={currentPhoto.caption || 'Tree photo'} />

                {photos.length > 1 && (
                    <>
                        <StyledNavButton direction="left" onClick={goToPrevious}>
                            ‹
                        </StyledNavButton>
                        <StyledNavButton direction="right" onClick={goToNext}>
                            ›
                        </StyledNavButton>
                        <StyledCounter>
                            {currentIndex + 1} / {photos.length}
                        </StyledCounter>
                    </>
                )}

                {(currentPhoto.caption || currentPhoto.date) && (
                    <StyledCaption>
                        {currentPhoto.caption && <div>{currentPhoto.caption}</div>}
                        {currentPhoto.date && (
                            <div style={{ opacity: 0.7 }}>
                                {new Date(currentPhoto.date).toLocaleDateString('vi-VN')}
                            </div>
                        )}
                    </StyledCaption>
                )}
            </StyledMainPhoto>

            {photos.length > 1 && (
                <StyledThumbnails>
                    {photos.map((photo, index) => (
                        <StyledThumbnail
                            key={photo.id}
                            isActive={index === currentIndex}
                            onClick={() => setCurrentIndex(index)}
                        >
                            <img src={photo.url} alt={`Thumbnail ${index + 1}`} />
                        </StyledThumbnail>
                    ))}
                </StyledThumbnails>
            )}
        </StyledCarousel>
    );
};

export type { PhotoItem };
