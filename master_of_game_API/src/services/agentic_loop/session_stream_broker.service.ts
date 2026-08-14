import { logger } from '../../logger';

/**
 * Transport-agnostic writable stream interface for SSE.
 * Decouples the Service Layer from express.Response.
 * Express Response naturally satisfies this interface.
 */
export interface SSEWritable {
  headersSent: boolean;
  setHeader(name: string, value: string): void;
  flushHeaders?(): void;
  write(chunk: string): boolean;
  end(): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

export interface ActiveSessionStream {
  sessionId: string;
  turnNumber: number;
  actionText: string;
  lastStatus: any | null;
  bufferedChunks: string;
  subscribers: Set<SSEWritable>;
  isCompleted: boolean;
}

export class SessionStreamBroker {
  private static instance: SessionStreamBroker;
  private activeSessions: Map<string, ActiveSessionStream> = new Map();

  private constructor() {}

  public static getInstance(): SessionStreamBroker {
    if (!SessionStreamBroker.instance) {
      SessionStreamBroker.instance = new SessionStreamBroker();
    }
    return SessionStreamBroker.instance;
  }

  public isSessionActive(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    return Boolean(session && !session.isCompleted);
  }

  public startSession(sessionId: string, turnNumber: number, actionText: string): void {
    logger.info('SessionStreamBroker: Starting stream session', { sessionId, turnNumber });
    const session: ActiveSessionStream = {
      sessionId,
      turnNumber,
      actionText,
      lastStatus: null,
      bufferedChunks: '',
      subscribers: new Set(),
      isCompleted: false,
    };
    this.activeSessions.set(sessionId, session);
  }

  public addSubscriber(sessionId: string, res: SSEWritable): void {
    const session = this.activeSessions.get(sessionId);

    // Setup SSE Headers if response headers have not been sent yet
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
    }

    if (!session || session.isCompleted) {
      logger.info('SessionStreamBroker: Subscription requested for inactive session', { sessionId });
      this.sendSSE(res, 'status', { stage: 'idle', message: 'Немає активного ходу' });
      res.end();
      return;
    }

    session.subscribers.add(res);
    logger.info('SessionStreamBroker: Added subscriber to active session', {
      sessionId,
      totalSubscribers: session.subscribers.size,
    });

    // Re-send latest status to newly reconnected subscriber
    if (session.lastStatus) {
      this.sendSSE(res, 'status', session.lastStatus);
    }

    // Re-send all buffered text chunks so far
    if (session.bufferedChunks) {
      this.sendSSE(res, 'chunk', { delta: session.bufferedChunks });
    }

    // Clean up subscriber when socket closes
    res.on('close', () => {
      if (session.subscribers.has(res)) {
        session.subscribers.delete(res);
        logger.info('SessionStreamBroker: Subscriber disconnected', {
          sessionId,
          remainingSubscribers: session.subscribers.size,
        });
      }
    });
  }

  public broadcastStatus(sessionId: string, statusData: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.lastStatus = statusData;
    this.broadcastToAll(session, 'status', statusData);
  }

  public broadcastChunk(sessionId: string, delta: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.bufferedChunks += delta;
    this.broadcastToAll(session, 'chunk', { delta });
  }

  public broadcastDone(sessionId: string, doneData: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.isCompleted = true;
    this.broadcastToAll(session, 'done', doneData);

    for (const res of session.subscribers) {
      try {
        res.end();
      } catch {}
    }
    session.subscribers.clear();

    // Keep session around briefly for late reconnects, then remove
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
      logger.info('SessionStreamBroker: Cleaned up active session state', { sessionId });
    }, 5000);
  }

  public broadcastError(sessionId: string, errorData: any): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.isCompleted = true;
    this.broadcastToAll(session, 'error', errorData);

    for (const res of session.subscribers) {
      try {
        res.end();
      } catch {}
    }
    session.subscribers.clear();

    setTimeout(() => {
      this.activeSessions.delete(sessionId);
    }, 2000);
  }

  private broadcastToAll(session: ActiveSessionStream, event: string, data: any): void {
    for (const res of session.subscribers) {
      try {
        this.sendSSE(res, event, data);
      } catch (err: any) {
        logger.error('SessionStreamBroker: Failed to send SSE chunk to subscriber', {
          sessionId: session.sessionId,
          error: err.message,
        });
        session.subscribers.delete(res);
      }
    }
  }

  private sendSSE(res: SSEWritable, event: string, data: any): void {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {}
  }
}
