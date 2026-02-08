import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { getJestMetadataAndApolloMocksWrapper } from '~/testing/jest/getJestMetadataAndApolloMocksWrapper';
import { AIAssistantSidebar } from '../AIAssistantSidebar';

const Wrapper = getJestMetadataAndApolloMocksWrapper({});

describe('AIAssistantSidebar', () => {
  it('should render AI Assistant sidebar with welcome message', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(
      screen.getByText('Xin chào! Tôi có thể giúp gì cho bạn về bất động sản?'),
    ).toBeInTheDocument();
  });

  it('should render 6 suggested questions', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    expect(
      screen.getByText('Tìm hidden gem đất nền Long Thành dưới 3 tỷ'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('So sánh giá căn hộ Quận 2 vs Quận 7'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Phân tích tiềm năng tăng giá khu vực sân bay'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tư vấn pháp lý mua đất nền'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tính toán vay ngân hàng mua nhà 5 tỷ'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Quy trình mua nhà từ A-Z'),
    ).toBeInTheDocument();
  });

  it('should populate input when suggested question is clicked', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const suggestedButton = screen.getByText(
      'Tìm hidden gem đất nền Long Thành dưới 3 tỷ',
    );
    fireEvent.click(suggestedButton);

    const input = screen.getByPlaceholderText(
      'Nhập câu hỏi của bạn...',
    ) as HTMLInputElement;
    expect(input.value).toBe('Tìm hidden gem đất nền Long Thành dưới 3 tỷ');
  });

  it('should send message when send button is clicked', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test message' } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should show loading indicator while waiting for response', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test message' } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(screen.getByText('Đang suy nghĩ...')).toBeInTheDocument();
  });

  it('should display AI response after sending message', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test message' } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(
      () => {
        expect(
          screen.getByText(/Trợ lý AI/),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should send message when Enter key is pressed', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');

    fireEvent.change(input, { target: { value: 'Test message' } });

    await act(async () => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should disable send button when input is empty', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const sendButton = screen.getByRole('button', { name: '' });
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has text', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test' } });

    expect(sendButton).not.toBeDisabled();
  });

  it('should clear input after sending message', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText(
      'Nhập câu hỏi của bạn...',
    ) as HTMLInputElement;
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test message' } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(input.value).toBe('');
  });

  it('should hide welcome message after first message', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test message' } });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    expect(
      screen.queryByText(
        'Xin chào! Tôi có thể giúp gì cho bạn về bất động sản?',
      ),
    ).not.toBeInTheDocument();
  });

  it('should display hidden gem response for Long Thành query', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, {
      target: { value: 'Tìm hidden gem đất nền Long Thành' },
    });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(
      () => {
        expect(
          screen.getByText('Phân tích Hidden Gems Long Thành'),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should display legal advice response for pháp lý query', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, {
      target: { value: 'Tư vấn pháp lý mua đất nền' },
    });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(
      () => {
        expect(
          screen.getByText('Tư vấn Pháp lý Mua Bất động sản'),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should display mortgage response for vay ngân hàng query', async () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const input = screen.getByPlaceholderText('Nhập câu hỏi của bạn...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, {
      target: { value: 'Tính toán vay ngân hàng mua nhà 5 tỷ' },
    });

    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(
      () => {
        expect(
          screen.getByText('Tính toán Vay Ngân hàng Mua nhà'),
        ).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });
});
