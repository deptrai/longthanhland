import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import {
  type DashboardStats as DashboardStatsType,
  type RecentProperty,
} from '../types';

interface DashboardStatsProps {
  stats: DashboardStatsType;
  recentProperties: RecentProperty[];
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
`;

const StatCard = styled.div<{ color?: string }>`
  background: linear-gradient(
    135deg,
    ${({ color }) => color || '#1a1a1a'} 0%,
    #1a1a1a 100%
  );
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px;
`;

const StatLabel = styled.div`
  color: #a0a0a0;
  font-size: 12px;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  text-transform: uppercase;
`;

const StatValue = styled.div`
  font-size: 36px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8px;
`;

const StatPercentage = styled.div<{ color: string }>`
  font-size: 14px;
  color: ${({ color }) => color};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TableCard = styled.div`
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  border-bottom: 1px solid #2a2a2a;
  padding: 20px 24px;
`;

const TableTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 4px 0;
`;

const TableSubtitle = styled.p`
  font-size: 14px;
  color: #a0a0a0;
  margin: 0;
`;

const Table = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const Th = styled.th`
  background: #141414;
  border-bottom: 1px solid #2a2a2a;
  color: #a0a0a0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  padding: 16px 24px;
  text-align: left;
  text-transform: uppercase;
`;

const Td = styled.td`
  padding: 16px 24px;
  color: #ffffff;
  font-size: 14px;
  border-bottom: 1px solid #2a2a2a;
`;

const Tr = styled.tr`
  transition: background 0.15s;

  &:hover {
    background: #1f1f1f;
  }
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ status }) => {
    switch (status) {
      case 'AVAILABLE':
        return '#22c55e20';
      case 'RESERVED':
        return '#eab30820';
      case 'DEPOSIT_PAID':
        return '#f9731620';
      case 'SOLD':
        return '#991b1b20';
      default:
        return '#a0a0a020';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'AVAILABLE':
        return '#22c55e';
      case 'RESERVED':
        return '#eab308';
      case 'DEPOSIT_PAID':
        return '#f97316';
      case 'SOLD':
        return '#991b1b';
      default:
        return '#a0a0a0';
    }
  }};
`;

export const DashboardStats = ({
  stats,
  recentProperties,
}: DashboardStatsProps) => {
  const { t } = useLingui();

  const formatPrice = (price: number) => {
    return (price / 1_000_000_000).toFixed(1) + 'B VND';
  };

  return (
    <Container>
      <StatsGrid>
        <StatCard>
          <StatLabel>{t`Total Properties`}</StatLabel>
          <StatValue>{stats.totalProperties}</StatValue>
        </StatCard>

        <StatCard color="#22c55e15">
          <StatLabel>{t`Available`}</StatLabel>
          <StatValue>{stats.available}</StatValue>
          <StatPercentage color="#22c55e">
            {stats.availablePercentage}%
          </StatPercentage>
        </StatCard>

        <StatCard color="#eab30815">
          <StatLabel>{t`Reserved`}</StatLabel>
          <StatValue>{stats.reserved}</StatValue>
          <StatPercentage color="#eab308">
            {stats.reservedPercentage}%
          </StatPercentage>
        </StatCard>

        <StatCard color="#991b1b15">
          <StatLabel>{t`Sold`}</StatLabel>
          <StatValue>{stats.sold}</StatValue>
          <StatPercentage color="#991b1b">
            {stats.soldPercentage}%
          </StatPercentage>
        </StatCard>
      </StatsGrid>

      <TableCard>
        <TableHeader>
          <TableTitle>{t`Recent Properties`}</TableTitle>
          <TableSubtitle>{t`Showing ${1}-${recentProperties.length} of ${stats.totalProperties} properties`}</TableSubtitle>
        </TableHeader>
        <Table>
          <thead>
            <tr>
              <Th>{t`Plot`}</Th>
              <Th>{t`Block`}</Th>
              <Th>{t`Area`}</Th>
              <Th>{t`Price`}</Th>
              <Th>{t`Status`}</Th>
              <Th>{t`Reserved By`}</Th>
              <Th>{t`Actions`}</Th>
            </tr>
          </thead>
          <tbody>
            {recentProperties.map((property) => (
              <Tr key={property.id}>
                <Td>{property.plotNumber}</Td>
                <Td>{property.block}</Td>
                <Td>{property.area} m²</Td>
                <Td>{formatPrice(property.price)}</Td>
                <Td>
                  <StatusBadge status={property.status}>
                    {property.status.replace('_', ' ')}
                  </StatusBadge>
                </Td>
                <Td>{property.reservedByName || '-'}</Td>
                <Td>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {t`View`}
                  </button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableCard>
    </Container>
  );
};
