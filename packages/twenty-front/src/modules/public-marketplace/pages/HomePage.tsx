import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import {
    IconBuilding,
    IconChevronRight,
    IconHome,
    IconMap,
    IconRocket,
    IconSearch,
    IconShield,
    IconSparkles,
    IconTrendingUp,
    IconUsers,
} from 'twenty-ui/display';
import {
    mockForRentSubcategories,
    mockForSaleSubcategories,
    mockHomepageStats,
    mockProjects,
    mockPublicListings,
} from '../data/mock-data';
import { useLanguage } from '../i18n/LanguageContext';

/* ─── Layout ─── */
const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
`;
const HeroSection = styled.section`
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.accent.accent12} 0%, ${theme.color.blue} 50%, ${theme.accent.accent8} 100%)`};
  padding: 4rem 2rem;
  text-align: center;
  color: ${({ theme }) => theme.font.color.inverted};
`;
const HeroTitle = styled.h1`
  font-size: 2.75rem; font-weight: 700; margin: 0 0 0.75rem;
`;
const HeroSubtitle = styled.p`
  font-size: 1.75rem; opacity: 0.9; margin: 0 0 2rem;
  max-width: 600px; margin-left: auto; margin-right: auto;
`;
const SearchBar = styled.div`
  display: flex; max-width: 800px; margin: 0 auto;
  background: ${({ theme }) => theme.background.primary}; border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;
const SearchInput = styled.input`
  flex: 1; padding: 1rem 1.25rem; border: none;
  font-size:     -eem; color: ${({ theme }) => theme.font.color.primary}; outline: none;
  &::placeholder { color: ${({ theme }) => theme.font.color.light}; }
`;
const SearchSelect = styled.select`
  padding: 1rem; border: none; border-left: 1px solid ${({ theme }) => theme.border.color.light};
  background: ${({ theme }) => theme.background.primary}; font-size: 1.3125rem; color: ${({ theme }) => theme.font.color.secondary};
  cursor: pointer; outline: none;
`;
const SearchButton = styled.button`
  padding: 1rem 2rem; background: ${({ theme }) => theme.color.red}; color: ${({ theme }) => theme.font.color.inverted};
  border: none; font-size:     -eem; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem;
  &:hover { opacity: 0.9; }
`;
const QuickNavRow = styled.div`
  display: flex; gap: 1rem; max-width: 1400px;
  margin: -2rem auto 0; padding: 0 2rem;
  position: relative; z-index: 10;
  @media (max-width: 768px) { flex-direction: column; }
`;
const QuickNavCard = styled(Link)`
  flex: 1; display: flex; align-items: center; gap: 1rem;
  padding: 1.25rem 1.5rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px; text-decoration: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); transition: all 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); }
`;
const QuickNavIcon = styled.div<{ $color: string }>`
  width: 48px; height: 48px; border-radius: 12px;
  background: ${({ $color }) => $color};
  display: flex; align-items: center; justify-content: center;
  color: ${({ theme }) => theme.font.color.inverted}; flex-shrink: 0;
`;
const QuickNavTitle = styled.div`
  font-size:     -eem; font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
`;
const QuickNavDesc = styled.div`
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.tertiary};
`;
const Sec = styled.section`
  max-width: 1400px; margin: 0 auto; padding: 2.5rem 2rem;
`;
const SecHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.5rem;
`;
const SecTitle = styled.h2`
  font-size: 1.75rem; font-weight: 700; margin: 0;
  color: ${({ theme }) => theme.font.color.primary};
  display: flex; align-items: center; gap: 0.5rem;
`;
const SecLink = styled(Link)`
  font-size: 1rem; color: ${({ theme }) => theme.color.blue};
  text-decoration: none; display: flex; align-items: center; gap: 0.25rem;
  &:hover { text-decoration: underline; }
`;
const CatGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;
`;
const CatCard = styled(Link)`
  display: flex; align-items: center; gap: 0.75rem; padding: 1rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px; text-decoration: none; transition: all 0.2s;
  &:hover { border-color: ${({ theme }) => theme.color.blue}; transform: translateY(-2px); }
