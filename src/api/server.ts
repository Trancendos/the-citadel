/**
 * The Citadel — REST API Server
 *
 * Exposes firewall rules, incident management, threat level,
 * and defense statistics over HTTP.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { DefenseEngine } from '../defense/defense-engine';
import { logger } from '../utils/logger';


// ============================================================================
// IAM MIDDLEWARE — Trancendos 2060 Standard (TRN-PROD-001)
// ============================================================================
import { createHash, createHmac } from 'crypto';

const IAM_JWT_SECRET = process.env.IAM_JWT_SECRET || process.env.JWT_SECRET || '';
const IAM_ALGORITHM = process.env.JWT_ALGORITHM || 'HS512';
const SERVICE_ID = 'citadel';
const MESH_ADDRESS = process.env.MESH_ADDRESS || 'citadel.agent.local';

function sha512Audit(data: string): string {
  return createHash('sha512').update(data).digest('hex');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64 + '='.repeat((4 - b64.length % 4) % 4), 'base64').toString('utf8');
}

interface JWTClaims {
  sub: string; email?: string; role?: string;
  active_role_level?: number; permissions?: string[];
  exp?: number; jti?: string;
}

function verifyIAMToken(token: string): JWTClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts;
    const header = JSON.parse(b64urlDecode(h));
    const alg = header.alg === 'HS512' ? 'sha512' : 'sha256';
    const expected = createHmac(alg, IAM_JWT_SECRET)
      .update(`${h}.${p}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    if (expected !== sig) return null;
    const claims = JSON.parse(b64urlDecode(p)) as JWTClaims;
    if (claims.exp && Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch { return null; }
}

function requireIAMLevel(maxLevel: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) { res.status(401).json({ error: 'Authentication required', service: SERVICE_ID }); return; }
    const claims = verifyIAMToken(token);
    if (!claims) { res.status(401).json({ error: 'Invalid or expired token', service: SERVICE_ID }); return; }
    const level = claims.active_role_level ?? 6;
    if (level > maxLevel) {
      console.log(JSON.stringify({ level: 'audit', decision: 'DENY', service: SERVICE_ID,
        principal: claims.sub, requiredLevel: maxLevel, actualLevel: level, path: req.path,
        integrityHash: sha512Audit(`DENY:${claims.sub}:${req.path}:${Date.now()}`),
        timestamp: new Date().toISOString() }));
      res.status(403).json({ error: 'Insufficient privilege level', required: maxLevel, actual: level });
      return;
    }
    (req as any).principal = claims;
    next();
  };
}

function iamRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Service-Id', SERVICE_ID);
  res.setHeader('X-Mesh-Address', MESH_ADDRESS);
  res.setHeader('X-IAM-Version', '1.0');
  next();
}

function iamHealthStatus() {
  return {
    iam: {
      version: '1.0', algorithm: IAM_ALGORITHM,
      status: IAM_JWT_SECRET ? 'configured' : 'unconfigured',
      meshAddress: MESH_ADDRESS,
      routingProtocol: process.env.MESH_ROUTING_PROTOCOL || 'static_port',
      cryptoMigrationPath: 'hmac_sha512 → ml_kem (2030) → hybrid_pqc (2040) → slh_dsa (2060)',
    },
  };
}
// ============================================================================
// END IAM MIDDLEWARE
// ============================================================================

export function createServer(engine: DefenseEngine): express.Application {
  const app = express();

  // ── Middleware ────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('combined', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
  }));

  // ── Health & Metrics ──────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'the-citadel',
      timestamp: new Date().toISOString(),
      threatLevel: engine.getCurrentThreatLevel(),
    });
  });

  app.get('/metrics', (_req: Request, res: Response) => {
    const stats = engine.getStats();
    res.json({
      service: 'the-citadel',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      stats,
    });
  });

  // ── Firewall Rules ────────────────────────────────────────────────────────

  /** GET /firewall/rules — list all firewall rules */
  app.get('/firewall/rules', (_req: Request, res: Response) => {
    const rules = engine.getRules();
    res.json({ rules, total: rules.length });
  });

  /** POST /firewall/rules — add a new firewall rule */
  app.post('/firewall/rules', (req: Request, res: Response) => {
    try {
      const { name, description, priority, source, destination, port, protocol, action } = req.body;
      if (!name || !action) {
        return res.status(400).json({ error: 'name and action are required' });
      }
      const rule = engine.addRule({ name, description, priority, source, destination, port, protocol, action });
      logger.info({ ruleId: rule.id, name: rule.name }, 'Firewall rule added via API');
      res.status(201).json({ rule });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** GET /firewall/rules/:id — get a specific rule */
  app.get('/firewall/rules/:id', (req: Request, res: Response) => {
    const rules = engine.getRules();
    const rule = rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ rule });
  });

  /** DELETE /firewall/rules/:id — delete a rule */
  app.delete('/firewall/rules/:id', (req: Request, res: Response) => {
    const deleted = engine.deleteRule(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Rule not found' });
    logger.info({ ruleId: req.params.id }, 'Firewall rule deleted via API');
    res.json({ success: true, message: 'Rule deleted' });
  });

  /** PATCH /firewall/rules/:id/toggle — enable/disable a rule */
  app.patch('/firewall/rules/:id/toggle', (req: Request, res: Response) => {
    const rule = engine.toggleRule(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    logger.info({ ruleId: rule.id, enabled: rule.enabled }, 'Firewall rule toggled via API');
    res.json({ rule });
  });

  /** POST /firewall/evaluate — evaluate a request against firewall rules */
  app.post('/firewall/evaluate', (req: Request, res: Response) => {
    try {
      const { source, destination, port } = req.body;
      if (!source || !destination) {
        return res.status(400).json({ error: 'source and destination are required' });
      }
      const result = engine.evaluateRequest(source, destination, port);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Incidents ─────────────────────────────────────────────────────────────

  /** GET /incidents — list incidents with optional filters */
  app.get('/incidents', (req: Request, res: Response) => {
    const { status, severity, limit } = req.query;
    let incidents = engine.getIncidents();

    if (status) incidents = incidents.filter(i => i.status === status);
    if (severity) incidents = incidents.filter(i => i.severity === severity);

    const limitNum = limit ? parseInt(limit as string, 10) : 100;
    incidents = incidents.slice(0, limitNum);

    res.json({ incidents, total: incidents.length });
  });

  /** POST /incidents — create a new security incident */
  app.post('/incidents', (req: Request, res: Response) => {
    try {
      const { title, description, severity, source, affectedServices } = req.body;
      if (!title || !severity) {
        return res.status(400).json({ error: 'title and severity are required' });
      }
      const incident = engine.createIncident({ title, description, severity, source, affectedServices });
      logger.warn({ incidentId: incident.id, severity: incident.severity }, 'Security incident created via API');
      res.status(201).json({ incident });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** GET /incidents/:id — get a specific incident */
  app.get('/incidents/:id', (req: Request, res: Response) => {
    const incident = engine.getIncident(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ incident });
  });

  /** PATCH /incidents/:id — update incident status or add timeline event */
  app.patch('/incidents/:id', (req: Request, res: Response) => {
    try {
      const { status, note, assignedTo } = req.body;
      const incident = engine.updateIncident(req.params.id, { status, note, assignedTo });
      if (!incident) return res.status(404).json({ error: 'Incident not found' });
      logger.info({ incidentId: incident.id, status: incident.status }, 'Incident updated via API');
      res.json({ incident });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** POST /incidents/:id/resolve — resolve an incident */
  app.post('/incidents/:id/resolve', (req: Request, res: Response) => {
    const { note } = req.body;
    const incident = engine.updateIncident(req.params.id, {
      status: 'resolved',
      note: note || 'Incident resolved',
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    logger.info({ incidentId: incident.id }, 'Incident resolved via API');
    res.json({ incident });
  });

  /** POST /incidents/:id/close — close an incident */
  app.post('/incidents/:id/close', (req: Request, res: Response) => {
    const { note } = req.body;
    const incident = engine.updateIncident(req.params.id, {
      status: 'closed',
      note: note || 'Incident closed',
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    logger.info({ incidentId: incident.id }, 'Incident closed via API');
    res.json({ incident });
  });

  // ── Threat Level ──────────────────────────────────────────────────────────

  /** GET /threat-level — get current threat level */
  app.get('/threat-level', (_req: Request, res: Response) => {
    const level = engine.getCurrentThreatLevel();
    const stats = engine.getStats();
    res.json({
      threatLevel: level,
      openIncidents: stats.openIncidents,
      criticalIncidents: stats.criticalIncidents,
      timestamp: new Date().toISOString(),
      ...iamHealthStatus(),
    });
  });

  // ── Defense Stats ─────────────────────────────────────────────────────────

  /** GET /stats — get defense statistics */
  app.get('/stats', (_req: Request, res: Response) => {
    const stats = engine.getStats();
    res.json({ stats });
  });


// ═══════════════════════════════════════════════════════════════════════════════
// 2060 SMART RESILIENCE LAYER — Auto-wired by Trancendos Compliance Engine
// ═══════════════════════════════════════════════════════════════════════════════
import {
  SmartTelemetry,
  SmartEventBus,
  SmartCircuitBreaker,
  telemetryMiddleware,
  adaptiveRateLimitMiddleware,
  createHealthEndpoint,
  setupGracefulShutdown,
} from '../middleware/resilience-layer';

// Initialize 2060 singletons
const telemetry2060 = SmartTelemetry.getInstance();
const eventBus2060 = SmartEventBus.getInstance();
const circuitBreaker2060 = new SmartCircuitBreaker(`${SERVICE_ID}-primary`, {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3,
});

// Wire telemetry middleware (request tracking + trace propagation)
app.use(telemetryMiddleware);

// Wire adaptive rate limiting (IAM-level aware)
app.use(adaptiveRateLimitMiddleware);

// 2060 Enhanced health endpoint with resilience status
app.get('/health/2060', createHealthEndpoint({
  serviceName: SERVICE_ID,
  meshAddress: MESH_ADDRESS,
  getCustomHealth: () => ({
    circuitBreaker: circuitBreaker2060.getState(),
    eventBusListeners: eventBus2060.listenerCount(),
    telemetryMetrics: telemetry2060.getMetricNames().length,
  }),
}));

// Prometheus text format metrics export
app.get('/metrics/prometheus', (_req: any, res: any) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(telemetry2060.exportPrometheus());
});

// Emit service lifecycle events
eventBus2060.emit('service.2060.wired', {
  serviceId: SERVICE_ID,
  meshAddress: MESH_ADDRESS,
  timestamp: new Date().toISOString(),
  features: ['telemetry', 'rate-limiting', 'circuit-breaker', 'event-bus', 'prometheus-export'],
});

// ═══════════════════════════════════════════════════════════════════════════════
// END 2060 SMART RESILIENCE LAYER
// ═══════════════════════════════════════════════════════════════════════════════

  // ── Error Handler ─────────────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error in the-citadel API');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}