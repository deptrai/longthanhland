import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import type {
  AgentWorkload,
  LeadDistributionStats,
  SlaDataPoint,
} from '../data/lead-distribution-mock';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
`;

const StyledFilters = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing(4)};
`;

const StyledSelect = styled.select`
  padding: ${({ theme }) => `${theme.spacing(2)} ${theme.spacing(3)}`};
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 14px;
  cursor: pointer;
`;

const StyledButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing(2)} ${theme.spacing(4)}`};
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }
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
  font-weight: 600;
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

const StyledSlaIndicator = styled.span<{ $compliance: number }>`
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 13px;
  font-weight: 500;
  padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(2)}`};

  ${({ $compliance }) => {
    if ($compliance >= 95) {
      return 'background: rgba(34, 197, 94, 0.1); color: #22c55e;';
    } else if ($compliance >= 90) {
      return 'background: rgba(234, 179, 8, 0.1); color: #eab308;';
    } else {
      return 'background: rgba(239, 68, 68, 0.1); color: #ef4444;';
    }
  }}
`;

const StyledWarning = styled.div`
  background: rgba(234, 179, 8, 0.1);
  padding: ${({ theme }) => theme.spacing(3)};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 13px;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-top: ${({ theme }) => theme.spacing(4)};
`;

const StyledChartContainer = styled.div`
  height: 200px;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => `${theme.spacing(4)} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const StyledChartBar = styled.div<{ $height: number; $isAboveTarget: boolean }>`
  flex: 1;
  height: ${({ $height }) => $height}%;
  background: ${({ $isAboveTarget }) =>
    $isAboveTarget
      ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
      : 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)'};
  border-radius: ${({ theme }) =>
    `${theme.border.radius.sm} ${theme.border.radius.sm} 0 0`};
  position: relative;
  transition: height 0.3s ease;

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

const StyledTargetLine = styled.div`
  align-items: center;
  background: rgba(156, 163, 175, 0.5);
  display: flex;
  height: 2px;
  position: absolute;
  top: 5%;
  width: 100%;

  &::after {
    color: ${({ theme }) => theme.font.color.tertiary};
    content: 'Target (95%)';
    font-size: 11px;
    position: absolute;
    right: 0;
    top: -20px;
  }
`;

const StyledManualOverride = styled.div`
  align-items: center;
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
  margin-top: ${({ theme }) => theme.spacing(4)};
  padding-top: ${({ theme }) => theme.spacing(4)};
`;

const StyledOverrideLabel = styled.div`
  color: ${({ theme }) => theme.font.color.secondary};
  flex-shrink: 0;
  font-size: 14px;
