import styled from '@emotion/styled';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    IconMail,
    IconMap,
    IconPhone,
    IconShoppingCart
} from 'twenty-ui/display';
import { EnhancedTrustScore } from '../components/EnhancedTrustScore';
import { mockPublicListings } from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';
import { calculateTrustScore } from '../utils/calculateTrustScore';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  margin: 0 auto;
  max-width: 1400px;
`;

const HeroImage = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  height: 400px;
  margin-bottom: 2rem;
  overflow: hidden;
  position: relative;
`;

const Image = styled.img`
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, transparent 50%);
`;

const HeroContent = styled.div`
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const LocationText = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  opacity: 0.9;
  color: white;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  color: ${({ theme }) => theme.color.blue};
  font-size: 1.875rem;
  font-weight: 700;
`;

const SpecGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
`;

const SpecItem = styled.div`
  background-color: ${({ theme }) => theme.background.tertiary};
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  padding: 1rem;
`;

const SpecLabel = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.9375rem;
`;

const SpecValue = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 600;
  font-size: 0.9375rem;
`;

const AmenityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const AmenityCard = styled.div`
  align-items: flex-start;
  background-color: ${({ theme }) => theme.background.tertiary};
  border-radius: 8px;
  display: flex;
  gap: 1rem;
  padding: 1rem;
`;

const AmenityIcon = styled.div`
  color: ${({ theme }) => theme.color.blue};
`;

const AmenityContent = styled.div`
  flex: 1;
`;

const AmenityTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.25rem;
`;

const AmenityList = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

const ContactCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const ContactButton = styled.button`
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

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const ContactItem = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.secondary};
  display: flex;
  font-size: 0.9375rem;
  gap: 0.75rem;
`;

const RelatedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
`;

const RelatedCard = styled.div`
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

const RelatedImage = styled.div`
  height: 180px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
`;

const RelatedImageTag = styled.img`
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const RelatedContent = styled.div`
  padding: 1rem;
`;

const RelatedTitle = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const RelatedPrice = styled.div`
  color: ${({ theme }) => theme.color.blue};
  font-weight: 700;
  font-size: 1.125rem;
`;

const MapPlaceholder = styled.div`
  height: 300px;
  background-color: ${({ theme }) => theme.background.tertiary};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1rem;
  gap: 1rem;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  line-height: 1.6;
`;

const SellerAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
`;

const SellerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SellerDetails = styled.div`
  flex: 1;
`;

