# AuraTicTac Architecture Documentation

## System Overview

AuraTicTac is a modern, real-time tic-tac-toe game supporting both single-player (vs AI) and multiplayer modes with persistent data storage.

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX REVERSE PROXY                           │
│                    (45.45.239.13:443)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • SSL Termination (TLS 1.2/1.3)                           │  │
│  │ • Rate Limiting (10 req/s per IP)                         │  │
│  │ • Security Headers (HSTS, XSS, etc.)                      │  │
│  │ • WebSocket Upgrade Handling                              │  │
│  │ • Static Asset Caching                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          │ HTTP/REST                          │ WebSocket
          ▼                                    ▼
┌─────────────────────┐           ┌─────────────────────┐
│   NEXT.JS APP       │           │  WEBSOCKET SERVER   │
│   (Port 3000)       │           │    (Port 3001)      │
│ ┌─────────────────┐ │           │ ┌─────────────────┐ │
│ │ • React UI      │ │           │ │ • Real-time     │ │
│ │ • API Routes    │ │           │ │   Game State    │ │
│ │ • Server        │ │           │ │ • Session Mgmt  │ │
│ │   Components    │ │           │ │ • Move Broadcast│ │
│ │ • AI Game Logic │ │           │ │ • Player Sync   │ │
│ └─────────────────┘ │           │ └─────────────────┘ │
└─────────────────────┘           └─────────────────────┘
          │                                    │
          └────────────────┬───────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL DATABASE                          │
│                      (auratictac)                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Tables:                                                    │  │
│  │ • players    - User profiles and statistics               │  │
│  │ • games      - Game sessions and state                    │  │
│  │ • game_moves - Move history for replay                    │  │
│  │                                                           │  │
│  │ Views:                                                    │  │
│  │ • leaderboard - Ranked player statistics                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Nginx Reverse Proxy

**Location:** Server 45.45.239.13 (Port 80/443)

**Responsibilities:**
- SSL/TLS termination for secure connections
- Route `/` and `/api/*` to Next.js (port 3000)
- Route `/ws` to WebSocket server (port 3001)
- Rate limiting to prevent abuse
- Security headers injection
- Static asset caching
- Health check endpoints

**Configuration File:** `/etc/nginx/sites-available/auratictac`

### 2. Next.js Application

**Location:** Port 3000

**Responsibilities:**
- Serve React UI components
- Handle API routes (`/api/games`, `/api/leaderboard`)
- Server-side rendering for SEO
- Single-player AI game logic (minimax algorithm)
- Static asset generation

**Key Files:**
- `app/page.tsx` - Main landing page
- `components/` - UI components
- `app/api/` - REST API endpoints

### 3. WebSocket Server

**Location:** Port 3001

**Responsibilities:**
- Real-time multiplayer game synchronization
- Session management (create/join)
- Game state broadcasting
- Player connection handling
- Move validation
- Disconnect recovery

**Message Types:**
- `session_created` - New game session
- `game_start` - Both players connected
- `move_made` - Player move broadcast
- `game_over` - Winner/draw notification
- `player_disconnected` - Connection lost

### 4. PostgreSQL Database

**Database:** `auratictac`
**User:** `auratictac_user`
**Password:** `TicTacAura2010@...`

**Schema:**

```
players
├── id (PK)
├── username (UNIQUE)
├── password_hash
├── created_at
├── last_active
├── total_games
├── wins
├── losses
└── draws

games
├── id (PK)
├── session_id (UNIQUE, 6 chars)
├── player_x_id (FK -> players)
├── player_o_id (FK -> players)
├── mode (single/multiplayer)
├── difficulty (easy/medium/hard)
├── board_state (9 chars)
├── current_turn (X/O)
├── winner (X/O/D)
├── status (waiting/active/completed)
├── created_at
├── updated_at
└── completed_at

game_moves
├── id (PK)
├── game_id (FK -> games)
├── player_id (FK -> players)
├── position (0-8)
├── symbol (X/O)
├── move_number
└── created_at
```

## Data Flow

### Single-Player Game Flow:
```
1. User selects difficulty → UI State
2. User makes move → Local AI calculation
3. AI responds → Update UI
4. Game ends → POST /api/games
5. Stats saved → Database
```

### Multiplayer Game Flow:
```
1. Player 1 creates session → WebSocket: session_created
2. Player 2 joins with code → WebSocket: game_start
3. Player makes move → WebSocket: move (validated)
4. Server broadcasts → WebSocket: move_made
5. Game ends → WebSocket: game_over
6. Stats saved → Database via API
```

## Security Measures

1. **Transport Security:**
   - TLS 1.2/1.3 encryption
   - HSTS enforcement
   - Secure WebSocket (WSS)

2. **Application Security:**
   - Input validation on all moves
   - Session ID entropy (6 chars, 36^6 combinations)
   - Rate limiting (10 req/s)
   - SQL injection prevention (parameterized queries)

3. **Database Security:**
   - Encrypted passwords (bcrypt)
   - Limited user privileges
   - Prepared statements only

## Scalability Considerations

1. **Horizontal Scaling:**
   - Stateless Next.js instances behind load balancer
   - Redis for WebSocket session sharing (future)
   - Database read replicas for leaderboard

2. **Performance:**
   - Static asset CDN caching
   - Database connection pooling
   - WebSocket heartbeat optimization

3. **Monitoring:**
   - Nginx access/error logs
   - Application metrics endpoint
   - Database query performance
