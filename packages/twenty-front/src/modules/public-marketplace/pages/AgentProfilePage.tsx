import styled from '@emotion/styled';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    IconCheck,
    IconEye,
    IconHeart,
    IconMap,
    IconMessage,
    IconPhone,
    IconPhoto,
} from 'twenty-ui/display';
import { MarketplaceFooter } from '../components/MarketplaceFooter';
import {
    type AgentListing,
    mockAgentProfile,
    mockAgentProfilePageData,
} from '../data/mock-data';

// === Layout ===
const StyledPage = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
`;

const StyledCoverBanner = styled.div<{ src: string }>`
  width: 100%;
  height: 260px;
  background-image: url(${({ src }) => src});
  background-size: cover;
  background-position: center;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
  }
`;

const StyledContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  gap: 2rem;
  margin-top: -60px;
  position: relative;
  z-index: 1;

  @media (max-width: 900px) {
    flex-direction: column;
    margin-top: -40px;
  }
`;

// === Left: Agent Card ===
const StyledAgentCard = styled.div`
  width: 320px;
  min-width: 320px;
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
  align-self: flex-start;
  position: sticky;
  top: 1.5rem;

  @media (max-width: 900px) {
    width: 100%;
    min-width: unset;
    position: static;
  }
`;

const StyledBadgeHeader = styled.div`
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.color.green}, ${theme.color.green})`};
  color: ${({ theme }) => theme.font.color.inverted};
  text-align: center;
  padding: 0.625rem;
  font-size: 1.0625rem;
  font-weight: 600;
`;

const StyledAgentBody = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledAvatar = styled.img`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  margin-bottom: 0.75rem;
`;

const StyledAgentName = styled.h2`
  font-size: 1.375rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 0.75rem;
`;

const StyledStatsRow = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin-bottom: 1.25rem;
  gap: 0.25rem;
`;

const StyledStatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  text-align: center;
`;

const StyledStatValue = styled.span`
  font-size: 1.1875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledVerifiedBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.green};
  font-size: 1.75rem;
`;

const StyledButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
`;

const StyledZaloButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.color.blue}, ${theme.color.blue})`};
  border: none;
  border-radius: 8px;
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 1.0625rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`;

const StyledPhoneButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 1.0625rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  &:hover { background-color: ${({ theme }) => theme.background.secondary}; }
`;

// === Right: Info + Tabs + Grid ===
const StyledRightSection = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 80px;

  @media (max-width: 900px) {
    padding-top: 0;
  }
`;

const StyledInfoCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const StyledInfoTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 1rem;
`;

const StyledInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-size: 1.0625rem;
  color: ${({ theme }) => theme.font.color.secondary};

  svg {
    color: ${({ theme }) => theme.font.color.tertiary};
    flex-shrink: 0;
  }
`;

const StyledInfoValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
`;

// === Tabs ===
const StyledTabsContainer = styled.div`
  display: flex;
  border-bottom: 2px solid ${({ theme }) => theme.border.color.medium};
  margin-bottom: 1.5rem;
`;

const StyledTab = styled.button<{ active: boolean }>`
  padding: 0.875rem 1.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ active, theme }) =>
    active ? theme.color.red : theme.font.color.tertiary};
  background: none;
  border: none;
  border-bottom: 3px solid ${({ active, theme }) =>
    active ? theme.color.red : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;

  &:hover {
    color: ${({ active, theme }) =>
      active ? theme.color.red : theme.font.color.primary};
  }
`;

// === Listings Grid ===
const StyledListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StyledListingCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const StyledImageWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background-color: ${({ theme }) => theme.background.tertiary};
`;

const StyledListingImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const StyledPhotoCountBadge = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.65);
  color: ${({ theme }) => theme.font.color.inverted};
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const StyledExpiredOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledExpiredLabel = styled.span`
  background: rgba(0, 0, 0, 0.75);
  color: ${({ theme }) => theme.font.color.inverted};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
`;

const StyledHeartButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.85);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.font.color.tertiary};
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.color.red};
    background: ${({ theme }) => theme.background.primary};
  }
`;

const StyledCardContent = styled.div`
  padding: 0.875rem;
`;

const StyledListingTitle = styled.h4`
  font-size: 1.0625rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`;

const StyledPriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.375rem;
`;

const StyledPrice = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.danger};
`;

const StyledArea = styled.span`
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const StyledLocationRow = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledDateRow = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const StyledEmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1.125rem;
`;

// === Helper ===
const formatPrice = (price: number): string => {
  if (price >= 1000000000) {
    const billions = price / 1000000000;
    return `${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)} tỷ`;
  }
  if (price >= 1000000) {
    const millions = price / 1000000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(0)} triệu`;
  }
  return price.toLocaleString('vi-VN') + ' đ';
};

