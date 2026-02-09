import styled from '@emotion/styled';
import { Link, useParams } from 'react-router-dom';
import { IconCheck, IconChevronRight, IconMap } from 'twenty-ui/display';

import { CompactTrustScore } from '../components/CompactTrustScore';
import { mockProjects, mockPublicListings } from '../data/mock-data';


const PageContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
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

const HeroSection = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 2rem;
`;

const HeroImage = styled.img`
  width: 100%;
  height: 400px;
  object-fit: cover;
`;

const HeroOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: ${({ theme }) => theme.font.color.inverted};
`;

const ProjectName = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 0.3rem 0.85rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  margin-left: 0.75rem;
  background: ${({ theme, status }) =>
    status === 'SELLING' ? theme.color.green :
    status === 'UPCOMING' ? theme.color.orange :
    status === 'HANDED_OVER' ? theme.color.blue : theme.color.gray};
  color: ${({ theme }) => theme.font.color.inverted};
`;

const ProjectLocation = styled.p`
  font-size: 1.125rem;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 0.35rem;
`;

const ContentGrid = styled.div`
  display: flex;
  gap: 2rem;
  @media (max-width: 968px) {
    flex-direction: column;
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const Sidebar = styled.aside`
  width: 340px;
  flex-shrink: 0;
  @media (max-width: 968px) {
    width: 100%;
  }
`;

const QuickInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const QuickInfoCard = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
`;

const QuickInfoLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 0.35rem;
`;

const QuickInfoValue = styled.div`
  font-size: 1.1875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
`;

const Section = styled.section`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const Description = styled.p`
  font-size: 1.125rem;
  line-height: 1.8;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const AmenitiesGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const AmenityTag = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: 8px;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const DeveloperRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const DeveloperLogo = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
`;

const DeveloperInfo = styled.div``;

const DeveloperName = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
`;

const DeveloperLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const SidebarCard = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
`;

const SidebarTitle = styled.h3`
  font-size: 1.1875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const ContactButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.color.red};
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 0.75rem;
  &:hover { opacity: 0.9; }
`;

const PhoneButton = styled.button`
  width: 100%;
  padding: 0.85rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  background: ${({ theme }) => theme.background.secondary};
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { border-color: ${({ theme }) => theme.color.blue}; }
`;

const RelatedProjectCard = styled(Link)`
  display: flex;
  gap: 0.75rem;
  text-decoration: none;
  margin-bottom: 1rem;
  &:last-child { margin-bottom: 0; }
`;

const RelatedProjectImage = styled.img`
  width: 90px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
`;

const RelatedProjectInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RelatedProjectName = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.font.color.primary};
  line-height: 1.4;
  margin-bottom: 0.25rem;
`;

const RelatedProjectPrice = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.color.blue};
  font-weight: 600;
`;

const MapPlaceholder = styled.div`
  width: 100%;
  height: 300px;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 1rem;
