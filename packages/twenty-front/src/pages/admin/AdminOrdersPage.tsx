import styled from '@emotion/styled';
import React, { useState } from 'react';
import { AdminOrderTable } from './components/AdminOrderTable';
import { AssignLotModal } from './components/AssignLotModal';
import { ViewOrderModal } from './components/ViewOrderModal';
import { useAdminOrders } from '../../modules/dainganxanh/admin/hooks/useAdminOrders';
import { PageContainer as BasePageContainer } from '@/ui/layout/page/components/PageContainer';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Button } from 'twenty-ui/input';
import { SubMenuTopBarContainer } from '@/ui/layout/page/components/SubMenuTopBarContainer';

const PageContainer = styled(BasePageContainer)`
  padding: 32px 24px;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
`;

const Title = styled.h1`
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
`;

const FilterSelect = styled.select`
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    
    &:focus {
        border-color: #2563eb;
    }
`;

const PaginationContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
`;

const PageInfo = styled.span`
    font-size: 14px;
    color: #64748b;
`;

export const AdminOrdersPage = () => {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('ALL');
    const [paymentMethod, setPaymentMethod] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
    const [viewOrder, setViewOrder] = useState<any | null>(null);

    const { orders, loading, meta, setOrders } = useAdminOrders(page, status, paymentMethod, startDate, endDate);

    const handleSelect = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleVerify = async (id: string) => {
        try {
            await fetch(`/orders/${id}/verify`, { method: 'POST' });
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'PAID' } : o));
        } catch (e) {
            console.error('Verify failed', e);
            alert('Verify failed');
        }
    };

    const openAssignModal = (id: string) => {
        setAssignOrderId(id);
        setIsAssignModalOpen(true);
    };

    const handleAssign = async (lotId: string) => {
        const idsToAssign = assignOrderId ? [assignOrderId] : selectedIds;

        if (idsToAssign.length === 0) return;

        // Loop manual assign (MVP)
        for (const id of idsToAssign) {
            await fetch(`/orders/${id}/assign-lot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lotId })
            });
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'COMPLETED' } : o));
        }

        setSelectedIds([]);
        setAssignOrderId(null);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatus(e.target.value);
        setPage(1);
    };

    return (
        <SubMenuTopBarContainer title="Admin Orders">
            <PageContainer>
                <Header>
                    <Title>Admin Order Management</Title>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {selectedIds.length > 0 && (
                            <>
                                <Button variant="secondary" onClick={() => {
                                    if (confirm(`Verify ${selectedIds.length} orders?`)) {
                                        selectedIds.forEach(id => handleVerify(id));
                                        setSelectedIds([]);
                                    }
                                }}>
                                    Verify ({selectedIds.length})
                                </Button>
                                <Button variant="primary" onClick={() => {
                                    // Use the first selected ID's logic ? 
                                    // Actually bulk assign needs to open modal, then apply to ALL selectedIds.
                                    setAssignOrderId(null); // Clear single order target
                                    setIsAssignModalOpen(true);
                                }}>
                                    Assign Lot ({selectedIds.length})
                                </Button>
                            </>
                        )}
                        <FilterSelect value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ marginLeft: 8 }}>
                            <option value="ALL">All Payments</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="USDT">USDT</option>
                        </FilterSelect>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: 4, marginLeft: 8 }} />
                        <span style={{ margin: '0 4px' }}>-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: 4 }} />

                        <FilterSelect value={status} onChange={handleStatusChange} style={{ marginLeft: 8 }}>
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </FilterSelect>
                    </div>
                </Header>

                <AdminOrderTable
                    orders={orders}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onVerify={handleVerify}
                    onAssign={openAssignModal}
                    onView={(order) => setViewOrder(order)}
                />

                {meta && meta.totalPages > 1 && (
                    <PaginationContainer>
                        <Button
                            variant="secondary"
                            size="small"
                            LeftIcon={IconChevronLeft}
                            onClick={() => setPage(page - 1)}
                            disabled={page <= 1}
                        >
                            Previous
                        </Button>
                        <PageInfo>
                            Page {meta.page} / {meta.totalPages} (Total: {meta.total})
                        </PageInfo>
                        <Button
                            variant="secondary"
                            size="small"
                            RightIcon={IconChevronRight}
                            onClick={() => setPage(page + 1)}
                            disabled={page >= meta.totalPages}
                        >
                            Next
                        </Button>
                    </PaginationContainer>
                )}

                <AssignLotModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssign={handleAssign}
                />

                <ViewOrderModal
                    order={viewOrder}
                    onClose={() => setViewOrder(null)}
                />
            </PageContainer>
        </SubMenuTopBarContainer>
    );
};
