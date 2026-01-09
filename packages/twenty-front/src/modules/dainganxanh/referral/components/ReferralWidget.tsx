import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useReferral } from '../hooks/useReferral';

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary'; fullWidth?: boolean }>`
    padding: 10px 20px;
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
        background: rgba(255, 255, 255, 0.2);
        color: white;
        &:hover { background: rgba(255, 255, 255, 0.3); }
    `}
`;

const Container = styled.div`
    padding: 24px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 12px;
    color: white;
    margin-bottom: 24px;
`;

const Title = styled.h3`
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
`;

const Subtitle = styled.p`
    font-size: 14px;
    opacity: 0.9;
    margin: 0 0 20px;
`;

const Content = styled.div`
    display: flex;
    gap: 24px;
    align-items: flex-start;

    @media (max-width: 768px) {
        flex-direction: column;
    }
`;

const QRSection = styled.div`
    flex-shrink: 0;
`;

const QRCanvas = styled.canvas`
    background: white;
    padding: 12px;
    border-radius: 8px;
    width: 150px;
    height: 150px;
`;

const InfoSection = styled.div`
    flex: 1;
`;

const LinkBox = styled.div`
    background: rgba(255, 255, 255, 0.15);
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    font-family: monospace;
    font-size: 14px;
    word-break: break-all;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
`;

const Stats = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-top: 16px;
`;

const StatBox = styled.div`
    background: rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 8px;
    text-align: center;
`;

const StatValue = styled.div`
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 4px;
`;

const StatLabel = styled.div`
    font-size: 12px;
    opacity: 0.8;
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

export const ReferralWidget = () => {
    const { referralCode, stats, loading, copyLink, shareLink } = useReferral();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        if (referralCode?.url && canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, referralCode.url, {
                width: 150,
                margin: 1,
                color: {
                    dark: '#10b981',
                    light: '#ffffff',
                },
            });
        }
    }, [referralCode]);

    const handleCopy = async () => {
        const success = await copyLink();
        if (success) {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };

    if (loading || !referralCode) {
        return (
            <Container>
                <Title>Referral Program</Title>
                <Subtitle>Loading...</Subtitle>
            </Container>
        );
    }

    return (
        <>
            <Container>
                <Title>🎁 Mời bạn bè, nhận hoa hồng</Title>
                <Subtitle>
                    Nhận 26,000 VND cho mỗi cây bạn bè mua qua link của bạn
                </Subtitle>

                <Content>
                    <QRSection>
                        <QRCanvas ref={canvasRef} />
                    </QRSection>

                    <InfoSection>
                        <LinkBox>{referralCode.url}</LinkBox>

                        <ButtonRow>
                            <StyledButton variant="secondary" onClick={handleCopy} fullWidth>
                                📋 Copy Link
                            </StyledButton>
                            <StyledButton variant="secondary" onClick={shareLink} fullWidth>
                                📱 Chia sẻ
                            </StyledButton>
                        </ButtonRow>

                        {stats && (
                            <Stats>
                                <StatBox>
                                    <StatValue>{stats.totalReferrals}</StatValue>
                                    <StatLabel>Lượt giới thiệu</StatLabel>
                                </StatBox>
                                <StatBox>
                                    <StatValue>{stats.convertedReferrals}</StatValue>
                                    <StatLabel>Đã mua</StatLabel>
                                </StatBox>
                                <StatBox>
                                    <StatValue>
                                        {(stats.totalEarnings / 1000).toFixed(0)}K
                                    </StatValue>
                                    <StatLabel>Tổng hoa hồng</StatLabel>
                                </StatBox>
                                <StatBox>
                                    <StatValue>
                                        {(stats.pendingEarnings / 1000).toFixed(0)}K
                                    </StatValue>
                                    <StatLabel>Chờ thanh toán</StatLabel>
                                </StatBox>
                            </Stats>
                        )}
                    </InfoSection>
                </Content>
            </Container>

            <Toast show={showToast}>✅ Đã copy link!</Toast>
        </>
    );
};
