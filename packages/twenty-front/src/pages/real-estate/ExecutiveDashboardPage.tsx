import { ExecutiveDashboard } from '@/real-estate/components/ExecutiveDashboard';
import {
  mockExecutiveStats,
  mockLeaderboard,
  mockPipelineHealth,
  mockProjectPerformance,
  mockRevenueTrend,
} from '@/real-estate/data/executive-mock';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';

const StyledHeader = styled.div`
  margin-bottom: 24px;
  padding: 20px;
`;

const StyledTitle = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 8px 0;
`;

const StyledSubtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin: 0;
`;

const StyledContent = styled.div`
  padding: 0 20px 20px 20px;
`;

export const ExecutiveDashboardPage = () => {
  const { t } = useLingui();

  return (
    <PageContainer>
      <StyledHeader>
        <StyledTitle>{t`📊 Executive Dashboard`}</StyledTitle>
        <StyledSubtitle>
          {t`High-level overview of company performance and key metrics`}
        </StyledSubtitle>
      </StyledHeader>
      <StyledContent>
        <ExecutiveDashboard
          stats={mockExecutiveStats}
          projectPerformance={mockProjectPerformance}
          leaderboard={mockLeaderboard}
          pipelineHealth={mockPipelineHealth}
          revenueTrend={mockRevenueTrend}
        />
      </StyledContent>
    </PageContainer>
  );
};
