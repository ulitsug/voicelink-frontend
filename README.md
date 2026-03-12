# VoiceLink — Frontend

React single-page application for the VoiceLink real-time communication platform. Features voice/video calling (WebRTC), real-time chat, contacts management, groups, and calendar scheduling.

> **Backend repo:** [voicelink-backend](https://github.com/ulitsug/voicelink-backend)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Library | React 18 |
| Routing | React Router v6 |
| Real-time | Socket.IO Client 4.7 |
| HTTP | Axios |
| Icons | react-icons (Feather) |
| Dates | date-fns |
| WebRTC | Native RTCPeerConnection |
| Encryption | Web Crypto API (RSA-OAEP) |

## Features

- **Voice & Video Calls** — P2P WebRTC with ICE restart, adaptive bitrate, connection quality stats
- **Screen Sharing** — Share screen during calls with mid-call renegotiation
- **Real-time Chat** — DM & group messaging, file/image upload, typing indicators, read receipts
- **Conversation List** — WhatsApp-style chat list with last message preview, unread badges, timestamps
- **Contacts** — Add/search/block contacts, one-click call or chat
- **Groups** — Create/manage groups, group chat, group calls
- **Calendar** — Event scheduling with participant invites & RSVP
- **Call History** — Browse past calls with callback functionality
- **Profile Management** — Avatar upload, display name, bio, password change
- **E2E Encryption** — Client-side RSA-OAEP encryption with IndexedDB key storage
- **Device Settings** — Camera, microphone, speaker selection + resolution presets
- **Presence** — Real-time online/offline indicators
- **Dashboard** — Stats overview with quick actions

## Project Structure

```
frontend/src/
├── App.js                    # Router + context providers
├── App.css                   # Global stylesheet (~2700 lines)
├── doodles.svg               # Decorative SVG background pattern
├── setupProxy.js             # CRA proxy → backend:5001
├── components/
│   ├── CalendarView.js       # Calendar event CRUD & RSVP
│   ├── CallHistory.js        # Past calls list with callback
│   ├── CallOverlay.js        # Full-screen call UI + controls
│   ├── ChatPanel.js          # Chat conversations & message thread
│   ├── ContactList.js        # Contacts with actions (call, chat)
│   ├── DeviceSettings.js     # Audio/video device picker
│   ├── GroupManager.js       # Group CRUD, members, group chat
│   ├── HomeScreen.js         # Dashboard home with stats
│   ├── Navbar.js             # Side navigation bar
│   ├── ProfileSettings.js    # Profile edit, avatar, password
│   └── UsersList.js          # Browse all users
├── contexts/
│   ├── AuthContext.js        # JWT auth, user session, socket init
│   ├── CallContext.js        # WebRTC call lifecycle management
│   └── ChatContext.js        # Messages, conversations, typing, read receipts
├── pages/
│   ├── Dashboard.js          # Main layout with tab routing
│   ├── Login.js              # Login form
│   └── Register.js           # Registration form
└── services/
    ├── api.js                # Axios instance + all API wrappers
    ├── socket.js             # Socket.IO client singleton
    ├── webrtc.js             # WebRTCService class (~500 lines)
    ├── encryption.js         # E2E RSA-OAEP encryption
    └── ringtone.js           # Web Audio API ringtone generator
```

## Components

| Component | Description |
|-----------|-------------|
| **ChatPanel** | Conversation list with last message preview, unread badges, online indicators. Message thread with date separators, read status (single/double check), file/image support. |
| **CallOverlay** | Full-screen call interface with local/remote video, mute/video/screen-share/hangup, connection quality bar, device settings panel. |
| **ContactList** | User's contacts with search filter. Voice call, video call, and chat action buttons per contact. |
| **GroupManager** | Create/edit/delete groups. Add/remove members (admin role). Group chat and group call initiation. |
| **CalendarView** | Create events with title, date/time, duration, reminders. Invite participants. Accept/decline invitations. |
| **HomeScreen** | Dashboard stats (contacts, groups, unread messages, calls), quick action buttons, recent contacts. |
| **ProfileSettings** | Edit display name and bio. Upload/remove avatar. Change password with current password verification. |
| **DeviceSettings** | Select camera, microphone, and speaker. Resolution presets (auto/720p/1080p/4K). |

## Contexts

| Context | Responsibilities |
|---------|-----------------|
| **AuthContext** | Login/register/logout, JWT storage, user state, Socket.IO connection lifecycle |
| **CallContext** | `initiateCall`, `acceptCall`, `rejectCall`, `endCall`, `toggleMute`, `toggleVideo`, `toggleScreenShare`. ICE restart. Connection quality stats. Incoming call ring tone. |
| **ChatContext** | Message state with deduplication, conversation list, unread counts, typing indicators, read receipts, `openChat`, `sendMessage` |

## Services

| Service | Description |
|---------|-------------|
| **api.js** | Axios instance with JWT token interceptor. Exports `authAPI`, `contactsAPI`, `callsAPI`, `chatAPI`, `groupsAPI`, `calendarAPI`. |
| **socket.js** | Socket.IO client with auto-reconnect, polling transport, heartbeat (20s). |
| **webrtc.js** | `WebRTCService` class. Media capture, RTCPeerConnection, offer/answer/ICE, screen share, renegotiation, ICE restart, adaptive bitrate, connection quality monitoring. |
| **encryption.js** | RSA-OAEP key generation, export/import (JWK), encrypt/decrypt. IndexedDB key pair persistence. |
| **ringtone.js** | Web Audio API two-tone (440/480Hz) ringtone with configurable on/off pattern. |

## Getting Started

### Prerequisites

- Node.js 16+
- Backend server running ([voicelink-backend](https://github.com/mubahood/voicelink-backend))

### Installation

```bash
# Clone the repository
git clone https://github.com/ulitsug/voicelink-frontend.git
cd voicelink-frontend

# Install dependencies
npm install

# Configure environment (optional)
cp .env.example .env
# Edit .env if needed
```

### Development

```bash
npm start
```

Opens at `https://localhost:3000`. The proxy in `setupProxy.js` forwards `/api/*` and `/socket.io/*` to `https://localhost:5001`.

### Production Build

```bash
npm run build
```

Outputs to `build/`. Serve with any static file server (nginx, serve, etc.).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTPS` | `true` | Enable HTTPS for dev server |
| `SSL_CRT_FILE` | `../cert.pem` | SSL certificate path |
| `SSL_KEY_FILE` | `../key.pem` | SSL key path |

## Design System

| Property | Value |
|----------|-------|
| Primary Color | `#174DA4` (brand blue) |
| Accent Color | `#cfb000` (gold) |
| Nav Background | `#0E2A52` (dark navy) |
| Border Radius | `0` (square corners) |
| Background | `#F0F1F4` with SVG doodle pattern |
| Container Background | `rgba(255,255,255,0.85)` |
| Font | Inter / system stack |
| Icons | Feather icons (react-icons/fi) |

## License

MIT
