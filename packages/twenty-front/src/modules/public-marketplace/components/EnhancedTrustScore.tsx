import styled from '@emotion/styled';
import { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconShield } from 'twenty-ui/display';

const Container = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ScoreBadge = styled.div<{ score: number }>`
  align-items: center;
  background-color: ${({ score }) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }};
  border-radius: 8px;
  color: white;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
`;

const ScoreNumber = styled.div`
  font-size: 2rem;
  font-weight: 700;
`;

const ScoreLabel = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: ${({ theme }) => theme.background.tertiary};
  color: ${({ theme }) => theme.font.color.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.quaternary};
  }
`;

const BreakdownGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const FactorCard = styled.div`
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 1rem;
`;

const FactorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`;

const FactorName = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.9375rem;
  font-weight: 600;
`;

const FactorScore = styled.div`
  color: ${({ theme }) => theme.color.blue};
  font-size: 0.875rem;
  font-weight: 600;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${({ theme }) => theme.background.quaternary};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const Progress = styled.div<{ percentage: number }>`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.color.blue},
    ${({ theme }) => theme.color.blue70}
  );
  height: 100%;
  transition: width 0.3s ease;
  width: ${({ percentage }) => percentage}%;
`;

const FactorDetails = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  line-height: 1.5;
`;

const AIBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 4px;
  margin-left: 0.5rem;
`;

interface TrustScoreFactor {
  name: string;
  points: number;
  maxPoints: number;
  details: string[];
  aiPowered?: boolean;
}

interface EnhancedTrustScoreProps {
  score: number;
  breakdown: {
    sellerVerification: TrustScoreFactor;
    listingQuality: TrustScoreFactor;
    marketPriceAnalysis: TrustScoreFactor;
    locationVerification: TrustScoreFactor;
    propertyAuthenticity: TrustScoreFactor;
    legalCompliance: TrustScoreFactor;
    infrastructureScore: TrustScoreFactor;
    environmentalFactors: TrustScoreFactor;
    engagement: TrustScoreFactor;
    platformHistory: TrustScoreFactor;
  };
}

export const EnhancedTrustScore = ({
  score,
  breakdown,
}: EnhancedTrustScoreProps) => {
  const [expanded, setExpanded] = useState(false);

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent Trust';
    if (score >= 80) return 'High Trust';
    if (score >= 70) return 'Good Trust';
    if (score >= 50) return 'Medium Trust';
    return 'Low Trust';
  };

  return (
    <Container>
      <Header>
        <Title>
          <IconShield size={24} />
          Enhanced Trust Score
        </Title>
        <ScoreBadge score={score}>
          <ScoreNumber>{score}</ScoreNumber>
          <ScoreLabel>{getScoreLabel(score)}</ScoreLabel>
        </ScoreBadge>
      </Header>

      <ExpandButton onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide Details' : 'View Detailed Breakdown'}
        {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      </ExpandButton>

      {expanded && (
        <BreakdownGrid>
          {Object.entries(breakdown).map(([key, factor]) => {
            const percentage = (factor.points / factor.maxPoints) * 100;
            return (
              <FactorCard key={key}>
                <FactorHeader>
                  <FactorName>
                    {factor.name}
                    {factor.aiPowered && <AIBadge>AI</AIBadge>}
                  </FactorName>
                  <FactorScore>
                    {factor.points}/{factor.maxPoints}
                  </FactorScore>
                </FactorHeader>
                <ProgressBar>
                  <Progress percentage={percentage} />
                </ProgressBar>
                <FactorDetails>
                  {factor.details.map((detail, index) => (
                    <div key={index}>• {detail}</div>
                  ))}
                </FactorDetails>
              </FactorCard>
            );
          })}
        </BreakdownGrid>
      )}
    </Container>
  );
};
