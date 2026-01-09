import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useUserOrders } from '../modules/dainganxanh/orders/hooks/useUserOrders';
import { OrderList } from '../modules/dainganxanh/orders/components/OrderList';
import { AppLayout } from '@/ui/layout/app-layout/components/AppLayout';
import { Button } from '@/ui/input/button/components/Button';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

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
  color: ${({ theme }) => theme.font.color.primary};
`;

const PageSubtitle = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 16px;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  background: white;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 14px;
`;

const PaginationContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 24px;
`;

const PageInfo = styled.span`
    font-size: 14px;
    color: ${({ theme }) => theme.font.color.secondary};
`;

export const OrderHistoryPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ALL');

  // Now pass params to hook
  const { orders, loading, meta } = useUserOrders(page, status);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setPage(1); // Reset to page 1 on filter change
  };

  return (
    <AppLayout>
      <PageContainer>
        <PageHeader>
          <TitleSection>
            <PageTitle>Lịch Sử Đơn Hàng</PageTitle>
            <PageSubtitle>Quản lý các khoản đóng góp và hợp đồng của bạn</PageSubtitle>
          </TitleSection>

          <FilterSelect value={status} onChange={handleStatusChange}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="VERIFIED">Đã thanh toán / Verified</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </FilterSelect>
        </PageHeader>

        <OrderList orders={orders} loading={loading} />

        {meta && meta.totalPages > 1 && (
          <PaginationContainer>
            <Button
              variant="secondary"
              size="small"
              LeftIcon={IconChevronLeft}
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              Trước
            </Button>
            <PageInfo>
              Trang {meta.page} / {meta.totalPages}
            </PageInfo>
            <Button
              variant="secondary"
              size="small"
              RightIcon={IconChevronRight}
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.totalPages}
            >
              Sau
            </Button>
          </PaginationContainer>
        )}
      </PageContainer>
    </AppLayout>
  );
};
