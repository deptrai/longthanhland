import styled from '@emotion/styled';
import { IconMap } from 'twenty-ui/display';

const StyledMapContainer = styled.div`
  width: 100%;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background-color: ${({ theme }) => theme.background.tertiary};
`;

const StyledMapFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const StyledMapPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const StyledMapIcon = styled.div`
  color: ${({ theme }) => theme.color.blue};
`;

const StyledMapText = styled.div`
  font-size: 1rem;
  font-weight: 500;
`;

interface LocationMapProps {
  address: string;
  city: string;
  district: string;
  useRealMap?: boolean;
}

export const LocationMap = ({
  address,
  city,
  district,
  useRealMap = false,
}: LocationMapProps) => {
  if (!useRealMap) {
    return (
      <StyledMapContainer>
        <StyledMapPlaceholder>
          <StyledMapIcon>
            <IconMap size={64} />
          </StyledMapIcon>
          <StyledMapText>Bản đồ vị trí</StyledMapText>
          <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            {district}, {city}
          </div>
        </StyledMapPlaceholder>
      </StyledMapContainer>
    );
  }

  const fullAddress = `${address}, ${district}, ${city}, Vietnam`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  return (
    <StyledMapContainer>
      <StyledMapFrame
        src={mapUrl}
        title="Property Location"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </StyledMapContainer>
  );
};
