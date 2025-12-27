import styled from '@emotion/styled';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconMap } from 'twenty-ui/display';
import { EnhancedTrustScore } from '../components/EnhancedTrustScore';
import { mockPublicListings } from '../data/mock-data';
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

const Location = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  opacity: 0.9;
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

const TrustScoreCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
`;

const TrustHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const TrustTitle = styled.h3`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 1.25rem;
  font-weight: 600;
`;

const TrustValue = styled.span`
  color: ${({ theme }) => theme.color.green};
  font-size: 2rem;
  font-weight: 700;
`;

const ProgressBar = styled.div`
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: 6px;
  height: 12px;
  margin-bottom: 1.5rem;
  overflow: hidden;
`;

const Progress = styled.div<{ value: number }>`
  background-color: ${({ theme }) => theme.color.green};
  border-radius: 6px;
  height: 100%;
  transition: width 0.3s;
  width: ${({ value }) => value}%;
`;

const TrustBreakdown = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.secondary};
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
  color: ${({ theme }) => theme.font.color.tertiary};
  line-height: 1.6;
`;

const InquiryButton = styled.button`
  width: 100%;
  background-color: ${({ theme }) => theme.color.blue};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.color.blue};
  }
`;

const SellerInfo = styled.div`
  align-items: center;
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
`;

const SellerAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
`;

const SellerDetails = styled.div`
  flex: 1;
`;

const SellerName = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 600;
`;

const SellerLabel = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

export const ListingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const listing = mockPublicListings.find((l) => l.id === id);

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
            <Location>
              <IconMap size={24} />
              {listing.district}, {listing.city}
            </Location>
          </HeroContent>
        </HeroImage>

        <Grid>
          <StatCard>
            <StatLabel>Price</StatLabel>
            <StatValue>{formatPrice(listing.price)}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Bedrooms</StatLabel>
            <StatValue>{listing.bedrooms}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Bathrooms</StatLabel>
            <StatValue>{listing.bathrooms}</StatValue>
          </StatCard>
          <StatCard>
            <StatLabel>Area</StatLabel>
            <StatValue>{listing.area}m²</StatValue>
          </StatCard>
        </Grid>

        {/* Enhanced Trust Score with 10 AI-powered criteria - calculated dynamically */}
        <EnhancedTrustScore score={trustScore} breakdown={trustBreakdown} />

        <Card>
          <SectionTitle>Description</SectionTitle>
          <Description>{listing.description}</Description>
        </Card>

        <Card>
          <SectionTitle>Contact Seller</SectionTitle>
          <InquiryButton onClick={() => setShowInquiryForm(!showInquiryForm)}>
            Send Inquiry
          </InquiryButton>
          <SellerInfo>
            <SellerAvatar>{getInitials(listing.sellerName)}</SellerAvatar>
            <SellerDetails>
              <SellerName>{listing.sellerName}</SellerName>
              <SellerLabel>Property Owner</SellerLabel>
            </SellerDetails>
          </SellerInfo>
        </Card>
      </MaxWidth>
    </Container>
  );
};
