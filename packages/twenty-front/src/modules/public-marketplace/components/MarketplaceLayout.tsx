import styled from '@emotion/styled';
import { Outlet, useNavigate } from 'react-router-dom';
import { AIAssistantSidebar } from '..';

const Container = styled.div`
  background-color: ${({ theme }) => theme.background.primary};
  display: flex;
  min-height: 100vh;
`;

const Header = styled.header`
  background-color: ${({ theme }) => theme.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: 0 auto;
  max-width: 1400px;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const NavLink = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  color: ${({ theme, $active }) =>
    $active ? theme.color.blue : theme.font.color.secondary};
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 0;
  border-bottom: 2px solid
    ${({ theme, $active }) => ($active ? theme.color.blue : 'transparent')};
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.color.blue};
  }
`;

const MainWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  width: 100%;
`;

const MarketplaceLayoutContent = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const { t } = useLanguage();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Container>
      <MainWrapper>
        <Header>
          <HeaderContent>
            <Logo onClick={() => handleNavigation('/marketplace/browse')}>
              <LogoText>🏠 {t('browse.title')}</LogoText>
            </Logo>
            <Nav>
              <NavLink
                $active={currentPath.includes('/browse')}
                onClick={() => handleNavigation('/marketplace/browse')}
              >
                {t('nav.browse')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/dashboard')}
                onClick={() => handleNavigation('/marketplace/dashboard')}
              >
                {t('nav.dashboard')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/post')}
                onClick={() => handleNavigation('/marketplace/post')}
              >
                {t('nav.postListing')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/inquiries')}
                onClick={() => handleNavigation('/marketplace/inquiries')}
              >
                {t('nav.inquiries')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/payment')}
                onClick={() => handleNavigation('/marketplace/payment')}
              >
                {t('nav.subscription')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/profile')}
                onClick={() => handleNavigation('/marketplace/profile')}
              >
                {t('nav.profile')}
              </NavLink>
              <LanguageSwitcher />
            </Nav>
          </HeaderContent>
        </Header>
        <MainContent>
          <Outlet />
        </MainContent>
      </MainWrapper>
      <AIAssistantSidebar />
    </Container>
  );
};

export const MarketplaceLayout = () => {
  return (
    <LanguageProvider>
      <MarketplaceLayoutContent />
    </LanguageProvider>
  );
};
