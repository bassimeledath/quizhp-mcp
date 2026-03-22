import type { Question } from "./types.js";

export interface GameSession {
  gameId: string;
  title: string;
  questions: Question[];
  createdAt: Date;
}

/**
 * In-memory game session store.
 * Tracks active quiz games for session management.
 */
export class GameStore {
  private sessions = new Map<string, GameSession>();

  /** Auto-expire sessions older than 1 hour */
  private readonly TTL_MS = 60 * 60 * 1000;

  /** Prevent memory exhaustion via session flooding */
  private readonly MAX_SESSIONS = 1000;

  createGame(questions: Question[], title?: string): GameSession {
    this.cleanup();

    // FIFO eviction: drop the oldest session if at capacity
    if (this.sessions.size >= this.MAX_SESSIONS) {
      const oldest = this.sessions.keys().next().value!;
      this.sessions.delete(oldest);
    }

    const gameId = `g_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const session: GameSession = {
      gameId,
      title: title || "Quiz",
      questions,
      createdAt: new Date(),
    };
    this.sessions.set(gameId, session);
    return session;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.createdAt.getTime() > this.TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
