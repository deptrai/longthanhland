import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { IconChevronRight, IconClockHour8, IconUser } from 'twenty-ui/display';

import { mockNewsArticles } from '../data/mock-data';

const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  gap: 2rem;
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const Sidebar = styled.aside`
  width: 340px;
  flex-shrink: 0;
  @media (max-width: 968px) {
    display: none;
  }
`;

const BreadcrumbNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const BreadcrumbLink = styled(Link)`
  color: ${({ theme }) => theme.font.color.tertiary};
  text-decoration: none;
  &:hover { color: ${({ theme }) => theme.color.blue}; }
`;

const ArticleTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  line-height: 1.4;
  margin-bottom: 1rem;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const AuthorAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
`;

const FeaturedImage = styled.img`
  width: 100%;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  max-height: 480px;
  object-fit: cover;
`;

const ArticleBody = styled.div`
  font-size: 1.4375rem;
  line-height: 1.8;
  color: ${({ theme }) => theme.font.color.primary};
  p { margin-bottom: 1.25rem; }
`;

const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const Tag = styled(Link)`
  padding: 0.35rem 0.85rem;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: 20px;
  font-size: 1.4375rem;
  color: ${({ theme }) => theme.font.color.secondary};
  text-decoration: none;
  &:hover { background: ${({ theme }) => theme.color.blue}; color: ${({ theme }) => theme.font.color.inverted}; }
`;

const ShareRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const ShareButton = styled.button`
  padding: 0.4rem 1rem;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  background: ${({ theme }) => theme.background.secondary};
  color: ${({ theme }) => theme.font.color.secondary};
  cursor: pointer;
  font-size: 1.4375rem;
  &:hover { border-color: ${({ theme }) => theme.color.blue}; color: ${({ theme }) => theme.color.blue}; }
`;

const SidebarCard = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const SidebarTitle = styled.h3`
  font-size: 1.4375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const RelatedItem = styled(Link)`
  display: flex;
  gap: 0.75rem;
  text-decoration: none;
  margin-bottom: 1rem;
  &:last-child { margin-bottom: 0; }
`;

const RelatedImage = styled.img`
  width: 90px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
`;

const RelatedInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RelatedTitle = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.font.color.primary};
  line-height: 1.4;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const RelatedDate = styled.span`
  font-size: 1.375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const NotFoundMessage = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.75rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

export const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const article = mockNewsArticles.find((a) => a.id === id);

  if (!article) {
    return (
      <PageContainer>
        <NotFoundMessage>
          Bài viết không tồn tại hoặc đã bị xóa.
          <br />
          <Link to="/marketplace/news" style={{ color: 'inherit' }}>← Quay lại Tin tức</Link>
        </NotFoundMessage>
      </PageContainer>
    );
  }

  const relatedArticles = mockNewsArticles
    .filter((a) => a.id !== article.id)
    .slice(0, 4);

  return (
    <PageContainer>
      <MainContent>
        <BreadcrumbNav>
          <BreadcrumbLink to="/marketplace">Trang chủ</BreadcrumbLink>
          <IconChevronRight size={14} />
          <BreadcrumbLink to="/marketplace/news">Tin tức</BreadcrumbLink>
          <IconChevronRight size={14} />
          <BreadcrumbLink to={`/marketplace/news?category=${article.category}`}>
            {article.category}
          </BreadcrumbLink>
          <IconChevronRight size={14} />
          <span>{article.title.length > 50 ? article.title.substring(0, 50) + '...' : article.title}</span>
        </BreadcrumbNav>

        <ArticleTitle>{article.title}</ArticleTitle>

        <MetaRow>
          <MetaItem>
            <AuthorAvatar src={article.authorAvatar} alt={article.author} />
            {article.author}
          </MetaItem>
          <MetaItem>
            <IconClockHour8 size={16} />
            {article.date}
          </MetaItem>
          <MetaItem>
            <IconClockHour8 size={16} />
            {article.readTime}
          </MetaItem>
          <MetaItem>
            <IconUser size={16} />
            {article.views.toLocaleString()} lượt xem
          </MetaItem>
        </MetaRow>

        <FeaturedImage src={article.image} alt={article.title} />

        <ArticleBody>
          {article.content.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </ArticleBody>

        <TagsSection>
          {article.tags.map((tag) => (
            <Tag key={tag} to={`/marketplace/news?tag=${tag}`}>#{tag}</Tag>
          ))}
        </TagsSection>

        <ShareRow>
          <span>Chia sẻ:</span>
          <ShareButton onClick={() => navigator.clipboard.writeText(window.location.href)}>
            📋 Copy link
          </ShareButton>
          <ShareButton>📘 Facebook</ShareButton>
          <ShareButton>💬 Zalo</ShareButton>
        </ShareRow>
      </MainContent>

      <Sidebar>
        <SidebarCard>
          <SidebarTitle>📰 Bài viết liên quan</SidebarTitle>
          {relatedArticles.map((related) => (
            <RelatedItem key={related.id} to={`/marketplace/news/${related.id}`}>
              <RelatedImage src={related.image} alt={related.title} />
              <RelatedInfo>
                <RelatedTitle>{related.title}</RelatedTitle>
                <RelatedDate>{related.date}</RelatedDate>
              </RelatedInfo>
            </RelatedItem>
          ))}
        </SidebarCard>
      </Sidebar>
    </PageContainer>
  );
};

