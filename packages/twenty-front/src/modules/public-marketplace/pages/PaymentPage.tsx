import styled from '@emotion/styled';
import { IconCheck } from 'twenty-ui';
import { mockSubscriptionPlans } from '../data/mock-data';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const PlansGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
`;

const PlanCard = styled.div<{ featured?: boolean }>`
  background-color: ${({ theme }) => theme.background.secondary};
  border: ${({ theme, featured }) =>
    featured
      ? `2px solid ${theme.color.blue}`
      : `1px solid ${theme.border.color.medium}`};
  border-radius: 16px;
  padding: 2rem;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const PlanHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const PlanName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const PlanPrice = styled.div`
  margin-bottom: 0.5rem;
`;

const Price = styled.span`
  font-size: 3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
`;

const PriceUnit = styled.span`
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-left: 0.5rem;
`;

const PricePeriod = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
`;

const Feature = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const CheckIcon = styled.div`
  color: ${({ theme }) => theme.color.green};
  flex-shrink: 0;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  width: 100%;
  background-color: ${({ theme, variant }) =>
    variant === 'secondary' ? theme.background.primary : theme.color.blue};
  color: ${({ theme, variant }) =>
    variant === 'secondary' ? theme.font.color.primary : 'white'};
  border: ${({ theme, variant }) =>
    variant === 'secondary' ? `1px solid ${theme.border.color.medium}` : 'none'};
  border-radius: 8px;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme, variant }) =>
      variant === 'secondary' ? theme.background.tertiary : theme.color.blue70};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PaymentPage = () => {
  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleUpgrade = (planId: string) => {
    console.log('Upgrading to plan:', planId);
    // In real implementation, this would redirect to payment gateway
  };

  return (
    <Container>
      <MaxWidth>
        <Header>
          <Title>Upgrade Subscription</Title>
          <Subtitle>Choose your plan</Subtitle>
        </Header>

        <PlansGrid>
          {mockSubscriptionPlans.map((plan, index) => (
            <PlanCard key={plan.id} featured={index === 1}>
              {index === 1 && <FeaturedBadge>Most Popular</FeaturedBadge>}
              <PlanHeader>
                <PlanName>{plan.name}</PlanName>
                <PlanPrice>
                  <Price>{formatPrice(plan.price)}</Price>
                  {plan.price > 0 && <PriceUnit>VND</PriceUnit>}
                </PlanPrice>
                {plan.price > 0 && <PricePeriod>per month</PricePeriod>}
              </PlanHeader>

              <FeaturesList>
                {plan.features.map((feature, idx) => (
                  <Feature key={idx}>
                    <CheckIcon>
                      <IconCheck size={16} />
                    </CheckIcon>
                    {feature}
                  </Feature>
                ))}
              </FeaturesList>

              <Button
                variant={index === 0 ? 'secondary' : 'primary'}
                onClick={() => handleUpgrade(plan.id)}
                disabled={index === 0}
              >
                {index === 0 ? 'Current Plan' : 'Upgrade'}
              </Button>
            </PlanCard>
          ))}
        </PlansGrid>
      </MaxWidth>
    </Container>
  );
};