`;
const CatIcon = styled.span` font-size: 2rem; `;
const CatName = styled.div`
  font-size: 1rem; font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const CatCount = styled.div`
  font-size: 1.375rem; color: ${({ theme }) => theme.font.color.tertiary};
`;
const ProjGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;
  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;
const ProjCard = styled(Link)`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px; overflow: hidden; text-decoration: none; transition: all 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
`;
const ProjImg = styled.div<{ $src: string }>`
  height: 180px; background: url(${({ $src }) => $src}) center/cover no-repeat;
  position: relative;
`;
const ProjBadge = styled.span<{ $status: string }>`
  position: absolute; top: 0.75rem; left: 0.75rem;
  padding: 0.25rem 0.75rem; border-radius: 6px;
  font-size: 1.375rem; font-weight: 600; color: ${({ theme }) => theme.font.color.inverted};
  background: ${({ theme, $status }) =>
    $status === 'SELLING' ? theme.color.green : $status === 'UPCOMING' ? theme.color.orange : theme.color.gray};
`;
const ProjBody = styled.div` padding: 1rem; `;
const ProjName = styled.h3`
  font-size:     -eem; font-weight: 700; margin: 0 0 0.25rem;
  color: ${({ theme }) => theme.font.color.primary};
`;
const ProjDev = styled.div`
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.5rem;
`;
const ProjTags = styled.div` display: flex; flex-wrap: wrap; gap: 0.5rem; `;
const ProjTag = styled.span`
  font-size: 1.375rem; padding: 0.2rem 0.5rem; border-radius: 4px;
  background: ${({ theme }) => theme.background.tertiary};
  color: ${({ theme }) => theme.font.color.secondary};
`;
const StatsRow = styled.div`
  display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center;
  padding: 2.5rem 2rem;
  background: ${({ theme }) => theme.background.secondary};
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
`;
const StatItem = styled.div` text-align: center; min-width: 140px; `;
const StatNumber = styled.div`
  font-size: 2.25rem; font-weight: 800;
  color: ${({ theme }) => theme.color.blue};
`;
const StatLabel = styled.div`
  font-size: 1.4375rem; color: ${({ theme }) => theme.font.color.tertiary};
  margin-top: 0.25rem;
`;
const FeaturesGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;
const FeatureCard = styled.div`
  text-align: center; padding: 2rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
`;
const FeatureIcon = styled.div`
  width: 56px; height: 56px; border-radius: 14px;
  background: ${({ theme }) => theme.color.blue}15;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem; color: ${({ theme }) => theme.color.blue};
`;
const FeatureTitle = styled.h3`
  font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem;
  color: ${({ theme }) => theme.font.color.primary};
`;
const FeatureDesc = styled.p`
  font-size: 1rem; margin: 0; line-height: 1.5;
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const ListingGrid = styled.div`
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;
  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;
const ListingCard = styled(Link)`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 10px; overflow: hidden; text-decoration: none; transition: all 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
`;
const ListingImg = styled.div<{ $src: string }>`
  height: 140px; background: url(${({ $src }) => $src}) center/cover no-repeat;
`;
const ListingBody = styled.div` padding: 0.75rem; `;
const ListingTitle = styled.div`
  font-size: 1.4375rem; font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; margin-bottom: 0.375rem; line-height: 1.3;
`;
const ListingPrice = styled.div`
  font-size: 1.3125rem; font-weight: 700; color: ${({ theme }) => theme.font.color.danger};
`;
const ListingMeta = styled.div`
  font-size: 1.375rem; color: ${({ theme }) => theme.font.color.tertiary};
  margin-top: 0.25rem;
`;

const STATUS_LABELS: Record<string, string> = {
  SELLING: 'Đang mở bán',
  UPCOMING: 'Sắp mở bán',
  HANDED_OVER: 'Đã bàn giao',
};

