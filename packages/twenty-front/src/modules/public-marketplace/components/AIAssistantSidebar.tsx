import styled from '@emotion/styled';
import { useState } from 'react';
import { IconRobot, IconSend } from 'twenty-ui/display';
import { useLanguage } from '../i18n/LanguageContext';

const Sidebar = styled.aside`
  background-color: ${({ theme }) => theme.background.secondary};
  border-left: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  width: 320px;
`;

const Header = styled.div`
  padding: 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0;
`;

const Status = styled.span`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.75rem;
`;

const MessagesContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  padding: 1rem;
`;

const WelcomeMessage = styled.div`
  padding: 2rem 1rem;
  text-align: center;
`;

const WelcomeText = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 0.9375rem;
  margin-bottom: 1.5rem;
`;

const SuggestedQuestions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SuggestedButton = styled.button`
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem;
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.background.quaternary};
    border-color: ${({ theme }) => theme.color.blue};
  }
`;

const Message = styled.div<{ $isUser: boolean }>`
  align-items: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
  display: flex;
  flex-direction: column;
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  background-color: ${({ theme, $isUser }) =>
    $isUser ? theme.color.blue : theme.background.tertiary};
  color: ${({ theme, $isUser }) =>
    $isUser ? '#ffffff' : theme.font.color.primary};
  padding: 0.75rem 1rem;
  border-radius: 12px;
  max-width: 80%;
  font-size: 0.9375rem;
  line-height: 1.5;
  word-wrap: break-word;
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: 0.875rem;
  padding: 0.5rem;
`;

const InputContainer = styled.div`
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
`;

const Input = styled.input`
  flex: 1;
  background-color: ${({ theme }) => theme.background.tertiary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: 8px;
  padding: 0.75rem;
  color: ${({ theme }) => theme.font.color.primary};
  font-size: 0.9375rem;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.color.blue};
  }

  &::placeholder {
    color: ${({ theme }) => theme.font.color.tertiary};
  }
`;

const SendButton = styled.button`
  background-color: ${({ theme }) => theme.color.blue};
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantSidebar = () => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    'Tìm hidden gem đất nền Long Thành dưới 3 tỷ',
    'So sánh giá căn hộ Quận 2 vs Quận 7',
    'Phân tích tiềm năng tăng giá khu vực sân bay',
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    // Mock AI response demonstrating hidden gem discovery process
    setTimeout(() => {
      let responseContent = '';

      // Intelligent response based on user query
      if (
        input.toLowerCase().includes('hidden gem') ||
        input.toLowerCase().includes('long thành')
      ) {
        responseContent = `🎯 **Phân tích Hidden Gems Long Thành**

Tôi đã tìm thấy 2 cơ hội đầu tư tiềm năng:

**1. Đất nền Long Thành - Khu dân cư Bàu Cạn**
💰 Giá: 2.2 tỷ (120m²) - Dưới ngân sách!
📍 Cách sân bay: 6km
⭐ Trust Score: 89%
✨ **Ưu điểm**: Giá tốt nhất khu vực, hạ tầng hoàn thiện, gần trường học & chợ

**2. Đất nền Long Thành - Gần sân bay**
💰 Giá: 2.8 tỷ (150m²)
📍 Cách sân bay: 3km - Vị trí đắc địa!
⭐ Trust Score: 92%
✨ **Ưu điểm**: Tiềm năng tăng giá cao khi sân bay hoạt động (2025)

📊 **Dự báo**: Giá đất Long Thành có thể tăng 30-50% trong 2 năm tới khi sân bay đi vào hoạt động.`;
      } else if (
        input.toLowerCase().includes('so sánh') ||
        input.toLowerCase().includes('quận')
      ) {
        responseContent = `📊 **So sánh Quận 2 vs Quận 7**

