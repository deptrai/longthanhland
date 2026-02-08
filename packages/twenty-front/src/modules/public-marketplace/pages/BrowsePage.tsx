import styled from '@emotion/styled';
import { useMemo, useState } from 'react';
import {
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconClockHour8,
    IconHeart,
    IconHome,
    IconMap,
    IconPhone,
    IconPhoto,
    IconSearch,
    IconSortDescending,
    IconVideo,
} from 'twenty-ui/display';
import { BrowseSidebar } from '../components/BrowseSidebar';
import { CompactTrustScore } from '../components/CompactTrustScore';
import { mockPublicListings } from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';
import { type PublicListing, type VipTier } from '../types';

/* ─── Constants ─── */
const ITEMS_PER_PAGE = 8;
const VIP_COLORS: Record<VipTier, { bg: string; text: string; label: string }> = {
  DIAMOND: { bg: '#e03c31', text: '#fff', label: 'VIP Diamond' },
  GOLD: { bg: '#f59e0b', text: '#fff', label: 'VIP Gold' },
  SILVER: { bg: '#94a3b8', text: '#fff', label: 'VIP Silver' },
  NONE: { bg: 'transparent', text: 'transparent', label: '' },
};

/* ─── Layout ─── */
const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
`;
const ContentArea = styled.div`
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 1.5rem 2rem;
  gap: 1.5rem;
`;
const MainContent = styled.div`
  flex: 1;
  min-width: 0;
`;

/* ─── Search Bar ─── */
const SearchBarWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px;
`;
const SearchInputWrapper = styled.div`
  flex: 1;
  min-width: 200px;
  position: relative;
`;
const SearchIconEl = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const Input = styled.input`
  width: 100%;
  background-color: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.625rem 0.75rem 0.625rem 2.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.primary};
  &:focus { outline: none; border-color: ${({ theme }) => theme.color.blue}; }
  &::placeholder { color: ${({ theme }) => theme.font.color.tertiary}; }
`;
const FilterSelect = styled.select`
  background-color: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.primary};
  cursor: pointer;
  min-width: 140px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.color.blue}; }
`;
const SearchBtn = styled.button`
  background-color: #e03c31;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  &:hover { background-color: #c5342a; }
`;

/* ─── Toolbar ─── */
const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;
const ResultCount = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.secondary};
  b { color: ${({ theme }) => theme.font.color.primary}; font-weight: 700; }
`;
const SortWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;
const SortSelect = styled.select`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 6px;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.primary};
  cursor: pointer;
`;

/* ─── Listing Card ─── */
const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;
const Card = styled.div<{ $vip: VipTier }>`
  display: flex;
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme, $vip }) =>
    $vip === 'DIAMOND' ? '#e03c31' : $vip === 'GOLD' ? '#f59e0b' : theme.border.color.medium};
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
  @media (max-width: 768px) { flex-direction: column; }
`;
const CardImageSection = styled.div`
  position: relative;
  width: 280px;
  min-height: 200px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  @media (max-width: 768px) { width: 100%; min-height: 180px; }
`;
const CardImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;
const VipBadge = styled.span<{ $bg: string }>`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background-color: ${({ $bg }) => $bg};
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
`;
const ImageOverlayRow = styled.div`
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  display: flex;
  gap: 0.375rem;
`;
const OverlayChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 0.6875rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
`;
const SaveBtn = styled.button<{ $saved: boolean }>`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(0,0,0,0.45);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ $saved }) => ($saved ? '#ef4444' : '#fff')};
  transition: color 0.2s, background 0.2s;
  &:hover { background: rgba(0,0,0,0.65); }
`;

/* ─── Card Body ─── */
const CardBody = styled.div`
  flex: 1;
  padding: 0.875rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
`;
const CardTitle = styled.h3<{ $vip: VipTier }>`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.375rem 0;
  color: ${({ $vip }) =>
    $vip === 'DIAMOND' ? '#e03c31' : $vip === 'GOLD' ? '#b45309' : 'inherit'};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`;
const PriceRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.375rem;
  flex-wrap: wrap;
`;
const PriceMain = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: #e03c31;
`;
const PricePerM2 = styled.span`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const PropMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.875rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-bottom: 0.375rem;
  flex-wrap: wrap;
`;
const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
`;
const LocationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.5rem;
`;
const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
  margin: 0.5rem 0;
