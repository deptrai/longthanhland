import styled from '@emotion/styled';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShareCardPreview } from '../../modules/dainganxanh/share/components/ShareCardPreview';
import { ShareButtons } from '../../modules/dainganxanh/share/components/ShareButtons';
import { useShareCard } from '../../modules/dainganxanh/share/hooks/useShareCard';

const PageWrapper = styled.div`
    min-height: 100vh;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    max-width: 800px;
    margin: 0 auto;
`;

const SuccessIcon = styled.div`
    font-size: 64px;
    margin-bottom: 16px;
    animation: bounce 0.5s ease-in-out;

    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
`;

const Title = styled.h1`
    font-size: 28px;
    font-weight: bold;
    color: #10b981;
    margin-bottom: 8px;
    text-align: center;
`;

const Subtitle = styled.p`
    font-size: 16px;
    color: #64748b;
    margin-bottom: 32px;
    text-align: center;
`;

const ShareSection = styled.div`
    width: 100%;
    margin-top: 24px;
    padding: 24px;
    background: #f8fafc;
    border-radius: 12px;
`;

const ShareTitle = styled.h2`
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 16px;
    text-align: center;
`;

export const OrderSuccessPage = () => {
    const [searchParams] = useSearchParams();

    const userName = searchParams.get('name') || 'Người gieo hạt';
    const treeCount = parseInt(searchParams.get('trees') || '1', 10);
    const co2Absorbed = parseFloat(searchParams.get('co2') || String(treeCount * 10));
    const referralCode = searchParams.get('ref') || undefined;

    const {
        shareData,
        loading,
        fetchShareData,
        handleWebShare,
        handleCopyLink,
        handleDownload,
    } = useShareCard(userName, treeCount, co2Absorbed, referralCode);

    useEffect(() => {
        fetchShareData();
    }, [fetchShareData]);

    return (
        <PageWrapper>
            <Container>
                <SuccessIcon>🎉</SuccessIcon>
                <Title>Cảm ơn bạn đã đặt hàng!</Title>
                <Subtitle>
                    Bạn đã góp phần trồng {treeCount} cây Dó Đen cho Mẹ Thiên Nhiên
                </Subtitle>

                {shareData && (
                    <>
                        <ShareCardPreview
                            svgUrl={shareData.svgUrl}
                            userName={userName}
                            treeCount={treeCount}
                            co2Absorbed={co2Absorbed}
                        />

                        <ShareSection>
                            <ShareTitle>Chia sẻ thành tựu của bạn!</ShareTitle>
                            <ShareButtons
                                onShare={handleWebShare}
                                onCopyLink={handleCopyLink}
                                onDownload={handleDownload}
                            />
                        </ShareSection>
                    </>
                )}

                {loading && (
                    <Subtitle>Đang tải share card...</Subtitle>
                )}
            </Container>
        </PageWrapper>
    );
};
