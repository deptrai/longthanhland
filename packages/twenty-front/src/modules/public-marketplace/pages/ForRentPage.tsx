import styled from '@emotion/styled';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    IconBuilding,
    IconChevronLeft,
    IconChevronRight,
    IconSearch,
    IconShield,
} from 'twenty-ui/display';
import {
    mockForRentSubcategories,
    mockPublicListings,
} from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';

/* ─── Styled Components ─── */
const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
`;
const Breadcrumb = styled.div`
  max-width: 1400px; margin: 0 auto; padding: 1rem 2rem;
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.tertiary};
  display: flex; align-items: center; gap: 0.5rem;
  a { color: ${({ theme }) => theme.color.blue}; text-decoration: none; &:hover { text-decoration: underline; } }
`;
const PageHeader = styled.div`
  max-width: 1400px; margin: 0 auto; padding: 0 2rem 1.5rem;
`;
const PageTitle = styled.h1`
  font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem;
  color: ${({ theme }) => theme.font.color.primary};
  display: flex; align-items: center; gap: 0.5rem;
`;
const PageDesc = styled.p`
  font-size: 1.3125rem; margin: 0;
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const CatGrid = styled.div`
  max-width: 1400px; margin: 0 auto; padding: 0 2rem 2rem;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;
`;
const CatCardWrapper = styled.div<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem;
  background: ${({ theme, $active }) => $active ? theme.color.blue + '10' : theme.background.secondary};
  border: 1px solid ${({ theme, $active }) => $active ? theme.color.blue : theme.border.color.medium};
  border-radius: 10px; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.color.blue}; transform: translateY(-1px); }
`;
const CatCard = styled(Link)`
  text-decoration: none; display: contents;
`;
const CatIcon = styled.span` font-size: 1.75rem; `;
const CatName = styled.div`
  font-size: 1.4375rem; font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
`;
const CatCount = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.font.color.tertiary};
`;
const ContentArea = styled.div`
  max-width: 1400px; margin: 0 auto; padding: 0 2rem 2rem;
  display: flex; gap: 1.5rem;
  @media (max-width: 1024px) { flex-direction: column; }
`;
const Sidebar = styled.aside`
  width: 280px; flex-shrink: 0;
  @media (max-width: 1024px) { width: 100%; }
`;
const FilterBox = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem;
`;
const FilterTitle = styled.h3`
  font-size: 1.3125rem; font-weight: 700; margin: 0 0 0.75rem;
  color: ${({ theme }) => theme.font.color.primary};
`;
const FilterOption = styled.label`
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.secondary};
  padding: 0.375rem 0; cursor: pointer;
  input { accent-color: ${({ theme }) => theme.color.blue}; }
`;
const SearchBox = styled.div`
  display: flex; margin-bottom: 1rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px; overflow: hidden;
`;
const SearchInput = styled.input`
  flex: 1; padding: 0.75rem 1rem; border: none;
  font-size: 1rem; outline: none;
  background: transparent; color: ${({ theme }) => theme.font.color.primary};
  &::placeholder { color: ${({ theme }) => theme.font.color.tertiary}; }
`;
const SearchBtn = styled.button`
  padding: 0.75rem 1rem; background: ${({ theme }) => theme.color.blue};
  color: ${({ theme }) => theme.font.color.inverted}; border: none; cursor: pointer;
  &:hover { opacity: 0.9; }
`;
const MainContent = styled.div` flex: 1; min-width: 0; `;
const SortBar = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1rem; padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px;
`;
const SortLabel = styled.span`
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.tertiary};
`;
const SortSelect = styled.select`
  padding: 0.375rem 0.75rem; border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 6px; font-size: 1.4375rem; outline: none;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.font.color.primary};
`;
const ListingGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
const Card = styled(Link)`
  display: flex; gap: 1rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px; overflow: hidden; text-decoration: none; transition: all 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
`;
const CardImg = styled.div<{ $src: string }>`
  width: 180px; min-height: 140px; flex-shrink: 0;
  background: url(${({ $src }) => $src}) center/cover no-repeat;
`;
const CardBody = styled.div`
  flex: 1; padding: 0.875rem 0.875rem 0.875rem 0; min-width: 0;
`;
const CardTitle = styled.div`
  font-size: 1rem; font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; margin-bottom: 0.375rem; line-height: 1.3;
`;
const CardPrice = styled.div`
  font-size:     -eem; font-weight: 700; color: ${({ theme }) => theme.color.blue}; margin-bottom: 0.25rem;
`;
const CardMeta = styled.div`
  font-size: 1.375rem; color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.25rem;
`;
const CardTrust = styled.div`
  display: inline-flex; align-items: center; gap: 0.25rem;
  font-size: 0.8125rem; font-weight: 600; color: ${({ theme }) => theme.color.green};
  background: ${({ theme }) => theme.tag.background.green}; padding: 0.2rem 0.5rem; border-radius: 4px;
`;
const Pagination = styled.div`
  display: flex; align-items: center; justify-content: center;
  gap: 0.5rem; margin-top: 1.5rem;
`;
const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 0.875rem; border-radius: 8px; border: 1px solid
    ${({ theme, $active }) => $active ? theme.color.blue : theme.border.color.medium};
  background: ${({ theme, $active }) => $active ? theme.color.blue : theme.background.secondary};
  color: ${({ theme, $active }) => $active ? theme.font.color.inverted : theme.font.color.primary};
  font-size: 1.4375rem; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.color.blue}; }
  &:disabled { opacity: 0.4; cursor: default; }
