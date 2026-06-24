# Story 8.8.1: AI Consultation Chatbot

Status: drafted

## Story
As a buyer, I want to chat with an AI assistant about properties, so that I get instant answers.

## Acceptance Criteria

1. **Chatbot Widget**: Welcome message, suggested questions (3-5), text input, chat history (scrollable), floating button (bottom-right), minimize/maximize, mobile-responsive
2. **AI Responses**: Vietnamese support, property recommendations (budget/location), market trends/prices, neighborhood info, buying process guidance, <3s response time, cites sources, GPT-4 for complex queries, GPT-3.5-turbo for simple queries
3. **Context Awareness**: Conversation history (session-based), current listing context, user search history (if logged in), personalized recommendations
4. **Rate Limiting**: Max 20 messages/session, clear limit warning, upgrade prompt for PRO users
5. **Fallback**: Contact form if AI fails, error handling, graceful degradation

## Tasks / Subtasks

- [ ] **Task 1: OpenAI Integration** (AC: #2)
  ```typescript
  @Injectable()
  export class ChatbotService {
    private openai: OpenAI;

    constructor() {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    async chat(messages: ChatMessage[], context: ChatContext): Promise<string> {
      const systemPrompt = this.buildSystemPrompt(context);

      const response = await this.openai.chat.completions.create({
        model: this.selectModel(messages),
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        functions: this.getFunctions(),
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content;
    }

    private selectModel(messages: ChatMessage[]): string {
      const lastMessage = messages[messages.length - 1].content;
      const isComplex = lastMessage.length > 100 || lastMessage.includes('?');
      return isComplex ? 'gpt-4' : 'gpt-3.5-turbo';
    }

    private getFunctions() {
      return [
        {
          name: 'searchProperties',
          description: 'Search for properties based on criteria',
          parameters: {
            type: 'object',
            properties: {
              budget: { type: 'number' },
              location: { type: 'string' },
              category: { type: 'string' },
            },
          },
        },
        {
          name: 'getMarketTrends',
          description: 'Get market trends for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string' },
            },
          },
        },
      ];
    }
  }
  ```

- [ ] **Task 2: Chatbot Widget Component** (AC: #1)
  ```typescript
  const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const suggestedQuestions = [
      'Tìm căn hộ dưới 3 tỷ ở Quận 7',
      'Giá nhà ở Thủ Đức hiện nay như thế nào?',
      'Quy trình mua nhà cần những gì?',
    ];

    const handleSend = async () => {
      if (!input.trim()) return;

      const userMessage = { role: 'user', content: input };
      setMessages([...messages, userMessage]);
      setInput('');
      setLoading(true);

      try {
        const response = await sendChatMessage(input, messages);
        setMessages([...messages, userMessage, { role: 'assistant', content: response }]);
      } catch (error) {
        setMessages([...messages, userMessage, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' }]);
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        {!isOpen && (
          <button onClick={() => setIsOpen(true)} className="chatbot-button">
            <MessageCircle />
          </button>
        )}

        {isOpen && (
          <div className="chatbot-widget">
            <div className="chatbot-header">
              <h3>Trợ lý AI</h3>
              <button onClick={() => setIsOpen(false)}>×</button>
            </div>

            <div className="chatbot-messages">
              {messages.length === 0 && (
                <div className="welcome">
                  <p>Xin chào! Tôi có thể giúp gì cho bạn?</p>
                  <div className="suggested-questions">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => setInput(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  {msg.content}
                </div>
              ))}

              {loading && <div className="loading">Đang suy nghĩ...</div>}
            </div>

            <div className="chatbot-input">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Nhập câu hỏi..."
              />
              <button onClick={handleSend}>Gửi</button>
            </div>
          </div>
        )}
      </>
    );
  };
  ```

- [ ] **Task 3: Context Management** (AC: #3)
  ```typescript
  const buildChatContext = (listing?: PublicListing, user?: PublicUser): ChatContext => {
    return {
      currentListing: listing ? {
        title: listing.title,
        price: listing.price,
        location: listing.location,
        category: listing.category,
      } : null,
      userSearchHistory: user?.searchHistory || [],
      userPreferences: user ? {
        budget: user.budget,
        preferredLocations: user.preferredLocations,
      } : null,
    };
  };
  ```

- [ ] **Task 4: Rate Limiting** (AC: #4)
  ```typescript
  const [messageCount, setMessageCount] = useState(0);
  const MAX_MESSAGES = 20;

  const handleSend = async () => {
    if (messageCount >= MAX_MESSAGES) {
      alert('Bạn đã đạt giới hạn 20 tin nhắn. Vui lòng nâng cấp lên PRO để tiếp tục.');
      return;
    }
    setMessageCount(messageCount + 1);
    // ... rest of send logic
  };
  ```

- [ ] **Task 5: Testing**
  - [ ] Test Vietnamese language support
  - [ ] Test context awareness
  - [ ] Test rate limiting
  - [ ] Test fallback handling
  - [ ] Achieve >80% coverage

## Dev Notes

**Architecture**: OpenAI GPT-4/3.5-turbo with function calling, session-based conversation, context-aware responses, rate limiting, cost optimization

**Key Decisions**: Model selection based on query complexity, Vietnamese language support, function calling for structured queries, 20 messages/session limit, fallback to contact form

**Implementation**: ChatbotService (OpenAI integration), ChatbotWidget (React component), context management (listing + user data), rate limiting (session-based), error handling (graceful degradation)

**Testing**: Vietnamese support, context awareness, rate limiting, fallback handling

### Success Criteria

- ✅ Chatbot widget working
- ✅ AI responses <3s
- ✅ Vietnamese support working
- ✅ Context awareness working
- ✅ Rate limiting working
- ✅ Fallback handling working
- ✅ Unit tests pass (>80% coverage)
- ✅ Manual testing successful

**Estimate**: 12 hours

## Dev Agent Record

### Context Reference
<!-- Story context XML will be added by story-context workflow -->

### Agent Model Used
<!-- To be filled by dev agent -->

### Debug Log References
<!-- To be filled by dev agent during implementation -->

### Completion Notes List
<!-- To be filled by dev agent after completion -->

### File List
<!-- To be filled by dev agent with NEW/MODIFIED/DELETED files -->