`;

/* ─── Agent Row ─── */
const AgentRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;
const AgentLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;
const AgentAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;
const AgentName = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const VerifiedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: #fff;
  flex-shrink: 0;
`;
const PhoneRevealBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background-color: #10b981;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.375rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover { background-color: #059669; }
`;
const PublishDate = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  flex-shrink: 0;
`;


/* ─── Pagination ─── */
const PaginationWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 1.5rem;
  padding: 1rem 0;
`;
const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: 1px solid ${({ theme, $active }) => ($active ? '#e03c31' : theme.border.color.medium)};
  background-color: ${({ $active }) => ($active ? '#e03c31' : 'transparent')};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.font.color.primary)};
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { border-color: #e03c31; color: ${({ $active }) => ($active ? '#fff' : '#e03c31')}; }
  &:disabled { opacity: 0.4; cursor: default; }
`;

/* ─── Helpers ─── */
const formatPriceShort = (price: number): string => {
  if (price >= 1_000_000_000) {
    const val = price / 1_000_000_000;
    return val % 1 === 0 ? `${val} tỷ` : `${val.toFixed(1)} tỷ`;
  }
  if (price >= 1_000_000) {
    const val = price / 1_000_000;
    return val % 1 === 0 ? `${val} triệu` : `${val.toFixed(1)} triệu`;
  }
  return price.toLocaleString('vi-VN') + ' đ';
};

const formatPricePerM2Short = (price: number): string => {
  if (price >= 1_000_000) {
    const val = price / 1_000_000;
    return val % 1 === 0 ? `${val} tr/m²` : `${val.toFixed(1)} tr/m²`;
  }
  return price.toLocaleString('vi-VN') + ' đ/m²';
};

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'area_desc';

