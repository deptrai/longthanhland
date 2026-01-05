import styled from '@emotion/styled';
import { IconChevronRight } from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

const StyledBreadcrumbContainer = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  font-size: 0.875rem;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const StyledBreadcrumbItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StyledBreadcrumbLink = styled.a`
  color: ${({ theme }) => theme.font.color.tertiary};
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.color.blue};
  }
`;

const StyledBreadcrumbCurrent = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 500;
`;

interface BreadcrumbProps {
  type: string;
  city: string;
  district: string;
  propertyName: string;
}

export const Breadcrumb = ({
  type,
  city,
  district,
  propertyName,
}: BreadcrumbProps) => {
  const { t } = useLanguage();

  return (
    <StyledBreadcrumbContainer>
      <StyledBreadcrumbItem>
        <StyledBreadcrumbLink href="/marketplace/browse">
          {t('nav.browse')}
        </StyledBreadcrumbLink>
        <IconChevronRight size={16} />
      </StyledBreadcrumbItem>
      <StyledBreadcrumbItem>
        <StyledBreadcrumbLink href={`/marketplace/browse?type=${type}`}>
          {type}
        </StyledBreadcrumbLink>
        <IconChevronRight size={16} />
      </StyledBreadcrumbItem>
      <StyledBreadcrumbItem>
        <StyledBreadcrumbLink href={`/marketplace/browse?city=${city}`}>
          {city}
        </StyledBreadcrumbLink>
        <IconChevronRight size={16} />
      </StyledBreadcrumbItem>
      <StyledBreadcrumbItem>
        <StyledBreadcrumbLink href={`/marketplace/browse?district=${district}`}>
          {district}
        </StyledBreadcrumbLink>
        <IconChevronRight size={16} />
      </StyledBreadcrumbItem>
      <StyledBreadcrumbCurrent>{propertyName}</StyledBreadcrumbCurrent>
    </StyledBreadcrumbContainer>
  );
};
