import styled from '@emotion/styled';
import { mockInquiries } from '../data/mock-data';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1.5rem;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
`;

const Table = styled.div``;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr 120px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: ${({ theme }) => theme.background.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr 120px;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const BuyerInfo = styled.div``;

const BuyerName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.25rem;
`;

const BuyerEmail = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const ListingTitle = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
`;

const Date = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  background-color: ${({ status }) => {
    switch (status) {
      case 'NEW':
        return '#3B82F620';
      case 'REPLIED':
        return '#22C55E20';
      case 'CLOSED':
        return '#88888820';
      default:
        return '#88888820';
    }
  }};
  color: ${({ status }) => {
    switch (status) {
      case 'NEW':
        return '#3B82F6';
      case 'REPLIED':
        return '#22C55E';
      case 'CLOSED':
        return '#888888';
      default:
        return '#888888';
    }
  }};
`;

export const InquiriesPage = () => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Container>
      <MaxWidth>
        <Title>Inquiry Management</Title>

        <Card>
          <Table>
            <TableHeader>
              <div>Buyer</div>
              <div>Listing</div>
              <div>Date</div>
              <div>Status</div>
            </TableHeader>
            {mockInquiries.map((inquiry) => (
              <TableRow key={inquiry.id}>
                <BuyerInfo>
                  <BuyerName>{inquiry.buyerName}</BuyerName>
                  <BuyerEmail>{inquiry.buyerEmail}</BuyerEmail>
                </BuyerInfo>
                <ListingTitle>{inquiry.listingTitle}</ListingTitle>
                <Date>{formatDate(inquiry.createdAt)}</Date>
                <div>
                  <StatusBadge status={inquiry.status}>
                    {inquiry.status === 'NEW' && 'New'}
                    {inquiry.status === 'REPLIED' && 'Replied'}
                    {inquiry.status === 'CLOSED' && 'Closed'}
                  </StatusBadge>
                </div>
              </TableRow>
            ))}
          </Table>
        </Card>
      </MaxWidth>
    </Container>
  );
};
