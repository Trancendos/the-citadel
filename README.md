# The Citadel 🏰

Active defense layer for the Trancendos mesh. Manages firewall rules, security incidents, and real-time threat level monitoring. Works alongside **Guardian AI** (IAM/zero-trust) and **Norman AI** (security intelligence) to form the **security triad**.

## Architecture

```
the-citadel/
├── src/
│   ├── defense/
│   │   └── defense-engine.ts    # Core defense logic
│   ├── api/
│   │   └── server.ts            # REST API (22 endpoints)
│   ├── utils/
│   │   └── logger.ts            # Pino structured logging
│   └── index.ts                 # Bootstrap & lifecycle
├── package.json
├── tsconfig.json
└── README.md
```

## Security Triad

| Service | Role |
|---------|------|
| **Guardian AI** | IAM, zero-trust token issuance, behavioral baselines |
| **Norman AI** | Threat intelligence, CVE scanning, security analysis |
| **The Citadel** | Active defense, firewall enforcement, incident response |

## Threat Levels

| Level | Description | Trigger |
|-------|-------------|---------|
| `none` | All clear | No open incidents |
| `low` | Minor issues | 1–2 low-severity open incidents |
| `medium` | Elevated risk | Medium-severity incidents or 3+ low |
| `high` | Active threat | High-severity incident open |
| `critical` | Emergency | Critical incident open or 5+ high |

## Firewall Rule Actions

| Action | Description |
|--------|-------------|
| `allow` | Permit the request |
| `deny` | Block the request |
| `rate_limit` | Apply rate limiting |
| `challenge` | Require additional verification |
| `log` | Log and allow |

## Default Firewall Rules (Priority-Ordered)

| Priority | Name | Action | Description |
|----------|------|--------|-------------|
| 100 | Block External→Internal | `deny` | Block all external→internal traffic |
| 200 | Allow Internal→Internal | `allow` | Permit mesh-internal communication |
| 300 | Rate Limit API | `rate_limit` | Rate limit API gateway traffic |
| 400 | Allow Health Checks | `allow` | Permit health check endpoints |
| 500 | Log Denied | `log` | Log all otherwise-denied requests |

## API Reference

### Health & Metrics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health + current threat level |
| GET | `/metrics` | Uptime, memory, defense stats |

### Firewall Rules
| Method | Path | Description |
|--------|------|-------------|
| GET | `/firewall/rules` | List all firewall rules |
| POST | `/firewall/rules` | Add a new rule |
| GET | `/firewall/rules/:id` | Get a specific rule |
| DELETE | `/firewall/rules/:id` | Delete a rule |
| PATCH | `/firewall/rules/:id/toggle` | Enable/disable a rule |
| POST | `/firewall/evaluate` | Evaluate a request against rules |

### Incidents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/incidents` | List incidents (filterable by status/severity) |
| POST | `/incidents` | Create a new security incident |
| GET | `/incidents/:id` | Get a specific incident |
| PATCH | `/incidents/:id` | Update incident status/notes |
| POST | `/incidents/:id/resolve` | Resolve an incident |
| POST | `/incidents/:id/close` | Close an incident |

### Threat & Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | `/threat-level` | Current threat level + open incident counts |
| GET | `/stats` | Full defense statistics |

## Incident Lifecycle

```
open → investigating → contained → resolved → closed
```

Each transition is recorded in the incident timeline with timestamp and notes.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3016` | HTTP server port |
| `LOG_LEVEL` | `info` | Pino log level |
| `NODE_ENV` | `development` | Runtime environment |

## Development

```bash
npm install
npm run dev      # tsx watch mode
npm run build    # TypeScript compile
npm start        # Run compiled output
```

## Integration

The Citadel integrates with:
- **Guardian AI** (port 3004) — token validation for API requests
- **Norman AI** (port 3002) — receives threat intelligence feeds
- **The Observatory** (port 3012) — exports defense metrics
- **The Nexus** (port 3014) — publishes incident events to the mesh

---

*Trancendos Industry 6.0 / 2060 Standard — Zero-Cost Architecture*