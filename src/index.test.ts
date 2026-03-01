import { describe, expect, it } from "vitest";
import { TheCitadelService } from "./index";
import type { Logger, LogLevel } from "./logger";

class MemoryLogger implements Logger {
  public readonly entries: Array<{ level: LogLevel; message: string; context?: Record<string, unknown> }> = [];

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    this.entries.push({ level, message, context });
  }
}

describe("TheCitadelService", () => {
  it("starts inactive and transitions to active", async () => {
    const logger = new MemoryLogger();
    const service = new TheCitadelService(logger);

    expect(service.getStatus().status).toBe("inactive");
    await service.start();
    expect(service.getStatus().status).toBe("active");
    expect(logger.entries.some((entry) => entry.message === "service.start.completed")).toBe(true);
  });

  it("transitions back to inactive when stopped", async () => {
    const logger = new MemoryLogger();
    const service = new TheCitadelService(logger);

    await service.start();
    await service.stop();
    expect(service.getStatus().status).toBe("inactive");
    expect(logger.entries.some((entry) => entry.message === "service.stop.completed")).toBe(true);
  });

  it("does not fail on duplicate lifecycle calls", async () => {
    const logger = new MemoryLogger();
    const service = new TheCitadelService(logger);

    await service.start();
    await service.start();
    await service.stop();
    await service.stop();

    const skippedEvents = logger.entries.filter((entry) => entry.message.endsWith(".skipped"));
    expect(skippedEvents.length).toBe(2);
  });
});
