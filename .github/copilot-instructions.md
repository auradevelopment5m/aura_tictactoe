# AuraTicTac AI Coding Instructions

## Welcome to AuraTicTac! ✨
AuraTicTac is a vibrant, real-time tic-tac-toe experience that brings classic gameplay into the modern web with glowing animations, smooth interactions, and competitive multiplayer action. Think neon-lit game boards, instant WebSocket battles, and a leaderboard that shines with player achievements.

## Architecture Overview
AuraTicTac is a full-stack tic-tac-toe game built with Next.js 16 (app router), React 19, TypeScript, and Tailwind CSS. It features:
- **Frontend**: React components using shadcn/ui (New York style) with Radix UI primitives - clean, accessible, and beautifully styled
- **Backend**: Next.js API routes (currently in-memory storage, planned PostgreSQL migration)
- **Real-time**: Node.js WebSocket server (port 3001) for multiplayer games that feel instantaneous
- **Database**: PostgreSQL with schema in `scripts/001-create-database.sql`
- **Deployment**: Nginx reverse proxy routing HTTP to Next.js (3000) and WebSocket upgrades to WS server (3001)

## Key Components & Patterns
- **UI Components**: Located in `components/`, use shadcn/ui with `cn()` utility for conditional classes that create smooth hover effects and state transitions
- **Game Logic**: Client-side for single-player (minimax AI), server-side WebSocket for multiplayer - keeping the action fast and fair
- **State Management**: React hooks (`useState`) for local state, no global state library needed for this focused experience
- **Styling**: Tailwind with CSS variables, custom glow effects for winning cells that pulse with victory, and subtle backdrop blurs
- **Icons**: Lucide React icons throughout - crisp, modern, and perfectly sized

## Development Workflow
- **Package Manager**: pnpm (see `pnpm-lock.yaml`) - fast, reliable, and lockfile-perfect
- **Scripts**: `pnpm dev` (Next.js dev server), `pnpm build`, `pnpm start` - get coding quickly!
- **Linting**: ESLint with `pnpm lint` - keeping code clean and consistent
- **Path Aliases**: `@/*` maps to project root (configured in `tsconfig.json` and `components.json`) - no more ../../../../

## API Patterns
- **Routes**: `app/api/` with Next.js route handlers - simple, powerful, and colocated
- **Data Flow**: Games saved via POST `/api/games`, leaderboard via GET `/api/leaderboard` - tracking every move and win
- **WebSocket Messages**: `session_created`, `game_start`, `move_made`, `game_over`, `player_disconnected` - real-time communication that feels alive
- **Database**: Currently demo data; production uses parameterized queries (see commented SQL in routes) - secure and scalable

## File Structure Conventions
- `components/ui/` - shadcn/ui components (do not modify directly) - the foundation of our beautiful UI
- `components/` - App-specific components (game-board, game-landing, etc.) - where the magic happens
- `app/` - Next.js app router pages and API routes - modern routing, zero config
- `scripts/` - Database schema, WebSocket server, deployment configs - everything needed for production
- `docs/` - Architecture documentation - the blueprint for our glowing creation

## Common Patterns
- **Component Props**: TypeScript interfaces for all props (e.g., `GameBoardProps`) - type-safe and self-documenting
- **Client Components**: Mark with `"use client"` directive when using hooks/events - Next.js 13+ app router style
- **Error Handling**: Basic try/catch in API routes, no custom error boundaries - keeping it simple and effective
- **Board Representation**: 9-element array for 3x3 grid, positions 0-8 - classic tic-tac-toe logic
- **Session IDs**: 6-character alphanumeric codes for multiplayer games - easy to share, hard to guess

## Design Philosophy & Visual Feel
- **Color Palette**: Neutral base with primary accent colors, CSS variables for theming
- **Animations**: Smooth transitions on hover, scale effects on winning moves, glow effects that celebrate victory
- **Layout**: Centered, card-based design with subtle background grids and backdrop blur effects
- **Typography**: Clean, modern fonts with proper hierarchy and contrast
- **Interactive States**: Hover glows, disabled opacity, winning cell highlights - every interaction feels responsive

## Deployment Notes
- **Production**: Nginx config in `scripts/nginx.conf` handles SSL, rate limiting, routing - secure and performant
- **WebSocket**: Separate server process, health check at `/health` - reliable real-time connections
- **Database**: PostgreSQL on remote server, connection details in architecture docs - scalable data layer
- **Scaling**: Stateless Next.js, WebSocket sessions in-memory (future Redis) - ready to grow

## Gotchas
- API routes currently use in-memory arrays; replace with PostgreSQL queries as commented - demo mode for now!
- WebSocket server runs separately from Next.js; start with `node scripts/websocket-server.js` - don't forget the real-time piece
- Winning detection uses hardcoded line combinations (see `checkWinner` function) - efficient and battle-tested
- Multiplayer sessions stored in Map; no persistence across server restarts - perfect for development, plan for Redis later
- API routes currently use in-memory arrays; replace with PostgreSQL queries as commented
- WebSocket server runs separately from Next.js; start with `node scripts/websocket-server.js`
- Winning detection uses hardcoded line combinations (see `checkWinner` function)
- Multiplayer sessions stored in Map; no persistence across server restarts