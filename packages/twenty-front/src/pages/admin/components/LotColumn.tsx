import styled from '@emotion/styled';
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TreeCard } from './TreeCard';
import { TreeLot } from '../../../modules/dainganxanh/admin/types/lot-management.types';

const Column = styled.div<{ isOver: boolean }>`
    min-width: 300px;
    background: ${({ isOver }) => (isOver ? '#f0f9ff' : '#ffffff')};
    border: 2px solid ${({ isOver }) => (isOver ? '#3b82f6' : '#e2e8f0')};
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
    cursor: pointer;

    &:hover {
        background: #f8fafc;
        border-radius: 4px;
        padding: 4px 8px;
        margin: -4px -8px 8px;
    }
`;

const LotName = styled.h3`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
`;

const CapacityBar = styled.div`
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 8px;
`;

const CapacityFill = styled.div<{ percentage: number }>`
    height: 100%;
    width: ${({ percentage }) => percentage}%;
    background: ${({ percentage }) =>
        percentage > 95 ? '#ef4444' : percentage > 80 ? '#f59e0b' : '#10b981'};
    transition: width 0.3s, background 0.3s;
`;

const CapacityText = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 4px;
`;

const TreeList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 200px;
`;

const OperatorBadge = styled.div`
    font-size: 11px;
    color: #64748b;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 12px;
`;

interface LotColumnProps {
    lot: TreeLot;
    onClick: () => void;
}

export const LotColumn = ({ lot, onClick }: LotColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id: lot.id,
    });

    const capacityPercentage = lot.capacity
        ? (lot.treeCount / lot.capacity) * 100
        : 0;

    return (
        <Column ref={setNodeRef} isOver={isOver}>
            <Header onClick={onClick}>
                <div>
                    <LotName>{lot.lotName || lot.name}</LotName>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {lot.lotCode}
                    </div>
                </div>
                {lot.assignedOperator && (
                    <OperatorBadge>{lot.assignedOperator.name}</OperatorBadge>
                )}
            </Header>

            <div>
                <CapacityBar>
                    <CapacityFill percentage={capacityPercentage} />
                </CapacityBar>
                <CapacityText>
                    {lot.treeCount || 0} / {lot.capacity || 0} trees
                </CapacityText>
            </div>

            <TreeList>
                {lot.trees?.map((tree: any) => (
                    <TreeCard key={tree.id} tree={tree} />
                ))}
            </TreeList>
        </Column>
    );
};