// === Listing Card Sub-component ===
const ListingCard = ({ listing }: { listing: AgentListing }) => (
  <StyledListingCard>
    <StyledImageWrapper>
      {listing.images[0] && (
        <StyledListingImage src={listing.images[0]} alt={listing.title} />
      )}
      <StyledPhotoCountBadge>
        <IconPhoto size={14} />
        {listing.photoCount}
      </StyledPhotoCountBadge>
      <StyledHeartButton onClick={(e) => e.stopPropagation()}>
        <IconHeart size={16} />
      </StyledHeartButton>
      {listing.isExpired && (
        <StyledExpiredOverlay>
          <StyledExpiredLabel>Tin đã hết hạn</StyledExpiredLabel>
        </StyledExpiredOverlay>
      )}
    </StyledImageWrapper>
    <StyledCardContent>
      <StyledListingTitle>{listing.title}</StyledListingTitle>
      <StyledPriceRow>
        <StyledPrice>{formatPrice(listing.price)}</StyledPrice>
        <StyledArea>{listing.area} m²</StyledArea>
      </StyledPriceRow>
      <StyledLocationRow>{listing.location}</StyledLocationRow>
      <StyledDateRow>{listing.postedDateLabel}</StyledDateRow>
    </StyledCardContent>
  </StyledListingCard>
);

// === Main Component ===
export const AgentProfilePage = () => {
  const { id: _agentId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'sale' | 'rent'>('sale');

  const agent = mockAgentProfile;
  const pageData = mockAgentProfilePageData;

  const currentListings =
    activeTab === 'sale' ? pageData.saleListings : pageData.rentListings;

  return (
    <StyledPage>
      {/* Cover Banner */}
      <StyledCoverBanner src={pageData.coverImage} />

      {/* Content */}
      <StyledContentWrapper>
        {/* Left: Agent Card */}
        <StyledAgentCard>
          <StyledBadgeHeader>🏅 {agent.badge}</StyledBadgeHeader>
          <StyledAgentBody>
            <StyledAvatar src={agent.avatar} alt={agent.fullName} />
            <StyledAgentName>{agent.fullName}</StyledAgentName>
            <StyledStatsRow>
              <StyledStatItem>
                <StyledStatValue>{agent.memberSince}</StyledStatValue>
                Tham gia
              </StyledStatItem>
              <StyledStatItem>
                <StyledStatValue>{agent.totalListings}</StyledStatValue>
                Tin đăng
              </StyledStatItem>
              <StyledStatItem>
                {agent.isVerified ? (
                  <StyledVerifiedBadge>
                    <IconCheck size={22} />
                  </StyledVerifiedBadge>
                ) : (
                  <StyledStatValue>—</StyledStatValue>
                )}
                Chứng chỉ
              </StyledStatItem>
            </StyledStatsRow>
            <StyledButtonGroup>
              <StyledZaloButton href={agent.zaloLink}>
                <IconMessage size={18} />
                Chat qua Zalo
              </StyledZaloButton>
              <StyledPhoneButton href={`tel:${agent.phone}`}>
                <IconPhone size={18} />
                {agent.phone} · Hiện số
              </StyledPhoneButton>
            </StyledButtonGroup>
          </StyledAgentBody>
        </StyledAgentCard>

        {/* Right: Info + Tabs + Grid */}
        <StyledRightSection>
          {/* Agent Info */}
          <StyledInfoCard>
            <StyledInfoTitle>Thông tin môi giới</StyledInfoTitle>
            <StyledInfoRow>
              <IconEye size={18} />
              <span>Lượt xem:</span>
              <StyledInfoValue>
                {pageData.viewCount.toLocaleString('vi-VN')}
              </StyledInfoValue>
            </StyledInfoRow>
            <StyledInfoRow>
              <IconCheck size={18} />
              <span>Mã chứng chỉ:</span>
              <StyledInfoValue>{pageData.certificateNumber}</StyledInfoValue>
            </StyledInfoRow>
            <StyledInfoRow>
              <IconMap size={18} />
              <span>{pageData.agentLocation}</span>
            </StyledInfoRow>
          </StyledInfoCard>

          {/* Tabs */}
          <StyledTabsContainer>
            <StyledTab
              active={activeTab === 'sale'}
              onClick={() => setActiveTab('sale')}
            >
              Tin bán ({pageData.saleCount})
            </StyledTab>
            <StyledTab
              active={activeTab === 'rent'}
              onClick={() => setActiveTab('rent')}
            >
              Tin thuê ({pageData.rentCount})
            </StyledTab>
          </StyledTabsContainer>

          {/* Listings Grid */}
          {currentListings.length > 0 ? (
            <StyledListingsGrid>
              {currentListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </StyledListingsGrid>
          ) : (
            <StyledEmptyState>
              Không có tin đăng nào trong mục này
            </StyledEmptyState>
          )}
        </StyledRightSection>
      </StyledContentWrapper>

      {/* Footer */}
      <MarketplaceFooter />
    </StyledPage>
  );
};