`;

const ITEMS_PER_PAGE = 8;
const PRICE_RANGES = ['Tất cả', 'Dưới 5 triệu', '5 - 10 triệu', '10 - 20 triệu', '20 - 50 triệu', 'Trên 50 triệu'];
const AREA_RANGES = ['Tất cả', 'Dưới 30 m²', '30 - 50 m²', '50 - 100 m²', '100 - 200 m²', 'Trên 200 m²'];

const formatPrice = (price: number): string => {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ/tháng`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu/tháng`;
  return price.toLocaleString('vi-VN') + ' đ/tháng';
};

export const ForRentPage = () => {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState('Tất cả');
  const [selectedArea, setSelectedArea] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const listings = mockPublicListings;
  const totalPages = Math.max(1, Math.ceil(listings.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedListings = listings.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const totalCount = mockForRentSubcategories.reduce((s, c) => s + c.count, 0);

  return (
    <Container>
      <Breadcrumb>
        <Link to="/marketplace">Trang chủ</Link> › <span>Nhà đất cho thuê</span>
      </Breadcrumb>

      <PageHeader>
        <PageTitle><IconBuilding size={24} /> Nhà đất cho thuê</PageTitle>
        <PageDesc>Tìm kiếm {totalCount.toLocaleString('vi-VN')} tin cho thuê bất động sản trên toàn quốc</PageDesc>
      </PageHeader>

      <CatGrid>
        {mockForRentSubcategories.map((cat) => (
          <CatCard
            key={cat.id}
            to={`/marketplace/for-rent?category=${cat.slug}`}
            onClick={(e) => { e.preventDefault(); setActiveCategory(activeCategory === cat.slug ? null : cat.slug); }}
          >
            <CatCardWrapper $active={activeCategory === cat.slug}>
              <CatIcon>{cat.icon}</CatIcon>
              <div>
                <CatName>{cat.name}</CatName>
                <CatCount>{cat.count.toLocaleString('vi-VN')} tin</CatCount>
              </div>
            </CatCardWrapper>
          </CatCard>
        ))}
      </CatGrid>

      <ContentArea>
        <Sidebar>
          <SearchBox>
            <SearchInput
              placeholder="Tìm theo khu vực, dự án..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchBtn><IconSearch size={16} /></SearchBtn>
          </SearchBox>

          <FilterBox>
            <FilterTitle>Khoảng giá thuê</FilterTitle>
            {PRICE_RANGES.map((range) => (
              <FilterOption key={range}>
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === range}
                  onChange={() => setSelectedPrice(range)}
                />
                {range}
              </FilterOption>
            ))}
          </FilterBox>

          <FilterBox>
            <FilterTitle>Diện tích</FilterTitle>
            {AREA_RANGES.map((range) => (
              <FilterOption key={range}>
                <input
                  type="radio"
                  name="area"
                  checked={selectedArea === range}
                  onChange={() => setSelectedArea(range)}
                />
                {range}
              </FilterOption>
            ))}
          </FilterBox>
        </Sidebar>

        <MainContent>
          <SortBar>
            <SortLabel>{listings.length} kết quả</SortLabel>
            <SortSelect>
              <option>Tin mới nhất</option>
              <option>Giá thấp đến cao</option>
              <option>Giá cao đến thấp</option>
              <option>Diện tích lớn nhất</option>
            </SortSelect>
          </SortBar>

          <ListingGrid>
            {paginatedListings.map((listing) => (
              <Card key={listing.id} to={`/marketplace/listings/${listing.id}`}>
                <CardImg $src={listing.images[0]} />
                <CardBody>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardPrice>{formatPrice(listing.price)}</CardPrice>
                  <CardMeta>{listing.area} m² · {listing.bedrooms} PN · {listing.district}, {listing.city}</CardMeta>
                  {listing.trustScore && (
                    <CardTrust><IconShield size={12} /> {listing.trustScore}/100</CardTrust>
                  )}
                </CardBody>
              </Card>
            ))}
          </ListingGrid>

          <Pagination>
            <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <IconChevronLeft size={16} />
            </PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PageBtn key={p} $active={p === safePage} onClick={() => setPage(p)}>
                {p}
              </PageBtn>
            ))}
            <PageBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <IconChevronRight size={16} />
            </PageBtn>
          </Pagination>
        </MainContent>
      </ContentArea>
    </Container>
  );
};
