/**
 * the-citadel - Defense and protection
 */

import { JsonConsoleLogger, type Logger } from "./logger";

export type ServiceStatus = "inactive" | "starting" | "active" | "stopping" | "error";

export class TheCitadelService {
  private readonly name = "the-citadel";
  private status: ServiceStatus = "inactive";
  private lastTransitionAt = new Date().toISOString();

  constructor(private readonly logger: Logger = new JsonConsoleLogger("the-citadel")) {}

  private transition(nextStatus: ServiceStatus, context: Record<string, unknown> = {}): void {
    this.status = nextStatus;
    this.lastTransitionAt = new Date().toISOString();
    this.logger.log("info", "service.state_transition", {
      from: context.from ?? null,
      to: nextStatus,
      ...context,
    });
  }

  async start(): Promise<void> {
    if (this.status === "active" || this.status === "starting") {
      this.logger.log("warn", "service.start.skipped", { status: this.status });
      return;
    }

    const previous = this.status;
    this.transition("starting", { from: previous });

    try {
      this.transition("active", { from: "starting" });
      this.logger.log("info", "service.start.completed");
    } catch (error) {
      this.transition("error", { from: "starting" });
      this.logger.log("error", "service.start.failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.status === "inactive" || this.status === "stopping") {
      this.logger.log("warn", "service.stop.skipped", { status: this.status });
      return;
    }

    const previous = this.status;
    this.transition("stopping", { from: previous });
    this.transition("inactive", { from: "stopping" });
    this.logger.log("info", "service.stop.completed");
  }

  getStatus(): Readonly<{ name: string; status: ServiceStatus; lastTransitionAt: string }> {
    return Object.freeze({
      name: this.name,
      status: this.status,
      lastTransitionAt: this.lastTransitionAt,
    });
  }
}

export default TheCitadelService;

if (require.main === module) {
  const service = new TheCitadelService();
  service.start().catch((error) => {
    console.error(
      `[the-citadel] failed to start: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
