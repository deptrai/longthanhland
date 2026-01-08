import styled from '@emotion/styled';

export type TreeStatus = 'SEEDLING' | 'GROWING' | 'MATURE' | 'HARVESTED';

export interface TreeCardData {
    id: string;
    treeCode: string;
    status: TreeStatus;
    co2Absorbed: number;
    plantingDate: string;
    photoUrl?: string;
    nextMilestoneDate?: string;
}

interface TreeCardProps {
    tree: TreeCardData;
    onClick?: () => void;
}

const StyledCard = styled.div`
  background: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.light};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.boxShadow.light};
    transform: translateY(-2px);
  }
`;

const StyledPhoto = styled.div`
  width: 100%;
  height: 120px;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin-bottom: 12px;
`;

const StyledTreeCode = styled.div`
  font-weight: 600;
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 8px;
`;

const StatusBadge = styled.span<{ status: TreeStatus }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: ${({ theme }) => theme.font.size.xs};
  font-weight: 500;
  background: ${({ status }) => {
        switch (status) {
            case 'SEEDLING':
                return '#E8F5E9';
            case 'GROWING':
                return '#C8E6C9';
            case 'MATURE':
                return '#2D5016';
            case 'HARVESTED':
                return '#FFF3E0';
            default:
                return '#E0E0E0';
        }
    }};
  color: ${({ status }) => {
        switch (status) {
            case 'SEEDLING':
                return '#1B5E20';
            case 'GROWING':
                return '#2E7D32';
            case 'MATURE':
                return '#FFFFFF';
            case 'HARVESTED':
                return '#E65100';
            default:
                return '#424242';
        }
    }};
`;

const StyledInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
`;

const StyledInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.font.color.secondary};
`;

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const calculateDaysUntil = (targetDate?: string): number | null => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : null;
};

export const TreeCard = ({ tree, onClick }: TreeCardProps) => {
    const daysUntilMilestone = calculateDaysUntil(tree.nextMilestoneDate);

    return (
        <StyledCard onClick={onClick} data-testid={`tree-card-${tree.id}`}>
            <StyledPhoto>
                {tree.photoUrl ? (
                    <img src={tree.photoUrl} alt={tree.treeCode} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                    '🌳'
                )}
            </StyledPhoto>

            <StyledTreeCode>{tree.treeCode}</StyledTreeCode>
            <StatusBadge status={tree.status}>{tree.status}</StatusBadge>

            <StyledInfo>
                <StyledInfoRow>
                    🌍 {tree.co2Absorbed.toFixed(1)} kg CO₂
                </StyledInfoRow>
                <StyledInfoRow>
                    📅 {formatDate(tree.plantingDate)}
                </StyledInfoRow>
                {daysUntilMilestone !== null && (
                    <StyledInfoRow>
                        ⏰ {daysUntilMilestone} ngày đến milestone
                    </StyledInfoRow>
                )}
            </StyledInfo>
        </StyledCard>
    );
};
