import styled from '@emotion/styled';
import React from 'react';
import { OrderCard } from './OrderCard';
import { Order } from '../hooks/useUserOrders';

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 40px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 24px;
  background: white;
  border-radius: 16px;
  border: 1px dashed ${({ theme }) => theme.border.color.medium};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const EmptyText = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 14px;
  margin: 0;
  max-width: 300px;
`;

export const OrderList: React.FC<{ orders: Order[], loading: boolean }> = ({ orders, loading }) => {
    if (loading) {
        return (
            <ListContainer>
                {/* Simple loading skeleton */}
                <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                    Đang tải dữ liệu...
                </div>
            </ListContainer>
        );
    }

    if (!orders || orders.length === 0) {
        return (
            <EmptyState>
                <div style={{ fontSize: 40 }}>🌱</div>
                <EmptyTitle>Chưa có đơn hàng nào</EmptyTitle>
                <EmptyText>
                    Bạn chưa thực hiện đơn hàng nào. Hãy tham gia trồng cây Đại Ngàn Xanh ngay hôm nay!
                </EmptyText>
            </EmptyState>
        );
    }

    return (
        <ListContainer>
            {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
            ))}
        </ListContainer>
    );
};
