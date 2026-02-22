# Org Security, Dependency, and Modularity Action Plan

_Generated: 2026-02-22_

## 1) Scope and Audit Method

This review used GitHub metadata and repository content checks for **Trancendos**:

- total repos discovered: **95**
- first-party/source repos (non-forks): **43**
- fork repos: **52**

Checks performed across first-party repos:

- baseline controls: workflows, Dependabot, SECURITY.md, CODEOWNERS
- structural signal: file counts, test presence
- dependency signal: workspace references, Node engine policy presence

## 2) Current State (Findings)

### Baseline security controls (43 source repos)

- missing workflows: **41/43**
- missing Dependabot config: **41/43**
- missing SECURITY.md: **41/43**
- missing CODEOWNERS: **43/43**

### Structural/modularity signal

- median file count per source repo: **4**
- repos with only template-level footprint (about 4 files): **37/43**
- repos with tests detected: **3/43**
- only materially developed repos:
  - `trancendos-ecosystem` (1414 files)
  - `secrets-portal` (72 files)

### Dependency management signal

- repos using `workspace:*` references in standalone repos: **40/43**
- repos missing explicit Node engine policy: **43/43**

This indicates broad template duplication and a large gap between intended modular architecture and implemented, independently operable repositories.

## 3) What Was Implemented in This Repo (`the-citadel`)

Completed as a hardened baseline/template:

1. **CVE + security automation**
   - `.github/workflows/security-and-cve.yml`
   - includes: dependency review, `pnpm audit`, dependency N/N-1 policy check, Trivy scan, CodeQL, gitleaks
2. **Runtime compliance automation**
   - `.github/workflows/runtime-compliance.yml`
   - Node matrix: 20 and 22 (N/N-1 policy target)
3. **SBOM generation**
   - `.github/workflows/sbom.yml`
4. **Dependency update automation**
   - `.github/dependabot.yml`
5. **Governance/security metadata**
   - `SECURITY.md`
   - `.github/CODEOWNERS`
6. **Dependency and installability fixes**
   - removed unresolved `workspace:*` dependency in this repo
   - upgraded toolchain deps to current versions
   - added lockfile and `.gitignore`
7. **Policy enforcement tooling**
   - `scripts/check-dependency-policy.mjs`
   - enforces dependency major lag not older than N-1
8. **Quality baseline**
   - added `src/index.test.ts`
   - added local scripts for typecheck/security checks in `package.json`

## 4) Required Standards Per Repo (Target State)

Every first-party repo should include:

- `.github/workflows/security-and-cve.yml` (or shared equivalent)
- `.github/workflows/runtime-compliance.yml` (language/runtime equivalent)
- `.github/workflows/sbom.yml`
- `.github/dependabot.yml`
- `SECURITY.md`
- `.github/CODEOWNERS`
- explicit runtime support policy (`engines` for Node repos)
- lockfile committed
- no unresolved `workspace:*` unless inside a true monorepo workspace root

## 5) Repo-by-Repo Prioritization and Requirements

### Priority P0 (harden immediately, critical platform surface)

- `trancendos-ecosystem`
- `secrets-portal`
- `shared-core`
- `infrastructure`
- `central-plexus`

Requirements:

- full baseline controls
- branch protection + required checks
- integration tests and release/versioning policy
- published dependency contracts (API/schema/version compatibility)

### Priority P1 (security/domain-sensitive services)

- `the-cryptex`, `the-citadel`, `the-void`, `the-foundation`
- `guardian-ai`, `sentinel-ai`, `oracle-ai`, `prometheus-ai`

Requirements:

- same as P0, plus stricter alert SLA and threat-model documentation

### Priority P2 (template-level repos, low implementation maturity)

Most remaining repos with ~4 files (examples):

- `the-agora`, `the-hive`, `the-library`, `the-lighthouse`, `the-nexus`
- `atlas-ai`, `chronos-ai`, `cornelius-ai`, `echo-ai`, `iris-ai`, `arcadia`
- `nexus-ai`, `mercury-ai`, `lunascene-ai`, `serenity-ai`, `queen-ai`, etc.

Requirements:

- either:
  1. merge into monorepo packages until they have independent logic/deployment, or
  2. keep separate but adopt full baseline and clear ownership + integration contracts

## 6) Merge vs Separate Recommendations

### Keep separate (recommended)

Keep as dedicated repos when one or more apply:

- distinct security boundary / secrets / compliance scope
- independent deployment cadence and SLOs
- unique runtime stack or infrastructure
- >= meaningful codebase size with active tests

Likely separate candidates:

- `secrets-portal`, `infrastructure`, `the-cryptex`, `the-citadel`, `central-plexus`, `shared-core`

### Merge (recommended now)

For template-like repos with minimal unique code and no independent release surface, merge into a single monorepo area:

- move to `trancendos-ecosystem/apps/*` or `packages/*`
- keep logical module boundaries in code/package namespaces
- split back out only after maturity thresholds are met (tests, ownership, deployment, API contract)

This reduces duplicated security/governance overhead and improves consistency.

## 7) Completion Check Against Action Plan (Current Snapshot)

- P0 baseline completion: **0/5** (before this repo rollout baseline)
- org baseline completion overall: **~2/43** had workflows/dependabot/security before this effort
- after this change set: `the-citadel` now has full baseline controls
- remaining first-party repos to roll out baseline: **42**

## 8) Grand Timeline

### Week 1: Governance freeze + ownership

- classify all 43 source repos as keep/merge/archive
- assign owners (CODEOWNERS + team mapping)
- define branch protection template

### Week 2: Security baseline rollout (P0 first)

- apply hardened template from `the-citadel` to P0 repos
- enable Dependabot + scheduled scans + SBOM

### Week 3: Security baseline rollout (P1/P2)

- complete remaining repos
- remove invalid standalone `workspace:*` dependencies
- enforce lockfile + engine policy

### Week 4: N/N-1 compliance wave

- run dependency policy checks across all repos
- upgrade N-2 or older dependencies
- publish compliance dashboard

### Week 5-6: Modularity cleanup

- merge template repos into monorepo modules where appropriate
- keep separate only where security/deployment boundaries justify it
- create explicit integration contracts between retained repos

### Week 7: Validation and hardening closeout

- cross-repo integration tests
- incident response tabletop for critical repos
- finalize risk register and quarterly review cadence

## 9) Success Metrics

- 100% source repos with baseline controls
- 100% source repos with explicit runtime and dependency policy
- 0 repos blocked by unresolved standalone `workspace:*` dependencies
- 100% P0/P1 repos with tests and required security gates on main branch
- reduction in duplicate template repos via planned consolidation
