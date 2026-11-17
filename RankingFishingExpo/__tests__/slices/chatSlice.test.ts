import reducer, { fetchConversations, setActiveConversation, addMessage } from '../../src/store/slices/chatSlice';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../../src/api/mock/data';
import { Message } from '../../src/store/types';

const init = () => reducer(undefined, { type: '@@init' });
const convs = () => MOCK_CONVERSATIONS.map((c) => ({ ...c }));

describe('chatSlice', () => {
  it('état initial', () => {
    expect(init()).toMatchObject({ conversations: [], messages: {}, isLoading: false, error: null });
  });

  it('fetchConversations trie par date décroissante', () => {
    const shuffled = convs().reverse();
    const s = reducer(init(), fetchConversations.fulfilled(shuffled, 'r', 'user_me'));
    const dates = s.conversations.map((c) => new Date(c.updatedAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(s.isLoading).toBe(false);
  });

  it('setActiveConversation remet les non-lus à 0', () => {
    let s = reducer(init(), fetchConversations.fulfilled(convs(), 'r', 'user_me'));
    const unread = s.conversations.find((c) => c.unreadCount > 0)!;
    s = reducer(s, setActiveConversation(unread));
    expect(s.conversations.find((c) => c.id === unread.id)!.unreadCount).toBe(0);
    expect(s.activeConversation?.id).toBe(unread.id);
  });

  it('addMessage déduplique par id et met à jour l\'aperçu', () => {
    let s = reducer(init(), fetchConversations.fulfilled(convs(), 'r', 'user_me'));
    const msg: Message = {
      ...MOCK_MESSAGES.conv_3[0],
      id: 'msg_new',
      content: 'Une Shimano Zodias, 1,98 m',
      senderId: 'user_me',
      senderName: 'PierreM',
      sentAt: new Date().toISOString(),
    };
    s = reducer(s, addMessage(msg));
    s = reducer(s, addMessage(msg));
    expect(s.messages.conv_3.filter((m) => m.id === 'msg_new')).toHaveLength(1);
    const conv = s.conversations.find((c) => c.id === 'conv_3')!;
    expect(conv.lastMessage.content).toBe('Une Shimano Zodias, 1,98 m');
  });
});
