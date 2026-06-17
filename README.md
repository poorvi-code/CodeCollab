# CodeCollab – Real-Time Collaborative Coding Platform

CodeCollab is a full-stack, real-time web application enabling developers to create private rooms, invite peers, chat instantly, and code in sync. 

## Architecture & Tech Stack

- **Frontend**: React (v19), React Router (v6), Monaco Editor (VS Code core), Socket.io Client, Apollo Client (GraphQL)
- **Backend**: Node.js, Express, Socket.io Server, Apollo Server (GraphQL), Mongoose ODM, JWT, bcryptjs
- **Database**: MongoDB (Local or Atlas Cloud)

---

## Directory Structure

```
CodeCollab/
├── backend/
│   ├── config/db.js           # Mongoose DB Connection
│   ├── controllers/           # Auth, Room, User (profile/notifications) controllers
│   ├── graphql/               # GraphQL Resolvers and Type Definitions
│   ├── middleware/            # JWT validation guard
│   ├── models/                # User, Room, Message, Notification schemas
│   ├── routes/                # REST endpoints
│   ├── server.js              # Server entry point (Express, Socket.io, Apollo GraphQL)
│   └── .env                   # Environment config
├── frontend/
│   ├── src/
│   │   ├── components/        # Navbar, Toast notify panel
│   │   ├── context/           # Auth and Socket.io context providers
│   │   ├── pages/             # Landing, Login, Register, Dashboard, Room workspace, Profile
│   │   ├── services/          # REST (Axios) and GraphQL queries/mutations
│   │   ├── App.css            # Dark/Coral global theme stylesheet
│   │   ├── App.jsx            # Routing and provider setup
│   │   └── main.jsx           # React entry point
└── package.json               # Root coordination package
```

---

## Features Implemented

1. **User Authentication**: Secure signup and login with password encryption (`bcryptjs`) and secure session tracking via (`JWT`). Includes custom role assignments (`Admin` vs `Developer`).
2. **Coding Rooms Hub**: User dashboard showing platform metrics (active collaborations, created/joined room stats, global count), listing active coding rooms with a search filter, showing a recent activity feed, and a form to spawn rooms.
3. **Real-time Code Editor**: Custom workspace featuring the high-performance **Monaco Editor** with automatic layout. Swappable language engines (JavaScript, Python, C++, HTML, etc.). Edits sync immediately across all connected clients.
4. **WebSocket Syncing**:
   - `join-room` / `leave-room`
   - `code-change` (synchronizes text updates in real-time)
   - `cursor-move` (shows other users' line and column coordinates)
   - `typing` (displays "typing..." indicators in the members panel)
   - `send-chat-message` (delivers chat updates instantly)
5. **Integrated Room Chat & Members**: Split tab system showing a live room messaging channel and list of active room occupants.
6. **Presence & Toasts**: Popups trigger in real-time as users enter or leave rooms.
7. **Mock Compiler**: Integrated mock output terminal. Clicking "Run Code" executes a simulated compiler based on the active language.
8. **Role-Based Access Control**: Admins and room creators are equipped with room deletion tools, while Developers join and code in rooms.
9. **GraphQL & REST integration**: Dual integration showing Apollo Server/Client GraphQL (handling room queries and stats aggregation) and Express REST (handling auth lifecycle and profile logs).

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB installed locally, or a MongoDB Atlas Cloud URI

### Installation & Environment Setup
1. Clone the repository or navigate to the workspace.
2. Configure your environment variables. Open `backend/.env` and insert your MongoDB Connection string:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_uri_here
   JWT_SECRET=your_jwt_secret_key_here
   ```
3. Run the installer script at the root directory to download dependencies for both backend and frontend:
   ```bash
   npm run install-all
   ```

### Running the Application
To run both the frontend dev server and the backend Node server concurrently:
```bash
npm run dev
```

- **Frontend Client**: Runs on `http://localhost:5173`
- **Backend API**: Runs on `http://localhost:5000`
- **GraphQL Apollo Server**: Runs on `http://localhost:5000/graphql` (Supports playground queries)

---

## Verification Plan

1. **Auth Test**: Register a new user as a `Developer` and another as an `Admin`. Login, and verify profile stats update.
2. **Real-time Sync**: Open two separate browser windows (one in Incognito). Log in as different developers, join the same Room workspace, type in the editor, and verify the text synchronizes instantly.
3. **Cursor and Typing Sync**: In the sidebar's "Members" tab, check that your collaborator's cursor position (line/column) is updated as they navigate, and verify "typing..." appears when edits are made.
4. **Chat and Toast Notifications**: Send a message in the chat panel, and verify it updates in the peer window. Verify toast notifications appear as users join/leave.
5. **Admin Deletion**: Confirm that only the room creator or an `Admin` user can delete rooms on the dashboard list.
