import styled from '@emotion/styled';

const SkeletonPulse = styled.div`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.background.tertiary} 25%,
    ${({ theme }) => theme.background.secondary} 50%,
    ${({ theme }) => theme.background.tertiary} 75%
  );
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

const StyledSkeletonCard = styled.div`
  background: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.light};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: 16px;
`;

const SkeletonPhoto = styled(SkeletonPulse)`
  width: 100%;
  height: 120px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  margin-bottom: 12px;
`;

const SkeletonText = styled(SkeletonPulse) <{ width?: string }>`
  height: 16px;
  border-radius: 4px;
  width: ${({ width }) => width || '100%'};
  margin-bottom: 8px;
`;

const SkeletonBadge = styled(SkeletonPulse)`
  width: 80px;
  height: 24px;
  border-radius: 12px;
  margin-bottom: 12px;
`;

const SkeletonRow = styled(SkeletonPulse)`
  height: 14px;
  border-radius: 4px;
  width: 60%;
  margin-bottom: 6px;
`;

export const TreeCardSkeleton = () => {
    return (
        <StyledSkeletonCard data-testid="tree-card-skeleton">
            <SkeletonPhoto />
            <SkeletonText width="70%" />
            <SkeletonBadge />
            <SkeletonRow />
            <SkeletonRow />
        </StyledSkeletonCard>
    );
};
