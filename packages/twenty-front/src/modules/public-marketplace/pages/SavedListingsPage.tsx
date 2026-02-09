import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { useState } from 'react';
import {
    IconBookmark,
    IconMap,
    IconPhone,
    IconPhoto,
    IconTrash
} from 'twenty-ui/display';
import { CompactTrustScore } from '../components/CompactTrustScore';
import { mockPublicListings } from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';
import { type PublicListing, type VipTier } from '../types';

const VIP_LABELS: Record<VipTier, string> = {
  DIAMOND: 'VIP Diamond',
  GOLD: 'VIP Gold',
  SILVER: 'VIP Silver',
  NONE: '',
};

const Container = styled.div`
  min-height: 60vh;
`;
const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;
const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;
const CountBadge = styled.span`
  background-color: ${({ theme }) => theme.color.blue};
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 12px;
`;
const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;
const EmptyTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-bottom: 0.5rem;
`;
const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.25rem;
`;
const Card = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }
`;
const CardImage = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
`;
const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const VipBadge = styled.span<{ $bg: string; $color: string }>`
  position: absolute;
  top: 8px;
  left: 8px;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
`;
const ImageCount = styled.span`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;
const RemoveButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme }) => theme.font.color.inverted};
  transition: all 0.2s;
  &:hover {
    background: ${({ theme }) => theme.color.red};
  }
`;
const CardBody = styled.div`
  padding: 1rem;
`;
const CardTitle = styled.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const CardPrice = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.danger};
  margin-bottom: 0.5rem;
`;
const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.5rem;
`;
const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;
const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
`;
const SellerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.secondary};
`;
const SellerAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
`;
const PhoneButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: ${({ theme }) => theme.color.green};
  color: ${({ theme }) => theme.font.color.inverted};
  border: none;
  border-radius: 6px;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;
const TrustRow = styled.div`
  margin-top: 0.375rem;
`;

const formatPrice = (price: number): string => {
  if (price >= 1_000_000_000) {
    const ty = price / 1_000_000_000;
    return ty % 1 === 0 ? `${ty} tỷ` : `${ty.toFixed(1)} tỷ`;
  }
  if (price >= 1_000_000) {
    const trieu = price / 1_000_000;
    return trieu % 1 === 0 ? `${trieu} triệu` : `${trieu.toFixed(0)} triệu`;
  }
  return price.toLocaleString('vi-VN') + ' đ';
};

export const SavedListingsPage = () => {
  const { t } = useLanguage();
  const theme = useTheme();
  const getVipColor = (tier: VipTier) => {
    switch (tier) {
      case 'DIAMOND': return theme.color.red;
      case 'GOLD': return theme.color.orange;
      case 'SILVER': return theme.color.gray;
      default: return 'transparent';
    }
  };
  const savedListings = mockPublicListings.filter((l) => l.isSaved);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const visibleListings = savedListings.filter((l) => !removedIds.has(l.id));

  const handleRemove = (id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
  };

  const handleRevealPhone = (id: string) => {
    setRevealedPhones((prev) => new Set(prev).add(id));
  };

  return (
    <Container>
      <PageHeader>
        <PageTitle>
          <IconBookmark size={24} />
          {t('nav.saved')}
          {visibleListings.length > 0 && (
            <CountBadge>{visibleListings.length}</CountBadge>
          )}
        </PageTitle>
      </PageHeader>

      {visibleListings.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📭</EmptyIcon>
          <EmptyTitle>Chưa có tin đăng nào được lưu</EmptyTitle>
          <p>Nhấn vào biểu tượng ❤️ trên các tin đăng để lưu lại tại đây</p>
        </EmptyState>
      ) : (
        <ListingsGrid>
          {visibleListings.map((listing: PublicListing) => {
            const vipBg = getVipColor(listing.vipTier);
            const vipLabel = VIP_LABELS[listing.vipTier];
            return (
              <Card key={listing.id}>
                <CardImage>
                  <Image src={listing.images[0]} alt={listing.title} />
                  {listing.vipTier !== 'NONE' && (
                    <VipBadge $bg={vipBg} $color={theme.font.color.inverted}>
                      {vipLabel}
                    </VipBadge>
                  )}
                  <ImageCount>
                    <IconPhoto size={14} />
                    {listing.imageCount}
                  </ImageCount>
                  <RemoveButton
                    onClick={() => handleRemove(listing.id)}
                    title="Bỏ lưu"
                  >
                    <IconTrash size={16} />
                  </RemoveButton>
                </CardImage>
                <CardBody>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardPrice>{formatPrice(listing.price)}</CardPrice>
                  <CardMeta>
                    <MetaItem>
                      <IconMap size={14} />
                      {listing.district}, {listing.city}
                    </MetaItem>
                    <MetaItem>{listing.area} m²</MetaItem>
                    {listing.bedrooms > 0 && (
                      <MetaItem>{listing.bedrooms} PN</MetaItem>
                    )}
                  </CardMeta>
                  <TrustRow>
                    <CompactTrustScore listing={listing} />
                  </TrustRow>
                </CardBody>
                <CardFooter>
                  <SellerInfo>
                    <SellerAvatar
                      src={listing.sellerAvatar}
                      alt={listing.sellerName}
                    />
                    {listing.sellerName}
                  </SellerInfo>
                  <PhoneButton
                    onClick={() => handleRevealPhone(listing.id)}
                  >
                    <IconPhone size={14} />
                    {revealedPhones.has(listing.id)
                      ? listing.sellerPhone
                      : listing.sellerPhone.slice(0, 7) + '***'}
                  </PhoneButton>
                </CardFooter>
              </Card>
            );
          })}
        </ListingsGrid>
      )}
    </Container>
  );
};
