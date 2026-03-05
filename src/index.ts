/**
 * The Citadel — Entry Point
 *
 * Active defense layer for the Trancendos mesh. Manages firewall rules,
 * security incidents, and threat level monitoring. Works alongside
 * Guardian AI (IAM/zero-trust) and Norman AI (security intelligence)
 * to form the security triad.
 *
 * Port: 3016
 */

import { DefenseEngine } from './defense/defense-engine';
import { createServer } from './api/server';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3016', 10);

async function bootstrap(): Promise<void> {
  logger.info('The Citadel starting up...');

  // ── Initialize Defense Engine ───────────────────────────────────────────
  const engine = new DefenseEngine();
  logger.info('DefenseEngine initialized with default firewall rules');

  // ── Log initial threat level ────────────────────────────────────────────
  const threatLevel = engine.getCurrentThreatLevel();
  const stats = engine.getStats();
  logger.info(
    {
      threatLevel,
      firewallRules: stats.totalRules,
      enabledRules: stats.enabledRules,
    },
    'Defense posture established'
  );

  // ── Start HTTP Server ───────────────────────────────────────────────────
  const app = createServer(engine);

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'The Citadel API server listening');
  });

  // ── Periodic Threat Assessment (every 60s) ──────────────────────────────
  setInterval(() => {
    const level = engine.getCurrentThreatLevel();
    const currentStats = engine.getStats();
    if (level !== 'none') {
      logger.warn(
        {
          threatLevel: level,
          openIncidents: currentStats.openIncidents,
          criticalIncidents: currentStats.criticalIncidents,
        },
        'Threat level elevated — active incidents require attention'
      );
    } else {
      logger.info(
        {
          threatLevel: level,
          blockedRequests: currentStats.blockedRequests,
          allowedRequests: currentStats.allowedRequests,
        },
        'Threat assessment: all clear'
      );
    }
  }, 60_000);

  // ── Graceful Shutdown ───────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(() => {
      logger.info('The Citadel shut down gracefully');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception in the-citadel');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection in the-citadel');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during the-citadel bootstrap');
  process.exit(1);
});