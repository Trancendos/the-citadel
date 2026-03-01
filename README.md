# the-citadel

Defense and protection

## Part of Luminous-MastermindAI Ecosystem

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Security and Dependency Operations

```bash
# Run CVE audit from lockfile
pnpm audit:deps

# Enforce N/N-1 dependency major policy
pnpm deps:policy

# Run complete local security checks
pnpm security:check

# Run production-readiness validation
pnpm validate:prod

# Run compliance-alignment checks (technical controls)
pnpm compliance:check

# Run full quality gate
pnpm quality:gate

# Audit baseline controls across all source repos in an org
./scripts/audit-org-baseline.sh Trancendos

# Analyze platform-wide repository gaps and recommendations
pnpm analyze:org
```

Automated controls are configured in:

- `.github/workflows/security-and-cve.yml`
- `.github/workflows/runtime-compliance.yml`
- `.github/workflows/sbom.yml`
- `.github/workflows/production-readiness.yml`
- `.github/workflows/org-gap-analysis.yml`
- `.github/dependabot.yml`
- `docs/ORG_REPO_SECURITY_MODULARITY_ACTION_PLAN.md`
- `docs/PLATFORM_GAP_ANALYSIS_AND_SOLUTIONIZATION.md`
- `docs/REGULATORY_CONTROL_ALIGNMENT.md`

> Compliance checks in this repo are technical-control checks and are not legal advice.

## License

MIT © Trancendos
