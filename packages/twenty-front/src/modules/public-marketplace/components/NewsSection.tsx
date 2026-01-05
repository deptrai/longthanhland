import styled from '@emotion/styled';

const NewsContainer = styled.section`
  margin-top: 3rem;
  padding: 2rem 0;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1.5rem;
`;

const NewsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const NewsCard = styled.article`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    border-color: ${({ theme }) => theme.color.blue};
  }
`;

const NewsImage = styled.img`
  height: 200px;
  object-fit: cover;
  width: 100%;
`;

const NewsContent = styled.div`
  padding: 1.5rem;
`;

const NewsCategory = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: ${({ theme }) => theme.color.blue};
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  margin-bottom: 0.75rem;
`;

const NewsTitle = styled.h3`
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.5rem;
`;

const NewsExcerpt = styled.p`
  font-size: 0.9375rem;
  color: ${({ theme }) => theme.font.color.secondary};
  line-height: 1.6;
  margin-bottom: 1rem;
`;

const NewsFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const NewsDate = styled.span``;

const NewsReadTime = styled.span``;

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  date: string;
  readTime: string;
}

const mockNews: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'Sân bay Long Thành: Cơ hội vàng cho nhà đầu tư bất động sản',
    excerpt:
      'Dự án sân bay quốc tế Long Thành dự kiến hoàn thành giai đoạn 1 vào năm 2025, mở ra cơ hội đầu tư hấp dẫn cho khu vực Đồng Nai với tiềm năng tăng giá 40-50%.',
    category: 'Thị trường',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
    date: '27/12/2025',
    readTime: '5 phút đọc',
  },
  {
    id: 'news-2',
    title: 'Quận 2 TPHCM: Giá căn hộ tăng 15% trong năm 2025',
    excerpt:
      'Thị trường bất động sản Quận 2 ghi nhận mức tăng trưởng ấn tượng với giá căn hộ trung bình tăng 15% so với cùng kỳ năm trước, nhờ hạ tầng Metro và các dự án cao cấp.',
    category: 'Phân tích',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    date: '26/12/2025',
    readTime: '4 phút đọc',
  },
  {
    id: 'news-3',
    title: 'Xu hướng đầu tư đất nền 2026: Nên chọn khu vực nào?',
    excerpt:
      'Chuyên gia dự báo đất nền khu vực ven đô và các tỉnh lân cận TPHCM sẽ là điểm sáng trong năm 2026, đặc biệt là Long Thành, Nhơn Trạch và Bình Dương.',
    category: 'Xu hướng',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
    date: '25/12/2025',
    readTime: '6 phút đọc',
  },
  {
    id: 'news-4',
    title: 'Phú Mỹ Hưng: Khu đô thị đáng sống nhất TPHCM',
    excerpt:
      'Với hạ tầng hoàn thiện, an ninh tốt và tiện ích đầy đủ, Phú Mỹ Hưng tiếp tục giữ vững vị trí khu đô thị đáng sống nhất thành phố với giá trị bất động sản ổn định.',
    category: 'Dự án',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    date: '24/12/2025',
    readTime: '5 phút đọc',
  },
  {
    id: 'news-5',
    title: 'Chính sách mới về thuế bất động sản 2026',
    excerpt:
      'Chính phủ công bố chính sách thuế mới cho bất động sản từ năm 2026, tác động đến cả người mua và nhà đầu tư. Cần cập nhật để đưa ra quyết định đúng đắn.',
    category: 'Chính sách',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    date: '23/12/2025',
    readTime: '7 phút đọc',
  },
  {
    id: 'news-6',
    title: 'Vinhomes Central Park: Biểu tượng căn hộ cao cấp Sài Gòn',
    excerpt:
      'Vinhomes Central Park không chỉ là nơi ở mà còn là biểu tượng của phong cách sống hiện đại với view sông tuyệt đẹp và tiện ích 5 sao, giá trị tăng đều qua các năm.',
    category: 'Dự án',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    date: '22/12/2025',
    readTime: '4 phút đọc',
  },
];

export const NewsSection = () => {
  return (
    <NewsContainer>
      <SectionTitle>📰 Tin tức Bất động sản</SectionTitle>
      <NewsGrid>
        {mockNews.map((article) => (
          <NewsCard key={article.id}>
            <NewsImage src={article.image} alt={article.title} />
            <NewsContent>
              <NewsCategory>{article.category}</NewsCategory>
              <NewsTitle>{article.title}</NewsTitle>
              <NewsExcerpt>{article.excerpt}</NewsExcerpt>
              <NewsFooter>
                <NewsDate>{article.date}</NewsDate>
                <NewsReadTime>{article.readTime}</NewsReadTime>
              </NewsFooter>
            </NewsContent>
          </NewsCard>
        ))}
      </NewsGrid>
    </NewsContainer>
  );
};
