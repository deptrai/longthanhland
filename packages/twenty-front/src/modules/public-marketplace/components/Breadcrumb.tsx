import styled from '@emotion/styled';
import { IconChevronRight } from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

const BreadcrumbContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const BreadcrumbItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const BreadcrumbLink = styled.a`
  color: ${({ theme }) => theme.font.color.tertiary};
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.color.blue};
  }
`;

const BreadcrumbCurrent = styled.span`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: 500;
`;

interface BreadcrumbProps {
  type: string;
  city: string;
  district: string;
  propertyName: string;
}

export const Breadcrumb = ({ type, city, district, propertyName }: BreadcrumbProps) => {
  const { t } = useLanguage();

  return (
    <BreadcrumbContainer>
      <BreadcrumbItem>
        <BreadcrumbLink href="/marketplace/browse">{t('nav.browse')}</BreadcrumbLink>
        <IconChevronRight size={16} />
      </BreadcrumbItem>
      <BreadcrumbItem>
        <BreadcrumbLink href={`/marketplace/browse?type=${type}`}>{type}</BreadcrumbLink>
        <IconChevronRight size={16} />
      </BreadcrumbItem>
      <BreadcrumbItem>
        <BreadcrumbLink href={`/marketplace/browse?city=${city}`}>{city}</BreadcrumbLink>
        <IconChevronRight size={16} />
      </BreadcrumbItem>
      <BreadcrumbItem>
        <BreadcrumbLink href={`/marketplace/browse?district=${district}`}>{district}</BreadcrumbLink>
        <IconChevronRight size={16} />
      </BreadcrumbItem>
      <BreadcrumbCurrent>{propertyName}</BreadcrumbCurrent>
    </BreadcrumbContainer>
  );
};
