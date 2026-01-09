import styled from '@emotion/styled';
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { ShareCardPreview } from '../../modules/dainganxanh/share/components/ShareCardPreview';
import { useShareCard } from '../../modules/dainganxanh/share/hooks/useShareCard';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    padding: 24px;
`;

const Title = styled.h1`
    font-size: 32px;
    font-weight: bold;
    color: #1e293b;
    margin-bottom: 16px;
    text-align: center;
`;

const Subtitle = styled.p`
    font-size: 18px;
    color: #64748b;
    margin-bottom: 32px;
    text-align: center;
`;

const RedirectMessage = styled.div`
    margin-top: 32px;
    padding: 16px 24px;
    background: #f8fafc;
    border-radius: 8px;
    color: #64748b;
    font-size: 14px;
`;

export const SharePage = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [searchParams] = useSearchParams();

    const userName = searchParams.get('name') || 'Người gieo hạt';
    const treeCount = parseInt(searchParams.get('trees') || '1', 10);
    const co2Absorbed = parseFloat(searchParams.get('co2') || '10');

    const { shareData, fetchShareData } = useShareCard(
        userName,
        treeCount,
        co2Absorbed,
    );

    useEffect(() => {
        fetchShareData();
    }, [fetchShareData]);

    useEffect(() => {
        // Redirect to homepage after 5 seconds
        const timer = setTimeout(() => {
            window.location.href = 'https://dainganxanh.vn';
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    if (!shareData) {
        return (
            <PageContainer>
                <Container>
                    <Title>Đang tải...</Title>
                </Container>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <Container>
                <Title>{userName} đã trồng {treeCount} cây 🌳</Title>
                <Subtitle>
                    Góp phần hấp thụ {co2Absorbed.toFixed(1)} kg CO₂ mỗi năm
                </Subtitle>

                <ShareCardPreview
                    svgUrl={shareData.svgUrl}
                    userName={userName}
                    treeCount={treeCount}
                    co2Absorbed={co2Absorbed}
                />

                <RedirectMessage>
                    Bạn cũng có thể tham gia trồng rừng tại dainganxanh.vn
                    <br />
                    Đang chuyển hướng trong 5 giây...
                </RedirectMessage>
            </Container>
        </PageContainer>
    );
};
