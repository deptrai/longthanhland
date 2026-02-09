import styled from '@emotion/styled';
import { mockInquiries } from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  margin: 0 auto;
  max-width: 1400px;
`;

const Title = styled.h1`
  font-size: 2.125rem;
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
  background-color: ${({ theme }) => theme.background.tertiary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  color: ${({ theme }) => theme.font.color.tertiary};
  display: grid;
  font-size: 1rem;
  font-weight: 600;
  gap: 1rem;
  grid-template-columns: 1.5fr 2fr 1fr 120px;
  padding: 1rem 1.5rem;
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
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1rem;
`;

const ListingTitle = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
`;

const StyledDate = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const StatusBadge = styled.span<{ status: string }>`
  background-color: ${({ theme, status }) => {
    switch (status) {
      case 'NEW':
        return theme.tag.background.blue;
      case 'REPLIED':
        return theme.tag.background.green;
      case 'CLOSED':
        return theme.tag.background.gray;
      default:
        return theme.tag.background.gray;
    }
  }};
  border-radius: 9999px;
  color: ${({ theme, status }) => {
    switch (status) {
      case 'NEW':
        return theme.tag.text.blue;
      case 'REPLIED':
        return theme.tag.text.green;
      case 'CLOSED':
        return theme.tag.text.gray;
      default:
        return theme.tag.text.gray;
    }
  }};
  display: inline-block;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  text-align: center;
`;

export const InquiriesPage = () => {
  const { t, language } = useLanguage();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'vi' ? 'vi-VN' : 'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      },
    );
  };

  return (
    <Container>
      <MaxWidth>
        <Title>{t('inquiries.title')}</Title>

        <Card>
          <Table>
            <TableHeader>
              <div>{t('inquiries.buyer')}</div>
              <div>{t('inquiries.listing')}</div>
              <div>{t('inquiries.date')}</div>
              <div>{t('inquiries.status')}</div>
            </TableHeader>
            {mockInquiries.map((inquiry) => (
              <TableRow key={inquiry.id}>
                <BuyerInfo>
                  <BuyerName>{inquiry.buyerName}</BuyerName>
                  <BuyerEmail>{inquiry.buyerEmail}</BuyerEmail>
                </BuyerInfo>
                <ListingTitle>{inquiry.listingTitle}</ListingTitle>
                <StyledDate>{formatDate(inquiry.createdAt)}</StyledDate>
                <div>
                  <StatusBadge status={inquiry.status}>
                    {inquiry.status === 'NEW' && t('inquiries.statusNew')}
                    {inquiry.status === 'REPLIED' && t('inquiries.statusReplied')}
                    {inquiry.status === 'CLOSED' && t('inquiries.statusClosed')}
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
