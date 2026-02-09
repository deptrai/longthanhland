import styled from '@emotion/styled';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
    IconBell,
    IconBookmark,
    IconChevronDown,
    IconLayoutDashboard,
    IconLogout,
    IconPlus,
    IconSettings,
    IconUser,
} from 'twenty-ui/display';
import { AIAssistantSidebar } from '..';
import { LanguageProvider, useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MarketplaceFooter } from './MarketplaceFooter';

const Container = styled.div`
  background-color: ${({ theme }) => theme.background.primary};
  display: flex;
  min-height: 100vh;
`;

const Header = styled.header`
  background-color: ${({ theme }) => theme.background.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  padding: 0.75rem 2rem;
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
  flex-shrink: 0;

  &:hover {
    opacity: 0.8;
  }
`;

const LogoImage = styled.img`
  width: 36px;
  height: 36px;
  object-fit: contain;
`;

const LogoText = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 1.25rem;
`;

const NavLink = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  color: ${({ theme, $active }) =>
    $active ? theme.color.blue : theme.font.color.secondary};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 0;
  border-bottom: 2px solid
    ${({ theme, $active }) => ($active ? theme.color.blue : 'transparent')};
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.color.blue};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 0.5rem;
  border-radius: 8px;
  color: ${({ theme }) => theme.font.color.secondary};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    color: ${({ theme }) => theme.font.color.primary};
  }
`;

const BadgeCount = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: ${({ theme }) => theme.color.red};
  color: ${({ theme }) => theme.font.color.inverted};
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
`;

const CTAButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background-color: ${({ theme }) => theme.color.red};
  color: ${({ theme }) => theme.font.color.inverted};
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

const UserMenuWrapper = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: none;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.375rem 0.625rem;
  cursor: pointer;
  color: ${({ theme }) => theme.font.color.secondary};
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    border-color: ${({ theme }) => theme.border.color.strong};
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background-color: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 220px;
  padding: 0.5rem 0;
  z-index: 1001;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  background: none;
  border: none;
  padding: 0.625rem 1rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.font.color.secondary};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: ${({ theme }) => theme.background.tertiary};
    color: ${({ theme }) => theme.font.color.primary};
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.border.color.medium};
  margin: 0.375rem 0;
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
  flex: 1;
`;

const MarketplaceLayoutContent = () => {
  const navigate = useNavigate();
  const currentPath = window.location.pathname;
  const { t } = useLanguage();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (path: string) => {
    setUserMenuOpen(false);
    navigate(path);
  };

  return (
    <Container>
      <MainWrapper>
        <Header>
          <HeaderContent>
            <Logo onClick={() => handleNavigation('/marketplace')}>
              <LogoImage src="/images/longthanhland-logo.png" alt="Long Thành Land" />
              <LogoText>{t('nav.logo')}</LogoText>
            </Logo>
            <Nav>
              <NavLink
                $active={
                  currentPath === '/marketplace' ||
                  currentPath === '/marketplace/home'
                }
                onClick={() => handleNavigation('/marketplace')}
              >
                {t('nav.home')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/for-sale')}
                onClick={() => handleNavigation('/marketplace/for-sale')}
              >
                {t('nav.forSale')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/for-rent')}
                onClick={() => handleNavigation('/marketplace/for-rent')}
              >
                {t('nav.forRent')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/projects')}
                onClick={() => handleNavigation('/marketplace/projects')}
              >
                {t('nav.projects')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/news')}
                onClick={() => handleNavigation('/marketplace/news')}
              >
                {t('nav.news')}
              </NavLink>
              <NavLink
                $active={currentPath.includes('/agents')}
                onClick={() => handleNavigation('/marketplace/agents')}
              >
                {t('nav.agents')}
              </NavLink>
            </Nav>
            <HeaderActions>
              <LanguageSwitcher />
              <ActionButton
                onClick={() => handleNavigation('/marketplace/saved')}
                title={t('nav.saved')}
              >
                <IconBookmark size={20} />
                <BadgeCount>3</BadgeCount>
              </ActionButton>
              <ActionButton title={t('nav.notifications')}>
                <IconBell size={20} />
                <BadgeCount>5</BadgeCount>
              </ActionButton>
              <CTAButton
                onClick={() => handleNavigation('/marketplace/post')}
              >
                <IconPlus size={16} />
                {t('nav.postListing')}
              </CTAButton>
              <UserMenuWrapper ref={userMenuRef}>
                <UserButton
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <IconUser size={20} />
                  <IconChevronDown size={14} />
                </UserButton>
                {userMenuOpen && (
                  <DropdownMenu>
                    <DropdownItem
                      onClick={() =>
                        handleNavigation('/marketplace/dashboard')
                      }
                    >
                      <IconLayoutDashboard size={18} />
                      {t('nav.dashboard')}
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        handleNavigation('/marketplace/profile')
                      }
                    >
                      <IconUser size={18} />
                      {t('nav.profile')}
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        handleNavigation('/marketplace/saved')
                      }
                    >
                      <IconBookmark size={18} />
                      {t('nav.saved')}
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        handleNavigation('/marketplace/inquiries')
                      }
                    >
                      <IconBell size={18} />
                      {t('nav.inquiries')}
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() =>
                        handleNavigation('/marketplace/payment')
                      }
                    >
                      <IconSettings size={18} />
                      {t('nav.subscription')}
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      onClick={() =>
                        handleNavigation('/marketplace/login')
                      }
                    >
                      <IconLogout size={18} />
                      {t('nav.logout')}
                    </DropdownItem>
                  </DropdownMenu>
                )}
              </UserMenuWrapper>
            </HeaderActions>
          </HeaderContent>
        </Header>
        <MainContent>
          <Outlet />
        </MainContent>
        <MarketplaceFooter />
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
