## Wave 3 — The Citadel: Defense Engine Platform Module

Implements The Citadel as a standalone service — active defense layer with firewall rule enforcement, security incident management, and real-time threat level monitoring. Forms the third pillar of the Trancendos security triad alongside Guardian AI and Norman AI.

### What's Included

**DefenseEngine** (`src/defense/defense-engine.ts`)
- Priority-ordered firewall rule evaluation
- FirewallActions: allow, deny, rate_limit, challenge, log
- SecurityIncident lifecycle with timeline events
- `getCurrentThreatLevel()` — dynamic threat assessment based on open incidents
- ThreatLevels: none, low, medium, high, critical
- `getStats()` — DefenseStats with blocked/allowed request counts

**5 Default Firewall Rules (Priority-Ordered)**
| Priority | Rule | Action |
|----------|------|--------|
| 100 | Block External to Internal | deny |
| 200 | Allow Internal to Internal | allow |
| 300 | Rate Limit API Gateway | rate_limit |
| 400 | Allow Health Checks | allow |
| 500 | Log Denied Requests | log |

**Incident Lifecycle**
```
open -> investigating -> contained -> resolved -> closed
```
Each transition recorded in incident timeline with timestamp and notes.

**REST API** (`src/api/server.ts`) — 16 endpoints
- Firewall: rules CRUD, toggle, evaluate request
- Incidents: CRUD, resolve, close
- Threat: current threat level
- Stats, health, metrics

**Bootstrap** (`src/index.ts`)
- Port 3016
- Periodic threat assessment every 60s
- Pino structured logging
- Graceful shutdown (SIGTERM/SIGINT)

### Security Triad
| Service | Role |
|---------|------|
| Guardian AI (3004) | IAM, zero-trust token issuance |
| Norman AI (3002) | Threat intelligence, CVE scanning |
| The Citadel (3016) | Active defense, firewall, incident response |

### Architecture
- Zero-cost mandate compliant
- Strict TypeScript ES2022
- Express + Helmet + CORS + Morgan
- Pino structured logging

### Part of Wave 3 — Platform Modules
Trancendos Industry 6.0 / 2060 Standard