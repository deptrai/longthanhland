import styled from '@emotion/styled';

import {
    calculateTotalCO2Absorbed,
    calculateProgressPercent,
    formatCO2Display,
    getCO2Equivalents,
    getCurrentAbsorptionRate,
    getAgeInMonths,
} from '../utils/carbonCalculator';

interface CO2ImpactSectionProps {
    plantingDate: string;
    co2Absorbed?: number;
}

const StyledSection = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  padding: 24px;
  border-radius: ${({ theme }) => theme.border.radius.md};
  margin-bottom: 24px;
`;

const StyledSectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledProgressContainer = styled.div`
  margin-bottom: 24px;
`;

const StyledProgressBar = styled.div`
  height: 12px;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const StyledProgressFill = styled.div<{ percent: number }>`
  height: 100%;
  width: ${({ percent }) => percent}%;
  background: linear-gradient(90deg, #8BC34A 0%, #2D5016 100%);
  border-radius: 6px;
  transition: width 0.5s ease;
`;

const StyledProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const StyledStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
`;

const StyledStat = styled.div`
  text-align: center;
`;

const StyledStatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #2D5016;
`;

const StyledStatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const StyledEquivalents = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StyledEquivalentRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
`;

const StyledEquivalentIcon = styled.span`
  font-size: 24px;
`;

const StyledEquivalentValue = styled.span`
  font-weight: 600;
  color: #2D5016;
  min-width: 60px;
`;

const StyledEquivalentLabel = styled.span`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 14px;
`;

export const CO2ImpactSection = ({ plantingDate, co2Absorbed }: CO2ImpactSectionProps) => {
    const calculatedCO2 = co2Absorbed ?? calculateTotalCO2Absorbed(plantingDate);
    const progressPercent = calculateProgressPercent(plantingDate);
    const ageMonths = getAgeInMonths(plantingDate);
    const yearlyRate = getCurrentAbsorptionRate(ageMonths);
    const equivalents = getCO2Equivalents(calculatedCO2);

    return (
        <StyledSection data-testid="co2-impact-section">
            <StyledSectionTitle>
                🌍 Tác động CO₂
            </StyledSectionTitle>

            <StyledProgressContainer>
                <StyledProgressBar>
                    <StyledProgressFill percent={progressPercent} />
                </StyledProgressBar>
                <StyledProgressLabel>
                    <span>Cây non</span>
                    <span>{progressPercent}% đến trưởng thành (5 năm)</span>
                    <span>Trưởng thành</span>
                </StyledProgressLabel>
            </StyledProgressContainer>

            <StyledStats>
                <StyledStat>
                    <StyledStatValue>{formatCO2Display(calculatedCO2)}</StyledStatValue>
                    <StyledStatLabel>Tổng CO₂ đã hấp thụ</StyledStatLabel>
                </StyledStat>
                <StyledStat>
                    <StyledStatValue>{yearlyRate} kg</StyledStatValue>
                    <StyledStatLabel>CO₂/năm (tốc độ hiện tại)</StyledStatLabel>
                </StyledStat>
            </StyledStats>

            <StyledSectionTitle style={{ fontSize: 14, marginBottom: 12 }}>
                Tương đương với:
            </StyledSectionTitle>

            <StyledEquivalents>
                {equivalents.map((eq) => (
                    <StyledEquivalentRow key={eq.label}>
                        <StyledEquivalentIcon>{eq.icon}</StyledEquivalentIcon>
                        <StyledEquivalentValue>{eq.value.toLocaleString()}</StyledEquivalentValue>
                        <StyledEquivalentLabel>{eq.label}</StyledEquivalentLabel>
                    </StyledEquivalentRow>
                ))}
            </StyledEquivalents>
        </StyledSection>
    );
};
