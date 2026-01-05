import styled from '@emotion/styled';
import { IconMail, IconPhone } from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

const StyledFooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.background.secondary};
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  padding: 3rem 2rem 2rem;
  margin-top: 4rem;
`;

const StyledFooterContent = styled.div`
  margin: 0 auto;
  max-width: 1400px;
`;

const StyledFooterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const StyledFooterSection = styled.div``;

const StyledFooterTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const StyledFooterLink = styled.a`
  display: block;
  color: ${({ theme }) => theme.font.color.tertiary};
  text-decoration: none;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.color.blue};
  }
`;

const StyledContactItem = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.secondary};
  display: flex;
  font-size: 0.875rem;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const StyledFooterBottom = styled.div`
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  padding-top: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

const StyledCompanyInfo = styled.div`
  line-height: 1.6;
  margin-bottom: 1rem;
`;

export const MarketplaceFooter = () => {
  const { t } = useLanguage();

  return (
    <StyledFooterContainer>
      <StyledFooterContent>
        <StyledFooterGrid>
          <StyledFooterSection>
            <StyledFooterTitle>{t('nav.logo')}</StyledFooterTitle>
            <StyledCompanyInfo>
              <div>CÔNG TY CỔ PHẦN TWENTY</div>
              <div>Tầng 5, Tòa nhà ABC, Hà Nội, Việt Nam</div>
            </StyledCompanyInfo>
            <StyledContactItem>
              <IconPhone size={18} />
              <span>1900 1881</span>
            </StyledContactItem>
            <StyledContactItem>
              <IconMail size={18} />
              <span>support@twenty.com</span>
            </StyledContactItem>
          </StyledFooterSection>

          <StyledFooterSection>
            <StyledFooterTitle>Hướng dẫn</StyledFooterTitle>
            <StyledFooterLink href="/about">Về chúng tôi</StyledFooterLink>
            <StyledFooterLink href="/pricing">
              Báo giá và hỗ trợ
            </StyledFooterLink>
            <StyledFooterLink href="/faq">Câu hỏi thường gặp</StyledFooterLink>
            <StyledFooterLink href="/contact">Liên hệ</StyledFooterLink>
          </StyledFooterSection>

          <StyledFooterSection>
            <StyledFooterTitle>Quy định</StyledFooterTitle>
            <StyledFooterLink href="/terms">Quy định đăng tin</StyledFooterLink>
            <StyledFooterLink href="/policy">
              Quy chế hoạt động
            </StyledFooterLink>
            <StyledFooterLink href="/privacy">
              Chính sách bảo mật
            </StyledFooterLink>
            <StyledFooterLink href="/complaints">
              Giải quyết khiếu nại
            </StyledFooterLink>
          </StyledFooterSection>

          <StyledFooterSection>
            <StyledFooterTitle>Dịch vụ</StyledFooterTitle>
            <StyledFooterLink href="/marketplace/browse">
              {t('nav.browse')}
            </StyledFooterLink>
            <StyledFooterLink href="/marketplace/post">
              {t('nav.postListing')}
            </StyledFooterLink>
            <StyledFooterLink href="/marketplace/dashboard">
              {t('nav.dashboard')}
            </StyledFooterLink>
            <StyledFooterLink href="/marketplace/subscription">
              {t('nav.subscription')}
            </StyledFooterLink>
          </StyledFooterSection>
        </StyledFooterGrid>

        <StyledFooterBottom>
          <div>Copyright © 2024 Twenty CRM. All rights reserved.</div>
          <div style={{ marginTop: '0.5rem' }}>
            Giấy phép thiết lập trang thông tin điện tử tổng hợp trên mạng số
            123/GP-TTĐT
          </div>
        </StyledFooterBottom>
      </StyledFooterContent>
    </StyledFooterContainer>
  );
};
