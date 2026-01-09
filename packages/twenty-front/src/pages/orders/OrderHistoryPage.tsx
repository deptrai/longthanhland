import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';

const PageContainer = styled.div`
    max-width: 1000px;
    margin: 0 auto;
    padding: 32px 24px;
`;

const PageHeader = styled.div`
    margin-bottom: 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
`;

const TitleSection = styled.div``;

const PageTitle = styled.h1`
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
    color: #1e293b;
`;

const PageSubtitle = styled.p`
    color: #64748b;
    font-size: 16px;
`;

const FilterSelect = styled.select`
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #1e293b;
    font-size: 14px;
`;

const OrderCard = styled.div`
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const OrderHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
`;

const OrderCode = styled.span`
    font-weight: 600;
    color: #10b981;
`;

const StatusBadge = styled.span<{ status: string }>`
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 500;
    background: ${({ status }) =>
    status === 'VERIFIED' ? '#dcfce7' :
      status === 'PENDING' ? '#fef3c7' :
        status === 'COMPLETED' ? '#dbeafe' : '#f1f5f9'
  };
    color: ${({ status }) =>
    status === 'VERIFIED' ? '#166534' :
      status === 'PENDING' ? '#92400e' :
        status === 'COMPLETED' ? '#1e40af' : '#475569'
  };
`;

const OrderInfo = styled.div`
    display: flex;
    gap: 24px;
    font-size: 14px;
    color: #64748b;
`;

const LoadingMessage = styled.p`
    text-align: center;
    color: #64748b;
    padding: 40px;
`;

const EmptyMessage = styled.p`
    text-align: center;
    color: #64748b;
    padding: 40px;
    background: #f8fafc;
    border-radius: 12px;
`;

interface Order {
  id: string;
  orderCode: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
}

export const OrderHistoryPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/orders/my');
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = status === 'ALL'
    ? orders
    : orders.filter(o => o.paymentStatus === status);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <PageContainer>
      <PageHeader>
        <TitleSection>
          <PageTitle>Lịch Sử Đơn Hàng</PageTitle>
          <PageSubtitle>Quản lý các khoản đóng góp và hợp đồng của bạn</PageSubtitle>
        </TitleSection>

        <FilterSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="PENDING">Chờ thanh toán</option>
          <option value="VERIFIED">Đã thanh toán</option>
          <option value="COMPLETED">Hoàn thành</option>
        </FilterSelect>
      </PageHeader>

      {loading ? (
        <LoadingMessage>Đang tải đơn hàng...</LoadingMessage>
      ) : filteredOrders.length === 0 ? (
        <EmptyMessage>Chưa có đơn hàng nào</EmptyMessage>
      ) : (
        filteredOrders.map((order) => (
          <OrderCard key={order.id}>
            <OrderHeader>
              <OrderCode>{order.orderCode}</OrderCode>
              <StatusBadge status={order.paymentStatus}>
                {order.paymentStatus === 'VERIFIED' ? 'Đã thanh toán' :
                  order.paymentStatus === 'PENDING' ? 'Chờ thanh toán' :
                    order.paymentStatus === 'COMPLETED' ? 'Hoàn thành' : order.paymentStatus}
              </StatusBadge>
            </OrderHeader>
            <OrderInfo>
              <span>🌳 {order.quantity} cây</span>
              <span>💰 {formatAmount(order.totalAmount)}</span>
              <span>📅 {formatDate(order.createdAt)}</span>
            </OrderInfo>
          </OrderCard>
        ))
      )}
    </PageContainer>
  );
};
