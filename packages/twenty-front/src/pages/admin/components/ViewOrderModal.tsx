import styled from '@emotion/styled';
import React from 'react';
import { Button } from './ui/Button';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalContainer = styled.div`
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const Title = styled.h2`
    margin: 0 0 16px;
    font-size: 18px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
`;

const Section = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.div`
    font-weight: 600;
    font-size: 13px;
    color: #64748b;
    margin-bottom: 4px;
`;

const Value = styled.div`
    font-size: 14px;
    color: #1e293b;
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
`;

interface ViewOrderModalProps {
    order: any | null;
    onClose: () => void;
}

export const ViewOrderModal = ({ order, onClose }: ViewOrderModalProps) => {
    if (!order) return null;

    return (
        <Overlay onClick={onClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
                <Title>Order Details: {order.orderCode}</Title>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Section>
                        <Label>Date</Label>
                        <Value>{new Date(order.createdAt).toLocaleString()}</Value>
                    </Section>
                    <Section>
                        <Label>Status</Label>
                        <Value>{order.status} / {order.paymentStatus}</Value>
                    </Section>
                    <Section>
                        <Label>Buyer</Label>
                        <Value>{order.buyer?.email || 'N/A'}</Value>
                    </Section>
                    <Section>
                        <Label>Amount</Label>
                        <Value>{order.amount?.toLocaleString()} {order.currency}</Value>
                    </Section>
                    <Section>
                        <Label>Transaction Hash</Label>
                        <Value>{order.transactionHash || 'N/A'}</Value>
                    </Section>
                    <Section>
                        <Label>Payment Method</Label>
                        <Value>{order.paymentMethod}</Value>
                    </Section>
                </div>

                <Section>
                    <Label>Assigned Trees ({order.trees?.length || 0})</Label>
                    <Value>
                        {order.trees?.length > 0 ? (
                            <ul style={{ maxHeight: 100, overflowY: 'auto', margin: 0, paddingLeft: 20 }}>
                                {order.trees.map((t: any) => (
                                    <li key={t.id}>{t.code} ({t.status})</li>
                                ))}
                            </ul>
                        ) : 'No trees assigned'}
                    </Value>
                </Section>

                <ButtonGroup>
                    <Button variant="primary" onClick={onClose}>Close</Button>
                </ButtonGroup>
            </ModalContainer>
        </Overlay>
    );
};
