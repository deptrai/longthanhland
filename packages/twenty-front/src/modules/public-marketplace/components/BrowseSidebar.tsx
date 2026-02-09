import styled from '@emotion/styled';
import { useState } from 'react';
import { IconBuilding, IconChevronDown, IconChevronUp, IconCoins, IconFilter } from 'twenty-ui/display';
import {
    mockAreaRanges,
    mockCityListings,
    mockPopularArticles,
    mockPriceRanges,
} from '../data/mock-data';

const SidebarContainer = styled.aside`
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0 0 1.5rem 0;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const SectionCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
`;

const SectionTitle = styled.h4`
  font-size:     -eem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  padding: 0.875rem 1.125rem;
  margin: 0;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  background-color: ${({ theme }) => theme.background.tertiary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FilterList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const FilterItem = styled.li`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
  &:last-child {
    border-bottom: none;
  }
`;

const FilterLink = styled.a`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1.125rem;
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 1rem;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    color: ${({ theme }) => theme.color.blue};
  }
`;

const CityCount = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1.4375rem;
`;

const ShowMoreButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.625rem;
  background: none;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
  color: ${({ theme }) => theme.color.blue};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
  }
`;

const ArticleList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  counter-reset: article-counter;
`;

const ArticleItem = styled.li`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};
  counter-increment: article-counter;
  &:last-child {
    border-bottom: none;
  }
`;

const ArticleLink = styled.a`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.625rem 1.125rem;
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 1rem;
  line-height: 1.4;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    color: ${({ theme }) => theme.color.blue};
  }

  &::before {
    content: counter(article-counter);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.color.blue};
    color: ${({ theme }) => theme.font.color.inverted};
    font-size: 1.375rem;
    font-weight: 700;
    margin-top: 1px;
  }
`;

const DEFAULT_VISIBLE_CITIES = 8;

const formatCount = (count: number): string => {
  return count.toLocaleString('vi-VN');
};

export const BrowseSidebar = () => {
  const [showAllCities, setShowAllCities] = useState(false);

  const visibleCities = showAllCities
    ? mockCityListings
    : mockCityListings.slice(0, DEFAULT_VISIBLE_CITIES);

  return (
    <SidebarContainer>
      {/* Price Range Filter */}
      <SectionCard>
        <SectionTitle>
          <IconCoins size={18} />
          Lọc theo khoảng giá
        </SectionTitle>
        <FilterList>
          {mockPriceRanges.map((range) => (
            <FilterItem key={range.value}>
              <FilterLink href={range.href}>{range.label}</FilterLink>
            </FilterItem>
          ))}
        </FilterList>
      </SectionCard>

      {/* Area Range Filter */}
      <SectionCard>
        <SectionTitle>
          <IconFilter size={18} />
          Lọc theo diện tích
        </SectionTitle>
        <FilterList>
          {mockAreaRanges.map((range) => (
            <FilterItem key={range.value}>
              <FilterLink href={range.href}>{range.label}</FilterLink>
            </FilterItem>
          ))}
        </FilterList>
      </SectionCard>

      {/* City Listings */}
      <SectionCard>
        <SectionTitle>
          <IconBuilding size={18} />
          Nhà đất cho thuê
        </SectionTitle>
        <FilterList>
          {visibleCities.map((city) => (
            <FilterItem key={city.name}>
              <FilterLink href={city.href}>
                <span>{city.name}</span>
                <CityCount>({formatCount(city.count)})</CityCount>
              </FilterLink>
            </FilterItem>
          ))}
        </FilterList>
        {mockCityListings.length > DEFAULT_VISIBLE_CITIES && (
          <ShowMoreButton onClick={() => setShowAllCities(!showAllCities)}>
            {showAllCities ? 'Thu gọn' : 'Xem thêm'}
            {showAllCities ? (
              <IconChevronUp size={14} />
            ) : (
              <IconChevronDown size={14} />
            )}
          </ShowMoreButton>
        )}
      </SectionCard>

      {/* Popular Articles */}
      <SectionCard>
        <SectionTitle>Bài viết được quan tâm</SectionTitle>
        <ArticleList>
          {mockPopularArticles.map((article) => (
            <ArticleItem key={article.title}>
              <ArticleLink href={article.href}>{article.title}</ArticleLink>
            </ArticleItem>
          ))}
        </ArticleList>
      </SectionCard>
    </SidebarContainer>
  );
};
