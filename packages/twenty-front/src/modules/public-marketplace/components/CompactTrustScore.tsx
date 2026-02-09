import styled from '@emotion/styled';
import { IconShield } from 'twenty-ui/display';
import {
    calculateTrustScore,
    type TrustScoreListing,
} from '../utils/calculateTrustScore';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const ShieldWrapper = styled.div<{ score: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${({ theme, score }) => {
    if (score >= 80) return `linear-gradient(135deg, ${theme.color.green} 0%, ${theme.color.green} 100%)`;
    if (score >= 50) return `linear-gradient(135deg, ${theme.color.orange} 0%, ${theme.color.orange} 100%)`;
    return `linear-gradient(135deg, ${theme.color.red} 0%, ${theme.color.red} 100%)`;
  }};
  color: ${({ theme }) => theme.font.color.inverted};
  flex-shrink: 0;
`;

const ScoreText = styled.span<{ score: number }>`
  font-size:     -eem;
  font-weight: 700;
  color: ${({ theme, score }) => {
    if (score >= 80) return theme.color.green;
    if (score >= 50) return theme.color.orange;
    return theme.color.red;
  }};
`;

const ScoreLabel = styled.span<{ score: number }>`
  font-size: 1.375rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  background-color: ${({ theme, score }) => {
    if (score >= 80) return theme.tag.background.green;
    if (score >= 50) return theme.tag.background.orange;
    return theme.tag.background.red;
  }};
  color: ${({ theme, score }) => {
    if (score >= 80) return theme.tag.text.green;
    if (score >= 50) return theme.tag.text.orange;
    return theme.tag.text.red;
  }};
`;

const AIBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.375rem;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.color.blue} 0%, ${theme.color.purple} 100%)`};
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 3px;
  letter-spacing: 0.5px;
`;

const FactorTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
`;

const FactorTag = styled.span<{ percentage: number }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.8125rem;
  border-radius: 3px;
  background-color: ${({ theme, percentage }) => {
    if (percentage >= 80) return theme.tag.background.green;
    if (percentage >= 50) return theme.tag.background.orange;
    return theme.tag.background.red;
  }};
  color: ${({ theme, percentage }) => {
    if (percentage >= 80) return theme.tag.text.green;
    if (percentage >= 50) return theme.tag.text.orange;
    return theme.tag.text.red;
  }};
  font-weight: 500;
`;

const FactorDot = styled.span<{ percentage: number }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ theme, percentage }) => {
    if (percentage >= 80) return theme.color.green;
    if (percentage >= 50) return theme.color.orange;
    return theme.color.red;
  }};
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

interface CompactTrustScoreProps {
  listing: TrustScoreListing;
  showFactors?: boolean;
}

const factorLabels: Record<string, string> = {
  sellerVerification: 'Xác minh',
  listingQuality: 'Chất lượng',
  marketPriceAnalysis: 'Giá thị trường',
  locationVerification: 'Vị trí',
  propertyAuthenticity: 'Xác thực',
  legalCompliance: 'Pháp lý',
  infrastructureScore: 'Hạ tầng',
  environmentalFactors: 'Môi trường',
};

export const CompactTrustScore = ({
  listing,
  showFactors = true,
}: CompactTrustScoreProps) => {
  const { score, breakdown } = calculateTrustScore(listing);

  const getLabel = (s: number): string => {
    if (s >= 90) return 'Xuất sắc';
    if (s >= 80) return 'Cao';
    if (s >= 50) return 'TB';
    return 'Thấp';
  };

  // Get top 3 AI-powered factors sorted by percentage
  const topFactors = Object.entries(breakdown)
    .filter(([, factor]) => factor.aiPowered)
    .map(([key, factor]) => ({
      key,
      label: factorLabels[key] || factor.name,
      percentage: Math.round((factor.points / factor.maxPoints) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return (
    <Wrapper>
      <Container>
        <ShieldWrapper score={score}>
          <IconShield size={16} />
        </ShieldWrapper>
        <ScoreText score={score}>{score}</ScoreText>
        <ScoreLabel score={score}>{getLabel(score)}</ScoreLabel>
        <AIBadge>AI</AIBadge>
      </Container>
      {showFactors && (
        <FactorTags>
          {topFactors.map((factor) => (
            <FactorTag key={factor.key} percentage={factor.percentage}>
              <FactorDot percentage={factor.percentage} />
              {factor.label} {factor.percentage}%
            </FactorTag>
          ))}
        </FactorTags>
      )}
    </Wrapper>
  );
};

