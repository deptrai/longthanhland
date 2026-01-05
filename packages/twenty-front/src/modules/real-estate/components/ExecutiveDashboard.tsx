import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import type {
  ExecutiveStats,
  Leaderboard,
  PipelineHealth,
  ProjectPerformance,
  RevenueTrendPoint,
} from '../data/executive-mock';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
`;

const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

const StyledPeriod = styled.div`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 16px;
`;

const StyledStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing(4)};
`;

const StyledStatCard = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: ${({ theme }) => theme.spacing(6)};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const StyledStatLabel = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

const StyledStatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: ${({ theme }) => theme.spacing(1)};
`;

const StyledStatSubtext = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 13px;
`;

const StyledSection = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: ${({ theme }) => theme.spacing(6)};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const StyledSectionTitle = styled.h3`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 ${({ theme }) => theme.spacing(5)} 0;
  padding-bottom: ${({ theme }) => theme.spacing(4)};
`;

const StyledTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const StyledTableHeader = styled.th`
  text-align: left;
  padding: ${({ theme }) => `${theme.spacing(3)} ${theme.spacing(4)}`};
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.font.color.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const StyledTableRow = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.background.transparent.light};
  }
`;

const StyledTableCell = styled.td`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 14px;
  padding: ${({ theme }) => `${theme.spacing(4)} ${theme.spacing(4)}`};
`;

const StyledStatusBadge = styled.span<{ $status: string }>`
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 13px;
  font-weight: 500;
  padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(2)}`};

  ${({ $status }) => {
    switch ($status) {
      case 'on_track':
        return 'background: rgba(34, 197, 94, 0.1); color: #22c55e;';
      case 'monitor':
        return 'background: rgba(234, 179, 8, 0.1); color: #eab308;';
      case 'planning':
        return 'background: rgba(59, 130, 246, 0.1); color: #3b82f6;';
      default:
        return 'background: rgba(156, 163, 175, 0.1); color: #9ca3af;';
    }
  }}
`;

const StyledTwoColumn = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing(4)};
`;

const StyledLeaderboardItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing(3)} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};

  &:last-child {
    border-bottom: none;
  }
`;

const StyledLeaderboardLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`;

const StyledMedal = styled.div`
  font-size: 24px;
`;

const StyledLeaderboardName = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 15px;
  font-weight: 600;
`;

const StyledLeaderboardStats = styled.div`
  text-align: right;
`;

const StyledLeaderboardDeals = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 14px;
  font-weight: 500;
`;

const StyledLeaderboardRevenue = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 12px;
`;

const StyledHealthMetric = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing(3)} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};

  &:last-child {
    border-bottom: none;
  }
`;

const StyledMetricLabel = styled.div`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 14px;
`;

const StyledMetricValue = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 14px;
  font-weight: 600;
`;

const StyledChartContainer = styled.div`
  height: 200px;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => `${theme.spacing(4)} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const StyledChartBar = styled.div<{ $height: number }>`
  flex: 1;
  height: ${({ $height }) => $height}%;
  background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: ${({ theme }) =>
    `${theme.border.radius.sm} ${theme.border.radius.sm} 0 0`};
  position: relative;
  transition: height 0.3s ease;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const StyledChartLabels = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  font-size: 12px;
  justify-content: space-around;
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

interface ExecutiveDashboardProps {
  stats: ExecutiveStats;
  projectPerformance: ProjectPerformance[];
  leaderboard: Leaderboard[];
  pipelineHealth: PipelineHealth;
  revenueTrend: RevenueTrendPoint[];
}

