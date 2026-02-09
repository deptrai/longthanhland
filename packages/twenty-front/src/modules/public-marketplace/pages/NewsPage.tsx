import styled from '@emotion/styled';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NewsSection } from '../components/NewsSection';
import { useLanguage } from '../i18n/LanguageContext';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', labelEn: 'All' },
  { id: 'market', label: 'Thị trường', labelEn: 'Market' },
  { id: 'analysis', label: 'Phân tích', labelEn: 'Analysis' },
  { id: 'trends', label: 'Xu hướng', labelEn: 'Trends' },
  { id: 'projects', label: 'Dự án', labelEn: 'Projects' },
  { id: 'policy', label: 'Chính sách', labelEn: 'Policy' },
];

const Container = styled.div`
  min-height: 60vh;
`;

const PageHeader = styled.div`
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const CategoryTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
`;

const CategoryTab = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.color.blue : theme.border.color.medium};
  background-color: ${({ theme, $active }) =>
    $active ? theme.color.blue : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.font.color.inverted : theme.font.color.secondary};

  &:hover {
    border-color: ${({ theme }) => theme.color.blue};
    color: ${({ theme, $active }) =>
      $active ? theme.font.color.inverted : theme.color.blue};
  }
`;

const FeaturedArticle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeaturedImage = styled.img`
  width: 100%;
  height: 300px;
  object-fit: cover;
`;

const FeaturedContent = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const FeaturedBadge = styled.span`
  display: inline-block;
  width: fit-content;
  padding: 0.25rem 0.75rem;
  background-color: ${({ theme }) => theme.color.red};
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  margin-bottom: 0.75rem;
`;

const FeaturedTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  line-height: 1.4;
  margin-bottom: 0.75rem;
`;

const FeaturedExcerpt = styled.p`
  font-size: 1.0625rem;
  color: ${({ theme }) => theme.font.color.secondary};
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const FeaturedMeta = styled.div`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  gap: 1rem;
`;

export const NewsPage = () => {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <Container>
      <PageHeader>
        <PageTitle>📰 {language === 'vi' ? 'Tin tức Bất động sản' : 'Real Estate News'}</PageTitle>
        <CategoryTabs>
          {CATEGORIES.map((cat) => (
            <CategoryTab
              key={cat.id}
              $active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            >
              {language === 'vi' ? cat.label : cat.labelEn}
            </CategoryTab>
          ))}
        </CategoryTabs>
      </PageHeader>

      <Link to="/marketplace/news/news-1" style={{ textDecoration: 'none', color: 'inherit' }}>
        <FeaturedArticle>
          <FeaturedImage
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800"
            alt="Featured article"
          />
          <FeaturedContent>
            <FeaturedBadge>Nổi bật</FeaturedBadge>
            <FeaturedTitle>
              Sân bay Long Thành: Cơ hội vàng cho nhà đầu tư bất động sản
            </FeaturedTitle>
            <FeaturedExcerpt>
              Dự án sân bay quốc tế Long Thành dự kiến hoàn thành giai đoạn 1
              vào năm 2025, mở ra cơ hội đầu tư hấp dẫn cho khu vực Đồng Nai
              với tiềm năng tăng giá 40-50%.
            </FeaturedExcerpt>
            <FeaturedMeta>
              <span>27/12/2025</span>
              <span>5 phút đọc</span>
              <span>Thị trường</span>
            </FeaturedMeta>
          </FeaturedContent>
        </FeaturedArticle>
      </Link>

      <NewsSection />
    </Container>
  );
};

