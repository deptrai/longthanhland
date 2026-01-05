import { DashboardStats } from '@/real-estate/components/DashboardStats';
import {
  mockDashboardStats,
  mockRecentProperties,
} from '@/real-estate/data/mock-data';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #a0a0a0;
  margin: 0;
`;

export const DashboardPage = () => {
  const { t } = useLingui();

  return (
    <PageContainer>
      <Header>
        <Title>{t`Dashboard`}</Title>
        <Subtitle>{t`Real Estate Platform Analytics`}</Subtitle>
      </Header>
      <DashboardStats
        stats={mockDashboardStats}
        recentProperties={mockRecentProperties}
      />
    </PageContainer>
  );
};
