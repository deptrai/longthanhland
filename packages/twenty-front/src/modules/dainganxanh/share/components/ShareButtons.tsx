import styled from '@emotion/styled';
import { useState } from 'react';

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary'; fullWidth?: boolean }>`
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};
    
    ${({ variant }) => variant === 'primary' ? `
        background: #10b981;
        color: white;
        &:hover { background: #059669; }
    ` : `
        background: #e2e8f0;
        color: #475569;
        &:hover { background: #cbd5e1; }
    `}
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 400px;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 12px;
`;

const Toast = styled.div<{ show: boolean }>`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: ${({ show }) => (show ? 1 : 0)};
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: 1000;
`;

interface ShareButtonsProps {
    onShare: () => void;
    onCopyLink: () => Promise<boolean>;
    onDownload: () => void;
}

export const ShareButtons = ({
    onShare,
    onCopyLink,
    onDownload,
}: ShareButtonsProps) => {
    const [showToast, setShowToast] = useState(false);

    const handleCopy = async () => {
        const success = await onCopyLink();
        if (success) {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };

    return (
        <>
            <Container>
                <StyledButton variant="primary" onClick={onShare} fullWidth>
                    📱 Chia sẻ
                </StyledButton>
                <ButtonRow>
                    <StyledButton variant="secondary" onClick={handleCopy} fullWidth>
                        🔗 Copy Link
                    </StyledButton>
                    <StyledButton variant="secondary" onClick={onDownload} fullWidth>
                        ⬇️ Tải về
                    </StyledButton>
                </ButtonRow>
            </Container>
            <Toast show={showToast}>✅ Đã copy link!</Toast>
        </>
    );
};
