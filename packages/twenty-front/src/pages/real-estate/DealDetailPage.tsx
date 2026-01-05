import { DealDetail } from '@/real-estate/components/DealDetail';
import {
  mockDealActivities,
  mockDeals,
} from '@/real-estate/data/customer-deal-mock';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { useNavigate, useParams } from 'react-router-dom';

const Header = styled.div`
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s;

  &:hover {
    color: #2563eb;
  }
`;

const NotFound = styled.div`
  color: #a0a0a0;
  font-size: 16px;
  padding: 48px;
  text-align: center;
`;

export const DealDetailPage = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { id } = useParams();

  const deal = mockDeals.find((d) => d.id === id);
  const activities = mockDealActivities.filter((a) => a.dealId === id);

  if (!deal) {
    return (
      <PageContainer>
        <Header>
          <BackButton onClick={() => navigate('/real-estate/deals')}>
            ← {t`Back to Deals`}
          </BackButton>
        </Header>
        <NotFound>{t`Deal not found`}</NotFound>
      </PageContainer>
    );
  }

  const handleEdit = () => {
    // [ASSUMPTION: In real implementation, open edit modal or navigate to edit page]
    console.log('Edit deal:', deal.id);
  };

  const handleChangeStage = () => {
    // [ASSUMPTION: In real implementation, open stage change dialog]
    console.log('Change stage for deal:', deal.id);
  };

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate('/real-estate/deals')}>
          ← {t`Back to Deals`}
        </BackButton>
      </Header>
      <DealDetail
        deal={deal}
        activities={activities}
        onEdit={handleEdit}
        onChangeStage={handleChangeStage}
      />
    </PageContainer>
  );
};
