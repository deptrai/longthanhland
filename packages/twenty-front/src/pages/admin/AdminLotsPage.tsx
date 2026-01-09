import styled from '@emotion/styled';
import React, { useState } from 'react';
import { useAdminLots } from '../../modules/dainganxanh/admin/hooks/useAdminLots';
import { KanbanBoard } from './components/KanbanBoard';
import { LotDetailsPanel } from './components/LotDetailsPanel';
import { TreeLot } from '../../modules/dainganxanh/admin/types/lot-management.types';

const PageWrapper = styled.div`
    min-height: 100vh;
    background: #f8fafc;
`;

const PageContainer = styled.div`
    max-width: 1600px;
    margin: 0 auto;
`;

const Container = styled.div`
    padding: 24px;
`;

const LoadingMessage = styled.div`
    text-align: center;
    padding: 48px;
    color: #64748b;
`;

const ErrorMessage = styled.div`
    text-align: center;
    padding: 48px;
    color: #ef4444;
    background: #fef2f2;
    border-radius: 8px;
    margin: 24px;
`;

export const AdminLotsPage = () => {
    const { lots, loading, error, reassignTree, assignOperator } = useAdminLots();
    const [selectedLot, setSelectedLot] = useState<TreeLot | null>(null);

    const handleLotClick = (lot: TreeLot) => {
        setSelectedLot(lot);
    };

    const handleClosePanel = () => {
        setSelectedLot(null);
    };

    if (loading) {
        return (
            <PageWrapper>
                <PageContainer>
                    <LoadingMessage>Loading lots...</LoadingMessage>
                </PageContainer>
            </PageWrapper>
        );
    }

    if (error) {
        return (
            <PageWrapper>
                <PageContainer>
                    <ErrorMessage>Error: {error}</ErrorMessage>
                </PageContainer>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <PageContainer>
                <Container>
                    <KanbanBoard
                        lots={lots}
                        onLotClick={handleLotClick}
                        onTreeMove={reassignTree}
                    />
                </Container>

                {selectedLot && (
                    <LotDetailsPanel
                        lot={selectedLot}
                        onClose={handleClosePanel}
                        onAssignOperator={assignOperator}
                    />
                )}
            </PageContainer>
        </PageWrapper>
    );
};
