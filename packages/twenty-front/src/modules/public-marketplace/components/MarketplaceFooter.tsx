import styled from '@emotion/styled';
import { useState } from 'react';
import {
    IconChevronDown,
    IconChevronUp,
    IconMail,
    IconPhone,
    IconSend,
    IconWorld,
} from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

// ─── Styled Components ───────────────────────────────────────

const FooterContainer = styled.footer`
  background-color: ${({ theme }) => theme.background.secondary};
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  color: ${({ theme }) => theme.font.color.secondary};
  padding: 0;
  margin-top: 4rem;
`;

const FooterInner = styled.div`
  margin: 0 auto;
  max-width: 1400px;
  padding: 0 2rem;
`;

// ─── Contact Bar ─────────────────────────────────────────────

const ContactBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding: 2rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const ContactCard = styled.a`
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: inherit;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.background.tertiary};
  }
`;

const ContactIconWrap = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.color.red};
`;

const ContactLabel = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const ContactValue = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
`;

// ─── Main Grid ───────────────────────────────────────────────

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1.2fr;
  gap: 2rem;
  padding: 2.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FooterSection = styled.div``;

const FooterTitle = styled.h3`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 1rem;
`;

const FooterLink = styled.a`
  display: block;
  color: ${({ theme }) => theme.font.color.secondary};
  text-decoration: none;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.font.color.primary};
  }
`;

const CompanyName = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.5rem;
`;

const CompanyAddress = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  line-height: 1.6;
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
`;

const CompanyPhone = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.font.color.secondary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

// ─── App Download ────────────────────────────────────────────

const AppDownloadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const QRPlaceholder = styled.div`
  width: 64px;
  height: 64px;
  background: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
`;

const StoreBadge = styled.a`
  display: inline-block;
  background: ${({ theme }) => theme.background.tertiary};
  color: ${({ theme }) => theme.font.color.primary};
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.7rem;
  text-decoration: none;
  text-align: center;
  transition: background 0.2s;
  line-height: 1.3;

  &:hover {
    background: ${({ theme }) => theme.background.transparent.medium};
  }

  span {
    display: block;
    font-size: 0.55rem;
    color: ${({ theme }) => theme.font.color.tertiary};
  }
`;


// ─── Newsletter ──────────────────────────────────────────────

const NewsletterSection = styled.div`
  margin-top: 1.5rem;
`;

const NewsletterInput = styled.div`
  display: flex;
  gap: 0;
  margin-top: 0.5rem;

  input {
    flex: 1;
    padding: 0.6rem 0.75rem;
    border: 1px solid ${({ theme }) => theme.border.color.medium};
    border-right: none;
    border-radius: 6px 0 0 6px;
    background: ${({ theme }) => theme.background.primary};
    color: ${({ theme }) => theme.font.color.primary};
    font-size: 0.85rem;
    outline: none;

    &::placeholder {
      color: ${({ theme }) => theme.font.color.tertiary};
    }
    &:focus {
      border-color: ${({ theme }) => theme.color.red};
    }
  }

  button {
    padding: 0.6rem 1rem;
    background: ${({ theme }) => theme.color.red};
    color: ${({ theme }) => theme.font.color.inverted};
    border: none;
    border-radius: 0 6px 6px 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }
`;

// ─── Branch Offices ──────────────────────────────────────────

const BranchSection = styled.div`
  padding: 1.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
`;

const BranchToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.color.red};
  }
`;

const BranchGrid = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'grid' : 'none')};
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-top: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BranchCard = styled.div``;

const BranchName = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 0.25rem;
`;

const BranchAddress = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  line-height: 1.5;
`;

// ─── Bottom Section ──────────────────────────────────────────

const BottomSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem 0;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const LegalInfo = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  line-height: 1.8;
  flex: 1;
`;

const BottomRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;

  @media (max-width: 768px) {
    align-items: flex-start;
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const SocialIcon = styled.a`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.font.color.secondary};
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.color.red};
    color: ${({ theme }) => theme.font.color.inverted};
  }
`;

const GovBadge = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 6px;
  color: ${({ theme }) => theme.font.color.secondary};
  text-decoration: none;
  font-size: 0.7rem;
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.color.red};
  }
