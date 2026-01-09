import { lazy, Suspense } from 'react';
import styled from '@emotion/styled';

interface TreeLocationMapProps {
    latitude: number;
    longitude: number;
    treeCode: string;
    treeLotName?: string;
}

// Lazy load the actual map component to prevent Leaflet's side effects from blocking React rendering
const LazyMapContent = lazy(() => import('./TreeLocationMapContent'));

const StyledSection = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  padding: 24px;
  border-radius: ${({ theme }) => theme.border.radius.md};
  margin-bottom: 24px;
`;

const StyledSectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledLoadingPlaceholder = styled.div`
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const StyledNoLocation = styled.div`
  text-align: center;
  padding: 32px;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

export const TreeLocationMap = ({
    latitude,
    longitude,
    treeCode,
    treeLotName,
}: TreeLocationMapProps) => {
    // Check if coordinates are valid
    const hasValidCoordinates =
        latitude !== 0 &&
        longitude !== 0 &&
        !isNaN(latitude) &&
        !isNaN(longitude);

    if (!hasValidCoordinates) {
        return (
            <StyledSection data-testid="tree-location-map">
                <StyledSectionTitle>📍 Vị trí cây</StyledSectionTitle>
                <StyledNoLocation>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>🗺️</div>
                    <div>Chưa có thông tin vị trí</div>
                </StyledNoLocation>
            </StyledSection>
        );
    }

    return (
        <StyledSection data-testid="tree-location-map">
            <StyledSectionTitle>📍 Vị trí cây</StyledSectionTitle>
            <Suspense
                fallback={
                    <StyledLoadingPlaceholder>
                        Đang tải bản đồ...
                    </StyledLoadingPlaceholder>
                }
            >
                <LazyMapContent
                    latitude={latitude}
                    longitude={longitude}
                    treeCode={treeCode}
                    treeLotName={treeLotName}
                />
            </Suspense>
        </StyledSection>
    );
};
