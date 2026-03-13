import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { chatAPI } from '../services/api';
import { showLocalNotification } from '../services/serviceWorker';

const ChatContext = createContext(null);

// Notification sound — two-tone chime via Web Audio API
let audioCtx = null;
function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    // First tone (E5 = 659 Hz)
    const osc1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    osc1.connect(g1); g1.connect(audioCtx.destination);
    osc1.frequency.value = 659;
    osc1.type = 'sine';
    g1.gain.setValueAtTime(0.18, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc1.start(t);
    osc1.stop(t + 0.25);

    // Second tone (A5 = 880 Hz), slight delay
    const osc2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc2.connect(g2); g2.connect(audioCtx.destination);
    osc2.frequency.value = 880;
    osc2.type = 'sine';
    g2.gain.setValueAtTime(0.001, t);
    g2.gain.setValueAtTime(0.18, t + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.start(t + 0.15);
    osc2.stop(t + 0.45);
  } catch (_) { /* ignore audio errors */ }
}

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
      if (message.id && existing.some((m) => m.id === message.id)) {
        return prev;
      }
      return { ...prev, [chatKey]: [...existing, message] };
    });
  }, []);

  // Helper: prepend older messages (for pagination)
  const prependMessages = useCallback((chatKey, olderMessages) => {
    setMessages((prev) => {
      const existing = prev[chatKey] || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const newMsgs = olderMessages.filter((m) => !existingIds.has(m.id));
      if (newMsgs.length === 0) return prev;
      return { ...prev, [chatKey]: [...newMsgs, ...existing] };
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
        // Increment unread & play notification sound
        setUnreadCounts((prev) => ({
          ...prev,
          [chatKey]: (prev[chatKey] || 0) + 1,
        }));
        playNotificationSound();

        // Show browser notification when tab is not focused
        if (document.hidden) {
          const senderName = message.sender?.display_name || message.sender?.username || 'Someone';
          const preview = message.message_type === 'text'
            ? (message.content || 'Sent a message').slice(0, 100)
            : `Sent a ${message.message_type}`;
          showLocalNotification(senderName, preview, {
            tag: `msg-${message.sender_id}`,
          });
        }
      }
    };

    const handleMessageSent = (message) => {
      const chatKey = message.group_id
        ? `group_${message.group_id}`
        : `user_${message.receiver_id}`;

      addMessage(chatKey, message);

      // Update conversation list for DMs
      if (!message.group_id) {
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
        }, 4000);
      }
    };

    const handleMessagesRead = (data) => {
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
      // Also update conversation last_message read status
      setConversations((prev) =>
        prev.map((c) =>
          c.user.id === data.reader_id && c.last_message?.sender_id !== data.reader_id
            ? { ...c, last_message: { ...c.last_message, is_read: true } }
            : c
        )
      );
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_typing', handleTyping);
    socket.on('messages_read', handleMessagesRead);

    const handleMessageDeleted = (data) => {
      const msgId = data.message_id;
      // Remove from all chat message lists
      setMessages((prev) => {
        const updated = {};
        let changed = false;
        for (const key of Object.keys(prev)) {
          const filtered = prev[key].filter((m) => m.id !== msgId);
          if (filtered.length !== prev[key].length) changed = true;
          updated[key] = filtered;
        }
        return changed ? updated : prev;
      });
      // Refresh conversations to update last_message
      loadConversations();
    };

    const handleConversationDeleted = (data) => {
      const otherId = data.other_user_id;
      const deletedBy = data.deleted_by;
      // Determine the chat key from perspective
      const chatKey = `user_${deletedBy === user?.id ? otherId : deletedBy}`;
      setMessages((prev) => {
        if (!prev[chatKey]) return prev;
        const { [chatKey]: _, ...rest } = prev;
        return rest;
      });
      setConversations((prev) => prev.filter((c) => {
        const cId = c.user.id;
        return cId !== otherId && cId !== deletedBy;
      }));
      setUnreadCounts((prev) => {
        if (!prev[chatKey]) return prev;
        const { [chatKey]: _, ...rest } = prev;
        return rest;
      });
      // If this conversation is currently open, close it
      const ac = activeChatRef.current;
      if (ac?.type === 'user' && (ac.id === otherId || ac.id === deletedBy)) {
        setActiveChat(null);
      }
    };

    socket.on('message_deleted', handleMessageDeleted);
    socket.on('conversation_deleted', handleConversationDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_typing', handleTyping);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('conversation_deleted', handleConversationDeleted);
    };
  }, [socket, addMessage, updateConversation, loadConversations, user]);

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

      return data;
    } catch (e) {
      console.error('Failed to load messages:', e);
      return null;
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

  const deleteMessage = useCallback(async (messageId, chatKey) => {
    try {
      await chatAPI.deleteMessage(messageId);
      setMessages((prev) => {
        const msgs = prev[chatKey];
        if (!msgs) return prev;
        return { ...prev, [chatKey]: msgs.filter((m) => m.id !== messageId) };
      });
      // Refresh conversations to update last_message
      loadConversations();
      return true;
    } catch (e) {
      console.error('Failed to delete message:', e);
      return false;
    }
  }, [loadConversations]);

  const deleteConversation = useCallback(async (otherUserId) => {
    try {
      await chatAPI.deleteConversation(otherUserId);
      const chatKey = `user_${otherUserId}`;
      setMessages((prev) => {
        const { [chatKey]: _, ...rest } = prev;
        return rest;
      });
      setConversations((prev) => prev.filter((c) => c.user.id !== otherUserId));
      setUnreadCounts((prev) => {
        const { [chatKey]: _, ...rest } = prev;
        return rest;
      });
      return true;
    } catch (e) {
      console.error('Failed to delete conversation:', e);
      return false;
    }
  }, []);

  // Compute total unread count across all chats
  const totalUnread = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, c) => sum + (c || 0), 0);
  }, [unreadCounts]);

  const value = {
    messages,
    activeChat,
    unreadCounts,
    totalUnread,
    typingUsers,
    conversations,
    loadMessages,
    loadConversations,
    prependMessages,
    sendMessage,
    sendTyping,
    openChat,
    setActiveChat,
    deleteMessage,
    deleteConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
