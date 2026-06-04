import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { SidebarAgent } from '@/components/layout/SidebarAgent';
import { useChatStore } from '@/stores/useChatStore';

// Mock the chat store
jest.mock('@/stores/useChatStore');

const mockUseChatStore = useChatStore as jest.MockedFunction<typeof useChatStore>;

describe('SidebarAgent', () => {
  const mockConversations = [
    { id: '1', title: 'Chat 1', messages: [] },
    { id: '2', title: 'Chat 2', messages: [] },
  ];

  const mockStore = {
    conversations: mockConversations,
    activeConversationId: '1',
    createConversation: jest.fn(() => ({ id: '3', title: 'New Chat', messages: [] })),
    selectConversation: jest.fn(),
    deleteConversation: jest.fn(),
    updateConversationTitle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChatStore.mockReturnValue(mockStore as any);
  });

  it('renders conversations list', () => {
    render(<SidebarAgent />);
    expect(screen.getByText('Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Chat 2')).toBeInTheDocument();
  });

  it('renders Conversations header', () => {
    render(<SidebarAgent />);
    expect(screen.getByText('CONVERSATIONS')).toBeInTheDocument();
  });

  it('renders new chat button', () => {
    render(<SidebarAgent />);
    const newButton = screen.getByRole('button').closest('button');
    expect(newButton).toBeInTheDocument();
  });

  it('highlights active conversation', () => {
    render(<SidebarAgent />);
    const chat1 = screen.getByText('Chat 1').closest('div');
    expect(chat1).toHaveClass('bg-accent');
  });

  it('calls selectConversation when clicking a conversation', async () => {
    const user = userEvent.setup();
    render(<SidebarAgent />);

    await user.click(screen.getByText('Chat 2'));
    expect(mockStore.selectConversation).toHaveBeenCalledWith('2');
  });

  it('calls createConversation when clicking new chat button', async () => {
    const user = userEvent.setup();
    render(<SidebarAgent />);

    const newButton = screen.getAllByRole('button')[0];
    await user.click(newButton);
    expect(mockStore.createConversation).toHaveBeenCalled();
  });

  it('shows edit and delete buttons on hover', () => {
    render(<SidebarAgent />);
    const chatGroup = screen.getByText('Chat 1').closest('div.group');
    const buttons = within(chatGroup!).getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('has minimal styling with small fonts', () => {
    render(<SidebarAgent />);
    const header = screen.getByText('CONVERSATIONS');
    expect(header).toHaveClass('text-xs');
    expect(header).toHaveClass('uppercase');
  });
});
