import styled from '@emotion/styled';
import { IconMail, IconPhone } from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

const FooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.background.secondary};
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  padding: 3rem 2rem 2rem;
  margin-top: 4rem;
`;

const FooterContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
`;

const FooterSection = styled.div``;

const FooterTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const FooterLink = styled.a`
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

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: ${({ theme }) => theme.font.color.secondary};
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
`;

const FooterBottom = styled.div`
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  padding-top: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
`;

const CompanyInfo = styled.div`
  margin-bottom: 1rem;
  line-height: 1.6;
`;

export const MarketplaceFooter = () => {
  const { t } = useLanguage();

  return (
    <FooterContainer>
      <FooterContent>
        <FooterGrid>
          <FooterSection>
            <FooterTitle>{t('nav.logo')}</FooterTitle>
            <CompanyInfo>
              <div>CÔNG TY CỔ PHẦN TWENTY</div>
              <div>Tầng 5, Tòa nhà ABC, Hà Nội, Việt Nam</div>
            </CompanyInfo>
            <ContactItem>
              <IconPhone size={18} />
              <span>1900 1881</span>
            </ContactItem>
            <ContactItem>
              <IconMail size={18} />
              <span>support@twenty.com</span>
            </ContactItem>
          </FooterSection>

          <FooterSection>
            <FooterTitle>Hướng dẫn</FooterTitle>
            <FooterLink href="/about">Về chúng tôi</FooterLink>
            <FooterLink href="/pricing">Báo giá và hỗ trợ</FooterLink>
            <FooterLink href="/faq">Câu hỏi thường gặp</FooterLink>
            <FooterLink href="/contact">Liên hệ</FooterLink>
          </FooterSection>

          <FooterSection>
            <FooterTitle>Quy định</FooterTitle>
            <FooterLink href="/terms">Quy định đăng tin</FooterLink>
            <FooterLink href="/policy">Quy chế hoạt động</FooterLink>
            <FooterLink href="/privacy">Chính sách bảo mật</FooterLink>
            <FooterLink href="/complaints">Giải quyết khiếu nại</FooterLink>
          </FooterSection>

          <FooterSection>
            <FooterTitle>Dịch vụ</FooterTitle>
            <FooterLink href="/marketplace/browse">{t('nav.browse')}</FooterLink>
            <FooterLink href="/marketplace/post">{t('nav.postListing')}</FooterLink>
            <FooterLink href="/marketplace/dashboard">{t('nav.dashboard')}</FooterLink>
            <FooterLink href="/marketplace/subscription">{t('nav.subscription')}</FooterLink>
          </FooterSection>
        </FooterGrid>

        <FooterBottom>
          <div>Copyright © 2024 Twenty CRM. All rights reserved.</div>
          <div style={{ marginTop: '0.5rem' }}>
            Giấy phép thiết lập trang thông tin điện tử tổng hợp trên mạng số 123/GP-TTĐT
          </div>
        </FooterBottom>
      </FooterContent>
    </FooterContainer>
  );
};
