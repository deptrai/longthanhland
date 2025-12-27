import styled from '@emotion/styled';
import { useState } from 'react';
import { IconRobot, IconSend } from 'twenty-ui/display';

const Sidebar = styled.aside`
  width: 320px;
  background-color: ${({ theme }) => theme.background.secondary};
  border-left: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
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
  font-size: 0.75rem;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const WelcomeMessage = styled.div`
  text-align: center;
  padding: 2rem 1rem;
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
  display: flex;
  flex-direction: column;
  align-items: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
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
  padding: 1rem;
  border-top: 1px solid ${({ theme }) => theme.border.color.medium};
  display: flex;
  gap: 0.5rem;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedQuestions = [
    'Tìm căn hộ dưới 3 tỷ ở Quận 7',
    'Giá nhà ở Thủ Đức hiện nay như thế nào?',
    'Quy trình mua nhà cần những gì?',
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    // Mock AI response (will be replaced with actual API call in backend implementation)
    setTimeout(() => {
      const mockResponse: ChatMessage = {
        role: 'assistant',
        content:
          'Xin chào! Tôi là trợ lý AI của Public Marketplace. Hiện tại tôi đang trong chế độ demo. Tính năng này sẽ được kích hoạt đầy đủ trong các phiên bản tiếp theo với tích hợp OpenAI GPT-4.',
      };
      setMessages((prev) => [...prev, mockResponse]);
      setLoading(false);
    }, 1000);
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
          <Title>AI Assistant</Title>
        </HeaderTitle>
        <Status>Online</Status>
      </Header>

      <MessagesContainer>
        {messages.length === 0 ? (
          <WelcomeMessage>
            <WelcomeText>
              Xin chào! Tôi có thể giúp gì cho bạn về bất động sản?
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
                Đang suy nghĩ...
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
          placeholder="Nhập câu hỏi của bạn..."
          disabled={loading}
        />
        <SendButton onClick={handleSend} disabled={loading || !input.trim()}>
          <IconSend size={20} />
        </SendButton>
      </InputContainer>
    </Sidebar>
  );
};
