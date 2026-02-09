import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { IconCheck, IconMessage, IconPhone } from 'twenty-ui/display';
import {
    mockAgentProfile,
    mockDistrictAreas,
    mockFeaturedListingLinks,
} from '../data/mock-data';

const SidebarContainer = styled.aside`
  width: 320px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem 0 1.5rem 1.5rem;

  @media (max-width: 1024px) {
    display: none;
  }
`;

// === Agent Profile Card ===
const AgentCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
`;

const AgentBadgeHeader = styled.div`
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.color.green}, ${theme.color.green})`};
  color: ${({ theme }) => theme.font.color.inverted};
  text-align: center;
  padding: 0.625rem;
  font-size: 0.9375rem;
  font-weight: 600;
`;

const AgentBody = styled.div`
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Avatar = styled.img`
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.border.color.medium};
  margin-bottom: 0.75rem;
`;

const AgentName = styled.h3`
  font-size: 1.1875rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 0.75rem;
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin-bottom: 1rem;
  gap: 0.25rem;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  text-align: center;
`;

const StatValue = styled.span`
  font-size: 1.0625rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
`;

const VerifiedBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.green};
  font-size: 1.5rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
`;

const ProfileButton = styled(Link)`
  display: block;
  text-align: center;
  padding: 0.625rem;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
  }
`;

const ZaloButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background: ${({ theme }) => `linear-gradient(135deg, ${theme.color.blue}, ${theme.color.blue})`};
  border: none;
  border-radius: 8px;
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const PhoneButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.background.secondary};
  }
`;

const PhoneHint = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  text-align: center;
  margin-top: 0.25rem;
`;

// === Area Links Section ===
const SectionCard = styled.div`
  background-color: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
`;

const SectionTitle = styled.h4`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  padding: 0.875rem 1.125rem;
  margin: 0;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  background-color: ${({ theme }) => theme.background.tertiary};
`;

const AreaList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const AreaItem = styled.li`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};

  &:last-child {
    border-bottom: none;
  }
`;

const AreaLink = styled.a`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 1.125rem;
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 0.9375rem;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    color: ${({ theme }) => theme.color.blue};
  }
`;

const AreaCount = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

// === Featured Listings Section ===
const FeaturedList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const FeaturedItem = styled.li`
  border-bottom: 1px solid ${({ theme }) => theme.border.color.light};

  &:last-child {
    border-bottom: none;
  }
`;

const FeaturedLink = styled.a`
  display: block;
  padding: 0.625rem 1.125rem;
  color: ${({ theme }) => theme.color.blue};
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    text-decoration: underline;
  }
`;


export const MarketplaceSidebar = () => {
  const agent = mockAgentProfile;

  return (
    <SidebarContainer>
      {/* Agent Profile Card */}
      <AgentCard>
        <AgentBadgeHeader>🏅 {agent.badge}</AgentBadgeHeader>
        <AgentBody>
          <Avatar src={agent.avatar} alt={agent.fullName} />
          <AgentName>{agent.fullName}</AgentName>
          <StatsRow>
            <StatItem>
              <StatValue>{agent.memberSince}</StatValue>
              Tham gia
            </StatItem>
            <StatItem>
              <StatValue>{agent.totalListings}</StatValue>
              Tin đăng
            </StatItem>
            <StatItem>
              {agent.isVerified ? (
                <VerifiedBadge>
                  <IconCheck size={22} />
                </VerifiedBadge>
              ) : (
                <StatValue>—</StatValue>
              )}
              Chứng chỉ
            </StatItem>
          </StatsRow>
          <ButtonGroup>
            <ProfileButton to={agent.profileLink}>
              Xem trang cá nhân
            </ProfileButton>
            <ZaloButton href={agent.zaloLink}>
              <IconMessage size={18} />
              Chat qua Zalo
            </ZaloButton>
            <PhoneButton href={`tel:${agent.phone}`}>
              <IconPhone size={18} />
              {agent.phone} · Hiện số
            </PhoneButton>
            <PhoneHint>
              ✕2 hiệu quả hơn cùng tài khoản Môi giới chuyên nghiệp
            </PhoneHint>
          </ButtonGroup>
        </AgentBody>
      </AgentCard>

      {/* Area/District Links */}
      {mockDistrictAreas.map((district) => (
        <SectionCard key={district.districtName}>
          <SectionTitle>
            Bán đất tại {district.districtName}
          </SectionTitle>
          <AreaList>
            {district.areas.map((area) => (
              <AreaItem key={area.name}>
                <AreaLink href={area.href}>
                  <span>{area.name}</span>
                  <AreaCount>({area.count})</AreaCount>
                </AreaLink>
              </AreaItem>
            ))}
          </AreaList>
        </SectionCard>
      ))}

      {/* Featured Listings */}
      <SectionCard>
        <SectionTitle>Bất động sản nổi bật</SectionTitle>
        <FeaturedList>
          {mockFeaturedListingLinks.map((item) => (
            <FeaturedItem key={item.title}>
              <FeaturedLink href={item.href}>{item.title}</FeaturedLink>
            </FeaturedItem>
          ))}
        </FeaturedList>
      </SectionCard>
    </SidebarContainer>
  );
};
