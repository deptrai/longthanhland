import styled from '@emotion/styled';
import { useParams, useNavigate, Navigate } from 'react-router-dom';

import { PageContainer } from '@/ui/layout/page/components/PageContainer';

import {
    TreeHeroSection,
    CO2ImpactSection,
    TreeTimelineSection,
    TreeActionButtons,
} from '@/dainganxanh/tree-detail/components';
import { useTreeDetail } from '@/dainganxanh/tree-detail/hooks/useTreeDetail';

const StyledPageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
`;

const StyledBackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  margin-bottom: 16px;

  &:hover {
    color: ${({ theme }) => theme.font.color.primary};
  }
`;

const StyledSkeleton = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  padding: 48px;
  text-align: center;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const StyledNotFound = styled.div`
  text-align: center;
  padding: 48px;
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
`;

const StyledNotFoundIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const StyledNotFoundTitle = styled.h2`
  font-size: 20px;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 8px 0;
`;

const StyledNotFoundText = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  margin: 0;
`;

export const TreeDetailPage = () => {
    const { treeCode } = useParams<{ treeCode: string }>();
    const navigate = useNavigate();

    // If no treeCode provided, redirect to my-garden
    if (!treeCode) {
        return <Navigate to="/my-garden" replace />;
    }

    const { tree, isLoading, notFound } = useTreeDetail({
        treeCode: treeCode,
    });

    const handleBack = () => {
        navigate('/my-garden');
    };

    if (isLoading) {
        return (
            <PageContainer>
                <StyledPageContainer>
                    <StyledBackButton onClick={handleBack}>
                        ← Quay lại Vườn của tôi
                    </StyledBackButton>
                    <StyledSkeleton>
                        Đang tải thông tin cây...
                    </StyledSkeleton>
                </StyledPageContainer>
            </PageContainer>
        );
    }

    if (notFound || !tree) {
        return (
            <PageContainer>
                <StyledPageContainer>
                    <StyledBackButton onClick={handleBack}>
                        ← Quay lại Vườn của tôi
                    </StyledBackButton>
                    <StyledNotFound>
                        <StyledNotFoundIcon>🔍</StyledNotFoundIcon>
                        <StyledNotFoundTitle>Không tìm thấy cây</StyledNotFoundTitle>
                        <StyledNotFoundText>
                            Cây với mã "{treeCode}" không tồn tại hoặc bạn không có quyền xem.
                        </StyledNotFoundText>
                    </StyledNotFound>
                </StyledPageContainer>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <StyledPageContainer>
                <StyledBackButton onClick={handleBack}>
                    ← Quay lại Vườn của tôi
                </StyledBackButton>

                <TreeHeroSection
                    treeCode={tree.treeCode}
                    status={tree.status}
                    co2Absorbed={tree.calculatedCO2}
                    plantingDate={tree.plantingDate}
                    photoUrl={tree.lastPhotoUrl}
                />

                <CO2ImpactSection
                    plantingDate={tree.plantingDate}
                    co2Absorbed={tree.calculatedCO2}
                />

                <TreeTimelineSection events={tree.timelineEvents} />

                <TreeActionButtons treeCode={tree.treeCode} />
            </StyledPageContainer>
        </PageContainer>
    );
};
