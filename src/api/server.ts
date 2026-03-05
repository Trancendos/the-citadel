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
    });
  });

  // ── Defense Stats ─────────────────────────────────────────────────────────

  /** GET /stats — get defense statistics */
  app.get('/stats', (_req: Request, res: Response) => {
    const stats = engine.getStats();
    res.json({ stats });
  });

  // ── Error Handler ─────────────────────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error in the-citadel API');
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}