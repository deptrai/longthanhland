import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import {
    IconEye,
    IconHome,
    IconMessage,
    IconTrendingUp,
} from 'twenty-ui/display';
import { mockPublicListings, mockSellerStats } from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  margin: 0 auto;
  max-width: 1400px;
`;

const Title = styled.h1`
  font-size: 2.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.5rem;
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const StatLabel = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1rem;
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, color }) => color ? `${color}20` : `${theme.color.blue}20`};
  color: ${({ theme, color }) => color || theme.color.blue};
`;

const StatValue = styled.div`
  font-size: 2.25rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.5rem;
`;

const StatChange = styled.div<{ positive?: boolean }>`
  font-size: 1rem;
  color: ${({ theme, positive }) => (positive ? theme.color.green : theme.color.red)};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  padding: 1.5rem;
`;

const CardTitle = styled.h2`
  color: ${({ theme }) => theme.font.color.primary};
  font-size:     -eem;
  font-weight: 600;
`;

const Table = styled.div``;

const TableHeader = styled.div`
  background-color: ${({ theme }) => theme.background.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  color: ${({ theme }) => theme.font.color.tertiary};
  display: grid;
  font-size: 1rem;
  font-weight: 600;
  gap: 1rem;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  padding: 1rem 1.5rem;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
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

const ListingInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FeaturedBadge = styled.span`
  background-color: ${({ theme }) => theme.color.yellow};
  color: ${({ theme }) => theme.background.primary};
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 1.375rem;
  font-weight: 700;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 500;
  background-color: ${({ theme, status }) => {
    switch (status) {
      case 'AVAILABLE':
        return theme.tag.background.green;
      case 'RESERVED':
        return theme.tag.background.orange;
      case 'SOLD':
        return theme.tag.background.purple;
      default:
        return theme.tag.background.gray;
    }
  }};
  color: ${({ theme, status }) => {
    switch (status) {
      case 'AVAILABLE':
        return theme.tag.text.green;
      case 'RESERVED':
        return theme.tag.text.orange;
      case 'SOLD':
        return theme.tag.text.purple;
      default:
        return theme.tag.text.gray;
    }
  }};
`;

export const DashboardPage = () => {
  const { t } = useLanguage();
  const theme = useTheme();
  const stats = mockSellerStats;
  const myListings = mockPublicListings.slice(0, 3); // Show first 3 listings

  return (
    <Container>
      <MaxWidth>
        <Title>{t('dashboard.title')}</Title>

        <StatsGrid>
          <StatCard>
            <StatHeader>
              <StatLabel>{t('dashboard.totalViews')}</StatLabel>
              <StatIcon color={theme.color.blue}>
                <IconEye size={20} />
              </StatIcon>
            </StatHeader>
            <StatValue>{stats.totalViews.toLocaleString()}</StatValue>
            <StatChange positive>
              <IconTrendingUp size={16} />
              +15% ↑
            </StatChange>
          </StatCard>

          <StatCard>
            <StatHeader>
              <StatLabel>{t('dashboard.inquiries')}</StatLabel>
              <StatIcon color={theme.color.purple}>
                <IconMessage size={20} />
              </StatIcon>
            </StatHeader>
            <StatValue>{stats.totalInquiries}</StatValue>
            <StatChange positive>
              <IconTrendingUp size={16} />
              +8% ↑
            </StatChange>
          </StatCard>

          <StatCard>
            <StatHeader>
              <StatLabel>{t('dashboard.activeListings')}</StatLabel>
              <StatIcon color={theme.color.green}>
                <IconHome size={20} />
              </StatIcon>
            </StatHeader>
            <StatValue>{stats.activeListings}</StatValue>
            <StatChange>—</StatChange>
          </StatCard>

          <StatCard>
            <StatHeader>
              <StatLabel>{t('dashboard.conversion')}</StatLabel>
              <StatIcon color={theme.color.orange}>
                <IconTrendingUp size={20} />
              </StatIcon>
            </StatHeader>
            <StatValue>{stats.conversionRate}%</StatValue>
            <StatChange>—</StatChange>
          </StatCard>
        </StatsGrid>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.myListings')}</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <div>{t('dashboard.tableTitle')}</div>
              <div>{t('dashboard.tableStatus')}</div>
              <div>{t('dashboard.tableViews')}</div>
              <div>{t('dashboard.tableInquiries')}</div>
            </TableHeader>
            {myListings.map((listing) => (
              <TableRow
                key={listing.id}
                onClick={() =>
                  (window.location.href = `/marketplace/listings/${listing.id}`)
                }
              >
                <ListingInfo>
                  {listing.isFeatured && <FeaturedBadge>⭐</FeaturedBadge>}
                  <span style={{ fontWeight: 600 }}>{listing.title}</span>
                </ListingInfo>
                <div>
                  <StatusBadge status={listing.status}>
                    {listing.status === 'AVAILABLE' && t('dashboard.statusLive')}
                    {listing.status === 'RESERVED' && t('dashboard.statusReserved')}
                    {listing.status === 'SOLD' && t('dashboard.statusSold')}
                  </StatusBadge>
                </div>
                <div>{listing.views}</div>
                <div>{listing.inquiries}</div>
              </TableRow>
            ))}
          </Table>
        </Card>
      </MaxWidth>
    </Container>
  );
};
