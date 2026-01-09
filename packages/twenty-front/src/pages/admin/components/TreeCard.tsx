import styled from '@emotion/styled';
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const Card = styled.div<{ isDragging: boolean }>`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px;
    cursor: grab;
    opacity: ${({ isDragging }) => (isDragging ? 0.5 : 1)};
    transition: all 0.2s;

    &:hover {
        border-color: #3b82f6;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    &:active {
        cursor: grabbing;
    }
`;

const TreeCode = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
`;

const TreeInfo = styled.div`
    font-size: 12px;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const StatusBadge = styled.span<{ status: string }>`
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: ${({ status }) => {
        switch (status) {
            case 'PLANTED':
                return '#dcfce7';
            case 'GROWING':
                return '#dbeafe';
            case 'MATURE':
                return '#fef3c7';
            case 'HARVESTED':
                return '#f3e8ff';
            default:
                return '#f1f5f9';
        }
    }};
    color: ${({ status }) => {
        switch (status) {
            case 'PLANTED':
                return '#166534';
            case 'GROWING':
                return '#1e40af';
            case 'MATURE':
                return '#92400e';
            case 'HARVESTED':
                return '#6b21a8';
            default:
                return '#475569';
        }
    }};
`;

interface TreeCardProps {
    tree: any;
}

export const TreeCard = ({ tree }: TreeCardProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: tree.id,
        });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            isDragging={isDragging}
            {...listeners}
            {...attributes}
        >
            <TreeCode>{tree.code || tree.treeCode}</TreeCode>
            <TreeInfo>
                <span>{tree.owner?.email || 'No owner'}</span>
                <StatusBadge status={tree.status}>{tree.status}</StatusBadge>
            </TreeInfo>
        </Card>
    );
};
