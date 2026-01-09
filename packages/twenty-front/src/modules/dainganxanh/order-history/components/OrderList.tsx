import styled from '@emotion/styled';
import { useRecoilValue } from 'recoil';
import { currentUserState } from '@/auth/states/currentUserState';
import { useQuery } from '@apollo/client'; // Or use custom hook for REST
import { useEffect, useState } from 'react';
import { Button } from '@/ui/input/button/components/Button';
import { Card } from '@/ui/layout/card/components/Card';
import { CardContent } from '@/ui/layout/card/components/CardContent';
import { CardHeader } from '@/ui/layout/card/components/CardHeader';
import { IconDownload, IconFileDescription } from '@tabler/icons-react';

// Define Order Interface matching Backend DTO
export interface Order {
    id: string;
    orderCode: string;
    status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
    paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
    totalAmount: number;
    quantity: number;
    contractPdfUrl?: string;
    createdAt: string;
}

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StyledOrderCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  transition: all 0.2s;
  
  &:hover {
      box-shadow: ${({ theme }) => theme.boxShadow.light};
  }
`;

const StyledOrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
`;

const StyledOrderCode = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.font.color.primary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledDate = styled.div`
    font-size: 13px;
    color: ${({ theme }) => theme.font.color.tertiary};
`;

const StyledDetailsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    
    @media (min-width: 640px) {
        grid-template-columns: repeat(4, 1fr);
    }
`;

const StyledDetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const StyledLabel = styled.span`
    font-size: 12px;
    color: ${({ theme }) => theme.font.color.secondary};
`;

const StyledValue = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: ${({ theme }) => theme.font.color.primary};
`;

const StatusBadge = styled.span<{ status: string }>`
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    
    ${({ status, theme }) => {
        switch (status) {
            case 'VERIFIED':
            case 'COMPLETED':
            case 'PAID':
                return `background: #E6F4EA; color: #1E7E34;`; // Green
            case 'PENDING':
                return `background: #FEF7E0; color: #B08800;`; // Yellow
            case 'FAILED':
            case 'CANCELLED':
                return `background: #FCE8E6; color: #C5221F;`; // Red
            default:
                return `background: ${theme.background.tertiary}; color: ${theme.font.color.secondary};`;
        }
    }}
`;

const StyledActions = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed ${({ theme }) => theme.border.color.light};
`;

export const OrderList = () => {
    // Mock data fetching hook (Replace with actual fetch from /orders/my-history)
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Replace with real API call
        const fetchOrders = async () => {
            try {
                // Mocking fetch for basic verification without running backend
                const response = await fetch('/api/orders/my-history', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setOrders(data);
                } else {
                    // Fallback mock for dev
                    console.warn('API fetch failed, using mock data');
                    setOrders([
                        {
                            id: '1',
                            orderCode: 'ORD-2024-001',
                            status: 'COMPLETED',
                            paymentStatus: 'VERIFIED',
                            totalAmount: 13000000,
                            quantity: 50,
                            contractPdfUrl: 'https://example.com/contract.pdf',
                            createdAt: new Date().toISOString()
                        }
                    ]);
                }

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    if (loading) return <div>Loading orders...</div>;
    if (orders.length === 0) return <div>Bạn chưa có đơn hàng nào.</div>;

    return (
        <StyledContainer>
            {orders.map(order => (
                <StyledOrderCard key={order.id}>
                    <CardContent>
                        <StyledOrderHeader>
                            <StyledOrderCode>
                                <IconFileDescription size={20} />
                                {order.orderCode}
                            </StyledOrderCode>
                            <StyledDate>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</StyledDate>
                        </StyledOrderHeader>

                        <StyledDetailsGrid>
                            <StyledDetailItem>
                                <StyledLabel>Số lượng cây</StyledLabel>
                                <StyledValue>{order.quantity}</StyledValue>
                            </StyledDetailItem>

                            <StyledDetailItem>
                                <StyledLabel>Tổng tiền</StyledLabel>
                                <StyledValue>{order.totalAmount.toLocaleString('vi-VN')} VND</StyledValue>
                            </StyledDetailItem>

                            <StyledDetailItem>
                                <StyledLabel>Trạng thái thanh toán</StyledLabel>
                                <StyledValue>
                                    <StatusBadge status={order.paymentStatus}>
                                        {order.paymentStatus === 'VERIFIED' ? 'Đã Thanh Toán' : order.paymentStatus}
                                    </StatusBadge>
                                </StyledValue>
                            </StyledDetailItem>

                            <StyledDetailItem>
                                <StyledLabel>Trạng thái đơn</StyledLabel>
                                <StyledValue>
                                    {order.status}
                                </StyledValue>
                            </StyledDetailItem>
                        </StyledDetailsGrid>

                        {order.contractPdfUrl && (
                            <StyledActions>
                                <Button
                                    onClick={() => window.open(order.contractPdfUrl, '_blank')}
                                    variant="secondary"
                                    LeftIcon={IconDownload}
                                >
                                    Tải Hợp Đồng
                                </Button>
                            </StyledActions>
                        )}
                    </CardContent>
                </StyledOrderCard>
            ))}
        </StyledContainer>
    );
};
