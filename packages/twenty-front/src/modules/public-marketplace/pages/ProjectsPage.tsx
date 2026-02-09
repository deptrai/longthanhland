import styled from '@emotion/styled';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    IconChevronLeft,
    IconChevronRight,
    IconMap,
    IconSearch,
    IconShield,
    IconUsers,
} from 'twenty-ui/display';
import {
    mockProjectSubcategories,
    mockProjects,
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
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;
`;
const CatCard = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem;
  background: ${({ theme, $active }) => $active ? theme.color.blue + '10' : theme.background.secondary};
  border: 1px solid ${({ theme, $active }) => $active ? theme.color.blue : theme.border.color.medium};
  border-radius: 10px; cursor: pointer; transition: all 0.2s; text-align: left;
  &:hover { border-color: ${({ theme }) => theme.color.blue}; transform: translateY(-1px); }
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
const ProjGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
const ProjCard = styled(Link)`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px; overflow: hidden; text-decoration: none; transition: all 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
`;
const ProjImg = styled.div<{ $src: string }>`
  height: 200px; background: url(${({ $src }) => $src}) center/cover no-repeat;
  position: relative;
`;
const ProjBadge = styled.span<{ $status: string }>`
  position: absolute; top: 0.75rem; left: 0.75rem;
  padding: 0.25rem 0.75rem; border-radius: 6px;
  font-size: 1.375rem; font-weight: 600; color: ${({ theme }) => theme.font.color.inverted};
  background: ${({ theme, $status }) =>
    $status === 'SELLING' ? theme.color.green : $status === 'UPCOMING' ? theme.color.orange : theme.color.gray};
`;
const ProjTrustBadge = styled.div`
  position: absolute; top: 0.75rem; right: 0.75rem;
  padding: 0.25rem 0.5rem; border-radius: 6px;
  font-size: 0.8125rem; font-weight: 700;
  background: rgba(0,0,0,0.6); color: ${({ theme }) => theme.color.green};
  display: flex; align-items: center; gap: 0.25rem;
`;
const ProjBody = styled.div` padding: 1.25rem; `;
const ProjName = styled.h3`
  font-size: 1.75rem; font-weight: 700; margin: 0 0 0.375rem;
  color: ${({ theme }) => theme.font.color.primary};
`;
const ProjDev = styled.div`
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.75rem;
`;
const ProjInfo = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
  margin-bottom: 0.75rem;
`;
const ProjInfoItem = styled.div`
  font-size: 1.375rem; color: ${({ theme }) => theme.font.color.secondary};
`;
const ProjInfoLabel = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const ProjInfoValue = styled.span`
  font-weight: 600; color: ${({ theme }) => theme.font.color.primary};
`;
const ProjAmenities = styled.div`
  display: flex; flex-wrap: wrap; gap: 0.375rem;
`;
const ProjAmenity = styled.span`
  font-size: 0.8125rem; padding: 0.2rem 0.5rem; border-radius: 4px;
  background: ${({ theme }) => theme.background.tertiary};
  color: ${({ theme }) => theme.font.color.secondary};
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

const ITEMS_PER_PAGE = 6;
const STATUS_LABELS: Record<string, string> = {
  SELLING: 'Đang mở bán',
  UPCOMING: 'Sắp mở bán',
  HANDED_OVER: 'Đã bàn giao',
};
const STATUS_OPTIONS = ['Tất cả', 'Đang mở bán', 'Sắp mở bán', 'Đã bàn giao'];
const LOCATION_OPTIONS = ['Tất cả', 'Hồ Chí Minh', 'Đồng Nai', 'Bình Dương', 'Long An'];

export const ProjectsPage = () => {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [selectedLocation, setSelectedLocation] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const projects = mockProjects;
  const totalPages = Math.max(1, Math.ceil(projects.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedProjects = projects.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const totalCount = mockProjectSubcategories.reduce((s, c) => s + c.count, 0);

  return (
    <Container>
      <Breadcrumb>
        <Link to="/marketplace">Trang chủ</Link> › <span>Dự án</span>
      </Breadcrumb>

      <PageHeader>
        <PageTitle><IconMap size={24} /> Dự án bất động sản</PageTitle>
        <PageDesc>Khám phá {totalCount.toLocaleString('vi-VN')} dự án bất động sản trên toàn quốc</PageDesc>
      </PageHeader>

      <CatGrid>
        {mockProjectSubcategories.map((cat) => (
          <CatCard
            key={cat.id}
            $active={activeCategory === cat.slug}
            onClick={() => setActiveCategory(activeCategory === cat.slug ? null : cat.slug)}
          >
            <CatIcon>{cat.icon}</CatIcon>
            <div>
              <CatName>{cat.name}</CatName>
              <CatCount>{cat.count.toLocaleString('vi-VN')} dự án</CatCount>
            </div>
          </CatCard>
        ))}
      </CatGrid>

      <ContentArea>
        <Sidebar>
          <SearchBox>
            <SearchInput
              placeholder="Tìm theo tên dự án, chủ đầu tư..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchBtn><IconSearch size={16} /></SearchBtn>
          </SearchBox>

          <FilterBox>
            <FilterTitle>Trạng thái</FilterTitle>
            {STATUS_OPTIONS.map((opt) => (
              <FilterOption key={opt}>
                <input
                  type="radio"
                  name="status"
                  checked={selectedStatus === opt}
                  onChange={() => setSelectedStatus(opt)}
                />
                {opt}
              </FilterOption>
            ))}
          </FilterBox>

          <FilterBox>
            <FilterTitle>Khu vực</FilterTitle>
            {LOCATION_OPTIONS.map((opt) => (
              <FilterOption key={opt}>
                <input
                  type="radio"
                  name="location"
                  checked={selectedLocation === opt}
                  onChange={() => setSelectedLocation(opt)}
                />
                {opt}
              </FilterOption>
            ))}
          </FilterBox>
        </Sidebar>

        <MainContent>
          <SortBar>
            <SortLabel>{projects.length} dự án</SortLabel>
            <SortSelect>
              <option>Mới nhất</option>
              <option>Giá thấp đến cao</option>
              <option>Giá cao đến thấp</option>
              <option>Sắp hoàn thành</option>
            </SortSelect>
          </SortBar>

          <ProjGrid>
            {paginatedProjects.map((proj) => (
              <ProjCard key={proj.id} to={`/marketplace/projects/${proj.id}`}>
                <ProjImg $src={proj.image}>
                  <ProjBadge $status={proj.status}>{STATUS_LABELS[proj.status]}</ProjBadge>
                  <ProjTrustBadge><IconShield size={12} /> {proj.trustScore}/100</ProjTrustBadge>
                </ProjImg>
                <ProjBody>
                  <ProjName>{proj.name}</ProjName>
                  <ProjDev>{proj.developer} · {proj.location}</ProjDev>
                  <ProjInfo>
                    <ProjInfoItem>
                      <ProjInfoLabel>Giá: </ProjInfoLabel>
                      <ProjInfoValue>{proj.priceRange}</ProjInfoValue>
                    </ProjInfoItem>
                    <ProjInfoItem>
                      <ProjInfoLabel>Diện tích: </ProjInfoLabel>
                      <ProjInfoValue>{proj.areaRange}</ProjInfoValue>
                    </ProjInfoItem>
                    <ProjInfoItem>
                      <ProjInfoLabel>Số căn: </ProjInfoLabel>
                      <ProjInfoValue><IconUsers size={12} /> {proj.totalUnits.toLocaleString('vi-VN')}</ProjInfoValue>
                    </ProjInfoItem>
                    <ProjInfoItem>
                      <ProjInfoLabel>Hoàn thành: </ProjInfoLabel>
                      <ProjInfoValue>{proj.completionDate}</ProjInfoValue>
                    </ProjInfoItem>
                  </ProjInfo>
                  <ProjAmenities>
                    {proj.amenities.slice(0, 4).map((a) => (
                      <ProjAmenity key={a}>{a}</ProjAmenity>
                    ))}
                    {proj.amenities.length > 4 && (
                      <ProjAmenity>+{proj.amenities.length - 4}</ProjAmenity>
                    )}
                  </ProjAmenities>
                </ProjBody>
              </ProjCard>
            ))}
          </ProjGrid>

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
