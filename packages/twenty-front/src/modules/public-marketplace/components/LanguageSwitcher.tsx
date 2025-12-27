import styled from '@emotion/styled';
import { useLanguage } from '../i18n/LanguageContext';

const SwitcherContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LanguageButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  background-color: ${({ theme, active }) =>
    active ? theme.color.blue : theme.background.secondary};
  color: ${({ theme, active }) =>
    active ? theme.font.color.inverted : theme.font.color.secondary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme, active }) =>
      active ? theme.color.blue : theme.background.tertiary};
  }
`;

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <SwitcherContainer>
      <LanguageButton
        active={language === 'vi'}
        onClick={() => setLanguage('vi')}
      >
        🇻🇳 VI
      </LanguageButton>
      <LanguageButton
        active={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        🇬🇧 EN
      </LanguageButton>
    </SwitcherContainer>
  );
};
