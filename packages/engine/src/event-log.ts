import type { GameEvent } from '@wfk/shared';

/**
 * Append-only event log used for the entire game timeline.
 * Replay reconstructs the game by walking these events.
 */
export class EventLog {
  private events: GameEvent[] = [];

  push(event: GameEvent): void {
    this.events.push(event);
  }

  pushMany(events: GameEvent[]): void {
    for (const e of events) this.events.push(e);
  }

  all(): readonly GameEvent[] {
    return this.events;
  }

  toJSON(): GameEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