`;

const ListingCard = styled(Link)`
  background: ${({ theme }) => theme.background.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  transition: all 0.2s;
  &:hover { transform: translateY(-4px); border-color: ${({ theme }) => theme.color.blue}; }
`;

const ListingImage = styled.img`
  width: 100%;
  height: 160px;
  object-fit: cover;
`;

const ListingInfo = styled.div`
  padding: 1rem;
`;

const ListingTitle = styled.h4`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.35rem;
`;

const ListingPrice = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.danger};
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
`;

const NotFoundMessage = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.25rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const statusLabels: Record<string, string> = {
  SELLING: 'Đang mở bán',
  UPCOMING: 'Sắp mở bán',
  HANDED_OVER: 'Đã bàn giao',
};

export const MarketplaceProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const project = mockProjects.find((p) => p.id === id);

  if (!project) {
    return (
      <PageContainer>
        <NotFoundMessage>
          Dự án không tồn tại hoặc đã bị xóa.
          <br />
          <Link to="/marketplace/projects" style={{ color: 'inherit' }}>
            ← Quay lại Dự án
          </Link>
        </NotFoundMessage>
      </PageContainer>
    );
  }

  const relatedProjects = mockProjects
    .filter((p) => p.id !== project.id)
    .slice(0, 4);

  const relatedListings = mockPublicListings
    .filter((l) => l.city === project.city)
    .slice(0, 4);

  return (
    <PageContainer>
      <BreadcrumbNav>
        <BreadcrumbLink to="/marketplace">Trang chủ</BreadcrumbLink>
        <IconChevronRight size={14} />
        <BreadcrumbLink to="/marketplace/projects">Dự án</BreadcrumbLink>
        <IconChevronRight size={14} />
        <BreadcrumbLink to={`/marketplace/projects?city=${project.city}`}>
          {project.city}
        </BreadcrumbLink>
        <IconChevronRight size={14} />
        <span>{project.name}</span>
      </BreadcrumbNav>

      <HeroSection>
        <HeroImage src={project.image} alt={project.name} />
        <HeroOverlay>
          <ProjectName>
            {project.name}
            <StatusBadge status={project.status}>
              {statusLabels[project.status] || project.status}
            </StatusBadge>
          </ProjectName>
          <ProjectLocation>
            <IconMap size={16} />
            {project.location}, {project.district}, {project.city}
          </ProjectLocation>
        </HeroOverlay>
      </HeroSection>

      <QuickInfoGrid>
        <QuickInfoCard>
          <QuickInfoLabel>Giá</QuickInfoLabel>
          <QuickInfoValue>{project.priceRange}</QuickInfoValue>
        </QuickInfoCard>
        <QuickInfoCard>
          <QuickInfoLabel>Diện tích</QuickInfoLabel>
          <QuickInfoValue>{project.areaRange}</QuickInfoValue>
        </QuickInfoCard>
        <QuickInfoCard>
          <QuickInfoLabel>Số căn</QuickInfoLabel>
          <QuickInfoValue>{project.totalUnits.toLocaleString()}</QuickInfoValue>
        </QuickInfoCard>
        <QuickInfoCard>
          <QuickInfoLabel>Bàn giao</QuickInfoLabel>
          <QuickInfoValue>{project.completionDate}</QuickInfoValue>
        </QuickInfoCard>
      </QuickInfoGrid>

      <ContentGrid>
        <MainContent>
          <Section>
            <SectionTitle>Tổng quan dự án</SectionTitle>
            <DeveloperRow>
              <DeveloperLogo
                src={project.developerLogo}
                alt={project.developer}
              />
              <DeveloperInfo>
                <DeveloperLabel>Chủ đầu tư</DeveloperLabel>
                <DeveloperName>{project.developer}</DeveloperName>
              </DeveloperInfo>
            </DeveloperRow>
            <Description>{project.description}</Description>
          </Section>

          <Section>
            <SectionTitle>Tiện ích nổi bật</SectionTitle>
            <AmenitiesGrid>
              {project.amenities.map((amenity) => (
                <AmenityTag key={amenity}>
                  <IconCheck size={16} />
                  {amenity}
                </AmenityTag>
              ))}
            </AmenitiesGrid>
          </Section>

          <Section>
            <SectionTitle>Vị trí dự án</SectionTitle>
            <MapPlaceholder>
              <IconMap size={24} /> &nbsp; Bản đồ vị trí - {project.location}
            </MapPlaceholder>
          </Section>

          {relatedListings.length > 0 && (
            <Section>
              <SectionTitle>Tin rao trong khu vực</SectionTitle>
              <ListingsGrid>
                {relatedListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    to={`/marketplace/listings/${listing.id}`}
                  >
                    <ListingImage
                      src={listing.images[0]}
                      alt={listing.title}
                    />
                    <ListingInfo>
                      <ListingTitle>{listing.title}</ListingTitle>
                      <ListingPrice>
                        {listing.price.toLocaleString()} VNĐ
                      </ListingPrice>
                    </ListingInfo>
                  </ListingCard>
                ))}
              </ListingsGrid>
            </Section>
          )}
        </MainContent>

        <Sidebar>
          <SidebarCard>
            <CompactTrustScore listing={mockPublicListings[0]} />
          </SidebarCard>

          <SidebarCard>
            <SidebarTitle>Liên hệ chủ đầu tư</SidebarTitle>
            <ContactButton>📧 Gửi yêu cầu tư vấn</ContactButton>
            <PhoneButton>📞 1900 xxxx</PhoneButton>
          </SidebarCard>

          <SidebarCard>
            <SidebarTitle>Dự án liên quan</SidebarTitle>
            {relatedProjects.map((rp) => (
              <RelatedProjectCard
                key={rp.id}
                to={`/marketplace/projects/${rp.id}`}
              >
                <RelatedProjectImage src={rp.image} alt={rp.name} />
                <RelatedProjectInfo>
                  <RelatedProjectName>{rp.name}</RelatedProjectName>
                  <RelatedProjectPrice>{rp.priceRange}</RelatedProjectPrice>
                </RelatedProjectInfo>
              </RelatedProjectCard>
            ))}
          </SidebarCard>
        </Sidebar>
      </ContentGrid>
    </PageContainer>
  );
};