export const ExecutiveDashboard = ({
  stats,
  projectPerformance,
  leaderboard,
  pipelineHealth,
  revenueTrend,
}: ExecutiveDashboardProps) => {
  const { t } = useLingui();

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B VND';
    }
    return (value / 1000000).toFixed(0) + 'M VND';
  };

  const getProgressPercent = (current: number, target: number) => {
    return Math.round((current / target) * 100);
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'on_track':
        return `🟢 ${t`On Track`}`;
      case 'monitor':
        return `🟡 ${t`Monitor`}`;
      case 'planning':
        return `🔵 ${t`Planning`}`;
      default:
        return status;
    }
  };

  const maxRevenue = Math.max(...revenueTrend.map((d) => d.value));

  return (
    <StyledContainer>
      <StyledHeader>
        <div />
        <StyledPeriod>{t`Dec 2025 Overview`}</StyledPeriod>
      </StyledHeader>

      <StyledStatsGrid>
        <StyledStatCard>
          <StyledStatLabel>💰 {t`Revenue MTD`}</StyledStatLabel>
          <StyledStatValue>{formatCurrency(stats.revenueMTD)}</StyledStatValue>
          <StyledStatSubtext>
            {t`Target:`} {formatCurrency(stats.revenueTarget)} (
            {getProgressPercent(stats.revenueMTD, stats.revenueTarget)}%)
          </StyledStatSubtext>
        </StyledStatCard>

        <StyledStatCard>
          <StyledStatLabel>🏆 {t`Deals Closed`}</StyledStatLabel>
          <StyledStatValue>
            {stats.dealsClosed} {t`deals`}
          </StyledStatValue>
          <StyledStatSubtext>
            {t`Target:`} {stats.dealsTarget} (
            {getProgressPercent(stats.dealsClosed, stats.dealsTarget)}%)
          </StyledStatSubtext>
        </StyledStatCard>

        <StyledStatCard>
          <StyledStatLabel>📈 {t`Growth Rate`}</StyledStatLabel>
          <StyledStatValue>+{stats.growthRate}%</StyledStatValue>
          <StyledStatSubtext>{t`vs Last Month`}</StyledStatSubtext>
        </StyledStatCard>
      </StyledStatsGrid>

      <StyledSection>
        <StyledSectionTitle>
          {t`Project Performance (This Month)`}
        </StyledSectionTitle>
        <StyledTable>
          <thead>
            <tr>
              <StyledTableHeader>{t`Project`}</StyledTableHeader>
              <StyledTableHeader>{t`Sales`}</StyledTableHeader>
              <StyledTableHeader>{t`Revenue`}</StyledTableHeader>
              <StyledTableHeader>{t`Inventory`}</StyledTableHeader>
              <StyledTableHeader>{t`Status`}</StyledTableHeader>
            </tr>
          </thead>
          <tbody>
            {projectPerformance.map((project) => (
              <StyledTableRow key={project.id}>
                <StyledTableCell>{project.name}</StyledTableCell>
                <StyledTableCell>{project.sales}</StyledTableCell>
                <StyledTableCell>
                  {formatCurrency(project.revenue)}
                </StyledTableCell>
                <StyledTableCell>
                  {project.inventoryAvailable}/{project.inventoryTotal}
                </StyledTableCell>
                <StyledTableCell>
                  <StyledStatusBadge $status={project.status}>
                    {getStatusLabel(project.status)}
                  </StyledStatusBadge>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </tbody>
        </StyledTable>
      </StyledSection>

      <StyledTwoColumn>
        <StyledSection>
          <StyledSectionTitle>{t`Sales Team Leaderboard`}</StyledSectionTitle>
          {leaderboard.map((leader) => (
            <StyledLeaderboardItem key={leader.rank}>
              <StyledLeaderboardLeft>
                <StyledMedal>{getMedalEmoji(leader.rank)}</StyledMedal>
                <div>
                  <StyledLeaderboardName>{leader.name}</StyledLeaderboardName>
                </div>
              </StyledLeaderboardLeft>
              <StyledLeaderboardStats>
                <StyledLeaderboardDeals>
                  {leader.deals} {t`deals`}
                </StyledLeaderboardDeals>
                <StyledLeaderboardRevenue>
                  {formatCurrency(leader.revenue)}
                </StyledLeaderboardRevenue>
              </StyledLeaderboardStats>
            </StyledLeaderboardItem>
          ))}
        </StyledSection>

        <StyledSection>
          <StyledSectionTitle>{t`Pipeline Health`}</StyledSectionTitle>
          <StyledHealthMetric>
            <StyledMetricLabel>{t`Conversion Rate:`}</StyledMetricLabel>
            <StyledMetricValue>
              {pipelineHealth.conversionRate}% ({t`Team Avg:`}{' '}
              {pipelineHealth.teamAverage}%)
            </StyledMetricValue>
          </StyledHealthMetric>
          <StyledHealthMetric>
            <StyledMetricLabel>{t`Avg Days to Close:`}</StyledMetricLabel>
            <StyledMetricValue>
              {pipelineHealth.avgDaysToClose} {t`days`} ({t`Target:`}{' '}
              {pipelineHealth.targetDays} {t`days`})
            </StyledMetricValue>
          </StyledHealthMetric>
          <StyledHealthMetric>
            <StyledMetricLabel>{t`Active Deals:`}</StyledMetricLabel>
            <StyledMetricValue>{pipelineHealth.activeDeals}</StyledMetricValue>
          </StyledHealthMetric>
          <StyledHealthMetric>
            <StyledMetricLabel>{t`Deal Value:`}</StyledMetricLabel>
            <StyledMetricValue>
              {formatCurrency(pipelineHealth.dealValue)}
            </StyledMetricValue>
          </StyledHealthMetric>
        </StyledSection>
      </StyledTwoColumn>

      <StyledSection>
        <StyledSectionTitle>{t`Revenue Trend (Last 12 Months)`}</StyledSectionTitle>
        <StyledChartContainer>
          {revenueTrend.map((data) => (
            <StyledChartBar
              key={data.month}
              $height={(data.value / maxRevenue) * 100}
              title={`${data.month}: ${formatCurrency(data.value)}`}
            />
          ))}
        </StyledChartContainer>
        <StyledChartLabels>
          {revenueTrend.map((data) => (
            <div key={data.month}>{data.month}</div>
          ))}
        </StyledChartLabels>
      </StyledSection>
    </StyledContainer>
  );
};
