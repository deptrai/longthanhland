import styled from '@emotion/styled';
import React, { useState } from 'react';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { useAdminLots } from '../../modules/dainganxanh/admin/hooks/useAdminLots';
import { KanbanBoard } from './components/KanbanBoard';
import { LotDetailsPanel } from './components/LotDetailsPanel';
import { TreeLot } from '../../modules/dainganxanh/admin/types/lot-management.types';

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

    const handleTreeMove = async (treeId: string, newLotId: string) => {
        try {
            await reassignTree(treeId, newLotId);
        } catch (err) {
            // Error is already logged in hook
            alert('Failed to move tree. Please check capacity and try again.');
        }
    };

    const handleOperatorAssign = async (lotId: string, operatorId: string) => {
        try {
            await assignOperator(lotId, operatorId);
            setSelectedLot(null);
        } catch (err) {
            alert('Failed to assign operator');
        }
    };

    if (loading) {
        return (
            <SubMenuTopBarContainer title="Lot Management">
                <PageContainer>
                    <LoadingMessage>Loading lots...</LoadingMessage>
                </PageContainer>
            </SubMenuTopBarContainer>
        );
    }

    if (error) {
        return (
            <SubMenuTopBarContainer title="Lot Management">
                <PageContainer>
                    <ErrorMessage>Error: {error}</ErrorMessage>
                </PageContainer>
            </SubMenuTopBarContainer>
        );
    }

    return (
        <SubMenuTopBarContainer title="Lot Management">
            <PageContainer>
                <Container>
                    <KanbanBoard
                        lots={lots}
                        onTreeMove={handleTreeMove}
                        onLotClick={setSelectedLot}
                    />
                </Container>

                {selectedLot && (
                    <LotDetailsPanel
                        lot={selectedLot}
                        onClose={() => setSelectedLot(null)}
                        onAssignOperator={handleOperatorAssign}
                    />
                )}
            </PageContainer>
        </SubMenuTopBarContainer>
    );
};
