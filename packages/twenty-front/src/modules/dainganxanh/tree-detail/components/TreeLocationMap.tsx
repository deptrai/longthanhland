import { useEffect } from 'react';
import styled from '@emotion/styled';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface TreeLocationMapProps {
    latitude: number;
    longitude: number;
    treeCode: string;
    treeLotName?: string;
}

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

const StyledMapContainer = styled.div`
  height: 300px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  overflow: hidden;
  
  .leaflet-container {
    height: 100%;
    width: 100%;
  }
`;

const StyledCoordinates = styled.div`
  margin-top: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  gap: 16px;
`;

const StyledNoLocation = styled.div`
  text-align: center;
  padding: 32px;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

// Custom tree icon
const treeIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#2D5016"/>
      <text x="12" y="16" font-size="12" text-anchor="middle" fill="white">🌳</text>
    </svg>
  `),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

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

            <StyledMapContainer>
                <MapContainer
                    center={[latitude, longitude]}
                    zoom={15}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[latitude, longitude]} icon={treeIcon}>
                        <Popup>
                            <strong>{treeCode}</strong>
                            {treeLotName && <div>{treeLotName}</div>}
                        </Popup>
                    </Marker>
                </MapContainer>
            </StyledMapContainer>

            <StyledCoordinates>
                <span>Vĩ độ: {latitude.toFixed(6)}</span>
                <span>Kinh độ: {longitude.toFixed(6)}</span>
            </StyledCoordinates>
        </StyledSection>
    );
};
