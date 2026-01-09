import styled from '@emotion/styled';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { useHarvestDecision, HarvestDecision, HarvestOption } from './hooks/useHarvestDecision';

const Container = styled.div`
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
`;

const Header = styled.h1`
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 24px;
`;

const TreeInfo = styled.div`
    background: #f8fafc;
    padding: 24px;
    border-radius: 12px;
    margin-bottom: 32px;
`;

const TreeTitle = styled.h2`
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 16px;
`;

const TreeStats = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
`;

const Stat = styled.div`
    text-align: center;
`;

const StatValue = styled.div`
    font-size: 28px;
    font-weight: bold;
    color: #10b981;
`;

const StatLabel = styled.div`
    font-size: 14px;
    color: #64748b;
    margin-top: 4px;
`;

const OptionsTitle = styled.h3`
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 24px;
    text-align: center;
`;

const OptionsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-bottom: 32px;
`;

const OptionCard = styled.div<{ selected: boolean }>`
    padding: 24px;
    border: 2px solid ${({ selected }) => (selected ? '#10b981' : '#e2e8f0')};
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    background: ${({ selected }) => (selected ? '#f0fdf4' : 'white')};

    &:hover {
        border-color: #10b981;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
    }
`;

const OptionIcon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
`;

const OptionTitle = styled.h4`
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
`;

const OptionDescription = styled.p`
    font-size: 14px;
    color: #64748b;
    margin-bottom: 12px;
`;

const OptionBenefit = styled.div`
    font-size: 14px;
    color: #10b981;
    font-weight: 500;
`;

const ButtonRow = styled.div`
    display: flex;
    justify-content: center;
    gap: 16px;
`;

const SubmitButton = styled.button<{ disabled: boolean }>`
    padding: 16px 32px;
    background: ${({ disabled }) => (disabled ? '#94a3b8' : '#10b981')};
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background: #059669;
    }
`;

const DecisionBadge = styled.div`
    display: inline-block;
    padding: 8px 16px;
    background: #10b981;
    color: white;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    margin-top: 16px;
`;

const LoadingText = styled.p`
    text-align: center;
    color: #64748b;
    padding: 48px;
`;

export const HarvestDecisionPage = () => {
    const { treeCode } = useParams<{ treeCode: string }>();
    const {
        harvestInfo,
        loading,
        submitting,
        selectedOption,
        setSelectedOption,
        submitDecision,
    } = useHarvestDecision(treeCode || '');

    const handleSubmit = async () => {
        if (!selectedOption) return;

        await submitDecision(selectedOption);
    };

    if (loading || !harvestInfo) {
        return (
            <PageContainer>
                <Container>
                    <Header>🌳 Quyết định thu hoạch</Header>
                    <LoadingText>Đang tải thông tin cây...</LoadingText>
                </Container>
            </PageContainer>
        );
    }

    const { tree, harvest, options } = harvestInfo;

    // If decision already made
    if (harvest.decision) {
        return (
            <PageContainer>
                <Container>
                    <Header>🌳 Quyết định thu hoạch</Header>
                    <TreeInfo>
                        <TreeTitle>🌳 Cây {tree.treeCode}</TreeTitle>
                        <DecisionBadge>
                            ✅ Quyết định đã được ghi nhận: {harvest.decision}
                        </DecisionBadge>
                    </TreeInfo>
                </Container>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <Container>
                <Header>🌳 Quyết định thu hoạch</Header>

                <TreeInfo>
                    <TreeTitle>Cây {tree.treeCode}</TreeTitle>
                    <TreeStats>
                        <Stat>
                            <StatValue>{tree.ageMonths}</StatValue>
                            <StatLabel>tháng tuổi</StatLabel>
                        </Stat>
                        <Stat>
                            <StatValue>{tree.status}</StatValue>
                            <StatLabel>Trạng thái</StatLabel>
                        </Stat>
                        <Stat>
                            <StatValue>{tree.location || 'N/A'}</StatValue>
                            <StatLabel>Vị trí</StatLabel>
                        </Stat>
                    </TreeStats>
                </TreeInfo>

                <OptionsTitle>Chọn phương án của bạn</OptionsTitle>

                <OptionsGrid>
                    {options.map((option: HarvestOption) => (
                        <OptionCard
                            key={option.id}
                            selected={selectedOption === option.id}
                            onClick={() => setSelectedOption(option.id)}
                        >
                            <OptionIcon>{option.title.split(' ')[0]}</OptionIcon>
                            <OptionTitle>{option.title}</OptionTitle>
                            <OptionDescription>{option.description}</OptionDescription>
                            {option.estimatedPayout && (
                                <OptionBenefit>💰 {option.estimatedPayout}</OptionBenefit>
                            )}
                            {option.benefit && (
                                <OptionBenefit>✨ {option.benefit}</OptionBenefit>
                            )}
                        </OptionCard>
                    ))}
                </OptionsGrid>

                <ButtonRow>
                    <SubmitButton
                        disabled={!selectedOption || submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? 'Đang gửi...' : 'Xác nhận quyết định'}
                    </SubmitButton>
                </ButtonRow>
            </Container>
        </PageContainer>
    );
};
