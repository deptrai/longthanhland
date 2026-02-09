import styled from '@emotion/styled';
import { useState } from 'react';
import {
    IconCheck,
    IconMap,
    IconPhone,
    IconSearch,
    IconUsers,
} from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

interface DirectoryAgent {
  id: string;
  name: string;
  avatar: string;
  company: string;
  location: string;
  specialty: string[];
  totalListings: number;
  rating: number;
  phone: string;
  verified: boolean;
  experience: string;
}

const mockDirectoryAgents: DirectoryAgent[] = [
  {
    id: 'agent-1', name: 'Trần Tín', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    company: 'Long Thành Real Estate', location: 'Long Thành, Đồng Nai', specialty: ['Đất nền', 'Nhà phố'],
    totalListings: 45, rating: 4.8, phone: '0901234567', verified: true, experience: '5 năm',
  },
  {
    id: 'agent-2', name: 'Nguyễn Thị Mai', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    company: 'Phú Mỹ Hưng Realty', location: 'Quận 7, TP.HCM', specialty: ['Căn hộ', 'Biệt thự'],
    totalListings: 78, rating: 4.9, phone: '0912345678', verified: true, experience: '8 năm',
  },
  {
    id: 'agent-3', name: 'Lê Văn Hùng', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    company: 'Đất Xanh Group', location: 'Quận 2, TP.HCM', specialty: ['Căn hộ', 'Văn phòng'],
    totalListings: 120, rating: 4.7, phone: '0923456789', verified: true, experience: '10 năm',
  },
  {
    id: 'agent-4', name: 'Phạm Minh Tuấn', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    company: 'Nhơn Trạch Land', location: 'Nhơn Trạch, Đồng Nai', specialty: ['Đất nền', 'Kho xưởng'],
    totalListings: 32, rating: 4.5, phone: '0934567890', verified: false, experience: '3 năm',
  },
  {
    id: 'agent-5', name: 'Hoàng Thị Lan', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    company: 'Vinhomes Agency', location: 'Quận 9, TP.HCM', specialty: ['Căn hộ', 'Shophouse'],
    totalListings: 95, rating: 4.9, phone: '0945678901', verified: true, experience: '7 năm',
  },
  {
    id: 'agent-6', name: 'Đỗ Quang Minh', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
    company: 'Bình Dương Property', location: 'Thủ Dầu Một, Bình Dương', specialty: ['Đất nền', 'Nhà phố'],
    totalListings: 56, rating: 4.6, phone: '0956789012', verified: true, experience: '6 năm',
  },
  {
    id: 'agent-7', name: 'Vũ Thị Hương', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
    company: 'Hà Nội Real Estate', location: 'Cầu Giấy, Hà Nội', specialty: ['Căn hộ', 'Biệt thự'],
    totalListings: 67, rating: 4.8, phone: '0967890123', verified: true, experience: '9 năm',
  },
  {
    id: 'agent-8', name: 'Trương Văn Nam', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face',
    company: 'Biên Hòa Land', location: 'Biên Hòa, Đồng Nai', specialty: ['Đất nền', 'Nhà phố', 'Kho xưởng'],
    totalListings: 41, rating: 4.4, phone: '0978901234', verified: false, experience: '4 năm',
  },
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;
const SearchRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;
const SearchInput = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.625rem 1rem;
  &:focus-within {
    border-color: ${({ theme }) => theme.color.blue};
  }
`;
const Input = styled.input`
  flex: 1;
  border: none;
  background: none;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.primary};
  outline: none;
  &::placeholder {
    color: ${({ theme }) => theme.font.color.tertiary};
  }
`;
const StatsRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const StatItem = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
`;
const AgentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
`;
const AgentCard = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.2s;
  cursor: pointer;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: ${({ theme }) => theme.color.blue};
  }
`;
const AgentTop = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;
const Avatar = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;
const AgentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;
const AgentName = styled.h3`
  font-size:     -eem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
`;
const VerifiedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.green};
  color: ${({ theme }) => theme.font.color.inverted};
  flex-shrink: 0;
`;
const AgentCompany = styled.div`
  font-size: 1.4375rem;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-bottom: 0.25rem;
`;
const AgentLocation = styled.div`
  font-size: 1.4375rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;
const TagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 1rem;
`;
const Tag = styled.span`
  padding: 0.2rem 0.625rem;
  background: ${({ theme }) => theme.background.tertiary};
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 1.375rem;
  border-radius: 12px;
`;
const AgentStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid ${({ theme }) => theme.border.color.light};
`;
const AgentStatItem = styled.div`
  text-align: center;
`;
const AgentStatValue = styled.div`
  font-size:     -eem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
`;
const AgentStatLabel = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;
const PhoneBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: ${({ theme }) => theme.color.green};
  color: ${({ theme }) => theme.font.color.inverted};
  border: none;
  border-radius: 6px;
  padding: 0.375rem 0.75rem;
  font-size: 1.375rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

export const AgentDirectoryPage = () => {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const [revealedPhones, setRevealedPhones] = useState<Set<string>>(new Set());

  const filtered = mockDirectoryAgents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRevealPhone = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhones((prev) => new Set(prev).add(id));
  };

  return (
    <Container>
      <PageHeader>
        <PageTitle>
          <IconUsers size={24} />
          {language === 'vi' ? 'Danh bạ Nhà môi giới' : 'Agent Directory'}
        </PageTitle>
      </PageHeader>

      <SearchRow>
        <SearchInput>
          <IconSearch size={18} />
          <Input
            placeholder={
              language === 'vi'
                ? 'Tìm theo tên, công ty, khu vực...'
                : 'Search by name, company, area...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SearchInput>
      </SearchRow>

      <StatsRow>
        <span>
          {language === 'vi' ? 'Tìm thấy' : 'Found'}{' '}
          <StatItem>{filtered.length}</StatItem>{' '}
          {language === 'vi' ? 'nhà môi giới' : 'agents'}
        </span>
      </StatsRow>

      <AgentsGrid>
        {filtered.map((agent) => (
          <AgentCard key={agent.id}>
            <AgentTop>
              <Avatar src={agent.avatar} alt={agent.name} />
              <AgentInfo>
                <AgentName>
                  {agent.name}
                  {agent.verified && (
                    <VerifiedBadge>
                      <IconCheck size={12} />
                    </VerifiedBadge>
                  )}
                </AgentName>
                <AgentCompany>{agent.company}</AgentCompany>
                <AgentLocation>
                  <IconMap size={14} />
                  {agent.location}
                </AgentLocation>
              </AgentInfo>
            </AgentTop>
            <TagsRow>
              {agent.specialty.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
              <Tag>⏱ {agent.experience}</Tag>
            </TagsRow>
            <AgentStats>
              <AgentStatItem>
                <AgentStatValue>{agent.totalListings}</AgentStatValue>
                <AgentStatLabel>
                  {language === 'vi' ? 'Tin đăng' : 'Listings'}
                </AgentStatLabel>
              </AgentStatItem>
              <AgentStatItem>
                <AgentStatValue>⭐ {agent.rating}</AgentStatValue>
                <AgentStatLabel>
                  {language === 'vi' ? 'Đánh giá' : 'Rating'}
                </AgentStatLabel>
              </AgentStatItem>
              <PhoneBtn onClick={(e) => handleRevealPhone(agent.id, e)}>
                <IconPhone size={14} />
                {revealedPhones.has(agent.id)
                  ? agent.phone
                  : agent.phone.slice(0, 7) + '***'}
              </PhoneBtn>
            </AgentStats>
          </AgentCard>
        ))}
      </AgentsGrid>
    </Container>
  );
};

