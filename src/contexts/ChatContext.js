import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { chatAPI } from '../services/api';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { socket, user } = useAuth();
  const [messages, setMessages] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [conversations, setConversations] = useState([]);
  const activeChatRef = useRef(null);

  // Keep ref in sync so socket callbacks see latest value
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Load conversations list on mount & when user changes
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data.conversations || []);
      // Sync unread counts from conversations
      const counts = {};
      (data.conversations || []).forEach((c) => {
        if (c.unread_count > 0) {
          counts[`user_${c.user.id}`] = c.unread_count;
        }
      });
      setUnreadCounts((prev) => ({ ...prev, ...counts }));
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
  }, []);

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  // Helper: add a message to state, deduplicating by id
  const addMessage = useCallback((chatKey, message) => {
    setMessages((prev) => {
      const existing = prev[chatKey] || [];
      // Prevent duplicate via message id
      if (message.id && existing.some((m) => m.id === message.id)) {
        return prev;
      }
      return { ...prev, [chatKey]: [...existing, message] };
    });
  }, []);

  // Helper: update conversation list when a new message arrives
  const updateConversation = useCallback((otherUser, message, incrementUnread) => {
    setConversations((prev) => {
      const otherId = otherUser.id;
      const existing = prev.filter((c) => c.user.id !== otherId);
      const old = prev.find((c) => c.user.id === otherId);
      const updated = {
        user: old?.user || otherUser,
        last_message: {
          id: message.id,
          content: message.content,
          message_type: message.message_type,
          sender_id: message.sender_id,
          created_at: message.created_at,
          is_read: message.is_read ?? false,
        },
        unread_count: incrementUnread
          ? (old?.unread_count || 0) + 1
          : 0,
      };
      return [updated, ...existing];
    });
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const chatKey = message.group_id
        ? `group_${message.group_id}`
        : `user_${message.sender_id}`;

      addMessage(chatKey, message);

      // Is this chat currently open?
      const ac = activeChatRef.current;
      const isActive =
        (ac?.type === 'user' && ac?.id === message.sender_id) ||
        (ac?.type === 'group' && ac?.id === message.group_id);

      if (!message.group_id && message.sender) {
        updateConversation(message.sender, message, !isActive);
      }

      if (isActive) {
        // Auto-mark as read if chat is open
        if (!message.group_id) {
          socket.emit('mark_read', { sender_id: message.sender_id });
        }
      } else {
        // Increment unread
        setUnreadCounts((prev) => ({
          ...prev,
          [chatKey]: (prev[chatKey] || 0) + 1,
        }));
      }
    };

    const handleMessageSent = (message) => {
      const chatKey = message.group_id
        ? `group_${message.group_id}`
        : `user_${message.receiver_id}`;

      addMessage(chatKey, message);

      // Update conversation list for DMs
      if (!message.group_id) {
        // We need receiver info — look it up from existing conversations
        setConversations((prev) => {
          const other = prev.find((c) => c.user.id === message.receiver_id);
          if (other) {
            const rest = prev.filter((c) => c.user.id !== message.receiver_id);
            return [{
              ...other,
              last_message: {
                id: message.id,
                content: message.content,
                message_type: message.message_type,
                sender_id: message.sender_id,
                created_at: message.created_at,
                is_read: false,
              },
            }, ...rest];
          }
          // The conversation might not exist yet if this is the first message
          // In that case, we'll need the receiver's profile from the message sender
          if (message.receiver) {
            return [{
              user: message.receiver,
              last_message: {
                id: message.id,
                content: message.content,
                message_type: message.message_type,
                sender_id: message.sender_id,
                created_at: message.created_at,
                is_read: false,
              },
              unread_count: 0,
            }, ...prev];
          }
          return prev;
        });
      }
    };

    const handleTyping = (data) => {
      const key = data.group_id ? `group_${data.group_id}` : `user_${data.user_id}`;
      setTypingUsers((prev) => ({
        ...prev,
        [key]: data.is_typing,
      }));

      if (data.is_typing) {
        setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [key]: false }));
        }, 3000);
      }
    };

    const handleMessagesRead = (data) => {
      // The reader (data.reader_id) has read our messages
      const chatKey = `user_${data.reader_id}`;
      setMessages((prev) => {
        const msgs = prev[chatKey];
        if (!msgs) return prev;
        return {
          ...prev,
          [chatKey]: msgs.map((m) =>
            m.receiver_id === data.reader_id ? { ...m, is_read: true } : m
          ),
        };
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, addMessage, updateConversation]);

  const loadMessages = useCallback(async (chatType, chatId) => {
    const chatKey = `${chatType}_${chatId}`;
    try {
      let data;
      if (chatType === 'user') {
        const response = await chatAPI.getMessages(chatId);
        data = response.data;
      } else {
        const { groupsAPI } = await import('../services/api');
        const response = await groupsAPI.getGroupMessages(chatId);
        data = response.data;
      }
      setMessages((prev) => ({ ...prev, [chatKey]: data.messages }));

      // Mark as read
      if (chatType === 'user' && socket) {
        socket.emit('mark_read', { sender_id: chatId });
      }

      // Clear unread
      setUnreadCounts((prev) => ({ ...prev, [chatKey]: 0 }));

      // Update conversation unread count in the list
      if (chatType === 'user') {
        setConversations((prev) =>
          prev.map((c) =>
            c.user.id === chatId ? { ...c, unread_count: 0 } : c
          )
        );
      }
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  }, [socket]);

  const sendMessage = useCallback((data) => {
    if (socket) {
      socket.emit('send_message', data);
    }
  }, [socket]);

  const sendTyping = useCallback((receiverId, groupId, isTyping) => {
    if (socket) {
      socket.emit('typing', {
        receiver_id: receiverId,
        group_id: groupId,
        is_typing: isTyping,
      });
    }
  }, [socket]);

  const openChat = useCallback((type, id) => {
    setActiveChat({ type, id });
    loadMessages(type, id);
  }, [loadMessages]);

  const value = {
    messages,
    activeChat,
    unreadCounts,
    typingUsers,
    conversations,
    loadMessages,
    loadConversations,
    sendMessage,
    sendTyping,
    openChat,
    setActiveChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