const SellerName = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 600;
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
`;

const SellerLabel = styled.div`
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
      <Container>
        <MaxWidth>
          <Card>
            <Title>Listing not found</Title>
            <Description>
              The listing you're looking for doesn't exist.
            </Description>
          </Card>
        </MaxWidth>
      </Container>
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
    <Container>
      <MaxWidth>
        <HeroImage>
          {listing.images[0] && (
            <Image src={listing.images[0]} alt={listing.title} />
          )}
          <Overlay />
          <HeroContent>
            <Title>{listing.title}</Title>
            <LocationText>
              <IconMap size={24} />
              {listing.district}, {listing.city}
            </LocationText>
          </HeroContent>
        </HeroImage>

        <Grid>
          <StatCard>
            <StatLabel>{t('detail.price')}</StatLabel>
            <StatValue>{formatPrice(listing.price)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>{t('detail.bedrooms')}</StatLabel>
            <StatValue>{listing.bedrooms}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>{t('detail.bathrooms')}</StatLabel>
            <StatValue>{listing.bathrooms}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>{t('detail.area')}</StatLabel>
            <StatValue>{listing.area}m²</StatValue>
          </StatCard>
        </Grid>

        {/* Enhanced Trust Score with 10 AI-powered criteria - calculated dynamically */}
        <EnhancedTrustScore score={trustScore} breakdown={trustBreakdown} />

        {/* Description */}
        <Card>
          <SectionTitle>{t('detail.description')}</SectionTitle>
          <Description>{listing.description}</Description>
        </Card>

        {/* Property Specifications */}
        <Card>
          <SectionTitle>{t('detail.specifications')}</SectionTitle>
          <SpecGrid>
            <SpecItem>
              <SpecLabel>{t('detail.furniture')}</SpecLabel>
              <SpecValue>{t('detail.furnished')}</SpecValue>
            </SpecItem>
            <SpecItem>
              <SpecLabel>{t('detail.direction')}</SpecLabel>
              <SpecValue>{t('detail.south')}</SpecValue>
            </SpecItem>
            <SpecItem>
              <SpecLabel>{t('detail.balconyDirection')}</SpecLabel>
              <SpecValue>{t('detail.east')}</SpecValue>
            </SpecItem>
            <SpecItem>
              <SpecLabel>{t('detail.floor')}</SpecLabel>
              <SpecValue>5/20</SpecValue>
            </SpecItem>
            <SpecItem>
              <SpecLabel>{t('detail.legalStatus')}</SpecLabel>
              <SpecValue>{t('detail.pinkBook')}</SpecValue>
            </SpecItem>
            <SpecItem>
              <SpecLabel>{t('common.bedrooms')}</SpecLabel>
              <SpecValue>{listing.bedrooms}</SpecValue>
            </SpecItem>
          </SpecGrid>
        </Card>

        {/* Location & Map */}
        <Card>
          <SectionTitle>{t('detail.location')}</SectionTitle>
          <Description style={{ marginBottom: '1.5rem' }}>
            {listing.district}, {listing.city}
          </Description>
          <MapPlaceholder>
            <IconMap size={48} />
            <span>{t('detail.map')} - Coming Soon</span>
          </MapPlaceholder>
        </Card>

        {/* Nearby Amenities */}
        <Card>
          <SectionTitle>{t('detail.nearbyAmenities')}</SectionTitle>
          <AmenityGrid>
            <AmenityCard>
              <AmenityIcon>
                <IconMap size={24} />
              </AmenityIcon>
              <AmenityContent>
                <AmenityTitle>{t('detail.schools')}</AmenityTitle>
                <AmenityList>
                  Trường THPT Chu Văn An (500m)
                  <br />
                  Trường TH Đoàn Thị Điểm (800m)
                </AmenityList>
              </AmenityContent>
            </AmenityCard>
            <AmenityCard>
              <AmenityIcon>
                <IconHeart size={24} />
              </AmenityIcon>
              <AmenityContent>
                <AmenityTitle>{t('detail.hospitals')}</AmenityTitle>
                <AmenityList>
                  Bệnh viện Bạch Mai (1.2km)
                  <br />
                  Phòng khám Đa khoa (300m)
                </AmenityList>
              </AmenityContent>
            </AmenityCard>
            <AmenityCard>
              <AmenityIcon>
                <IconShoppingCart size={24} />
              </AmenityIcon>
              <AmenityContent>
                <AmenityTitle>{t('detail.markets')}</AmenityTitle>
                <AmenityList>
                  Siêu thị Vinmart (200m)
                  <br />
                  Chợ Hôm (600m)
                </AmenityList>
              </AmenityContent>
            </AmenityCard>
            <AmenityCard>
              <AmenityIcon>
                <IconMap size={24} />
              </AmenityIcon>
              <AmenityContent>
                <AmenityTitle>{t('detail.parks')}</AmenityTitle>
                <AmenityList>
                  Công viên Thống Nhất (1km)
                  <br />
                  Hồ Hoàng Cầu (400m)
                </AmenityList>
              </AmenityContent>
            </AmenityCard>
          </AmenityGrid>
        </Card>

        {/* Contact Seller */}
        <ContactCard>
          <SectionTitle>{t('detail.contactSeller')}</SectionTitle>
          <ContactButton onClick={() => setShowInquiryForm(!showInquiryForm)}>
            {t('detail.sendInquiry')}
          </ContactButton>
          <SellerInfo>
            <SellerAvatar>{getInitials(listing.sellerName)}</SellerAvatar>
            <SellerDetails>
              <SellerName>{listing.sellerName}</SellerName>
              <SellerLabel>{t('detail.propertyOwner')}</SellerLabel>
            </SellerDetails>
          </SellerInfo>
          <ContactInfo>
            <ContactItem>
              <IconPhone size={18} />
              <span>0903 469 ***</span>
            </ContactItem>
            <ContactItem>
              <IconMail size={18} />
              <span>
                {listing.sellerName.toLowerCase().replace(' ', '.')}@example.com
              </span>
            </ContactItem>
          </ContactInfo>
        </ContactCard>

        {/* Related Listings */}
        {relatedListings.length > 0 && (
          <Card>
            <SectionTitle>{t('detail.relatedListings')}</SectionTitle>
            <RelatedGrid>
              {relatedListings.map((related) => (
                <RelatedCard key={related.id}>
                  <RelatedImage>
                    {related.images[0] && (
                      <RelatedImageTag
                        src={related.images[0]}
                        alt={related.title}
                      />
                    )}
                  </RelatedImage>
                  <RelatedContent>
                    <RelatedTitle>{related.title}</RelatedTitle>
                    <RelatedPrice>{formatPrice(related.price)}</RelatedPrice>
                  </RelatedContent>
                </RelatedCard>
              ))}
            </RelatedGrid>
          </Card>
        )}
      </MaxWidth>
    </Container>
  );
};
