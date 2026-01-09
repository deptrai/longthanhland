import styled from '@emotion/styled';
import { useEffect } from 'react';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    animation: fadeIn 0.5s ease-in;

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const CardImage = styled.img`
    width: 100%;
    max-width: 600px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    margin-bottom: 24px;
`;

const Stats = styled.div`
    display: flex;
    gap: 32px;
    margin-bottom: 24px;
`;

const Stat = styled.div`
    text-align: center;
`;

const StatValue = styled.div`
    font-size: 32px;
    font-weight: bold;
    color: #10b981;
`;

const StatLabel = styled.div`
    font-size: 14px;
    color: #64748b;
    margin-top: 4px;
`;

interface ShareCardPreviewProps {
    svgUrl: string;
    userName: string;
    treeCount: number;
    co2Absorbed: number;
}

export const ShareCardPreview = ({
    svgUrl,
    userName,
    treeCount,
    co2Absorbed,
}: ShareCardPreviewProps) => {
    useEffect(() => {
        // Preload image
        const img = new Image();
        img.src = svgUrl;
    }, [svgUrl]);

    return (
        <Container>
            <CardImage src={svgUrl} alt={`${userName} share card`} />
            <Stats>
                <Stat>
                    <StatValue>🌳 {treeCount}</StatValue>
                    <StatLabel>Cây đã trồng</StatLabel>
                </Stat>
                <Stat>
                    <StatValue>🌍 {co2Absorbed.toFixed(1)}</StatValue>
                    <StatLabel>kg CO₂/năm</StatLabel>
                </Stat>
            </Stats>
        </Container>
    );
};
