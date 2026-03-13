import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiChevronDown, FiChevronRight, FiLock, FiUnlock, FiShield,
  FiSearch, FiArrowLeft, FiWifi, FiZap, FiCopy, FiCheck,
} from 'react-icons/fi';
import './ApiDocs.css';

/* ────────────────────────────────────────────────────────────── */
/*  FULL API SPECIFICATION                                       */
/* ────────────────────────────────────────────────────────────── */

const API_BASE = (() => {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
})();

const SECTIONS = [
  /* ── Authentication ── */
  {
    id: 'auth',
    title: 'Authentication',
    description: 'User registration, login, email verification, password management, profile updates, and avatar handling. JWT tokens are used for authenticated endpoints — pass them via the Authorization: Bearer <token> header.',
    endpoints: [
      {
        method: 'POST', path: '/api/auth/register', auth: 'none',
        summary: 'Register a new user account',
        description: 'Creates a new user. The account remains unverified until an admin sends a verification email or manually verifies it.',
        body: {
          username: { type: 'string', required: true, description: '3–50 characters, unique' },
          email: { type: 'string', required: true, description: 'Valid email, unique' },
          password: { type: 'string', required: true, description: 'Minimum 6 characters' },
          display_name: { type: 'string', required: true, description: 'User display name' },
        },
        responses: [
          { status: 201, description: 'Account created (pending verification)', example: '{"message":"Registration successful. Please wait for admin to send you a verification email.","pending_verification":true}' },
          { status: 400, description: 'Missing or invalid fields' },
          { status: 409, description: 'Username or email already taken' },
        ],
      },
      {
        method: 'POST', path: '/api/auth/login', auth: 'none',
        summary: 'Log in with username/email and password',
        description: 'Authenticates a user and returns a JWT access token. Admins bypass email verification requirements.',
        body: {
          username: { type: 'string', required: true, description: 'Username or email address' },
          password: { type: 'string', required: true, description: 'Account password' },
        },
        responses: [
          { status: 200, description: 'Login successful', example: '{"message":"Login successful","user":{...},"access_token":"eyJ..."}' },
          { status: 401, description: 'Invalid credentials' },
          { status: 403, description: 'Email not verified' },
        ],
      },
      {
        method: 'POST', path: '/api/auth/verify-email', auth: 'none',
        summary: 'Verify email with token',
        description: 'Verifies a user\'s email address using the token sent via email. On success, returns a JWT token so the user is logged in immediately.',
        body: {
          token: { type: 'string', required: true, description: 'Verification token from email link' },
        },
        responses: [
          { status: 200, description: 'Email verified, returns JWT', example: '{"message":"Email verified successfully.","user":{...},"access_token":"eyJ..."}' },
          { status: 400, description: 'Invalid or expired token' },
        ],
      },
      {
        method: 'POST', path: '/api/auth/forgot-password', auth: 'none',
        summary: 'Request password reset email',
        description: 'Sends a password reset email if the account exists. Always returns success to prevent email enumeration.',
        body: {
          email: { type: 'string', required: true, description: 'Account email address' },
        },
        responses: [
          { status: 200, description: 'Reset email sent (if account exists)', example: '{"message":"If the email exists, a password reset link has been sent."}' },
        ],
      },
      {
        method: 'POST', path: '/api/auth/reset-password', auth: 'none',
        summary: 'Reset password with token',
        description: 'Sets a new password using a reset token received via email.',
        body: {
          token: { type: 'string', required: true, description: 'Reset token from email link' },
          password: { type: 'string', required: true, description: 'New password (min 6 chars)' },
        },
        responses: [
          { status: 200, description: 'Password reset successful' },
          { status: 400, description: 'Invalid/expired token or weak password' },
        ],
      },
      {
        method: 'GET', path: '/api/auth/me', auth: 'jwt',
        summary: 'Get current user profile',
        description: 'Returns the authenticated user\'s full profile including email.',
        responses: [
          { status: 200, description: 'User profile object', example: '{"user":{"id":1,"username":"admin","display_name":"System Admin","email":"admin@voicelink.local","role":"super_admin",...}}' },
          { status: 401, description: 'Not authenticated' },
        ],
      },
      {
        method: 'PUT', path: '/api/auth/update-profile', auth: 'jwt',
        summary: 'Update current user profile',
        body: {
          display_name: { type: 'string', required: false, description: 'New display name (max 100 chars)' },
          bio: { type: 'string', required: false, description: 'User bio (max 250 chars)' },
          avatar_url: { type: 'string', required: false, description: 'Avatar URL' },
          public_key: { type: 'string', required: false, description: 'Public encryption key' },
        },
        responses: [
          { status: 200, description: 'Updated user profile' },
        ],
      },
      {
        method: 'PUT', path: '/api/auth/change-password', auth: 'jwt',
        summary: 'Change password',
        body: {
          current_password: { type: 'string', required: true, description: 'Current password' },
          new_password: { type: 'string', required: true, description: 'New password (min 6 chars)' },
        },
        responses: [
          { status: 200, description: 'Password changed' },
          { status: 400, description: 'Incorrect current password or weak new password' },
        ],
      },
      {
        method: 'POST', path: '/api/auth/upload-avatar', auth: 'jwt',
        summary: 'Upload avatar image',
        description: 'Upload a profile image. Accepts jpg, png, gif, webp. Send as multipart/form-data with field name "file".',
        body: {
          file: { type: 'file', required: true, description: 'Image file (jpg, png, gif, webp)' },
        },
        responses: [
          { status: 200, description: 'Avatar uploaded', example: '{"avatar_url":"/api/auth/avatars/avatar_1_abc12345.png","user":{...}}' },
          { status: 400, description: 'No file or invalid file type' },
        ],
      },
      {
        method: 'DELETE', path: '/api/auth/remove-avatar', auth: 'jwt',
        summary: 'Remove avatar image',
        responses: [
          { status: 200, description: 'Avatar removed, returns updated user' },
        ],
      },
      {
        method: 'GET', path: '/api/auth/avatars/:filename', auth: 'none',
        summary: 'Serve avatar file',
        description: 'Returns the avatar image file. Public endpoint.',
        params: {
          filename: { type: 'string', in: 'path', description: 'Avatar filename' },
        },
        responses: [
          { status: 200, description: 'Image binary' },
          { status: 400, description: 'Invalid filename' },
        ],
      },
      {
        method: 'GET', path: '/api/auth/dashboard-stats', auth: 'jwt',
        summary: 'Get user dashboard statistics',
        description: 'Returns counts for contacts, groups, unread messages, calls, and recent contacts.',
        responses: [
          { status: 200, description: 'Dashboard stats', example: '{"contacts":5,"groups":2,"unread_messages":3,"total_calls":12,"missed_calls":1,"recent_contacts":[...]}' },
        ],
      },
    ],
  },

  /* ── Contacts ── */
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Manage user contacts — add, remove, block, unblock, search. Adding a contact automatically creates a reverse contact for the other user.',
    endpoints: [
      {
        method: 'GET', path: '/api/contacts', auth: 'jwt',
        summary: 'List all contacts',
        description: 'Returns all non-blocked contacts for the current user.',
        responses: [
          { status: 200, description: 'Contact list', example: '{"contacts":[{"id":1,"user_id":2,"contact_id":3,"contact_user":{...},...}]}' },
        ],
      },
      {
        method: 'GET', path: '/api/contacts/users', auth: 'jwt',
        summary: 'List all registered users',
        description: 'Paginated list of all users (excludes self). Each user includes an is_contact flag.',
        query: {
          page: { type: 'integer', default: 1, description: 'Page number' },
          per_page: { type: 'integer', default: 20, description: 'Results per page' },
          q: { type: 'string', description: 'Search by username or display name' },
        },
        responses: [
          { status: 200, description: 'Paginated user list', example: '{"users":[{"id":2,"username":"jane","is_contact":true,...}],"total":10,"page":1,"pages":1}' },
        ],
      },
      {
        method: 'GET', path: '/api/contacts/search', auth: 'jwt',
        summary: 'Search users by name',
        description: 'Quick search for users by username or display name. Requires at least 2 characters.',
        query: {
          q: { type: 'string', required: true, description: 'Search query (min 2 chars)' },
        },
        responses: [
          { status: 200, description: 'Matching users (max 20)', example: '{"users":[{...}]}' },
        ],
      },
      {
        method: 'POST', path: '/api/contacts', auth: 'jwt',
        summary: 'Add a contact',
        description: 'Adds a user as a contact. Also creates the reverse contact automatically.',
        body: {
          contact_id: { type: 'integer', required: true, description: 'User ID to add as contact' },
        },
        responses: [
          { status: 201, description: 'Contact created' },
          { status: 400, description: 'Cannot add yourself' },
          { status: 404, description: 'User not found' },
          { status: 409, description: 'Contact already exists' },
        ],
      },
      {
        method: 'DELETE', path: '/api/contacts/:contact_id', auth: 'jwt',
        summary: 'Remove a contact',
        params: { contact_id: { type: 'integer', in: 'path', description: 'Contact user ID' } },
        responses: [
          { status: 200, description: 'Contact removed' },
          { status: 404, description: 'Contact not found' },
        ],
      },
      {
        method: 'PUT', path: '/api/contacts/:contact_id/block', auth: 'jwt',
        summary: 'Block a contact',
        params: { contact_id: { type: 'integer', in: 'path', description: 'Contact user ID' } },
        responses: [
          { status: 200, description: 'Contact blocked' },
        ],
      },
      {
        method: 'PUT', path: '/api/contacts/:contact_id/unblock', auth: 'jwt',
        summary: 'Unblock a contact',
        params: { contact_id: { type: 'integer', in: 'path', description: 'Contact user ID' } },
        responses: [
          { status: 200, description: 'Contact unblocked' },
        ],
      },
    ],
  },

  /* ── Chat / Messaging ── */
  {
    id: 'chat',
    title: 'Chat & Messaging',
    description: 'RESTful endpoints for message history, file uploads, unread counts, and conversations. Real-time messaging is handled via WebSocket events (see WebSocket section below).',
    endpoints: [
      {
        method: 'GET', path: '/api/chat/messages/:other_user_id', auth: 'jwt',
        summary: 'Get message history with a user',
        description: 'Returns paginated messages between the authenticated user and the specified user. Automatically marks unread messages as read.',
        params: { other_user_id: { type: 'integer', in: 'path', description: 'Other user ID' } },
        query: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 50, description: 'Max 100' },
        },
        responses: [
          { status: 200, description: 'Paginated messages (chronological)', example: '{"messages":[{...}],"total":100,"page":1,"pages":2}' },
        ],
      },
      {
        method: 'POST', path: '/api/chat/messages', auth: 'jwt',
        summary: 'Send a message (REST)',
        description: 'Send a message via REST API. For real-time delivery, use the WebSocket send_message event instead.',
        body: {
          receiver_id: { type: 'integer', required: false, description: 'For direct messages' },
          group_id: { type: 'integer', required: false, description: 'For group messages' },
          content: { type: 'string', required: false, description: 'Message text' },
          encrypted_content: { type: 'string', required: false, description: 'E2E encrypted content' },
          message_type: { type: 'string', required: false, description: '"text" (default), "image", "file", "audio"' },
        },
        responses: [
          { status: 201, description: 'Message created' },
          { status: 400, description: 'Missing receiver_id/group_id or empty content' },
        ],
      },
      {
        method: 'POST', path: '/api/chat/upload', auth: 'jwt',
        summary: 'Upload a file for chat',
        description: 'Upload a file to attach to a message. Send as multipart/form-data. Max 50 MB.',
        body: {
          file: { type: 'file', required: true, description: 'File to upload' },
        },
        responses: [
          { status: 200, description: 'File uploaded', example: '{"file_url":"/api/chat/files/abc123.pdf","file_name":"document.pdf","file_size":102400}' },
        ],
      },
      {
        method: 'GET', path: '/api/chat/files/:filename', auth: 'none',
        summary: 'Serve an uploaded file',
        params: { filename: { type: 'string', in: 'path', description: 'Uploaded filename' } },
        responses: [
          { status: 200, description: 'File binary' },
        ],
      },
      {
        method: 'GET', path: '/api/chat/unread', auth: 'jwt',
        summary: 'Get unread message counts',
        description: 'Returns unread message counts grouped by sender.',
        responses: [
          { status: 200, description: 'Unread counts', example: '{"unread":{"3":5,"7":2}}' },
        ],
      },
      {
        method: 'GET', path: '/api/chat/conversations', auth: 'jwt',
        summary: 'List all conversations',
        description: 'Returns all 1-to-1 conversations for the current user, each with the other user\'s info, last message, and unread count. Sorted by most recent.',
        responses: [
          { status: 200, description: 'Conversations list', example: '{"conversations":[{"user":{...},"last_message":{...},"unread_count":2}]}' },
        ],
      },
      {
        method: 'DELETE', path: '/api/chat/messages/:message_id', auth: 'jwt',
        summary: 'Delete a message',
        description: 'Permanently delete a specific message. Only the sender of the message can delete it. Associated uploaded files are also removed.',
        params: { message_id: { type: 'integer', in: 'path', description: 'Message ID to delete' } },
        responses: [
          { status: 200, description: 'Message deleted', example: '{"success":true,"message_id":42,"receiver_id":3,"group_id":null}' },
          { status: 403, description: 'Not the sender of this message' },
          { status: 404, description: 'Message not found' },
        ],
      },
      {
        method: 'DELETE', path: '/api/chat/conversations/:other_user_id', auth: 'jwt',
        summary: 'Delete an entire conversation',
        description: 'Permanently delete all messages between the authenticated user and the specified user. Removes associated uploaded files.',
        params: { other_user_id: { type: 'integer', in: 'path', description: 'Other user ID' } },
        responses: [
          { status: 200, description: 'Conversation deleted', example: '{"success":true,"other_user_id":3,"deleted_count":15}' },
          { status: 404, description: 'No conversation found' },
        ],
      },
    ],
  },

  /* ── Calls ── */
  {
    id: 'calls',
    title: 'Voice & Video Calls',
    description: 'Call history, ICE server configuration for WebRTC, and call log management. Real-time call signaling uses WebSocket events (see WebSocket section).',
    endpoints: [
      {
        method: 'GET', path: '/api/calls/ice-config', auth: 'jwt',
        summary: 'Get WebRTC ICE server configuration',
        description: 'Returns STUN/TURN server configuration needed to establish WebRTC peer connections.',
        responses: [
          { status: 200, description: 'ICE configuration', example: '{"iceServers":[{"urls":["turn:10.10.23.228:3478"],"username":"voicelink","credential":"..."},{"urls":"stun:stun.l.google.com:19302"}],"localIp":"10.10.23.68"}' },
        ],
      },
      {
        method: 'GET', path: '/api/calls/history', auth: 'jwt',
        summary: 'Get call history',
        query: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 50, description: 'Max 100' },
        },
        responses: [
          { status: 200, description: 'Paginated call logs', example: '{"calls":[{"id":1,"caller_id":1,"callee_id":2,"call_type":"voice","status":"ended","duration":120,...}],"total":5,"page":1,"pages":1}' },
        ],
      },
      {
        method: 'POST', path: '/api/calls/log', auth: 'jwt',
        summary: 'Create a call log entry',
        body: {
          callee_id: { type: 'integer', required: false, description: 'Called user ID' },
          group_id: { type: 'integer', required: false, description: 'Group call group ID' },
          call_type: { type: 'string', required: false, description: '"voice" (default) or "video"' },
        },
        responses: [
          { status: 201, description: 'Call log created with status "initiated"' },
        ],
      },
      {
        method: 'PUT', path: '/api/calls/log/:call_id', auth: 'jwt',
        summary: 'Update a call log',
        description: 'Update call status. Setting status to "active" records answered_at. Setting "ended" records ended_at and calculates duration. Supports end_reason and quality_score.',
        params: { call_id: { type: 'integer', in: 'path', description: 'Call log ID' } },
        body: {
          status: { type: 'string', required: false, description: '"initiated", "ringing", "active", "ended", "missed"' },
          end_reason: { type: 'string', required: false, description: '"normal", "no_answer", "rejected", "error", "network"' },
          quality_score: { type: 'integer', required: false, description: 'Call quality rating 1-5' },
        },
        responses: [
          { status: 200, description: 'Updated call log (includes end_reason, quality_score)' },
          { status: 403, description: 'Not a participant in this call' },
        ],
      },
      {
        method: 'GET', path: '/api/calls/active', auth: 'jwt',
        summary: 'Get currently active calls',
        description: 'Returns a list of all currently active calls with caller/callee info and call metadata.',
        responses: [
          { status: 200, description: '{active_calls: [{caller, callee, call_type, started_at}], count}' },
        ],
      },
    ],
  },

  /* ── Groups ── */
  {
    id: 'groups',
    title: 'Groups',
    description: 'Create and manage group chats. Group admins can add/remove members and update group settings. The group creator can delete the group.',
    endpoints: [
      {
        method: 'GET', path: '/api/groups', auth: 'jwt',
        summary: 'List user\'s groups',
        responses: [
          { status: 200, description: 'Groups with members', example: '{"groups":[{"id":1,"name":"Team","members":[...],...}]}' },
        ],
      },
      {
        method: 'POST', path: '/api/groups', auth: 'jwt',
        summary: 'Create a group',
        body: {
          name: { type: 'string', required: true, description: 'Group name' },
          description: { type: 'string', required: false, description: 'Group description' },
          member_ids: { type: 'integer[]', required: false, description: 'Initial member user IDs' },
        },
        responses: [
          { status: 201, description: 'Group created (creator is admin)' },
        ],
      },
      {
        method: 'GET', path: '/api/groups/:group_id', auth: 'jwt',
        summary: 'Get group details',
        params: { group_id: { type: 'integer', in: 'path' } },
        responses: [
          { status: 200, description: 'Group with members' },
          { status: 403, description: 'Not a member' },
        ],
      },
      {
        method: 'PUT', path: '/api/groups/:group_id', auth: 'jwt',
        summary: 'Update group (admin only)',
        params: { group_id: { type: 'integer', in: 'path' } },
        body: {
          name: { type: 'string', required: false },
          description: { type: 'string', required: false },
        },
        responses: [
          { status: 200, description: 'Updated group' },
          { status: 403, description: 'Not a group admin' },
        ],
      },
      {
        method: 'POST', path: '/api/groups/:group_id/members', auth: 'jwt',
        summary: 'Add member to group (admin only)',
        params: { group_id: { type: 'integer', in: 'path' } },
        body: {
          user_id: { type: 'integer', required: true, description: 'User ID to add' },
        },
        responses: [
          { status: 201, description: 'Member added' },
          { status: 409, description: 'Already a member' },
        ],
      },
      {
        method: 'DELETE', path: '/api/groups/:group_id/members/:member_user_id', auth: 'jwt',
        summary: 'Remove member or leave group',
        description: 'Admins can remove other members. Any member can remove themselves (leave).',
        params: {
          group_id: { type: 'integer', in: 'path' },
          member_user_id: { type: 'integer', in: 'path', description: 'User ID to remove' },
        },
        responses: [
          { status: 200, description: 'Member removed' },
          { status: 403, description: 'Not admin (when removing others)' },
        ],
      },
      {
        method: 'GET', path: '/api/groups/:group_id/messages', auth: 'jwt',
        summary: 'Get group message history',
        params: { group_id: { type: 'integer', in: 'path' } },
        query: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 50, description: 'Max 100' },
        },
        responses: [
          { status: 200, description: 'Paginated group messages' },
          { status: 403, description: 'Not a member' },
        ],
      },
      {
        method: 'DELETE', path: '/api/groups/:group_id', auth: 'jwt',
        summary: 'Delete group (creator only)',
        params: { group_id: { type: 'integer', in: 'path' } },
        responses: [
          { status: 200, description: 'Group deleted' },
          { status: 403, description: 'Not the creator' },
        ],
      },
    ],
  },

  /* ── Calendar ── */
  {
    id: 'calendar',
    title: 'Calendar & Scheduling',
    description: 'Schedule calls, meetings, and events. Invite participants who can accept or decline.',
    endpoints: [
      {
        method: 'GET', path: '/api/calendar/events', auth: 'jwt',
        summary: 'List all events',
        description: 'Returns events where the user is the creator or a participant.',
        responses: [
          { status: 200, description: 'Events list', example: '{"events":[{"id":1,"title":"Team Call","scheduled_at":"2026-03-15T10:00:00","participants":[...],...}]}' },
        ],
      },
      {
        method: 'POST', path: '/api/calendar/events', auth: 'jwt',
        summary: 'Create an event',
        body: {
          title: { type: 'string', required: true, description: 'Event title' },
          scheduled_at: { type: 'string', required: true, description: 'ISO 8601 datetime' },
          description: { type: 'string', required: false },
          group_id: { type: 'integer', required: false, description: 'Associated group' },
          event_type: { type: 'string', required: false, description: '"call" (default), "meeting", "reminder"' },
          duration_minutes: { type: 'integer', required: false, description: 'Default: 30' },
          reminder_minutes: { type: 'integer', required: false, description: 'Default: 15' },
          is_recurring: { type: 'boolean', required: false, description: 'Default: false' },
          recurrence_rule: { type: 'string', required: false, description: 'Recurrence rule string' },
          participant_ids: { type: 'integer[]', required: false, description: 'Invited user IDs' },
        },
        responses: [
          { status: 201, description: 'Event created' },
          { status: 400, description: 'Missing title/date or invalid format' },
        ],
      },
      {
        method: 'PUT', path: '/api/calendar/events/:event_id', auth: 'jwt',
        summary: 'Update an event (creator only)',
        params: { event_id: { type: 'integer', in: 'path' } },
        body: {
          title: { type: 'string', required: false },
          description: { type: 'string', required: false },
          scheduled_at: { type: 'string', required: false, description: 'ISO 8601' },
          duration_minutes: { type: 'integer', required: false },
          reminder_minutes: { type: 'integer', required: false },
        },
        responses: [
          { status: 200, description: 'Updated event' },
          { status: 403, description: 'Not the creator' },
        ],
      },
      {
        method: 'DELETE', path: '/api/calendar/events/:event_id', auth: 'jwt',
        summary: 'Delete an event (creator only)',
        params: { event_id: { type: 'integer', in: 'path' } },
        responses: [
          { status: 200, description: 'Event deleted' },
          { status: 403, description: 'Not the creator' },
        ],
      },
      {
        method: 'PUT', path: '/api/calendar/events/:event_id/respond', auth: 'jwt',
        summary: 'Respond to an event invitation',
        params: { event_id: { type: 'integer', in: 'path' } },
        body: {
          status: { type: 'string', required: true, description: '"accepted" or "declined"' },
        },
        responses: [
          { status: 200, description: 'Response recorded' },
          { status: 404, description: 'Not invited' },
        ],
      },
    ],
  },

  /* ── Push Notifications ── */
  {
    id: 'push',
    title: 'Push Notifications',
    description: 'Web Push subscription management using the VAPID protocol. Subscribe browser clients to receive push notifications for calls and messages even when the app is not focused.',
    endpoints: [
      {
        method: 'GET', path: '/api/push/vapid-key', auth: 'none',
        summary: 'Get VAPID public key',
        description: 'Returns the server\'s VAPID public key needed by clients to subscribe to push notifications.',
        responses: [
          { status: 200, description: 'VAPID key', example: '{"public_key":"BLoYag..."}' },
        ],
      },
      {
        method: 'POST', path: '/api/push/subscribe', auth: 'jwt',
        summary: 'Subscribe to push notifications',
        description: 'Register a push subscription for the current user. Upserts if the endpoint already exists.',
        body: {
          subscription: {
            type: 'object', required: true,
            description: 'PushSubscription object: {endpoint, keys: {p256dh, auth}}',
          },
        },
        responses: [
          { status: 200, description: 'Subscribed' },
          { status: 400, description: 'Invalid subscription data' },
        ],
      },
      {
        method: 'POST', path: '/api/push/unsubscribe', auth: 'jwt',
        summary: 'Unsubscribe from push notifications',
        body: {
          endpoint: { type: 'string', required: false, description: 'Specific endpoint to remove (or omit to remove all)' },
        },
        responses: [
          { status: 200, description: 'Unsubscribed' },
        ],
      },
    ],
  },

  /* ── Admin ── */
  {
    id: 'admin',
    title: 'Administration',
    description: 'Platform administration endpoints. Require admin or super_admin role. Manage users, view system stats, configure settings, handle email verification.',
    endpoints: [
      {
        method: 'GET', path: '/api/admin/dashboard', auth: 'admin',
        summary: 'Admin dashboard overview',
        responses: [
          { status: 200, description: 'Platform stats', example: '{"total_users":10,"total_messages":500,"total_calls":50,"total_groups":3,"active_calls":1,"new_users_today":2,"messages_today":45,"calls_today":5}' },
        ],
      },
      {
        method: 'GET', path: '/api/admin/system-info', auth: 'admin',
        summary: 'Server system information',
        responses: [
          { status: 200, description: 'System info', example: '{"hostname":"SERVER","local_ip":"10.10.23.68","platform":"Windows-10","python_version":"3.13.5",...}' },
        ],
      },
      {
        method: 'GET', path: '/api/admin/config', auth: 'admin',
        summary: 'List all system config',
        responses: [{ status: 200, description: 'Config key-value pairs' }],
      },
      {
        method: 'PUT', path: '/api/admin/config', auth: 'admin',
        summary: 'Set a system config value',
        body: {
          key: { type: 'string', required: true },
          value: { type: 'string', required: true },
          description: { type: 'string', required: false },
        },
        responses: [{ status: 200, description: 'Config saved' }],
      },
      {
        method: 'DELETE', path: '/api/admin/config/:key', auth: 'admin',
        summary: 'Delete a system config',
        params: { key: { type: 'string', in: 'path' } },
        responses: [{ status: 200, description: 'Config deleted' }],
      },
      {
        method: 'GET', path: '/api/admin/users', auth: 'admin',
        summary: 'List all users (paginated)',
        query: {
          page: { type: 'integer', default: 1 },
          per_page: { type: 'integer', default: 20 },
          q: { type: 'string', description: 'Search username, display name, or email' },
          role: { type: 'string', description: 'Filter by role' },
        },
        responses: [{ status: 200, description: 'Paginated user list' }],
      },
      {
        method: 'POST', path: '/api/admin/users', auth: 'admin',
        summary: 'Create a user (admin)',
        body: {
          username: { type: 'string', required: true },
          email: { type: 'string', required: true },
          password: { type: 'string', required: true },
          display_name: { type: 'string', required: true },
          role: { type: 'string', required: false, description: '"user" or "admin"' },
          email_verified: { type: 'boolean', required: false },
        },
        responses: [{ status: 201, description: 'User created' }],
      },
      {
        method: 'GET', path: '/api/admin/users/:user_id', auth: 'admin',
        summary: 'Get user details with stats',
        params: { user_id: { type: 'integer', in: 'path' } },
        responses: [{ status: 200, description: 'User with contacts, messages, calls, groups stats' }],
      },
      {
        method: 'PUT', path: '/api/admin/users/:user_id', auth: 'admin',
        summary: 'Update a user',
        params: { user_id: { type: 'integer', in: 'path' } },
        body: {
          username: { type: 'string', required: false },
          email: { type: 'string', required: false },
          display_name: { type: 'string', required: false },
          bio: { type: 'string', required: false },
          role: { type: 'string', required: false },
          password: { type: 'string', required: false },
        },
        responses: [{ status: 200, description: 'User updated' }],
      },
      {
        method: 'DELETE', path: '/api/admin/users/:user_id', auth: 'admin',
        summary: 'Delete a user and all their data',
        description: 'Deletes the user and all associated contacts, messages, call logs, and group memberships. Super admin and self cannot be deleted.',
        params: { user_id: { type: 'integer', in: 'path' } },
        responses: [
          { status: 200, description: 'User deleted' },
          { status: 403, description: 'Cannot delete super admin or yourself' },
        ],
      },
      {
        method: 'GET', path: '/api/admin/stats/messages', auth: 'admin',
        summary: 'Message statistics',
        responses: [{ status: 200, description: 'Total, today count, breakdown by type' }],
      },
      {
        method: 'GET', path: '/api/admin/stats/calls', auth: 'admin',
        summary: 'Call statistics',
        responses: [{ status: 200, description: 'Total, today, by status, by type, avg duration' }],
      },
      {
        method: 'GET', path: '/api/admin/users/pending-verification', auth: 'admin',
        summary: 'List unverified users',
        responses: [{ status: 200, description: 'Users with email_verified=false' }],
      },
      {
        method: 'POST', path: '/api/admin/users/:user_id/send-verification', auth: 'admin',
        summary: 'Send verification email',
        params: { user_id: { type: 'integer', in: 'path' } },
        responses: [
          { status: 200, description: 'Email sent' },
          { status: 500, description: 'SMTP error' },
        ],
      },
      {
        method: 'POST', path: '/api/admin/users/:user_id/verify-email', auth: 'admin',
        summary: 'Manually verify user email',
        params: { user_id: { type: 'integer', in: 'path' } },
        responses: [{ status: 200, description: 'Email verified' }],
      },
      {
        method: 'POST', path: '/api/admin/users/:user_id/unverify-email', auth: 'admin',
        summary: 'Revoke email verification',
        params: { user_id: { type: 'integer', in: 'path' } },
        responses: [{ status: 200, description: 'Verification revoked' }],
      },
      {
        method: 'POST', path: '/api/admin/users/:user_id/send-reset', auth: 'admin',
        summary: 'Send password reset email',
        params: { user_id: { type: 'integer', in: 'path' } },
        responses: [
          { status: 200, description: 'Reset email sent' },
          { status: 500, description: 'SMTP error' },
        ],
      },
    ],
  },
];

