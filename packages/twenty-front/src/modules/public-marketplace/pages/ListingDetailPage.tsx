import styled from '@emotion/styled';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconHeart, IconMail, IconMap, IconPhone } from 'twenty-ui/display';
import { Breadcrumb } from '../components/Breadcrumb';
import { EnhancedTrustScore } from '../components/EnhancedTrustScore';
import { ImageSlider } from '../components/ImageSlider';
import { LocationMap } from '../components/LocationMap';
import { MarketplaceFooter } from '../components/MarketplaceFooter';
import { mockPublicListings } from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';
import { calculateTrustScore } from '../utils/calculateTrustScore';

const StyledContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const StyledMaxWidth = styled.div`
  margin: 0 auto;
  max-width: 1400px;
`;

const StyledTitle = styled.h1`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 2rem;
  font-weight: 700;
  margin: 1.5rem 0 1rem;
`;

const StyledLocationText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 2rem;
`;

const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StyledStatCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.5rem;
`;

const StyledStatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.5rem;
`;

const StyledStatValue = styled.div`
  color: ${({ theme }) => theme.color.blue};
  font-size: 1.875rem;
  font-weight: 700;
`;

const StyledSpecGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
`;

const StyledSpecItem = styled.div`
  background-color: ${({ theme }) => theme.background.tertiary};
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  padding: 1rem;
`;

const StyledSpecLabel = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.9375rem;
`;

const StyledSpecValue = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 600;
  font-size: 0.9375rem;
`;

const StyledAmenityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const StyledAmenityCard = styled.div`
  align-items: flex-start;
  background-color: ${({ theme }) => theme.background.tertiary};
  border-radius: 8px;
  display: flex;
  gap: 1rem;
  padding: 1rem;
`;

const StyledAmenityIcon = styled.div`
  color: ${({ theme }) => theme.color.blue};
`;

const StyledAmenityContent = styled.div`
  flex: 1;
`;

const StyledAmenityTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.25rem;
`;

const StyledAmenityList = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

const StyledContactCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const StyledContactButton = styled.button`
  width: 100%;
  background-color: ${({ theme }) => theme.color.blue};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const StyledContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const StyledContactItem = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.secondary};
  display: flex;
  font-size: 0.9375rem;
  gap: 0.75rem;
`;

const StyledRelatedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
`;

const StyledRelatedCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }
`;

const StyledRelatedImage = styled.div`
  height: 180px;
  background-color: ${({ theme }) => theme.background.tertiary};
  position: relative;
`;

const StyledRelatedImageTag = styled.img`
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const StyledRelatedContent = styled.div`
  padding: 1rem;
`;

const StyledRelatedTitle = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const StyledRelatedPrice = styled.div`
  color: ${({ theme }) => theme.color.blue};
  font-weight: 700;
  font-size: 1.125rem;
`;

const StyledCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const StyledSectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const StyledDescription = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  line-height: 1.6;
`;

const StyledSellerAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.blue};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
`;

const StyledSellerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StyledSellerDetails = styled.div`
  flex: 1;
`;

