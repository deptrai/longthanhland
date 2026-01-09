import styled from '@emotion/styled';
import React, { useState } from 'react';
import { Card, CardContent } from '@/ui/layout/card/components/Card';
import { IconDownload, IconFileDescription, IconTree, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { Button } from '@/ui/input/button/components/Button';
import { useTheme } from '@emotion/react';

const StyledCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  transition: all 0.2s ease;
  background: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.boxShadow.light};
    border-color: ${({ theme }) => theme.border.color.strong};
  }
`;

const StyledContent = styled(CardContent)`
  padding: 24px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
`;

const OrderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const OrderIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const OrderCode = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.font.color.primary};
`;

const OrderDate = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.span`
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-weight: 600;
`;

const Value = styled.span`
  font-size: 15px;
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 500;
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  
  ${({ status }) => {
    switch (status) {
      case 'VERIFIED':
      case 'COMPLETED':
      case 'PAID':
        return `background: #E6F4EA; color: #1E7E34; border: 1px solid #CEEAD6;`;
      case 'PENDING':
        return `background: #FEF7E0; color: #B08800; border: 1px solid #FEEFC3;`;
      case 'FAILED':
      case 'CANCELLED':
        return `background: #FCE8E6; color: #C5221F; border: 1px solid #FAD2CF;`;
      default:
        return `background: #F1F3F4; color: #5F6368; border: 1px solid #DADCE0;`;
    }
  }}
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed ${({ theme }) => theme.border.color.light};
  padding-top: 16px;
`;

const TreeListSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
`;

const TreeListTitle = styled.h4`
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.font.color.secondary};
`;

const TreeTagContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const TreeTag = styled.a`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: ${({ theme }) => theme.background.secondary};
    border-radius: 4px;
    font-size: 12px;
    color: ${({ theme }) => theme.font.color.primary};
    text-decoration: none;
    border: 1px solid transparent;

    &:hover {
        border-color: ${({ theme }) => theme.color.green50};
        color: ${({ theme }) => theme.color.green100};
        background: ${({ theme }) => theme.color.green10};
    }
`;

export const OrderCard: React.FC<{ order: any }> = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const formattedDate = new Date(order.createdAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formattedAmount = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(order.totalAmount);

  const getPaymentStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      'VERIFIED': 'Đã Thanh Toán',
      'PENDING': 'Chờ Thanh Toán',
      'FAILED': 'Thất Bại',
      'PENDING_VERIFICATION': 'Đang Xác Minh'
    };
    return map[status] || status;
  };

  const hasTrees = order.trees && order.trees.length > 0;

  return (
    <StyledCard>
      <StyledContent>
        <HeaderRow>
          <OrderInfo>
            <OrderIcon>
              <IconFileDescription size={20} />
            </OrderIcon>
            <div>
              <OrderCode>#{order.orderCode}</OrderCode>
              <OrderDate>{formattedDate}</OrderDate>
            </div>
          </OrderInfo>
          <StatusBadge status={order.paymentStatus}>
            {getPaymentStatusLabel(order.paymentStatus)}
          </StatusBadge>
        </HeaderRow>

        <DetailGrid>
          <DetailItem>
            <Label>Số Lượng Cây</Label>
            <Value>{order.quantity} cây</Value>
          </DetailItem>

          <DetailItem>
            <Label>Tổng Giá Trị</Label>
            <Value>{formattedAmount}</Value>
          </DetailItem>

          <DetailItem>
            <Label>Phương Thức</Label>
            <Value>{order.paymentMethod === 'USDT' ? 'USDT (Crypto)' : 'Chuyển Khoản'}</Value>
          </DetailItem>

          <DetailItem>
            <Label>Trạng Thái</Label>
            <Value>{order.status}</Value>
          </DetailItem>
        </DetailGrid>

        <ActionRow>
          <div>
            {hasTrees && (
              <Button
                variant="tertiary"
                size="small"
                LeftIcon={expanded ? IconChevronUp : IconChevronDown}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Ẩn danh sách cây' : `Xem ${order.trees.length} cây`}
              </Button>
            )}
          </div>

          {order.contractPdfUrl && (
            <Button
              variant="secondary"
              size="small"
              LeftIcon={IconDownload}
              onClick={() => window.open(order.contractPdfUrl, '_blank')}
            >
              Tải Hợp Đồng
            </Button>
          )}
        </ActionRow>

        {expanded && hasTrees && (
          <TreeListSection>
            <TreeListTitle>Danh sách mã cây:</TreeListTitle>
            <TreeTagContainer>
              {order.trees.map((tree: any) => (
                <TreeTag key={tree.code} href={`/my-garden/trees/${tree.code}`}>
                  <IconTree size={12} style={{ marginRight: 4 }} />
                  {tree.code}
                </TreeTag>
              ))}
            </TreeTagContainer>
          </TreeListSection>
        )}

      </StyledContent>
    </StyledCard>
  );
};