/* ── WebSocket Events ── */
const SOCKET_EVENTS = [
  {
    id: 'ws-presence',
    title: 'Presence & Connection',
    description: 'Socket.IO events for connection management, authentication, and user presence tracking.',
    events: [
      {
        name: 'authenticate', direction: 'emit',
        summary: 'Authenticate the socket connection',
        description: 'Must be emitted after connecting. Maps the socket to a user and sets status to online.',
        payload: { token: 'JWT access token', device: '"web" (optional)' },
        response: 'authenticated → {user, online_users[{id, username, display_name, avatar_url, status, device, in_call}]}',
      },
      {
        name: 'get_online_users', direction: 'emit',
        summary: 'Request current online users with enriched data',
        response: 'online_users → {users[{id, username, display_name, avatar_url, status, device, in_call}]}',
      },
      {
        name: 'heartbeat', direction: 'emit',
        summary: 'Keep-alive heartbeat with activity tracking',
        payload: { activity: '"active" | "idle" (optional)', device: '"web" (optional)' },
        response: 'heartbeat_ack → {status, user_id, server_time}',
      },
      {
        name: 'update_status', direction: 'emit',
        summary: 'Manually set your status',
        payload: { status: '"online" | "away" | "busy" | "dnd"' },
        response: 'Broadcasts user_status_changed to all users',
      },
      {
        name: 'ping_user', direction: 'emit',
        summary: 'Check if a specific user is truly online',
        payload: { target_id: 'integer' },
        response: 'user_ping_result → {user_id, online, in_call, status, last_seen}',
      },
      {
        name: 'user_status_changed', direction: 'listen',
        summary: 'User came online/offline or changed status',
        payload: { user_id: 'integer', status: '"online" | "offline" | "away" | "busy" | "dnd"', username: 'string', display_name: 'string', avatar_url: 'string', last_seen: 'ISO (offline only)' },
      },
      {
        name: 'user_call_status', direction: 'listen',
        summary: 'User started or ended a call (busy indicator)',
        payload: { user_id: 'integer', in_call: 'boolean', call_type: '"voice" | "video" (when in_call)' },
      },
    ],
  },
  {
    id: 'ws-calls',
    title: 'Call Signaling',
    description: 'WebRTC call signaling over Socket.IO. Handles call initiation, acceptance, rejection, ICE candidates, and renegotiation.',
    events: [
      {
        name: 'call_user', direction: 'emit',
        summary: 'Initiate a call to another user',
        payload: { target_id: 'integer', call_type: '"voice" | "video"', offer: 'RTCSessionDescription', call_id: 'integer' },
        response: 'incoming_call → to target',
      },
      {
        name: 'incoming_call', direction: 'listen',
        summary: 'Receive an incoming call',
        payload: { caller_id: 'integer', caller: '{id, display_name, username}', call_type: 'string', offer: 'RTCSessionDescription', call_id: 'integer' },
      },
      {
        name: 'call_accepted', direction: 'emit',
        summary: 'Accept an incoming call',
        payload: { caller_id: 'integer', answer: 'RTCSessionDescription', call_id: 'integer' },
        response: 'call_accepted → to caller with answer',
      },
      {
        name: 'call_rejected', direction: 'emit',
        summary: 'Reject an incoming call',
        payload: { caller_id: 'integer', call_id: 'integer' },
        response: 'call_rejected → to caller',
      },
      {
        name: 'ice_candidate', direction: 'both',
        summary: 'Exchange ICE candidates',
        payload: { target_id: 'integer', candidate: 'RTCIceCandidate' },
      },
      {
        name: 'end_call', direction: 'emit',
        summary: 'End an active call',
        payload: { target_id: 'integer', call_id: 'integer' },
        response: 'call_ended → to target',
      },
      {
        name: 'call_error', direction: 'listen',
        summary: 'Call error (user offline, busy)',
        payload: { error: 'string' },
      },
      {
        name: 'renegotiate_offer', direction: 'both',
        summary: 'Send renegotiation offer (add/remove video)',
        payload: { target_id: 'integer', offer: 'RTCSessionDescription' },
      },
      {
        name: 'renegotiate_answer', direction: 'both',
        summary: 'Send renegotiation answer',
        payload: { target_id: 'integer', answer: 'RTCSessionDescription' },
      },
      {
        name: 'screen_share_started', direction: 'both',
        summary: 'Notify screen sharing started',
        payload: { target_id: 'integer' },
      },
      {
        name: 'screen_share_stopped', direction: 'both',
        summary: 'Notify screen sharing stopped',
        payload: { target_id: 'integer' },
      },
      {
        name: 'group_call_initiate', direction: 'emit',
        summary: 'Start a group call',
        payload: { participant_ids: 'integer[]', call_type: 'string', group_id: 'integer' },
        response: 'group_call_invite → to each participant',
      },
      {
        name: 'group_call_join', direction: 'emit',
        summary: 'Join an active group call',
        payload: { participant_ids: 'integer[]', offer: 'RTCSessionDescription' },
        response: 'group_call_peer_joined → to other participants',
      },
      {
        name: 'media_state_changed', direction: 'emit',
        summary: 'Sync mute/video/screen state to call partner',
        payload: { target_id: 'integer', muted: 'boolean', video_on: 'boolean', screen_sharing: 'boolean' },
        response: 'remote_media_state → to target',
      },
      {
        name: 'remote_media_state', direction: 'listen',
        summary: 'Receive call partner\'s media state',
        payload: { user_id: 'integer', muted: 'boolean', video_on: 'boolean', screen_sharing: 'boolean' },
      },
      {
        name: 'call_reconnecting', direction: 'both',
        summary: 'Notify partner that ICE reconnection is in progress',
        payload: { target_id: 'integer (emit) | user_id: integer (listen)' },
      },
      {
        name: 'call_reconnected', direction: 'both',
        summary: 'Notify partner that reconnection succeeded',
        payload: { target_id: 'integer (emit) | user_id: integer (listen)' },
      },
      {
        name: 'check_ring_timeout', direction: 'emit',
        summary: 'Check if outgoing ring has timed out (45s)',
        payload: { call_id: 'integer' },
        response: 'call_error → {error, reason: "timeout"} if timed out',
      },
      {
        name: 'call_quality_report', direction: 'emit',
        summary: 'Send call quality stats to partner',
        payload: { target_id: 'integer', quality: '"good"|"fair"|"poor"', rtt: 'number', packet_loss: 'number', bitrate_in: 'number', bitrate_out: 'number' },
        response: 'partner_quality_report → to target',
      },
    ],
  },
  {
    id: 'ws-chat',
    title: 'Real-time Messaging',
    description: 'Real-time message delivery, typing indicators, read receipts, and group room management.',
    events: [
      {
        name: 'send_message', direction: 'emit',
        summary: 'Send a message in real-time',
        payload: {
          receiver_id: 'integer (DM)', group_id: 'integer (group)',
          content: 'string', message_type: '"text" | "image" | "file" | "audio"',
          encrypted_content: 'string', file_url: 'string', file_name: 'string', file_size: 'integer',
        },
        response: 'new_message → to receiver; message_sent → back to sender',
      },
      {
        name: 'new_message', direction: 'listen',
        summary: 'Receive a new message',
        payload: { id: 'integer', sender_id: 'integer', content: 'string', message_type: 'string', created_at: 'ISO string', '...': '' },
      },
      {
        name: 'typing', direction: 'emit',
        summary: 'Send typing indicator',
        payload: { receiver_id: 'integer', group_id: 'integer', is_typing: 'boolean' },
        response: 'user_typing → to target(s)',
      },
      {
        name: 'mark_read', direction: 'emit',
        summary: 'Mark messages as read',
        payload: { sender_id: 'integer' },
        response: 'messages_read → to sender with {reader_id}',
      },
      {
        name: 'join_group_room', direction: 'emit',
        summary: 'Join a group chat room',
        payload: { group_id: 'integer' },
      },
      {
        name: 'leave_group_room', direction: 'emit',
        summary: 'Leave a group chat room',
        payload: { group_id: 'integer' },
      },
      {
        name: 'delete_message', direction: 'emit',
        summary: 'Delete a message in real-time',
        payload: { message_id: 'integer' },
        response: 'message_deleted → to receiver/group members and back to sender',
      },
      {
        name: 'message_deleted', direction: 'listen',
        summary: 'A message was deleted',
        payload: { message_id: 'integer', sender_id: 'integer' },
      },
      {
        name: 'delete_conversation', direction: 'emit',
        summary: 'Delete an entire conversation',
        payload: { other_user_id: 'integer' },
        response: 'conversation_deleted → to the other user and back to sender',
      },
      {
        name: 'conversation_deleted', direction: 'listen',
        summary: 'A conversation was deleted',
        payload: { other_user_id: 'integer', deleted_by: 'integer' },
      },
    ],
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  UI COMPONENTS                                                */
/* ────────────────────────────────────────────────────────────── */

const METHOD_COLORS = {
  GET: '#22a364',
  POST: '#2568d4',
  PUT: '#d49a25',
  DELETE: '#d43b25',
  PATCH: '#7c3aed',
};

function MethodBadge({ method }) {
  return (
    <span className="apidoc-method" style={{ background: METHOD_COLORS[method] || '#666' }}>
      {method}
    </span>
  );
}

function AuthBadge({ auth }) {
  if (auth === 'none')
    return <span className="apidoc-auth apidoc-auth--public"><FiUnlock size={11} /> Public</span>;
  if (auth === 'admin')
    return <span className="apidoc-auth apidoc-auth--admin"><FiShield size={11} /> Admin</span>;
  return <span className="apidoc-auth apidoc-auth--jwt"><FiLock size={11} /> JWT</span>;
}

function DirectionBadge({ direction }) {
  const label = direction === 'emit' ? 'Client → Server'
    : direction === 'listen' ? 'Server → Client' : 'Bidirectional';
  const cls = direction === 'emit' ? 'apidoc-dir--emit'
    : direction === 'listen' ? 'apidoc-dir--listen' : 'apidoc-dir--both';
  return <span className={`apidoc-dir ${cls}`}>{label}</span>;
}

function CopyButton({ text }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="apidoc-copy" onClick={copy} title="Copy">
      {copied ? <FiCheck size={12} /> : <FiCopy size={12} />}
    </button>
  );
}

function FieldTable({ fields, title }) {
  if (!fields || Object.keys(fields).length === 0) return null;
  return (
    <div className="apidoc-fields">
      <span className="apidoc-fields-title">{title}</span>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
        <tbody>
          {Object.entries(fields).map(([name, info]) => (
            <tr key={name}>
              <td><code>{name}</code></td>
              <td>{typeof info === 'string' ? info : info.type}</td>
              <td>{typeof info === 'object' && info.required ? 'Yes' : typeof info === 'object' && info.required === false ? 'No' : '—'}</td>
              <td>{typeof info === 'object' ? (info.description || '') : ''}{typeof info === 'object' && info.default !== undefined ? ` (default: ${info.default})` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({ ep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`apidoc-endpoint ${open ? 'open' : ''}`}>
      <button className="apidoc-endpoint-header" onClick={() => setOpen(!open)}>
        <div className="apidoc-endpoint-left">
          {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
          <MethodBadge method={ep.method} />
          <code className="apidoc-path">{ep.path}</code>
        </div>
        <div className="apidoc-endpoint-right">
          <span className="apidoc-summary">{ep.summary}</span>
          <AuthBadge auth={ep.auth} />
        </div>
      </button>
      {open && (
        <div className="apidoc-endpoint-body">
          {ep.description && <p className="apidoc-desc">{ep.description}</p>}
          <FieldTable fields={ep.params} title="Path Parameters" />
          <FieldTable fields={ep.query} title="Query Parameters" />
          <FieldTable fields={ep.body} title="Request Body (JSON)" />
          {ep.responses && (
            <div className="apidoc-responses">
              <span className="apidoc-fields-title">Responses</span>
              {ep.responses.map((r, i) => (
                <div key={i} className="apidoc-response">
                  <span className={`apidoc-status ${r.status < 400 ? 'ok' : 'err'}`}>{r.status}</span>
                  <span>{r.description}</span>
                  {r.example && (
                    <div className="apidoc-example">
                      <CopyButton text={r.example} />
                      <pre>{r.example}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SocketEventCard({ ev }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`apidoc-endpoint ${open ? 'open' : ''}`}>
      <button className="apidoc-endpoint-header" onClick={() => setOpen(!open)}>
        <div className="apidoc-endpoint-left">
          {open ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
          <span className="apidoc-method" style={{ background: '#7c3aed' }}>WS</span>
          <code className="apidoc-path">{ev.name}</code>
        </div>
        <div className="apidoc-endpoint-right">
          <span className="apidoc-summary">{ev.summary}</span>
          <DirectionBadge direction={ev.direction} />
        </div>
      </button>
      {open && (
        <div className="apidoc-endpoint-body">
          {ev.description && <p className="apidoc-desc">{ev.description}</p>}
          {ev.payload && (
            <div className="apidoc-fields">
              <span className="apidoc-fields-title">Payload</span>
              <table>
                <thead><tr><th>Field</th><th>Type / Value</th></tr></thead>
                <tbody>
                  {Object.entries(ev.payload).map(([k, v]) => (
                    <tr key={k}><td><code>{k}</code></td><td>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ev.response && (
            <div className="apidoc-response-note">
              <strong>Response event:</strong> {ev.response}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  MAIN PAGE                                                    */
/* ────────────────────────────────────────────────────────────── */

export default function ApiDocs() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(null);

  const allSections = useMemo(() => [...SECTIONS], []);
  const allSocketSections = useMemo(() => [...SOCKET_EVENTS], []);

  const filteredSections = useMemo(() => {
    if (!search) return allSections;
    const q = search.toLowerCase();
    return allSections.map((s) => ({
      ...s,
      endpoints: s.endpoints.filter((ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        (ep.description || '').toLowerCase().includes(q)
      ),
    })).filter((s) => s.endpoints.length > 0);
  }, [search, allSections]);

  const filteredSocketSections = useMemo(() => {
    if (!search) return allSocketSections;
    const q = search.toLowerCase();
    return allSocketSections.map((s) => ({
      ...s,
      events: s.events.filter((ev) =>
        ev.name.toLowerCase().includes(q) ||
        ev.summary.toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q)
      ),
    })).filter((s) => s.events.length > 0);
  }, [search, allSocketSections]);

  const totalEndpoints = allSections.reduce((n, s) => n + s.endpoints.length, 0);
  const totalEvents = allSocketSections.reduce((n, s) => n + s.events.length, 0);

  return (
    <div className="apidoc">
      {/* ── Sidebar ── */}
      <nav className="apidoc-sidebar">
        <div className="apidoc-sidebar-top">
          <Link to="/welcome" className="apidoc-back"><FiArrowLeft size={14} /> VoiceLink</Link>
          <h2>API Reference</h2>
          <p className="apidoc-version">v1.0 &middot; {totalEndpoints} endpoints &middot; {totalEvents} events</p>
        </div>

        <div className="apidoc-sidebar-search">
          <FiSearch size={14} />
          <input
            type="text"
            placeholder="Search endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="apidoc-sidebar-nav">
          <div className="apidoc-nav-group">
            <span className="apidoc-nav-label">REST API</span>
            {allSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={activeSection === s.id ? 'active' : ''}
                onClick={() => setActiveSection(s.id)}
              >
                {s.title}
                <span className="apidoc-nav-count">{s.endpoints.length}</span>
              </a>
            ))}
          </div>
          <div className="apidoc-nav-group">
            <span className="apidoc-nav-label">WebSocket Events</span>
            {allSocketSections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={activeSection === s.id ? 'active' : ''}
                onClick={() => setActiveSection(s.id)}
              >
                {s.title}
                <span className="apidoc-nav-count">{s.events.length}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="apidoc-main">
        {/* Header */}
        <header className="apidoc-header">
          <div>
            <h1>VoiceLink API Documentation</h1>
            <p>Complete reference for the VoiceLink REST API and WebSocket events.</p>
          </div>
          <div className="apidoc-base-url">
            <FiWifi size={14} />
            <span>Base URL:</span>
            <code>{API_BASE}</code>
            <CopyButton text={API_BASE} />
          </div>
        </header>

        {/* Overview */}
        <section className="apidoc-overview">
          <h2>Overview</h2>
          <div className="apidoc-overview-grid">
            <div className="apidoc-overview-card">
              <h3>Authentication</h3>
              <p>
                VoiceLink uses <strong>JWT Bearer tokens</strong> for authentication. Obtain a token via
                <code>POST /api/auth/login</code>, then include it in all authenticated requests:
              </p>
              <pre>Authorization: Bearer {'<'}your_jwt_token{'>'}</pre>
            </div>
            <div className="apidoc-overview-card">
              <h3>WebSocket</h3>
              <p>
                Real-time features use <strong>Socket.IO</strong>. Connect to the server, then emit
                the <code>authenticate</code> event with your JWT token. All subsequent events are
                tied to your session.
              </p>
              <pre>const socket = io('{API_BASE}');<br/>socket.emit('authenticate', {'{'} token {'}'});</pre>
            </div>
            <div className="apidoc-overview-card">
              <h3>Responses</h3>
              <p>
                All REST responses are JSON. Successful responses return <strong>2xx</strong> status codes.
                Errors return <strong>4xx/5xx</strong> with an <code>error</code> field:
              </p>
              <pre>{'{"error": "Invalid credentials"}'}</pre>
            </div>
            <div className="apidoc-overview-card">
              <h3>Authorization Levels</h3>
              <p>Three levels are used across endpoints:</p>
              <ul>
                <li><span className="apidoc-auth apidoc-auth--public"><FiUnlock size={10} /> Public</span> — No authentication required</li>
                <li><span className="apidoc-auth apidoc-auth--jwt"><FiLock size={10} /> JWT</span> — Requires valid JWT token</li>
                <li><span className="apidoc-auth apidoc-auth--admin"><FiShield size={10} /> Admin</span> — Requires admin or super_admin role</li>
              </ul>
            </div>
          </div>
        </section>

        {/* REST Sections */}
        {filteredSections.map((section) => (
          <section key={section.id} id={section.id} className="apidoc-section">
            <div className="apidoc-section-header">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <div className="apidoc-endpoints">
              {section.endpoints.map((ep, i) => (
                <EndpointCard key={i} ep={ep} />
              ))}
            </div>
          </section>
        ))}

        {/* WebSocket Sections */}
        {filteredSocketSections.length > 0 && (
          <div className="apidoc-ws-divider">
            <FiZap size={16} />
            <span>WebSocket Events (Socket.IO)</span>
          </div>
        )}
        {filteredSocketSections.map((section) => (
          <section key={section.id} id={section.id} className="apidoc-section">
            <div className="apidoc-section-header">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <div className="apidoc-endpoints">
              {section.events.map((ev, i) => (
                <SocketEventCard key={i} ev={ev} />
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <footer className="apidoc-footer">
          <p>VoiceLink API v1.0 &middot; Local Network Communication Platform</p>
        </footer>
      </main>
    </div>
  );
}
