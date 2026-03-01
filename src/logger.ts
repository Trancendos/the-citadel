export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
}

export class JsonConsoleLogger implements Logger {
  constructor(private readonly service: string) {}

  log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
    const entry = {
      ts: new Date().toISOString(),
      service: this.service,
      level,
      message,
      context,
    };
    console.log(JSON.stringify(entry));
  }
}
