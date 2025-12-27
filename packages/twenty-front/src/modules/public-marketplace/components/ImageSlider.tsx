import styled from '@emotion/styled';
import { useState } from 'react';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/display';

const SliderContainer = styled.div`
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const SliderImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const SliderButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  z-index: 10;

  &:hover {
    background-color: rgba(0, 0, 0, 0.7);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const PrevButton = styled(SliderButton)`
  left: 1rem;
`;

const NextButton = styled(SliderButton)`
  right: 1rem;
`;

const Counter = styled.div`
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  z-index: 10;
`;

const ThumbnailContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  overflow-x: auto;
  padding: 0.5rem 0;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.background.tertiary};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.blue};
    border-radius: 3px;
  }
`;

const Thumbnail = styled.div<{ active: boolean }>`
  min-width: 80px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid ${({ active, theme }) => (active ? theme.color.blue : 'transparent')};
  opacity: ${({ active }) => (active ? 1 : 0.6)};
  transition: all 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

interface ImageSliderProps {
  images: string[];
  title: string;
}

export const ImageSlider = ({ images, title }: ImageSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) {
    return (
      <SliderContainer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
          No images available
        </div>
      </SliderContainer>
    );
  }

  return (
    <>
      <SliderContainer>
        <SliderImage src={images[currentIndex]} alt={`${title} - Image ${currentIndex + 1}`} />
        {images.length > 1 && (
          <>
            <PrevButton onClick={handlePrev}>
              <IconChevronLeft size={24} />
            </PrevButton>
            <NextButton onClick={handleNext}>
              <IconChevronRight size={24} />
            </NextButton>
            <Counter>
              {currentIndex + 1} / {images.length}
            </Counter>
          </>
        )}
      </SliderContainer>
      {images.length > 1 && (
        <ThumbnailContainer>
          {images.map((image, index) => (
            <Thumbnail
              key={index}
              active={index === currentIndex}
              onClick={() => handleThumbnailClick(index)}
            >
              <ThumbnailImage src={image} alt={`${title} - Thumbnail ${index + 1}`} />
            </Thumbnail>
          ))}
        </ThumbnailContainer>
      )}
    </>
  );
};
