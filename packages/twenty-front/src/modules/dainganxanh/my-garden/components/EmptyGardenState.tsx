import styled from '@emotion/styled';

const StyledEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`;

const StyledEmoji = styled.div`
  font-size: 80px;
  margin-bottom: 24px;
`;

const StyledTitle = styled.h2`
  font-size: ${({ theme }) => theme.font.size.lg};
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 8px;
`;

const StyledDescription = styled.p`
  font-size: ${({ theme }) => theme.font.size.md};
  color: ${({ theme }) => theme.font.color.secondary};
  margin-bottom: 24px;
  max-width: 400px;
`;

const StyledCTA = styled.a`
  display: inline-block;
  padding: 12px 24px;
  background: #2D5016;
  color: white;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s ease;

  &:hover {
    background: #3D6B1F;
  }
`;

interface EmptyGardenStateProps {
    onBuyTree?: () => void;
}

export const EmptyGardenState = ({ onBuyTree }: EmptyGardenStateProps) => {
    return (
        <StyledEmptyState data-testid="empty-garden-state">
            <StyledEmoji>🌱</StyledEmoji>
            <StyledTitle>Vườn của bạn đang trống</StyledTitle>
            <StyledDescription>
                Bạn chưa sở hữu cây nào. Hãy bắt đầu hành trình xanh của bạn bằng cách mua cây đầu tiên!
            </StyledDescription>
            {onBuyTree && (
                <StyledCTA onClick={onBuyTree} role="button">
                    🛒 Mua Cây Ngay
                </StyledCTA>
            )}
        </StyledEmptyState>
    );
};
