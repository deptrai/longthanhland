import styled from '@emotion/styled';
import React from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { LotColumn } from './LotColumn';

const BoardContainer = styled.div`
    display: flex;
    gap: 16px;
    overflow-x: auto;
    padding: 16px 0;
    min-height: 600px;
`;

interface KanbanBoardProps {
    lots: any[];
    onTreeMove: (treeId: string, newLotId: string) => Promise<void>;
    onLotClick: (lot: any) => void;
}

export const KanbanBoard = ({ lots, onTreeMove, onLotClick }: KanbanBoardProps) => {
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const treeId = active.id as string;
        const newLotId = over.id as string;

        try {
            await onTreeMove(treeId, newLotId);
        } catch (error) {
            console.error('Failed to move tree:', error);
            // Error handling is done in parent component
        }
    };

    return (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <BoardContainer>
                {lots.map((lot) => (
                    <LotColumn
                        key={lot.id}
                        lot={lot}
                        onClick={() => onLotClick(lot)}
                    />
                ))}
            </BoardContainer>
        </DndContext>
    );
};