`;

// ─── Component ───────────────────────────────────────────────

export const MarketplaceFooter = () => {
  const { t } = useLanguage();
  const [branchOpen, setBranchOpen] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <FooterContainer>
      <FooterInner>
        {/* ── Contact Bar ── */}
        <ContactBar>
          <ContactCard href="tel:19001881">
            <ContactIconWrap>
              <IconPhone size={20} />
            </ContactIconWrap>
            <div>
              <ContactLabel>Hotline</ContactLabel>
              <ContactValue>1900 1881</ContactValue>
            </div>
          </ContactCard>
          <ContactCard
            href="https://trogiup.longthanhland.vn"
            target="_blank"
            rel="nofollow"
          >
            <ContactIconWrap>
              <IconWorld size={20} />
            </ContactIconWrap>
            <div>
              <ContactLabel>Hỗ trợ khách hàng</ContactLabel>
              <ContactValue>trogiup.longthanhland.vn</ContactValue>
            </div>
          </ContactCard>
          <ContactCard href="mailto:hotro@longthanhland.vn">
            <ContactIconWrap>
              <IconMail size={20} />
            </ContactIconWrap>
            <div>
              <ContactLabel>Chăm sóc khách hàng</ContactLabel>
              <ContactValue>hotro@longthanhland.vn</ContactValue>
            </div>
          </ContactCard>
        </ContactBar>

        {/* ── Main Grid ── */}
        <MainGrid>
          {/* Company Info */}
          <FooterSection>
            <FooterTitle>{t('nav.logo')}</FooterTitle>
            <CompanyName>CÔNG TY CỔ PHẦN LONG THÀNH LAND</CompanyName>
            <CompanyAddress>
              📍 Khu phố 2, Thị trấn Long Thành, Huyện Long Thành, Tỉnh Đồng
              Nai, Việt Nam
            </CompanyAddress>
            <CompanyPhone>
              <IconPhone size={14} />
              (0251) 352 1881 - (0251) 352 1882
            </CompanyPhone>
            <AppDownloadRow>
              <QRPlaceholder>QR Code</QRPlaceholder>
              <div>
                <StoreBadge href="#" target="_blank" rel="nofollow">
                  <span>GET IT ON</span>
                  Google Play
                </StoreBadge>
                <StoreBadge
                  href="#"
                  target="_blank"
                  rel="nofollow"
                  style={{ marginTop: '0.4rem' }}
                >
                  <span>Download on the</span>
                  App Store
                </StoreBadge>
              </div>
            </AppDownloadRow>
          </FooterSection>

          {/* Hướng dẫn */}
          <FooterSection>
            <FooterTitle>Hướng dẫn</FooterTitle>
            <FooterLink href="/about">Về chúng tôi</FooterLink>
            <FooterLink href="/pricing">Báo giá và hỗ trợ</FooterLink>
            <FooterLink href="/faq">Câu hỏi thường gặp</FooterLink>
            <FooterLink href="/feedback">Góp ý báo lỗi</FooterLink>
            <FooterLink href="/sitemap">Sitemap</FooterLink>
          </FooterSection>

          {/* Quy định */}
          <FooterSection>
            <FooterTitle>Quy định</FooterTitle>
            <FooterLink href="/terms">Quy định đăng tin</FooterLink>
            <FooterLink href="/policy">Quy chế hoạt động</FooterLink>
            <FooterLink href="/agreement">Điều khoản thỏa thuận</FooterLink>
            <FooterLink href="/privacy">Chính sách bảo mật</FooterLink>
            <FooterLink href="/complaints">Giải quyết khiếu nại</FooterLink>
          </FooterSection>

          {/* Dịch vụ */}
          <FooterSection>
            <FooterTitle>Dịch vụ</FooterTitle>
            <FooterLink href="/marketplace/browse">
              {t('nav.browse')}
            </FooterLink>
            <FooterLink href="/marketplace/post">
              {t('nav.postListing')}
            </FooterLink>
            <FooterLink href="/marketplace/dashboard">
              {t('nav.dashboard')}
            </FooterLink>
            <FooterLink href="/marketplace/subscription">
              {t('nav.subscription')}
            </FooterLink>
          </FooterSection>

          {/* Newsletter */}
          <FooterSection>
            <FooterTitle>Đăng ký nhận tin</FooterTitle>
            <NewsletterSection>
              <NewsletterInput>
                <input
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="button" title="Đăng ký">
                  <IconSend size={18} />
                </button>
              </NewsletterInput>
            </NewsletterSection>
          </FooterSection>
        </MainGrid>

        {/* ── Branch Offices ── */}
        <BranchSection>
          <BranchToggle onClick={() => setBranchOpen(!branchOpen)}>
            {branchOpen ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
            Xem chi nhánh của Long Thành Land
          </BranchToggle>
          <BranchGrid $open={branchOpen}>
            <BranchCard>
              <BranchName>Trụ sở chính - Long Thành</BranchName>
              <BranchAddress>
                Khu phố 2, Thị trấn Long Thành, Huyện Long Thành, Tỉnh Đồng
                Nai
                <br />
                Hotline: 1900 1881
              </BranchAddress>
            </BranchCard>
            <BranchCard>
              <BranchName>Chi nhánh TP. Hồ Chí Minh</BranchName>
              <BranchAddress>
                Tầng 5, Tòa nhà Viettel, 285 Cách Mạng Tháng Tám, Phường Hòa
                Hưng, TP.HCM
                <br />
                Hotline: 1900 1881
              </BranchAddress>
            </BranchCard>
            <BranchCard>
              <BranchName>Chi nhánh Biên Hòa</BranchName>
              <BranchAddress>
                Tầng 3, Tòa nhà Sonadezi, Đường 30/4, TP. Biên Hòa, Đồng Nai
                <br />
                Hotline: 1900 1881
              </BranchAddress>
            </BranchCard>
            <BranchCard>
              <BranchName>Chi nhánh Nhơn Trạch</BranchName>
              <BranchAddress>
                Khu công nghiệp Nhơn Trạch, Huyện Nhơn Trạch, Đồng Nai
                <br />
                Hotline: 1900 1881
              </BranchAddress>
            </BranchCard>
            <BranchCard>
              <BranchName>Chi nhánh Bình Dương</BranchName>
              <BranchAddress>
                Tầng 10, Becamex Tower, 230 Đại Lộ Bình Dương, TP. Thủ Dầu Một
                <br />
                Hotline: 1900 1881
              </BranchAddress>
            </BranchCard>
            <BranchCard>
              <BranchName>Chi nhánh Vũng Tàu</BranchName>
              <BranchAddress>
                Tầng 4, Tòa nhà ACB, 111 Hoàng Hoa Thám, TP. Vũng Tàu
                <br />
                Hotline: 1900 1881
              </BranchAddress>
            </BranchCard>
          </BranchGrid>
        </BranchSection>

        {/* ── Bottom Section ── */}
        <BottomSection>
          <LegalInfo>
            <div>
              <strong>Copyright © 2024 - 2026 Long Thành Land.</strong> All
              rights reserved.
            </div>
            <div>
              Giấy ĐKKD số 3602XXXXXX do Sở KHĐT tỉnh Đồng Nai cấp lần đầu
              ngày 01/01/2024
            </div>
            <div>
              Giấy phép thiết lập trang thông tin điện tử tổng hợp trên mạng số
              191/GP-TTĐT do Sở TTTT Đồng Nai cấp ngày 01/06/2024
            </div>
            <div>
              Chịu trách nhiệm nội dung: Ông Nguyễn Văn A | Chịu trách nhiệm
              sàn GDTMĐT: Bà Trần Thị B
            </div>
            <div>
              Quy chế, quy định giao dịch có hiệu lực từ 01/01/2024. Ghi rõ
              nguồn &quot;longthanhland.vn&quot; khi phát hành lại thông tin.
            </div>
          </LegalInfo>
          <BottomRight>
            <GovBadge
              href="http://online.gov.vn"
              target="_blank"
              rel="nofollow"
            >
              🛡️ Đã đăng ký Bộ Công Thương
            </GovBadge>
            <SocialLinks>
              <SocialIcon
                href="https://facebook.com/longthanhland"
                target="_blank"
                rel="nofollow"
                title="Facebook"
              >
                f
              </SocialIcon>
              <SocialIcon
                href="https://youtube.com/@longthanhland"
                target="_blank"
                rel="nofollow"
                title="YouTube"
              >
                ▶
              </SocialIcon>
              <SocialIcon
                href="https://zalo.me/longthanhland"
                target="_blank"
                rel="nofollow"
                title="Zalo"
              >
                Z
              </SocialIcon>
              <SocialIcon
                href="https://tiktok.com/@longthanhland"
                target="_blank"
                rel="nofollow"
                title="TikTok"
              >
                T
              </SocialIcon>
            </SocialLinks>
          </BottomRight>
        </BottomSection>
      </FooterInner>
    </FooterContainer>
  );
};
