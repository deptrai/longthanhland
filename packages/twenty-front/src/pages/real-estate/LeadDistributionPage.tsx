import { LeadDistributionDashboard } from '@/real-estate/components/LeadDistributionDashboard';
import {
  mockAgentWorkloads,
  mockDistributionStats,
  mockSlaData,
} from '@/real-estate/data/lead-distribution-mock';
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

export const LeadDistributionPage = () => {
  const { t } = useLingui();

  const handleReassign = (leadId: string, agentId: string) => {
    alert(`Lead ${leadId} reassigned to agent ${agentId}`);
  };

  return (
    <PageContainer>
      <StyledHeader>
        <StyledTitle>{t`📊 Lead Distribution Dashboard`}</StyledTitle>
        <StyledSubtitle>
          {t`Monitor lead allocation and SLA compliance across sales team`}
        </StyledSubtitle>
      </StyledHeader>
      <StyledContent>
        <LeadDistributionDashboard
          stats={mockDistributionStats}
          agentWorkloads={mockAgentWorkloads}
          slaData={mockSlaData}
          onReassign={handleReassign}
        />
      </StyledContent>
    </PageContainer>
  );
};
