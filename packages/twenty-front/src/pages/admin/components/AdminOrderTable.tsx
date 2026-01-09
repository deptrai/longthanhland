import styled from '@emotion/styled';
import React from 'react';

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
`;

const Th = styled.th`
    text-align: left;
    padding: 12px 16px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 600;
    color: #475569;
`;

const Td = styled.td`
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
`;

const Tr = styled.tr`
    &:hover {
        background: #f8fafc;
    }
`;

const ActionButton = styled.button`
    padding: 6px 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    
    &:hover {
        background: #1d4ed8;
    }
`;

export interface AdminOrderTableProps {
    orders: any[];
    loading: boolean;
    selectedIds: string[];
    onSelect: (id: string, checked: boolean) => void;
    onVerify: (id: string) => void;
    onAssign: (id: string) => void;
    onView: (order: any) => void;
}

export const AdminOrderTable = ({ orders, loading, selectedIds, onSelect, onVerify, onAssign, onView }: AdminOrderTableProps) => {
    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Table>
            <thead>
                <tr>
                    <Th><input type="checkbox" onChange={(e) => orders.forEach(o => onSelect(o.id, e.target.checked))} /></Th>
                    <Th>Date</Th>
                    <Th>Buyer</Th>
                    <Th>Status</Th>
                    <Th>Amount</Th>
                    <Th>Actions</Th>
                </tr>
            </thead>
            <tbody>
                {orders.map(order => (
                    <Tr key={order.id}>
                        <Td>
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(order.id)}
                                onChange={(e) => onSelect(order.id, e.target.checked)}
                            />
                        </Td>
                        <Td>{new Date(order.createdAt).toLocaleDateString()}</Td>
                        <Td>{order.buyer?.email}</Td>
                        <Td>{order.status}</Td>
                        <Td>{order.amount?.toLocaleString()} ({order.currency})</Td>
                        <Td>
                            <ActionButton onClick={() => onVerify(order.id)}>Verify</ActionButton>
                            <ActionButton onClick={() => onAssign(order.id)} style={{ marginLeft: 8, background: '#10b981' }}>Assign</ActionButton>
                            <ActionButton onClick={() => onView(order)} style={{ marginLeft: 8, background: '#64748b' }}>View</ActionButton>
                        </Td>
                    </Tr>
                ))}
                {orders.length === 0 && (
                    <Tr>
                        <Td colSpan={6} style={{ textAlign: 'center' }}>No orders found</Td>
                    </Tr>
                )}
            </tbody>
        </Table>
    );
};
