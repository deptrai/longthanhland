import styled from '@emotion/styled';

import { TreeStatus } from '@/dainganxanh/my-garden/components/TreeCard';
import { formatCO2Display, getAgeInMonths, formatAge } from '../utils/carbonCalculator';

interface TreeHeroSectionProps {
    treeCode: string;
    status: TreeStatus;
    co2Absorbed: number;
    plantingDate: string;
    photoUrl?: string;
    treeName?: string;
    healthScore?: number;
}

const StyledHero = styled.div`
  position: relative;
  margin-bottom: 24px;
`;

const StyledPhotoContainer = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #2D5016 0%, #4A8522 50%, #8BC34A 100%);
  border-radius: ${({ theme }) => theme.border.radius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  overflow: hidden;
`;

const StyledPhoto = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const StyledInfoOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  border-radius: 0 0 8px 8px;
  color: white;
`;

const StyledTreeCode = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const StyledTreeName = styled.div`
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 12px;
`;

const StatusBadge = styled.span<{ status: TreeStatus }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  background: ${({ status }) => {
        switch (status) {
            case 'SEEDLING':
                return '#4CAF50';
            case 'GROWING':
                return '#8BC34A';
            case 'MATURE':
                return '#2D5016';
            case 'HARVESTED':
                return '#FF9800';
            default:
                return '#9E9E9E';
        }
    }};
  color: white;
`;

const StyledQuickStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 24px;
`;

const StyledStatCard = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  padding: 16px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  text-align: center;
`;

const StyledStatIcon = styled.div`
  font-size: 28px;
  margin-bottom: 8px;
`;

const StyledStatValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: #2D5016;
`;

const StyledStatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-top: 4px;
`;

export const TreeHeroSection = ({
    treeCode,
    status,
    co2Absorbed,
    plantingDate,
    photoUrl,
    treeName,
    healthScore = 100,
}: TreeHeroSectionProps) => {
    const ageMonths = getAgeInMonths(plantingDate);

    return (
        <StyledHero data-testid="tree-hero-section">
            <StyledPhotoContainer>
                {photoUrl ? (
                    <StyledPhoto src={photoUrl} alt={treeCode} />
                ) : (
                    '🌳'
                )}
                <StyledInfoOverlay>
                    <StyledTreeCode>{treeCode}</StyledTreeCode>
                    {treeName && <StyledTreeName>{treeName}</StyledTreeName>}
                    <StatusBadge status={status}>{status}</StatusBadge>
                </StyledInfoOverlay>
            </StyledPhotoContainer>

            <StyledQuickStats>
                <StyledStatCard>
                    <StyledStatIcon>🌍</StyledStatIcon>
                    <StyledStatValue>{formatCO2Display(co2Absorbed)}</StyledStatValue>
                    <StyledStatLabel>CO₂ đã hấp thụ</StyledStatLabel>
                </StyledStatCard>

                <StyledStatCard>
                    <StyledStatIcon>📅</StyledStatIcon>
                    <StyledStatValue>{formatAge(ageMonths)}</StyledStatValue>
                    <StyledStatLabel>Tuổi cây</StyledStatLabel>
                </StyledStatCard>

                <StyledStatCard>
                    <StyledStatIcon>💚</StyledStatIcon>
                    <StyledStatValue>{healthScore}%</StyledStatValue>
                    <StyledStatLabel>Sức khỏe</StyledStatLabel>
                </StyledStatCard>
            </StyledQuickStats>
        </StyledHero>
    );
};
