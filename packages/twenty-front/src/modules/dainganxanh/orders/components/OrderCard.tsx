import styled from '@emotion/styled';
import React, { useState } from 'react';
import { IconDownload, IconFileDescription, IconTree, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useTheme } from '@emotion/react';

const StyledCard = styled.div`
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  background: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
  }
`;

const StyledContent = styled.div`
  padding: 24px;
`;

const StyledButton = styled.button<{ variant?: 'primary' | 'secondary' | 'tertiary' }>`
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    
    ${({ variant }) => {
    if (variant === 'primary') {
      return `
                background: #10b981;
                color: white;
                border-color: #10b981;
                &:hover { background: #059669; border-color: #059669; }
            `;
    } else if (variant === 'tertiary') {
      return `
                background: transparent;
                color: #64748b;
                border-color: #e2e8f0;
                &:hover { background: #f8fafc; border-color: #cbd5e1; }
            `;
    } else {
      return `
                background: white;
                color: #475569;
                border-color: #e2e8f0;
                &:hover { background: #f8fafc; border-color: #cbd5e1; }
            `;
    }
  }}
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
        border-color: #10b981;
        color: #10b981;
        background: #f0fdf4;
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
              <StyledButton
                variant="tertiary"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                {expanded ? 'Ẩn danh sách cây' : `Xem ${order.trees.length} cây`}
              </StyledButton>
            )}
          </div>

          {order.contractPdfUrl && (
            <StyledButton
              variant="secondary"
              onClick={() => window.open(order.contractPdfUrl, '_blank')}
            >
              <IconDownload size={16} />
              Tải Hợp Đồng
            </StyledButton>
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