**Quận 2 (Thủ Đức)**:
💰 Giá TB: 4.2 - 9.8 tỷ
📈 Tăng trưởng: +15%/năm
🏢 Dự án nổi bật: Masteri, Gateway, Estella Heights
✅ Ưu điểm: Khu quốc tế, trường học tốt, Metro

**Quận 7 (Phú Mỹ Hưng)**:
💰 Giá TB: 8.5 - 35 tỷ
📈 Tăng trưởng: +12%/năm
🏢 Dự án nổi bật: Vinhomes, Phú Mỹ Hưng
✅ Ưu điểm: Hạ tầng hoàn thiện, an ninh tốt

💡 **Khuyến nghị**: Quận 2 phù hợp đầu tư ngắn hạn (tiềm năng cao), Quận 7 phù hợp ở lâu dài (ổn định).`;
      } else if (
        input.toLowerCase().includes('tiềm năng') ||
        input.toLowerCase().includes('sân bay')
      ) {
        responseContent = `🚀 **Phân tích Tiềm năng Khu vực Sân bay Long Thành**

**Dự án**: Sân bay quốc tế Long Thành
📅 Hoàn thành: Giai đoạn 1 - 2025
💼 Quy mô: 5,000 ha, 100 triệu khách/năm

**Tác động đến BĐS**:
📈 Giá đất tăng: 30-50% (2024-2026)
🏗️ Hạ tầng: Cao tốc, Metro đang xây dựng
🏢 Khu công nghiệp: Thu hút FDI mạnh

**Khu vực HOT**:
1️⃣ Bán kính 5km: Tăng giá 40-50%
2️⃣ Mặt tiền QL51: Tiềm năng kinh doanh cao
3️⃣ Khu dân cư quy hoạch: An toàn pháp lý

💎 **Hidden Gems hiện tại**: 2.2-2.8 tỷ
🎯 **Dự báo 2026**: 3.5-4.5 tỷ (+50-60%)`;
      } else {
        responseContent = `Xin chào! Tôi là AI Assistant của Public Marketplace.

Tôi có thể giúp bạn:
🔍 Tìm kiếm hidden gems với giá tốt
📊 Phân tích thị trường và tiềm năng tăng giá
💡 So sánh các khu vực đầu tư
📈 Dự báo xu hướng bất động sản

Hãy thử các câu hỏi gợi ý bên dưới để khám phá cơ hội đầu tư tốt nhất!`;
      }

      const mockResponse: ChatMessage = {
        role: 'assistant',
        content: responseContent,
      };
      setMessages((prev) => [...prev, mockResponse]);
      setLoading(false);
    }, 1500);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sidebar>
      <Header>
        <HeaderTitle>
          <IconRobot size={20} />
          <Title>{t('aiAssistant.title')}</Title>
        </HeaderTitle>
        <Status>{t('aiAssistant.status')}</Status>
      </Header>

      <MessagesContainer>
        {messages.length === 0 ? (
          <WelcomeMessage>
            <WelcomeText>
              {t('aiAssistant.welcome')}
            </WelcomeText>
            <SuggestedQuestions>
              {suggestedQuestions.map((question, index) => (
                <SuggestedButton
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                >
                  {question}
                </SuggestedButton>
              ))}
            </SuggestedQuestions>
          </WelcomeMessage>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message key={index} $isUser={message.role === 'user'}>
                <MessageBubble $isUser={message.role === 'user'}>
                  {message.content}
                </MessageBubble>
              </Message>
            ))}
            {loading && (
              <LoadingIndicator>
                <IconRobot size={16} />
                {t('aiAssistant.thinking')}
              </LoadingIndicator>
            )}
          </>
        )}
      </MessagesContainer>

      <InputContainer>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t('aiAssistant.placeholder')}
          disabled={loading}
        />
        <SendButton onClick={handleSend} disabled={loading || !input.trim()}>
          <IconSend size={20} />
        </SendButton>
      </InputContainer>
    </Sidebar>
  );
};
