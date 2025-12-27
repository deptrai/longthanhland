import styled from '@emotion/styled';
import { useState } from 'react';
import { IconMap, IconSearch } from 'twenty-ui/display';
import { NewsSection } from '..';
import { mockPublicListings } from '../data/mock-data';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  margin: 0 auto;
  max-width: 1400px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PostButton = styled.button`
  background-color: ${({ theme }) => theme.color.blue};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.color.blue};
  }
`;

const SearchBar = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SearchInput = styled.div`
  flex: 1;
  max-width: 600px;
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const Input = styled.input`
  width: 100%;
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem 1rem 0.75rem 3rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }

  &::placeholder {
    color: ${({ theme }) => theme.font.color.tertiary};
  }
`;

const Select = styled.select`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 1.25rem;
  font-weight: 600;
`;

const FeaturedBadge = styled.span`
  background-color: ${({ theme }) => theme.color.yellow};
  color: ${({ theme }) => theme.background.primary};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const ListingCard = styled.div<{ isFeatured?: boolean }>`
  background-color: ${({ theme }) => theme.background.secondary};
  border: ${({ theme, isFeatured }) =>
    isFeatured
      ? `2px solid ${theme.color.yellow}`
      : `1px solid ${theme.border.color.medium}`};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Image = styled.img`
  height: 100%;
  object-fit: cover;
  width: 100%;
`;

const FeaturedTag = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.color.yellow};
  border-radius: 6px;
  color: ${({ theme }) => theme.background.primary};
  display: flex;
  font-size: 0.75rem;
  font-weight: 700;
  gap: 0.25rem;
  left: 0.75rem;
  padding: 0.375rem 0.75rem;
  position: absolute;
  top: 0.75rem;
`;

const CardContent = styled.div`
  padding: 1.25rem;
`;

const ListingTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Location = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const Price = styled.div`
  color: ${({ theme }) => theme.color.blue};
  font-size: 1.5rem;
  font-weight: 700;
`;

const Features = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const Feature = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const TrustScore = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 8px;
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: 4px;
  overflow: hidden;
`;

const Progress = styled.div<{ value: number }>`
  background-color: ${({ theme }) => theme.color.green};
  border-radius: 4px;
  height: 100%;
  transition: width 0.3s;
  width: ${({ value }) => value}%;
`;

const TrustValue = styled.span`
  color: ${({ theme }) => theme.color.green};
  font-size: 0.875rem;
  font-weight: 600;
`;

const Table = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  background-color: ${({ theme }) => theme.background.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  color: ${({ theme }) => theme.font.color.tertiary};
  display: grid;
  font-size: 0.875rem;
  font-weight: 600;
  gap: 1rem;
  grid-template-columns: 2fr 1fr 1fr 100px;
  padding: 1rem 1.5rem;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const PropertyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Thumbnail = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
`;

const PropertyDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const PropertyTitle = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PropertyMeta = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

export const BrowsePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const featuredListings = mockPublicListings.filter((l) => l.isFeatured);
  const regularListings = mockPublicListings.filter((l) => !l.isFeatured);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleListingClick = (id: string) => {
    window.location.href = `/marketplace/listings/${id}`;
  };

  return (
    <Container>
      <MaxWidth>
        <Header>
          <Title>
            <IconMap size={28} />
            Public Marketplace
          </Title>
          <PostButton
            onClick={() => (window.location.href = '/marketplace/post')}
          >
            + Post Listing
          </PostButton>
        </Header>

        <SearchBar>
          <SearchInput>
            <SearchIcon>
              <IconSearch size={20} />
            </SearchIcon>
            <Input
              type="text"
              placeholder="Search location, property type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchInput>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="APARTMENT">Apartment</option>
            <option value="HOUSE">House</option>
            <option value="LAND">Land</option>
            <option value="VILLA">Villa</option>
          </Select>
        </SearchBar>

        {featuredListings.length > 0 && (
          <Section>
            <SectionHeader>
              <SectionTitle>Featured Listings</SectionTitle>
              <FeaturedBadge>⭐ FEATURED</FeaturedBadge>
            </SectionHeader>
            <Grid>
              {featuredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  isFeatured
                  onClick={() => handleListingClick(listing.id)}
                >
                  <ImageContainer>
                    {listing.images[0] && (
                      <Image src={listing.images[0]} alt={listing.title} />
                    )}
                    <FeaturedTag>⭐ Featured</FeaturedTag>
                  </ImageContainer>
                  <CardContent>
                    <ListingTitle>{listing.title}</ListingTitle>
                    <Location>
                      <IconMap size={16} />
                      {listing.district}, {listing.city}
                    </Location>
                    <PriceRow>
                      <Price>{formatPrice(listing.price)}</Price>
                    </PriceRow>
                    <Features>
                      <Feature>{listing.bedrooms} BR</Feature>
                      <Feature>{listing.bathrooms} BA</Feature>
                      <Feature>{listing.area} m²</Feature>
                    </Features>
                    <TrustScore>
                      <ProgressBar>
                        <Progress value={listing.trustScore} />
                      </ProgressBar>
                      <TrustValue>{listing.trustScore}%</TrustValue>
                    </TrustScore>
                  </CardContent>
                </ListingCard>
              ))}
            </Grid>
          </Section>
        )}

        <Section>
          <SectionTitle>All Listings</SectionTitle>
          <Table>
            <TableHeader>
              <div>Property</div>
              <div>Location</div>
              <div>Price</div>
              <div>Trust</div>
            </TableHeader>
            {regularListings.map((listing) => (
              <TableRow
                key={listing.id}
                onClick={() => handleListingClick(listing.id)}
              >
                <PropertyInfo>
                  <Thumbnail>
                    {listing.images[0] && (
                      <Image src={listing.images[0]} alt={listing.title} />
                    )}
                  </Thumbnail>
                  <PropertyDetails>
                    <PropertyTitle>{listing.title}</PropertyTitle>
                    <PropertyMeta>
                      {listing.bedrooms}BR • {listing.bathrooms}BA •{' '}
                      {listing.area}m²
                    </PropertyMeta>
                  </PropertyDetails>
                </PropertyInfo>
                <div style={{ color: '#888888' }}>{listing.district}</div>
                <div style={{ fontWeight: 600, color: '#3B82F6' }}>
                  {formatPrice(listing.price)}
                </div>
                <TrustScore>
                  <ProgressBar style={{ flex: 1 }}>
                    <Progress value={listing.trustScore} />
                  </ProgressBar>
                  <TrustValue>{listing.trustScore}%</TrustValue>
                </TrustScore>
              </TableRow>
            ))}
          </Table>
        </Section>

        <NewsSection />
      </MaxWidth>
    </Container>
  );
};
