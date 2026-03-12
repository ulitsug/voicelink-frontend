import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useDashboard } from '../contexts/DashboardContext';
import { chatAPI } from '../services/api';
import { useCall } from '../contexts/CallContext';
import {
  FiSend, FiPaperclip, FiArrowLeft, FiFile, FiPhone, FiVideo,
  FiMessageSquare, FiCheck, FiCheckCircle, FiChevronUp,
  FiX, FiDownload, FiImage,
} from 'react-icons/fi';

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now - d;
  const oneDay = 86400000;

  if (diff < oneDay && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < oneDay * 2) return 'Yesterday';
  if (diff < oneDay * 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function previewText(msg, userId) {
  if (!msg) return '';
  const prefix = msg.sender_id === userId ? 'You: ' : '';
  if (msg.message_type === 'image') return `${prefix}📷 Photo`;
  if (msg.message_type === 'file') return `${prefix}📎 File`;
  const text = msg.content || '';
  return `${prefix}${text.length > 40 ? text.substring(0, 40) + '…' : text}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Image lightbox modal
function ImageLightbox({ src, fileName, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <div className="lightbox-toolbar">
          <span className="lightbox-filename">{fileName || 'Image'}</span>
          <div className="lightbox-actions">
            <a href={src} download={fileName || 'image'} className="lightbox-btn" title="Download">
              <FiDownload size={18} />
            </a>
            <button className="lightbox-btn" onClick={onClose} title="Close">
              <FiX size={18} />
            </button>
          </div>
        </div>
        <div className="lightbox-image-wrap">
          <img src={src} alt={fileName || 'Image'} />
        </div>
      </div>
    </div>
  );
}

// File preview before sending
function FilePreview({ file, previewUrl, caption, onCaptionChange, onSend, onCancel, uploading }) {
  const isImage = file?.type?.startsWith('image/');
  return (
    <div className="file-preview-overlay" onClick={onCancel}>
      <div className="file-preview-card" onClick={(e) => e.stopPropagation()}>
        <div className="file-preview-header">
          <span>{isImage ? 'Send Photo' : 'Send File'}</span>
          <button className="lightbox-btn" onClick={onCancel}><FiX size={18} /></button>
        </div>
        <div className="file-preview-body">
          {isImage && previewUrl ? (
            <img src={previewUrl} alt={file.name} className="file-preview-image" />
          ) : (
            <div className="file-preview-icon">
              <FiFile size={48} />
              <span className="file-preview-name">{file.name}</span>
              <span className="file-preview-size">{formatFileSize(file.size)}</span>
            </div>
          )}
        </div>
        <div className="file-preview-footer">
          <input
            className="file-preview-caption"
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
            autoFocus
          />
          <button className="btn-send-file" onClick={onSend} disabled={uploading}>
            {uploading ? (
              <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            ) : (
              <FiSend size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { user } = useAuth();
  const { contacts, onlineUsers } = useDashboard();
  const { initiateCall } = useCall();
  const {
    messages, activeChat, unreadCounts, typingUsers, conversations,
    openChat, sendMessage, sendTyping, setActiveChat, loadConversations,
    prependMessages,
  } = useChat();
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [fileCaption, setFileCaption] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const prevMessagesLenRef = useRef(0);
  const shouldScrollRef = useRef(true);

  const chatKey = activeChat ? `${activeChat.type}_${activeChat.id}` : null;
  const chatMessages = chatKey ? messages[chatKey] || [] : [];

  // Scroll to bottom when new messages arrive (not on load-more)
  useEffect(() => {
    if (chatMessages.length > prevMessagesLenRef.current && shouldScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLenRef.current = chatMessages.length;
  }, [chatMessages.length]);

  // Reset pagination when chat changes
  useEffect(() => {
    setCurrentPage(1);
    setHasMorePages(true);
    prevMessagesLenRef.current = 0;
    shouldScrollRef.current = true;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  }, [chatKey]);

  const handleSend = () => {
    const text = messageText.trim();
    if (!text || !activeChat) return;

    shouldScrollRef.current = true;
    sendMessage({
      receiver_id: activeChat.type === 'user' ? activeChat.id : undefined,
      group_id: activeChat.type === 'group' ? activeChat.id : undefined,
      content: text,
      message_type: 'text',
    });
    setMessageText('');

    sendTyping(
      activeChat.type === 'user' ? activeChat.id : undefined,
      activeChat.type === 'group' ? activeChat.id : undefined,
      false
    );
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (activeChat) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTyping(
        activeChat.type === 'user' ? activeChat.id : undefined,
        activeChat.type === 'group' ? activeChat.id : undefined,
        true
      );
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(
          activeChat.type === 'user' ? activeChat.id : undefined,
          activeChat.type === 'group' ? activeChat.id : undefined,
          false
        );
      }, 2000);
    }
  };

  // Stage file for preview instead of uploading immediately
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    setPendingFile(file);
    setFileCaption('');
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPendingPreviewUrl(url);
    } else {
      setPendingPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelFilePreview = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setFileCaption('');
  };

  const handleFileSend = async () => {
    if (!pendingFile || !activeChat) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);
      const { data } = await chatAPI.uploadFile(formData);

      shouldScrollRef.current = true;
      sendMessage({
        receiver_id: activeChat.type === 'user' ? activeChat.id : undefined,
        group_id: activeChat.type === 'group' ? activeChat.id : undefined,
        content: fileCaption.trim() || pendingFile.name,
        message_type: pendingFile.type.startsWith('image/') ? 'image' : 'file',
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
      });
      cancelFilePreview();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadMore = useCallback(async () => {
    if (!activeChat || loadingMore || !hasMorePages) return;
    setLoadingMore(true);
    shouldScrollRef.current = false;
    const nextPage = currentPage + 1;
    try {
      let data;
      if (activeChat.type === 'user') {
        const res = await chatAPI.getMessages(activeChat.id, nextPage);
        data = res.data;
      } else {
        const { groupsAPI } = await import('../services/api');
        const res = await groupsAPI.getGroupMessages(activeChat.id, nextPage);
        data = res.data;
      }
      if (data.messages.length === 0) {
        setHasMorePages(false);
      } else {
        const key = `${activeChat.type}_${activeChat.id}`;
        const container = messagesContainerRef.current;
        const prevScrollHeight = container?.scrollHeight || 0;

        prependMessages(key, data.messages);
        setCurrentPage(nextPage);

        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });

        if (data.page >= data.pages) {
          setHasMorePages(false);
        }
      }
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
      shouldScrollRef.current = true;
    }
  }, [activeChat, currentPage, loadingMore, hasMorePages, prependMessages]);

  const getContactName = (contactId) => {
    const conv = conversations.find((c) => c.user.id === contactId);
    if (conv) return conv.user.display_name || conv.user.username;
    const contact = contacts.find((c) => c.contact_id === contactId);
    return contact?.contact?.display_name || `User ${contactId}`;
  };

  const getContactAvatar = (contactId) => {
    const conv = conversations.find((c) => c.user.id === contactId);
    return conv?.user?.avatar_url || null;
  };

  const isTyping = chatKey && typingUsers[chatKey];

  const conversationUserIds = new Set(conversations.map((c) => c.user.id));
  const contactsWithoutConversation = contacts.filter(
    (c) => !conversationUserIds.has(c.contact_id)
  );

  // Chat list view
  if (!activeChat) {
    return (
      <div className="chat-panel">
        <div className="chat-list">
          {conversations.length === 0 && contactsWithoutConversation.length === 0 ? (
            <div className="empty-state">
              <FiMessageSquare size={48} />
              <p>No conversations yet</p>
              <span>Add contacts and start chatting</span>
            </div>
          ) : (
            <>
              {conversations.map((conv) => {
                const key = `user_${conv.user.id}`;
                const unread = unreadCounts[key] || conv.unread_count || 0;
                const isOnline = onlineUsers.some((u) => u.id === conv.user.id);
                const typing = typingUsers[key];

                return (
                  <div
                    key={conv.user.id}
                    className={`chat-list-item ${unread > 0 ? 'has-unread' : ''}`}
                    onClick={() => openChat('user', conv.user.id)}
                  >
                    <div className="contact-avatar">
                      {conv.user.avatar_url ? (
                        <img src={conv.user.avatar_url} alt="" />
                      ) : (
                        <span>{(conv.user.display_name || conv.user.username || '?').charAt(0).toUpperCase()}</span>
                      )}
                      <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>
                    <div className="chat-list-info">
                      <div className="chat-list-top">
                        <span className="contact-name">{conv.user.display_name || conv.user.username}</span>
                        <span className="chat-time">{formatTime(conv.last_message?.created_at)}</span>
                      </div>
                      <div className="chat-list-bottom">
                        <span className="chat-preview">
                          {typing ? (
                            <em className="typing-text">typing<span className="typing-dots"><span>.</span><span>.</span><span>.</span></span></em>
                          ) : (
                            previewText(conv.last_message, user?.id)
                          )}
                        </span>
                        {unread > 0 && <span className="unread-badge">{unread}</span>}
                        {unread === 0 && conv.last_message?.sender_id === user?.id && (
                          <span className="read-indicator">
                            {conv.last_message?.is_read ? <FiCheckCircle size={13} /> : <FiCheck size={13} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {contactsWithoutConversation.length > 0 && conversations.length > 0 && (
                <div className="chat-list-divider">
                  <span>Other Contacts</span>
                </div>
              )}

              {contactsWithoutConversation.map((contact) => {
                const isOnline = onlineUsers.some((u) => u.id === contact.contact_id);
                return (
                  <div
                    key={`c-${contact.id}`}
                    className="chat-list-item"
                    onClick={() => openChat('user', contact.contact_id)}
                  >
                    <div className="contact-avatar">
                      {contact.contact?.avatar_url ? (
                        <img src={contact.contact.avatar_url} alt="" />
                      ) : (
                        <span>{(contact.contact?.display_name || '?').charAt(0).toUpperCase()}</span>
                      )}
                      <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>
                    <div className="chat-list-info">
                      <div className="chat-list-top">
                        <span className="contact-name">{contact.contact?.display_name}</span>
                      </div>
                      <div className="chat-list-bottom">
                        <span className="chat-preview">Start a conversation</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  // Active chat view
  const activeName = activeChat.type === 'user'
    ? getContactName(activeChat.id)
    : `Group`;
  const activeAvatarUrl = activeChat.type === 'user'
    ? getContactAvatar(activeChat.id)
    : null;
  const activeIsOnline = activeChat.type === 'user'
    ? onlineUsers.some((u) => u.id === activeChat.id)
    : false;

  return (
    <div className="chat-panel active-chat">
      <div className="chat-header">
        <button className="btn-back" onClick={() => { setActiveChat(null); loadConversations(); }}>
          <FiArrowLeft size={18} />
        </button>
        <div className="chat-header-avatar">
          {activeAvatarUrl ? (
            <img src={activeAvatarUrl} alt="" />
          ) : (
            <span>{(activeName || '?').charAt(0).toUpperCase()}</span>
          )}
          {activeChat.type === 'user' && (
            <div className={`status-dot ${activeIsOnline ? 'online' : 'offline'}`} />
          )}
        </div>
        <div className="chat-header-info">
          <span className="chat-header-name">{activeName}</span>
          {activeChat.type === 'user' ? (
            isTyping ? (
              <span className="chat-header-status typing">
                typing
                <span className="typing-wave">
                  <span></span><span></span><span></span>
                </span>
              </span>
            ) : (
              <span className={`chat-header-status ${activeIsOnline ? 'online' : ''}`}>
                {activeIsOnline ? 'Online' : 'Offline'}
              </span>
            )
          ) : null}
        </div>
        {activeChat.type === 'user' && (() => {
          const contact = contacts.find((c) => c.contact_id === activeChat.id);
          const targetUser = contact?.contact || { id: activeChat.id };
          return (
            <div className="chat-header-actions">
              <button
                className="btn-action call"
                onClick={() => initiateCall(targetUser, 'voice')}
                title="Voice Call"
              >
                <FiPhone size={16} />
              </button>
              <button
                className="btn-action video"
                onClick={() => initiateCall(targetUser, 'video')}
                title="Video Call"
              >
                <FiVideo size={16} />
              </button>
            </div>
          );
        })()}
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {hasMorePages && chatMessages.length >= 50 && (
          <div className="load-more-area">
            <button
              className="btn-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
              ) : (
                <><FiChevronUp size={14} /> Load older messages</>
              )}
            </button>
          </div>
        )}

        {chatMessages.length === 0 ? (
          <div className="chat-empty-messages">
            <FiMessageSquare size={36} />
            <p>No messages yet</p>
            <span>Send a message to start the conversation</span>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isSent = msg.sender_id === user?.id;
            const msgDate = new Date(msg.created_at).toLocaleDateString();
            const prevDate = idx > 0
              ? new Date(chatMessages[idx - 1].created_at).toLocaleDateString()
              : null;
            const showDateSep = idx === 0 || msgDate !== prevDate;

            return (
              <React.Fragment key={msg.id || idx}>
                {showDateSep && (
                  <div className="message-date-separator">
                    <span>{formatDateLabel(msg.created_at)}</span>
                  </div>
                )}
                <div className={`message ${isSent ? 'sent' : 'received'}`}>
                  {!isSent && msg.sender?.display_name && activeChat.type === 'group' && (
                    <span className="message-sender">{msg.sender.display_name}</span>
                  )}
                  {msg.message_type === 'image' && msg.file_url && (
                    <div
                      className="message-image-thumb"
                      onClick={() => setLightboxImg({ src: msg.file_url, name: msg.file_name })}
                    >
                      <img src={msg.file_url} alt={msg.file_name || 'Image'} />
                      <div className="image-thumb-overlay"><FiImage size={14} /></div>
                    </div>
                  )}
                  {msg.message_type === 'file' && msg.file_url && (
                    <a href={msg.file_url} className="message-file" download={msg.file_name} target="_blank" rel="noopener noreferrer">
                      <FiFile size={16} />
                      <div className="file-info-text">
                        <span className="file-name-text">{msg.file_name}</span>
                        <span className="file-size">{formatFileSize(msg.file_size)}</span>
                      </div>
                      <FiDownload size={14} className="file-dl-icon" />
                    </a>
                  )}
                  {msg.message_type === 'image' && msg.content && msg.content !== msg.file_name && (
                    <p className="message-text message-caption">{msg.content}</p>
                  )}
                  {msg.message_type === 'text' && msg.content && (
                    <p className="message-text">{msg.content}</p>
                  )}
                  <div className="message-meta">
                    <span className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isSent && (
                      <span className={`message-status ${msg.is_read ? 'read' : ''}`}>
                        {msg.is_read ? <FiCheckCircle size={12} /> : <FiCheck size={12} />}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {isTyping && (
          <div className="message received typing-bubble">
            <div className="typing-dots-bubble">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileSelect}
        />
        <button
          className="btn-attach"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Attach file"
        >
          <FiPaperclip size={18} />
        </button>
        <textarea
          className="chat-input"
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={1}
        />
        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!messageText.trim() || uploading}
          title="Send"
        >
          <FiSend size={18} />
        </button>
      </div>

      {/* File preview before sending */}
      {pendingFile && (
        <FilePreview
          file={pendingFile}
          previewUrl={pendingPreviewUrl}
          caption={fileCaption}
          onCaptionChange={setFileCaption}
          onSend={handleFileSend}
          onCancel={cancelFilePreview}
          uploading={uploading}
        />
      )}

      {/* Image lightbox */}
      {lightboxImg && (
        <ImageLightbox
          src={lightboxImg.src}
          fileName={lightboxImg.name}
          onClose={() => setLightboxImg(null)}
        />
      )}
    </div>
  );
}

function formatDateLabel(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today - msgDay;

  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
