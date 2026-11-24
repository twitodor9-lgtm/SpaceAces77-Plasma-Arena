type Fields = Record<string, string | number>;

export class RunTelemetry {
  private events: (Fields & { type: string; ms: number })[] = [];
  private dropped = 0;

  private readonly arenaId: string;
  private readonly startedAt: number;

  constructor(arenaId: string, startedAt: number) {
    this.arenaId = arenaId;
    this.startedAt = startedAt;
  }

  record(type: string, now: number, fields: Fields = {}): void {
    if (this.events.length === 5000) {
      if (type !== "result") {
        this.dropped++;
        return;
      }
      this.events.pop();
      this.dropped++;
    }
    this.events.push({ ...fields, type, ms: Math.max(0, Math.round(now - this.startedAt)) });
  }

  json(): string {
    return JSON.stringify({ version: 1, arenaId: this.arenaId, dropped: this.dropped, events: this.events }, null, 2);
  }
}
