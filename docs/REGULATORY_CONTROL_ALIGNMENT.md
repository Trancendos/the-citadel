# Regulatory Control Alignment (Technical)

_Generated: 2026-02-22_

> This document is a technical control baseline and is **not legal advice**. Validate regulatory obligations with legal/compliance counsel.

## Objective

Map engineering controls to common regulatory/compliance expectations so we can stay proactive and audit-ready.

## Control Matrix

| Control Area | Example Technical Control | Evidence Artifact |
|---|---|---|
| Vulnerability Management | Dependabot + `pnpm audit` + Trivy | workflow logs, PRs, reports |
| Secure SDLC | CodeQL + required review ownership | SARIF uploads, CODEOWNERS |
| Secrets Management | gitleaks and secret scanning policy | scan outputs, remediation tickets |
| Software Supply Chain | SBOM generation (CycloneDX) | `sbom.cdx.json` artifacts |
| Dependency Freshness | N/N-1 policy checks | dependency-policy reports |
| Security Governance | `SECURITY.md`, response SLAs | policy doc + issue timeline |
| Change Control | Branch protection + required checks | branch settings + checks |
| Operational Readiness | production-readiness validation suite | readiness report artifacts |

## Regulatory-Adjacent Coverage (High Level)

- **EU CRA-aligned practice**: vulnerability management, SBOM, coordinated disclosure.
- **NIS2-aligned practice**: risk management controls, incident readiness, software integrity.
- **SOC 2 aligned practice**: change management, security monitoring, ownership and access controls.

## Remaining Manual/Org Controls (Not solved by repo config alone)

- legal/regulatory scope determination by jurisdiction and product
- incident communication procedures with external parties
- formal asset inventory and data classification
- disaster recovery exercises and documented RTO/RPO
- access recertification and privileged account governance

## Enforcement Approach

1. CI runs:
   - `pnpm security:check`
   - `pnpm compliance:check`
   - `pnpm validate:prod`
2. Weekly org scan:
   - `node scripts/analyze-org-platform-gaps.mjs Trancendos`
3. Required remediation SLA:
   - Critical: 24-72 hours
   - High: within 7 days
   - Medium: within 30 days
