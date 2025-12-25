import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import type { Lead, LeadStatus } from '../types/sales-tools';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FiltersBar = styled.div`
  background: #1a1a1a;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #2a2a2a;
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterLabel = styled.span`
  font-size: 14px;
  color: #a0a0a0;
  font-weight: 500;
`;

const FilterButton = styled.button<{ active?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ active }) => (active ? '#3b82f6' : '#2a2a2a')};
  background: ${({ active }) => (active ? '#1e40af' : '#0d0d0d')};
  color: ${({ active }) => (active ? '#ffffff' : '#e0e0e0')};

  &:hover {
    border-color: #3b82f6;
  }
`;

const LeadsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LeadCard = styled.div<{ slaStatus: string }>`
  background: #1a1a1a;
  border: 1px solid
    ${({ slaStatus }) => {
      switch (slaStatus) {
        case 'OVERDUE':
          return '#ef4444';
        case 'WARNING':
          return '#f59e0b';
        default:
          return '#2a2a2a';
      }
    }};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3b82f6;
    transform: translateX(4px);
  }
`;

const LeadHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const LeadInfo = styled.div`
  flex: 1;
`;

const LeadName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
`;

const LeadContact = styled.div`
  color: #a0a0a0;
  font-size: 13px;
`;

const LeadBadges = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
`;

const StatusBadge = styled.span<{ status: LeadStatus }>`
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ status }) => {
    switch (status) {
      case 'QUALIFIED':
        return '#15803d';
      case 'CONTACTED':
        return '#1e40af';
      case 'NEW':
        return '#b45309';
      case 'LOST':
        return '#991b1b';
      default:
        return '#374151';
    }
  }};
  color: #ffffff;
`;

const SLAIndicator = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ status }) => {
    switch (status) {
      case 'OVERDUE':
        return 'rgba(239, 68, 68, 0.2)';
      case 'WARNING':
        return 'rgba(245, 158, 11, 0.2)';
      default:
        return 'rgba(34, 197, 94, 0.2)';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'OVERDUE':
        return '#ef4444';
      case 'WARNING':
        return '#f59e0b';
      default:
        return '#22c55e';
    }
  }};
`;

const LeadMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #2a2a2a;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaLabel = styled.span`
  color: #6b7280;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const MetaValue = styled.span`
  color: #e0e0e0;
  font-size: 14px;
`;

const EmptyState = styled.div`
  color: #6b7280;
  font-size: 14px;
  padding: 64px 24px;
  text-align: center;
`;

interface MyLeadsProps {
  leads: Lead[];
  onLeadClick?: (leadId: string) => void;
}

export const MyLeads = ({ leads, onLeadClick }: MyLeadsProps) => {
  const { t } = useLingui();
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'ALL'>(
    'ALL',
  );

  const filteredLeads = leads.filter(
    (lead) => selectedStatus === 'ALL' || lead.status === selectedStatus,
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSLAText = (lead: Lead) => {
    const now = new Date();
    const deadline = new Date(lead.slaDeadline);
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      const hoursOverdue = Math.abs(hoursLeft);
      return `🔴 ${Math.floor(hoursOverdue)}${t`h overdue`}`;
    } else if (hoursLeft < 24) {
      return `⚠️ ${Math.floor(hoursLeft)}${t`h left`}`;
    } else {
      const daysLeft = Math.floor(hoursLeft / 24);
      return `✅ ${daysLeft}${t`d left`}`;
    }
  };

  const getStatusLabel = (status: LeadStatus) => {
    switch (status) {
      case 'NEW':
        return t`New`;
      case 'CONTACTED':
        return t`Contacted`;
      case 'QUALIFIED':
        return t`Qualified`;
      case 'LOST':
        return t`Lost`;
      default:
        return status;
    }
  };

  return (
    <Container>
      <FiltersBar>
        <FilterLabel>{t`Filter by status:`}</FilterLabel>
        <FilterButton
          active={selectedStatus === 'ALL'}
          onClick={() => setSelectedStatus('ALL')}
        >
          {t`All`} ({leads.length})
        </FilterButton>
        <FilterButton
          active={selectedStatus === 'NEW'}
          onClick={() => setSelectedStatus('NEW')}
        >
          {t`New`} ({leads.filter((l) => l.status === 'NEW').length})
        </FilterButton>
        <FilterButton
          active={selectedStatus === 'CONTACTED'}
          onClick={() => setSelectedStatus('CONTACTED')}
        >
          {t`Contacted`} ({leads.filter((l) => l.status === 'CONTACTED').length}
          )
        </FilterButton>
        <FilterButton
          active={selectedStatus === 'QUALIFIED'}
          onClick={() => setSelectedStatus('QUALIFIED')}
        >
          {t`Qualified`} ({leads.filter((l) => l.status === 'QUALIFIED').length}
          )
        </FilterButton>
        <FilterButton
          active={selectedStatus === 'LOST'}
          onClick={() => setSelectedStatus('LOST')}
        >
          {t`Lost`} ({leads.filter((l) => l.status === 'LOST').length})
        </FilterButton>
      </FiltersBar>

      <LeadsList>
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              slaStatus={lead.slaStatus}
              onClick={() => onLeadClick?.(lead.id)}
            >
              <LeadHeader>
                <LeadInfo>
                  <LeadName>{lead.customerName}</LeadName>
                  <LeadContact>
                    {lead.email} • {lead.phone}
                  </LeadContact>
                </LeadInfo>
                <LeadBadges>
                  <StatusBadge status={lead.status}>
                    {getStatusLabel(lead.status)}
                  </StatusBadge>
                  <SLAIndicator status={lead.slaStatus}>
                    {getSLAText(lead)}
                  </SLAIndicator>
                </LeadBadges>
              </LeadHeader>

              <LeadMeta>
                <MetaItem>
                  <MetaLabel>{t`Source`}</MetaLabel>
                  <MetaValue>{lead.source}</MetaValue>
                </MetaItem>

                <MetaItem>
                  <MetaLabel>{t`Created`}</MetaLabel>
                  <MetaValue>{formatDate(lead.createdAt)}</MetaValue>
                </MetaItem>

                {lead.lastContactedAt && (
                  <MetaItem>
                    <MetaLabel>{t`Last Contact`}</MetaLabel>
                    <MetaValue>{formatDate(lead.lastContactedAt)}</MetaValue>
                  </MetaItem>
                )}

                <MetaItem>
                  <MetaLabel>{t`SLA Deadline`}</MetaLabel>
                  <MetaValue>{formatDate(lead.slaDeadline)}</MetaValue>
                </MetaItem>
              </LeadMeta>

              {lead.notes && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #2a2a2a',
                    fontSize: '13px',
                    color: '#6b7280',
                  }}
                >
                  📝 {lead.notes}
                </div>
              )}
            </LeadCard>
          ))
        ) : (
          <EmptyState>
            {t`No leads found with status:`} <strong>{selectedStatus}</strong>
          </EmptyState>
        )}
      </LeadsList>
    </Container>
  );
};