`;

interface LeadDistributionDashboardProps {
  stats: LeadDistributionStats;
  agentWorkloads: AgentWorkload[];
  slaData: SlaDataPoint[];
  onReassign?: (leadId: string, agentId: string) => void;
}

export const LeadDistributionDashboard = ({
  stats,
  agentWorkloads,
  slaData,
  onReassign,
}: LeadDistributionDashboardProps) => {
  const { t } = useLingui();

  return (
    <StyledContainer>
      <StyledFilters>
        <span>{t`Today: Dec 9, 2025`}</span>
        <StyledSelect>
          <option>{t`This Week`}</option>
          <option>{t`This Month`}</option>
          <option>{t`This Quarter`}</option>
        </StyledSelect>
        <StyledSelect>
          <option>{t`Sales Team A`}</option>
          <option>{t`Sales Team B`}</option>
          <option>{t`All Teams`}</option>
        </StyledSelect>
        <StyledButton>⚙️ {t`Rules`}</StyledButton>
      </StyledFilters>

      <StyledStatsGrid>
        <StyledStatCard>
          <StyledStatLabel>{t`Leads Today`}</StyledStatLabel>
          <StyledStatValue>
            {stats.leadsToday} {t`leads`}
          </StyledStatValue>
          <StyledStatSubtext>
            {stats.leadsTodayChange > 0 ? '+' : ''}
            {stats.leadsTodayChange} {t`vs yesterday`}
          </StyledStatSubtext>
        </StyledStatCard>

        <StyledStatCard>
          <StyledStatLabel>{t`SLA Compliance`}</StyledStatLabel>
          <StyledStatValue>{stats.slaCompliance}%</StyledStatValue>
          <StyledStatSubtext>
            {t`Target:`} {stats.slaTarget}%
          </StyledStatSubtext>
        </StyledStatCard>

        <StyledStatCard>
          <StyledStatLabel>{t`Avg Response Time`}</StyledStatLabel>
          <StyledStatValue>{stats.avgResponseTime}</StyledStatValue>
          <StyledStatSubtext>
            {t`Target:`} {stats.avgResponseTarget}
          </StyledStatSubtext>
        </StyledStatCard>
      </StyledStatsGrid>

      <StyledSection>
        <StyledSectionTitle>{t`Workload Distribution (This Week)`}</StyledSectionTitle>
        <StyledTable>
          <thead>
            <tr>
              <StyledTableHeader>{t`Agent`}</StyledTableHeader>
              <StyledTableHeader>{t`Assigned`}</StyledTableHeader>
              <StyledTableHeader>{t`Following`}</StyledTableHeader>
              <StyledTableHeader>{t`Qualified`}</StyledTableHeader>
              <StyledTableHeader>{t`SLA %`}</StyledTableHeader>
            </tr>
          </thead>
          <tbody>
            {agentWorkloads.map((agent) => (
              <StyledTableRow key={agent.id}>
                <StyledTableCell>{agent.name}</StyledTableCell>
                <StyledTableCell>{agent.assigned}</StyledTableCell>
                <StyledTableCell>{agent.following}</StyledTableCell>
                <StyledTableCell>{agent.qualified}</StyledTableCell>
                <StyledTableCell>
                  <StyledSlaIndicator $compliance={agent.slaCompliance}>
                    {agent.slaCompliance}%{' '}
                    {agent.slaCompliance >= 95
                      ? '✅'
                      : agent.slaCompliance >= 90
                        ? '⚠️'
                        : '❌'}
                  </StyledSlaIndicator>
                </StyledTableCell>
              </StyledTableRow>
            ))}
          </tbody>
        </StyledTable>
        <StyledWarning>
          {t`Balance Score:`} {stats.balanceScore}/100 ({t`Good`})
          {stats.warnings.length > 0 && (
            <>
              <br />
              ⚠️ {stats.warnings.join(', ')}
            </>
          )}
        </StyledWarning>
      </StyledSection>

      <StyledSection>
        <StyledSectionTitle>{t`SLA Performance (Last 7 Days)`}</StyledSectionTitle>
        <StyledChartContainer>
          <StyledTargetLine />
          {slaData.map((data) => (
            <StyledChartBar
              key={data.day}
              $height={data.compliance}
              $isAboveTarget={data.compliance >= 95}
              title={`${data.day}: ${data.compliance}%`}
            />
          ))}
        </StyledChartContainer>
        <StyledChartLabels>
          {slaData.map((data) => (
            <div key={data.day}>{data.day}</div>
          ))}
        </StyledChartLabels>
      </StyledSection>

      <StyledSection>
        <StyledSectionTitle>{t`Manual Override`}</StyledSectionTitle>
        <StyledManualOverride>
          <StyledOverrideLabel>{t`Lead: Nguyen Van X → Currently: Luis Phan`}</StyledOverrideLabel>
          <StyledSelect>
            <option>{t`Reassign to...`}</option>
            {agentWorkloads.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.available} {t`slots`})
              </option>
            ))}
          </StyledSelect>
          <StyledButton onClick={() => onReassign?.('lead-1', 'agent-2')}>
            {t`Apply`}
          </StyledButton>
        </StyledManualOverride>
      </StyledSection>
    </StyledContainer>
  );
};