const sortListings = (list: PublicListing[], key: SortKey): PublicListing[] => {
  const sorted = [...list];
  switch (key) {
    case 'price_asc': return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc': return sorted.sort((a, b) => b.price - a.price);
    case 'area_desc': return sorted.sort((a, b) => b.area - a.area);
    case 'newest':
    default: return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

/* ─── Component ─── */
export const BrowsePage = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());
  const [savedListings, setSavedListings] = useState<Set<string>>(
    () => new Set(mockPublicListings.filter((l) => l.isSaved).map((l) => l.id)),
  );

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let list = [...mockPublicListings];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') list = list.filter((l) => l.propertyType === categoryFilter);
    if (locationFilter !== 'all') list = list.filter((l) => l.city === locationFilter);
    if (priceFilter !== 'all') {
      const [min, max] = priceFilter.split('-').map(Number);
      list = list.filter((l) => l.price >= min && (max ? l.price <= max : true));
    }
    if (areaFilter !== 'all') {
      const [min, max] = areaFilter.split('-').map(Number);
      list = list.filter((l) => l.area >= min && (max ? l.area <= max : true));
    }
    return list;
  }, [searchQuery, categoryFilter, locationFilter, priceFilter, areaFilter]);

  const sorted = useMemo(() => sortListings(filtered, sortKey), [filtered, sortKey]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endIdx = Math.min(safePage * ITEMS_PER_PAGE, sorted.length);

  const handleListingClick = (id: string) => {
    window.location.href = `/marketplace/listings/${id}`;
  };
  const toggleSave = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedListings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const togglePhone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRevealedPhones((prev) => new Set(prev).add(id));
  };

  return (
    <Container>
      <ContentArea>
        <BrowseSidebar />
        <MainContent>
          {/* ── Search Bar ── */}
          <SearchBarWrapper>
            <FilterSelect value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">Loại nhà đất</option>
              <option value="APARTMENT">Căn hộ chung cư</option>
              <option value="HOUSE">Nhà riêng</option>
              <option value="LAND">Đất nền</option>
              <option value="VILLA">Biệt thự</option>
            </FilterSelect>
            <FilterSelect value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">Khu vực</option>
              <option value="Hồ Chí Minh">Hồ Chí Minh</option>
              <option value="Đồng Nai">Đồng Nai</option>
            </FilterSelect>
            <FilterSelect value={priceFilter} onChange={(e) => { setPriceFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">Mức giá</option>
              <option value="0-2000000000">Dưới 2 tỷ</option>
              <option value="2000000000-5000000000">2 - 5 tỷ</option>
              <option value="5000000000-10000000000">5 - 10 tỷ</option>
              <option value="10000000000-0">Trên 10 tỷ</option>
            </FilterSelect>
            <FilterSelect value={areaFilter} onChange={(e) => { setAreaFilter(e.target.value); setCurrentPage(1); }}>
              <option value="all">Diện tích</option>
              <option value="0-50">Dưới 50 m²</option>
              <option value="50-100">50 - 100 m²</option>
              <option value="100-200">100 - 200 m²</option>
              <option value="200-0">Trên 200 m²</option>
            </FilterSelect>
            <SearchInputWrapper>
              <SearchIconEl><IconSearch size={16} /></SearchIconEl>
              <Input
                type="text"
                placeholder="Tìm kiếm theo tên, địa chỉ..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </SearchInputWrapper>
            <SearchBtn><IconSearch size={16} /> Tìm kiếm</SearchBtn>
          </SearchBarWrapper>

          {/* ── Toolbar ── */}
          <Toolbar>
            <ResultCount>
              {sorted.length > 0
                ? <>Hiển thị <b>{startIdx}-{endIdx}</b> trong <b>{sorted.length}</b> kết quả</>
                : 'Không tìm thấy kết quả'}
            </ResultCount>
            <SortWrapper>
              <IconSortDescending size={16} />
              <SortSelect value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá thấp → cao</option>
                <option value="price_desc">Giá cao → thấp</option>
                <option value="area_desc">Diện tích lớn nhất</option>
              </SortSelect>
            </SortWrapper>
          </Toolbar>

          {/* ── Listing Cards ── */}
          <CardList>
            {paged.map((listing) => {
              const vip = VIP_COLORS[listing.vipTier];
              const isSaved = savedListings.has(listing.id);
              const phoneRevealed = revealedPhones.has(listing.id);
              return (
                <Card key={listing.id} $vip={listing.vipTier} onClick={() => handleListingClick(listing.id)}>
                  {/* Image */}
                  <CardImageSection>
                    {listing.images[0] && <CardImg src={listing.images[0]} alt={listing.title} />}
                    {listing.vipTier !== 'NONE' && (
                      <VipBadge $bg={vip.bg}>{vip.label}</VipBadge>
                    )}
                    <SaveBtn $saved={isSaved} onClick={(e) => toggleSave(e, listing.id)}>
                      <IconHeart size={16} />
                    </SaveBtn>
                    <ImageOverlayRow>
                      <OverlayChip><IconPhoto size={12} /> {listing.imageCount}</OverlayChip>
                      {listing.hasVideo && <OverlayChip><IconVideo size={12} /> Video</OverlayChip>}
                    </ImageOverlayRow>
                  </CardImageSection>

                  {/* Body */}
                  <CardBody>
                    <div>
                      <CardTitle $vip={listing.vipTier}>{listing.title}</CardTitle>
                      <PriceRow>
                        <PriceMain>{formatPriceShort(listing.price)}</PriceMain>
                        {listing.pricePerM2 && (
                          <PricePerM2>~ {formatPricePerM2Short(listing.pricePerM2)}</PricePerM2>
                        )}
                      </PriceRow>
                      <PropMeta>
                        <MetaItem><IconHome size={14} /> {listing.area} m²</MetaItem>
                        {listing.bedrooms > 0 && <MetaItem>{listing.bedrooms} PN</MetaItem>}
                        {listing.bathrooms > 0 && <MetaItem>{listing.bathrooms} WC</MetaItem>}
                      </PropMeta>
                      <LocationRow>
                        <IconMap size={13} /> {listing.location}
                      </LocationRow>
                      <CompactTrustScore listing={listing} />
                    </div>
                    <div>
                      <Divider />
                      <AgentRow>
                        <AgentLeft>
                          <AgentAvatar src={listing.sellerAvatar} alt={listing.sellerName} />
                          <AgentName>{listing.sellerName}</AgentName>
                          {listing.sellerVerified && (
                            <VerifiedBadge title="Đã xác minh"><IconCheck size={10} /></VerifiedBadge>
                          )}
                          <PublishDate><IconClockHour8 size={12} /> {listing.publishDate}</PublishDate>
                        </AgentLeft>
                        <PhoneRevealBtn onClick={(e) => togglePhone(e, listing.id)}>
                          <IconPhone size={14} />
                          {phoneRevealed ? listing.sellerPhone.replace('***', '678') : listing.sellerPhone}
                        </PhoneRevealBtn>
                      </AgentRow>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </CardList>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <PaginationWrapper>
              <PageBtn
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <IconChevronLeft size={16} />
              </PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PageBtn
                  key={page}
                  $active={page === safePage}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </PageBtn>
              ))}
              <PageBtn
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <IconChevronRight size={16} />
              </PageBtn>
            </PaginationWrapper>
          )}
        </MainContent>
      </ContentArea>
    </Container>
  );
};
