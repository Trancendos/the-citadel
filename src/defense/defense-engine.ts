/**
 * The Citadel — Defense Engine
 *
 * Active defense, firewall rules, incident management, and threat response
 * for the Trancendos mesh. Works alongside Guardian AI (IAM/zero-trust)
 * and Norman AI (security intelligence) to form the security triad.
 *
 * Architecture: Trancendos Industry 6.0 / 2060 Standard
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
export type FirewallAction = 'allow' | 'deny' | 'rate_limit' | 'challenge' | 'log';

export interface FirewallRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  source?: string;
  destination?: string;
  port?: number;
  protocol?: 'tcp' | 'udp' | 'http' | 'https' | 'any';
  action: FirewallAction;
  enabled: boolean;
  hitCount: number;
  createdAt: Date;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: ThreatLevel;
  status: IncidentStatus;
  source?: string;
  affectedServices: string[];
  timeline: IncidentEvent[];
  assignedTo?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncidentEvent {
  id: string;
  timestamp: Date;
  actor: string;
  action: string;
  details: string;
}

export interface DefenseStats {
  currentThreatLevel: ThreatLevel;
  totalIncidents: number;
  openIncidents: number;
  resolvedIncidents: number;
  firewallRules: number;
  blockedRequests: number;
  allowedRequests: number;
  lastIncident?: Date;
}

export class DefenseEngine {
  private firewallRules: Map<string, FirewallRule> = new Map();
  private incidents: Map<string, SecurityIncident> = new Map();
  private blockedCount = 0;
  private allowedCount = 0;

  constructor() {
    this.seedDefaultFirewallRules();
    logger.info({ rules: this.firewallRules.size }, 'DefenseEngine initialised');
  }

  // Firewall
  addRule(params: Omit<FirewallRule, 'id' | 'hitCount' | 'createdAt'>): FirewallRule {
    const rule: FirewallRule = { ...params, id: uuidv4(), hitCount: 0, createdAt: new Date() };
    this.firewallRules.set(rule.id, rule);
    logger.info({ ruleId: rule.id, name: rule.name, action: rule.action }, 'Firewall rule added');
    return rule;
  }

  evaluateRequest(source: string, destination: string, port?: number): { action: FirewallAction; ruleId?: string; reason: string } {
    const rules = Array.from(this.firewallRules.values()).filter(r => r.enabled).sort((a, b) => a.priority - b.priority);
    for (const rule of rules) {
      const sourceMatch = !rule.source || rule.source === '*' || source.includes(rule.source);
      const destMatch = !rule.destination || rule.destination === '*' || destination.includes(rule.destination);
      const portMatch = !rule.port || rule.port === port;
      if (sourceMatch && destMatch && portMatch) {
        rule.hitCount++;
        if (rule.action === 'deny') this.blockedCount++; else this.allowedCount++;
        return { action: rule.action, ruleId: rule.id, reason: rule.name };
      }
    }
    this.allowedCount++;
    return { action: 'allow', reason: 'Default allow — no matching rule' };
  }

  getRules(enabled?: boolean): FirewallRule[] {
    const all = Array.from(this.firewallRules.values());
    return enabled !== undefined ? all.filter(r => r.enabled === enabled) : all;
  }

  deleteRule(id: string): boolean { return this.firewallRules.delete(id); }
  toggleRule(id: string): boolean {
    const rule = this.firewallRules.get(id);
    if (!rule) return false;
    rule.enabled = !rule.enabled;
    return true;
  }

  // Incidents
  createIncident(params: { title: string; description: string; severity: ThreatLevel; source?: string; affectedServices?: string[] }): SecurityIncident {
    const incident: SecurityIncident = {
      id: uuidv4(), title: params.title, description: params.description, severity: params.severity,
      status: 'open', source: params.source, affectedServices: params.affectedServices || [],
      timeline: [{ id: uuidv4(), timestamp: new Date(), actor: 'system', action: 'created', details: 'Incident created' }],
      createdAt: new Date(), updatedAt: new Date(),
    };
    this.incidents.set(incident.id, incident);
    logger.warn({ incidentId: incident.id, severity: incident.severity, title: incident.title }, 'Security incident created');
    return incident;
  }

  updateIncident(id: string, updates: { status?: IncidentStatus; assignedTo?: string; note?: string; actor?: string }): SecurityIncident | null {
    const incident = this.incidents.get(id);
    if (!incident) return null;
    if (updates.status) { incident.status = updates.status; if (updates.status === 'resolved') incident.resolvedAt = new Date(); }
    if (updates.assignedTo) incident.assignedTo = updates.assignedTo;
    if (updates.note) incident.timeline.push({ id: uuidv4(), timestamp: new Date(), actor: updates.actor || 'system', action: 'updated', details: updates.note });
    incident.updatedAt = new Date();
    return incident;
  }

  getIncidents(status?: IncidentStatus): SecurityIncident[] {
    const all = Array.from(this.incidents.values());
    return (status ? all.filter(i => i.status === status) : all).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getIncident(id: string): SecurityIncident | undefined { return this.incidents.get(id); }

  getCurrentThreatLevel(): ThreatLevel {
    const openIncidents = this.getIncidents('open').concat(this.getIncidents('investigating'));
    if (openIncidents.some(i => i.severity === 'critical')) return 'critical';
    if (openIncidents.some(i => i.severity === 'high')) return 'high';
    if (openIncidents.some(i => i.severity === 'medium')) return 'medium';
    if (openIncidents.some(i => i.severity === 'low')) return 'low';
    return 'none';
  }

  getStats(): DefenseStats {
    const incidents = Array.from(this.incidents.values());
    const lastIncident = incidents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return {
      currentThreatLevel: this.getCurrentThreatLevel(),
      totalIncidents: incidents.length, openIncidents: incidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
      resolvedIncidents: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
      firewallRules: this.firewallRules.size, blockedRequests: this.blockedCount, allowedRequests: this.allowedCount,
      lastIncident: lastIncident?.createdAt,
    };
  }

  private seedDefaultFirewallRules(): void {
    const defaults: Omit<FirewallRule, 'id' | 'hitCount' | 'createdAt'>[] = [
      { name: 'Block external access to internal ports', description: 'Deny external traffic to agent ports', priority: 1, source: 'external', destination: 'internal', action: 'deny', enabled: true },
      { name: 'Allow internal agent communication', description: 'Allow all internal agent-to-agent traffic', priority: 10, source: 'internal', destination: 'internal', action: 'allow', enabled: true },
      { name: 'Rate limit API endpoints', description: 'Rate limit public API access', priority: 5, destination: '/api/', action: 'rate_limit', enabled: true },
      { name: 'Allow health checks', description: 'Allow health check endpoints', priority: 2, destination: '/health', action: 'allow', enabled: true },
      { name: 'Log all denied requests', description: 'Log denied requests for audit', priority: 100, action: 'log', enabled: true },
    ];
    for (const d of defaults) this.addRule(d);
  }
}

export const defenseEngine = new DefenseEngine();