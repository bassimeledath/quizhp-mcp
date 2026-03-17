# QuizHP MCP Server

An interactive quiz MCP server that turns any topic into playable mini-games. Each question renders as a unique canvas game — archery, puzzles, switches, and 125+ more templates.

## Features

- **125+ game templates** — MCQ and true/false questions each get a unique mini-game (piano keys, treasure chests, archery, bomb defusal, etc.)
- **Multi-platform** — responsive layouts for desktop and mobile with fullscreen support
- **MCP App UI** — rich interactive widget rendered inside Claude or ChatGPT
- **Three deployment modes** — stdio (Claude Desktop), HTTP (remote server), Cloudflare Worker
- **Score reporting** — quiz results sent back to the AI for follow-up discussion
- **No external dependencies** — all templates are bundled, no API calls needed

## Installation

```bash
npm install quizhp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "quizhp": {
      "command": "npx",
      "args": ["-y", "quizhp"]
    }
  }
}
```

### Claude.ai (Remote HTTP)

Deploy the server and connect via the MCP endpoint:

```bash
# Start the HTTP server
npx quizhp start

# Or run directly
node dist/server/index.js
```

The MCP endpoint is available at `http://localhost:3001/mcp`.

### ChatGPT

Deploy the HTTP server and point ChatGPT's MCP integration to your `/mcp` endpoint. CORS is pre-configured for `chatgpt.com` and `chat.openai.com`.

### Cloudflare Worker

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy
```

## Usage Examples

### Basic Quiz

Ask Claude:
> "Quiz me on the solar system"

Claude generates questions and calls the `play-quiz` tool. Each question appears as a different interactive mini-game.

### Document-Based Quiz

> "Read this PDF and quiz me on the key concepts"

Claude extracts facts from the document and creates grounded quiz questions.

### Custom Configuration

> "Give me 15 hard true/false questions about JavaScript closures"

The AI adapts question count, difficulty, and type mix based on your request.

## Development

```bash
# Install dependencies
npm install

# Build everything (server + view)
npm run build

# Build only the view widget
npm run build:view

# Build only the server
npm run build:server

# Dev mode (auto-reload)
npm run dev

# Start HTTP server
npm start

# Start stdio server
npm run start:stdio
```

## Architecture

```
src/
  index.ts          — Express HTTP server (Streamable HTTP transport)
  stdio.ts          — Stdio server (Claude Desktop)
  worker.ts         — Cloudflare Worker entry point
  quiz-server.ts    — MCP server factory (tool + resource registration)
  game-store.ts     — In-memory session store with TTL
  template-store.ts — Loads game templates from bundled files
  types.ts          — Shared TypeScript types

view/src/
  QuizApp.tsx       — Main MCP App component
  components/       — React UI (QuizContainer, GameRuntime, EndScreen, etc.)
  store/            — Zustand state management
  hooks/            — postMessage communication hook
  lib/              — Template injection utilities

templates/          — 125+ HTML canvas game templates
  web/mcq/          — Desktop multiple-choice games
  web/true-false/   — Desktop true/false games
  mobile/mcq/       — Mobile multiple-choice games
  mobile/true-false/ — Mobile true/false games
```

## License

MIT