const formatPrice = (price: number): string => {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
  return price.toLocaleString('vi-VN') + ' đ';
};

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K+`;
  return n.toLocaleString('vi-VN');
};

export const HomePage = () => {
  const { t } = useLanguage();
  const theme = useTheme();
  const featuredListings = mockPublicListings.filter((l) => l.isFeatured).slice(0, 4);
  const featuredProjects = mockProjects.slice(0, 3);

  return (
    <Container>
      {/* Hero */}
      <HeroSection>
        <HeroTitle>🏠 Long Thành Land</HeroTitle>
        <HeroSubtitle>
          Nền tảng bất động sản thông minh với AI - Tìm kiếm, đánh giá và giao dịch an toàn
        </HeroSubtitle>
        <SearchBar>
          <SearchInput placeholder="Tìm kiếm địa điểm, dự án, loại BĐS..." />
          <SearchSelect>
            <option>Nhà đất bán</option>
            <option>Nhà đất cho thuê</option>
            <option>Dự án</option>
          </SearchSelect>
          <SearchButton><IconSearch size={18} /> Tìm kiếm</SearchButton>
        </SearchBar>
      </HeroSection>

      {/* Quick Nav */}
      <QuickNavRow>
        <QuickNavCard to="/marketplace/for-sale">
          <QuickNavIcon $color={theme.color.red}><IconHome size={24} /></QuickNavIcon>
          <div>
            <QuickNavTitle>Nhà đất bán</QuickNavTitle>
            <QuickNavDesc>{formatNumber(mockForSaleSubcategories.reduce((s, c) => s + c.count, 0))} tin đăng</QuickNavDesc>
          </div>
        </QuickNavCard>
        <QuickNavCard to="/marketplace/for-rent">
          <QuickNavIcon $color={theme.color.blue}><IconBuilding size={24} /></QuickNavIcon>
          <div>
            <QuickNavTitle>Nhà đất cho thuê</QuickNavTitle>
            <QuickNavDesc>{formatNumber(mockForRentSubcategories.reduce((s, c) => s + c.count, 0))} tin đăng</QuickNavDesc>
          </div>
        </QuickNavCard>
        <QuickNavCard to="/marketplace/projects">
          <QuickNavIcon $color={theme.color.green}><IconMap size={24} /></QuickNavIcon>
          <div>
            <QuickNavTitle>Dự án</QuickNavTitle>
            <QuickNavDesc>{formatNumber(mockHomepageStats.totalProjects)} dự án</QuickNavDesc>
          </div>
        </QuickNavCard>
      </QuickNavRow>

      {/* For Sale Categories */}
      <Sec>
        <SecHeader>
          <SecTitle><IconHome size={22} /> Nhà đất bán</SecTitle>
          <SecLink to="/marketplace/for-sale">Xem tất cả <IconChevronRight size={16} /></SecLink>
        </SecHeader>
        <CatGrid>
          {mockForSaleSubcategories.slice(0, 6).map((cat) => (
            <CatCard key={cat.id} to={`/marketplace/for-sale?category=${cat.slug}`}>
              <CatIcon>{cat.icon}</CatIcon>
              <div>
                <CatName>{cat.name}</CatName>
                <CatCount>{cat.count.toLocaleString('vi-VN')} tin</CatCount>
              </div>
            </CatCard>
          ))}
        </CatGrid>
      </Sec>

      {/* Featured Listings */}
      <Sec>
        <SecHeader>
          <SecTitle><IconTrendingUp size={22} /> Tin đăng nổi bật</SecTitle>
          <SecLink to="/marketplace/browse">Xem tất cả <IconChevronRight size={16} /></SecLink>
        </SecHeader>
        <ListingGrid>
          {featuredListings.map((listing) => (
            <ListingCard key={listing.id} to={`/marketplace/listings/${listing.id}`}>
              <ListingImg $src={listing.images[0]} />
              <ListingBody>
                <ListingTitle>{listing.title}</ListingTitle>
                <ListingPrice>{formatPrice(listing.price)}</ListingPrice>
                <ListingMeta>{listing.area} m² · {listing.district}, {listing.city}</ListingMeta>
              </ListingBody>
            </ListingCard>
          ))}
        </ListingGrid>
      </Sec>

      {/* Featured Projects */}
      <Sec>
        <SecHeader>
          <SecTitle><IconRocket size={22} /> Dự án nổi bật</SecTitle>
          <SecLink to="/marketplace/projects">Xem tất cả <IconChevronRight size={16} /></SecLink>
        </SecHeader>
        <ProjGrid>
          {featuredProjects.map((proj) => (
            <ProjCard key={proj.id} to={`/marketplace/projects?id=${proj.id}`}>
              <ProjImg $src={proj.image}>
                <ProjBadge $status={proj.status}>{STATUS_LABELS[proj.status]}</ProjBadge>
              </ProjImg>
              <ProjBody>
                <ProjName>{proj.name}</ProjName>
                <ProjDev>{proj.developer} · {proj.location}</ProjDev>
                <ProjTags>
                  <ProjTag>{proj.priceRange}</ProjTag>
                  <ProjTag>{proj.areaRange}</ProjTag>
                  <ProjTag>🛡️ {proj.trustScore}/100</ProjTag>
                </ProjTags>
              </ProjBody>
            </ProjCard>
          ))}
        </ProjGrid>
      </Sec>

      {/* Stats */}
      <StatsRow>
        <StatItem>
          <StatNumber>{formatNumber(mockHomepageStats.totalListings)}</StatNumber>
          <StatLabel>Tin đăng</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>{formatNumber(mockHomepageStats.totalProjects)}</StatNumber>
          <StatLabel>Dự án</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>{formatNumber(mockHomepageStats.totalAgents)}</StatNumber>
          <StatLabel>Nhà môi giới</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>{formatNumber(mockHomepageStats.totalUsers)}</StatNumber>
          <StatLabel>Người dùng</StatLabel>
        </StatItem>
        <StatItem>
          <StatNumber>{mockHomepageStats.citiesCovered}</StatNumber>
          <StatLabel>Tỉnh thành</StatLabel>
        </StatItem>
      </StatsRow>

      {/* AI Features */}
      <Sec>
        <SecHeader>
          <SecTitle><IconSparkles size={22} /> Tính năng AI độc quyền</SecTitle>
        </SecHeader>
        <FeaturesGrid>
          <FeatureCard>
            <FeatureIcon><IconShield size={28} /></FeatureIcon>
            <FeatureTitle>AI Trust Score</FeatureTitle>
            <FeatureDesc>Hệ thống chấm điểm tin cậy 10 yếu tố, giúp bạn đánh giá độ uy tín của mỗi tin đăng.</FeatureDesc>
          </FeatureCard>
          <FeatureCard>
            <FeatureIcon><IconTrendingUp size={28} /></FeatureIcon>
            <FeatureTitle>Phân tích giá thị trường</FeatureTitle>
            <FeatureDesc>AI so sánh giá với 30+ BĐS tương tự, cảnh báo giá bất thường, dự đoán xu hướng.</FeatureDesc>
          </FeatureCard>
          <FeatureCard>
            <FeatureIcon><IconUsers size={28} /></FeatureIcon>
            <FeatureTitle>Trợ lý AI 24/7</FeatureTitle>
            <FeatureDesc>Chatbot thông minh hỗ trợ tìm kiếm, tư vấn pháp lý, phân tích đầu tư BĐS.</FeatureDesc>
          </FeatureCard>
        </FeaturesGrid>
      </Sec>

      {/* For Rent Categories */}
      <Sec>
        <SecHeader>
          <SecTitle><IconBuilding size={22} /> Nhà đất cho thuê</SecTitle>
          <SecLink to="/marketplace/for-rent">Xem tất cả <IconChevronRight size={16} /></SecLink>
        </SecHeader>
        <CatGrid>
          {mockForRentSubcategories.slice(0, 6).map((cat) => (
            <CatCard key={cat.id} to={`/marketplace/for-rent?category=${cat.slug}`}>
              <CatIcon>{cat.icon}</CatIcon>
              <div>
                <CatName>{cat.name}</CatName>
                <CatCount>{cat.count.toLocaleString('vi-VN')} tin</CatCount>
              </div>
            </CatCard>
          ))}
        </CatGrid>
      </Sec>
    </Container>
  );
};