const StyledSellerName = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 600;
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
`;

const StyledSellerLabel = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

export const ListingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const listing = mockPublicListings.find((l) => l.id === id);
  const { t } = useLanguage();

  const [showInquiryForm, setShowInquiryForm] = useState(false);

  if (!listing) {
    return (
      <StyledContainer>
        <StyledMaxWidth>
          <StyledCard>
            <StyledTitle>Listing not found</StyledTitle>
            <StyledDescription>
              The listing you're looking for doesn't exist.
            </StyledDescription>
          </StyledCard>
        </StyledMaxWidth>
      </StyledContainer>
    );
  }

  // Calculate Enhanced Trust Score dynamically for this listing
  const { score: trustScore, breakdown: trustBreakdown } =
    calculateTrustScore(listing);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Mock related listings
  const relatedListings = mockPublicListings
    .filter(
      (l) => l.id !== listing.id && l.propertyType === listing.propertyType,
    )
    .slice(0, 3);

  return (
    <StyledContainer>
      <StyledMaxWidth>
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          type="Cho thuê"
          city={listing.city}
          district={listing.district}
          propertyName={listing.title}
        />

        {/* Image Slider */}
        <ImageSlider images={listing.images} title={listing.title} />

        {/* Title and Location */}
        <StyledTitle>{listing.title}</StyledTitle>
        <StyledLocationText>
          <IconMap size={20} />
          {listing.district}, {listing.city}
        </StyledLocationText>

        <StyledGrid>
          <StyledStatCard>
            <StyledStatLabel>{t('detail.price')}</StyledStatLabel>
            <StyledStatValue>{formatPrice(listing.price)}</StyledStatValue>
          </StyledStatCard>
          <StyledStatCard>
            <StyledStatLabel>{t('detail.bedrooms')}</StyledStatLabel>
            <StyledStatValue>{listing.bedrooms}</StyledStatValue>
          </StyledStatCard>
          <StyledStatCard>
            <StyledStatLabel>{t('detail.bathrooms')}</StyledStatLabel>
            <StyledStatValue>{listing.bathrooms}</StyledStatValue>
          </StyledStatCard>
          <StyledStatCard>
            <StyledStatLabel>{t('detail.area')}</StyledStatLabel>
            <StyledStatValue>{listing.area}m²</StyledStatValue>
          </StyledStatCard>
        </StyledGrid>

        {/* Enhanced Trust Score with 10 AI-powered criteria - calculated dynamically */}
        <EnhancedTrustScore score={trustScore} breakdown={trustBreakdown} />

        {/* Description */}
        <StyledCard>
          <StyledSectionTitle>{t('detail.description')}</StyledSectionTitle>
          <StyledDescription>{listing.description}</StyledDescription>
        </StyledCard>

        {/* Property Specifications */}
        <StyledCard>
          <StyledSectionTitle>{t('detail.specifications')}</StyledSectionTitle>
          <StyledSpecGrid>
            <StyledSpecItem>
              <StyledSpecLabel>{t('detail.furniture')}</StyledSpecLabel>
              <StyledSpecValue>{t('detail.furnished')}</StyledSpecValue>
            </StyledSpecItem>
            <StyledSpecItem>
              <StyledSpecLabel>{t('detail.direction')}</StyledSpecLabel>
              <StyledSpecValue>{t('detail.south')}</StyledSpecValue>
            </StyledSpecItem>
            <StyledSpecItem>
              <StyledSpecLabel>{t('detail.balconyDirection')}</StyledSpecLabel>
              <StyledSpecValue>{t('detail.east')}</StyledSpecValue>
            </StyledSpecItem>
            <StyledSpecItem>
              <StyledSpecLabel>{t('detail.floor')}</StyledSpecLabel>
              <StyledSpecValue>5/20</StyledSpecValue>
            </StyledSpecItem>
            <StyledSpecItem>
              <StyledSpecLabel>{t('detail.legalStatus')}</StyledSpecLabel>
              <StyledSpecValue>{t('detail.pinkBook')}</StyledSpecValue>
            </StyledSpecItem>
            <StyledSpecItem>
              <StyledSpecLabel>{t('common.bedrooms')}</StyledSpecLabel>
              <StyledSpecValue>{listing.bedrooms}</StyledSpecValue>
            </StyledSpecItem>
          </StyledSpecGrid>
        </StyledCard>

        {/* Location & Map */}
        <StyledCard>
          <StyledSectionTitle>{t('detail.location')}</StyledSectionTitle>
          <StyledDescription style={{ marginBottom: '1.5rem' }}>
            {listing.district}, {listing.city}
          </StyledDescription>
          <LocationMap
            address={listing.location}
            city={listing.city}
            district={listing.district}
            useRealMap={true}
          />
        </StyledCard>

        {/* Nearby Amenities */}
        <StyledCard>
          <StyledSectionTitle>{t('detail.nearbyAmenities')}</StyledSectionTitle>
          <StyledAmenityGrid>
            <StyledAmenityCard>
              <StyledAmenityIcon>
                <IconMap size={24} />
              </StyledAmenityIcon>
              <StyledAmenityContent>
                <StyledAmenityTitle>{t('detail.schools')}</StyledAmenityTitle>
                <StyledAmenityList>
                  Trường THPT Chu Văn An (500m)
                  <br />
                  Trường TH Đoàn Thị Điểm (800m)
                </StyledAmenityList>
              </StyledAmenityContent>
            </StyledAmenityCard>
            <StyledAmenityCard>
              <StyledAmenityIcon>
                <IconHeart size={24} />
              </StyledAmenityIcon>
              <StyledAmenityContent>
                <StyledAmenityTitle>{t('detail.hospitals')}</StyledAmenityTitle>
                <StyledAmenityList>
                  Bệnh viện Bạch Mai (1.2km)
                  <br />
                  Phòng khám Đa khoa (300m)
                </StyledAmenityList>
              </StyledAmenityContent>
            </StyledAmenityCard>
            <StyledAmenityCard>
              <StyledAmenityIcon>
                <IconMap size={24} />
              </StyledAmenityIcon>
              <StyledAmenityContent>
                <StyledAmenityTitle>{t('detail.markets')}</StyledAmenityTitle>
                <StyledAmenityList>
                  Siêu thị Vinmart (200m)
                  <br />
                  Chợ Hôm (600m)
                </StyledAmenityList>
              </StyledAmenityContent>
            </StyledAmenityCard>
            <StyledAmenityCard>
              <StyledAmenityIcon>
                <IconMap size={24} />
              </StyledAmenityIcon>
              <StyledAmenityContent>
                <StyledAmenityTitle>{t('detail.parks')}</StyledAmenityTitle>
                <StyledAmenityList>
                  Công viên Thống Nhất (1km)
                  <br />
                  Hồ Hoàng Cầu (400m)
                </StyledAmenityList>
              </StyledAmenityContent>
            </StyledAmenityCard>
          </StyledAmenityGrid>
        </StyledCard>

        {/* Contact Seller */}
        <StyledContactCard>
          <StyledSectionTitle>{t('detail.contactSeller')}</StyledSectionTitle>
          <StyledContactButton
            onClick={() => setShowInquiryForm(!showInquiryForm)}
          >
            {t('detail.sendInquiry')}
          </StyledContactButton>
          <StyledSellerInfo>
            <StyledSellerAvatar>
              {getInitials(listing.sellerName)}
            </StyledSellerAvatar>
            <StyledSellerDetails>
              <StyledSellerName>{listing.sellerName}</StyledSellerName>
              <StyledSellerLabel>{t('detail.propertyOwner')}</StyledSellerLabel>
            </StyledSellerDetails>
          </StyledSellerInfo>
          <StyledContactInfo>
            <StyledContactItem>
              <IconPhone size={18} />
              <span>0903 469 ***</span>
            </StyledContactItem>
            <StyledContactItem>
              <IconMail size={18} />
              <span>
                {listing.sellerName.toLowerCase().replace(' ', '.')}@example.com
              </span>
            </StyledContactItem>
          </StyledContactInfo>
        </StyledContactCard>

        {/* Related Listings */}
        {relatedListings.length > 0 && (
          <StyledCard>
            <StyledSectionTitle>
              {t('detail.relatedListings')}
            </StyledSectionTitle>
            <StyledRelatedGrid>
              {relatedListings.map((related) => (
                <StyledRelatedCard key={related.id}>
                  <StyledRelatedImage>
                    {related.images[0] && (
                      <StyledRelatedImageTag
                        src={related.images[0]}
                        alt={related.title}
                      />
                    )}
                  </StyledRelatedImage>
                  <StyledRelatedContent>
                    <StyledRelatedTitle>{related.title}</StyledRelatedTitle>
                    <StyledRelatedPrice>
                      {formatPrice(related.price)}
                    </StyledRelatedPrice>
                  </StyledRelatedContent>
                </StyledRelatedCard>
              ))}
            </StyledRelatedGrid>
          </StyledCard>
        )}
      </StyledMaxWidth>

      {/* Footer */}
      <MarketplaceFooter />
    </StyledContainer>
  );
};
