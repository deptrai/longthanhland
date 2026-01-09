import styled from '@emotion/styled';

interface TreeActionButtonsProps {
    treeCode: string;
    onShare?: () => void;
    onDownloadReport?: () => void;
    onContactSupport?: () => void;
}

const StyledActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`;

const StyledActionButton = styled.button<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  ${({ variant, theme }) =>
        variant === 'primary'
            ? `
        background: #2D5016;
        color: white;
        &:hover {
          background: #1e3a0f;
        }
      `
            : `
        background: ${theme.background.secondary};
        color: ${theme.font.color.primary};
        border: 1px solid ${theme.border.color.light};
        &:hover {
          background: ${theme.background.tertiary};
        }
      `}
`;

const StyledIcon = styled.span`
  font-size: 18px;
`;

export const TreeActionButtons = ({
    treeCode,
    onShare,
    onDownloadReport,
    onContactSupport,
}: TreeActionButtonsProps) => {
    const handleShare = () => {
        if (onShare) {
            onShare();
            return;
        }

        // Default share behavior
        if (navigator.share) {
            navigator.share({
                title: `Cây ${treeCode} - Đại Ngàn Xanh`,
                text: `Xem cây của tôi tại Đại Ngàn Xanh: ${treeCode}`,
                url: window.location.href,
            });
        } else {
            // Copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Đã sao chép link!');
        }
    };

    const handleDownloadReport = () => {
        if (onDownloadReport) {
            onDownloadReport();
            return;
        }
        // TODO: Implement PDF download
        console.log('[TreeActionButtons] Download report for:', treeCode);
        alert('Tính năng đang phát triển');
    };

    const handleContactSupport = () => {
        if (onContactSupport) {
            onContactSupport();
            return;
        }
        // Default: open email
        window.location.href = `mailto:support@dainganxanh.vn?subject=Hỗ trợ cây ${treeCode}`;
    };

    return (
        <StyledActionsContainer data-testid="tree-action-buttons">
            <StyledActionButton variant="primary" onClick={handleShare}>
                <StyledIcon>📤</StyledIcon>
                Chia sẻ
            </StyledActionButton>

            <StyledActionButton variant="secondary" onClick={handleDownloadReport}>
                <StyledIcon>📄</StyledIcon>
                Tải báo cáo PDF
            </StyledActionButton>

            <StyledActionButton variant="secondary" onClick={handleContactSupport}>
                <StyledIcon>💬</StyledIcon>
                Liên hệ hỗ trợ
            </StyledActionButton>
        </StyledActionsContainer>
    );
};
