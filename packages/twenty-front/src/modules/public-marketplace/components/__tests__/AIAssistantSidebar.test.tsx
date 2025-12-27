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

  it('should render 3 suggested questions', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    expect(
      screen.getByText('Tìm căn hộ dưới 3 tỷ ở Quận 7'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Giá nhà ở Thủ Đức hiện nay như thế nào?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Quy trình mua nhà cần những gì?'),
    ).toBeInTheDocument();
  });

  it('should populate input when suggested question is clicked', () => {
    render(<AIAssistantSidebar />, { wrapper: Wrapper });

    const suggestedButton = screen.getByText('Tìm căn hộ dưới 3 tỷ ở Quận 7');
    fireEvent.click(suggestedButton);

    const input = screen.getByPlaceholderText(
      'Nhập câu hỏi của bạn...',
    ) as HTMLInputElement;
    expect(input.value).toBe('Tìm căn hộ dưới 3 tỷ ở Quận 7');
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
          screen.getByText(/Xin chào! Tôi là trợ lý AI/),
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
});
