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

# Audit baseline controls across all source repos in an org
./scripts/audit-org-baseline.sh Trancendos
```

Automated controls are configured in:

- `.github/workflows/security-and-cve.yml`
- `.github/workflows/runtime-compliance.yml`
- `.github/workflows/sbom.yml`
- `.github/dependabot.yml`
- `docs/ORG_REPO_SECURITY_MODULARITY_ACTION_PLAN.md`

## License

MIT © Trancendos
