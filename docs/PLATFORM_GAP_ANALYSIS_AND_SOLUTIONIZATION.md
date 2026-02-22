# Platform Gap Analysis and Solutionization

_Generated: 2026-02-22_

## 1) Current Platform Snapshot

Based on first-party repos (`Trancendos`, non-forks):

- source repos audited: **43**
- missing workflows: **40**
- missing Dependabot: **40**
- missing SECURITY.md: **40**
- missing CODEOWNERS: **42**
- missing lockfiles: **41**
- missing tests: **40**
- missing branch protection detected: **43**

This indicates systemic governance and deployment-readiness gaps despite broad repository modularization.

## 2) Platform Grouping and What Is Missing

### A) Core / Platform Control Plane

- `trancendos-ecosystem`, `central-plexus`, `shared-core`, `infrastructure`, `secrets-portal`

Missing or weak areas:

- uniform branch protection and required checks
- cross-repo dependency contracts
- centralized integration test matrix
- org-level control/evidence reporting

### B) Security/Resilience Boundary Repos

- `the-citadel`, `the-cryptex`, `the-void`, `guardian-ai`, `sentinel-ai`, `prometheus-ai`

Missing or weak areas:

- threat-model documents
- incident runbooks
- consistent CVE/SCA/secret scanning baseline
- immutable release and provenance controls

### C) Domain/Agent Surface (mostly template footprint)

- many `the-*` and `*-ai` repos with ~4 files each

Missing or weak areas:

- independent deployment/use-case justification
- meaningful runtime logic and tests
- ownership and integration contracts
- practical observability and service-level telemetry

## 3) Obvious Bugs / Issues Identified and Addressed Here

In this repo (`the-citadel`) the following issues were fixed in this iteration:

1. **Service state bug**: `getStatus()` previously always returned `active`, even after stop.
2. **Standalone installability risk**: unresolved workspace dependency in standalone repo.
3. **Lack of validation orchestration**: no production-readiness/compliance validator scripts.
4. **Insufficient automation observability**: scripts lacked structured logging and report artifacts.

## 4) Solutionization Strategy

### Track 1: Security Baseline Factory (fast rollout)

Create and apply a reusable baseline across all source repos:

- `security-and-cve.yml`
- `runtime-compliance.yml`
- `sbom.yml`
- `production-readiness.yml`
- `dependabot.yml`
- `SECURITY.md`
- `CODEOWNERS`

### Track 2: Repo Rationalization

- keep separate only if repo has:
  - unique security boundary
  - independent deployment cadence/SLO
  - meaningful testable implementation
- merge template-level repos into monorepo packages/modules until maturity thresholds are met

### Track 3: Compliance Evidence Pipeline

- scheduled org gap analysis report generation
- recurring production-readiness reports
- recurring regulatory-alignment control checks
- archived artifacts retained for audit evidence

### Track 4: Production Reliability Readiness

- mandate typecheck/test/build/security gates
- add structured service logging standard
- define error budgets and rollback criteria per critical service

## 5) Fast-Track Implementation Plan (ASAP Production State)

### 0-72 hours

- apply baseline controls to P0 repos:
  - `trancendos-ecosystem`
  - `secrets-portal`
  - `shared-core`
  - `infrastructure`
  - `central-plexus`
- enable branch protections + required checks

### Week 1

- apply baseline controls to security-boundary repos (P1)
- fix unresolved dependency/workspace references in standalone repos
- enforce lockfiles and runtime policy (`engines`)

### Week 2

- consolidate template-level repos into monorepo modules
- define explicit integration contracts and ownership matrix

### Week 3

- complete cross-repo integration tests
- run incident simulation for critical services
- publish production readiness dashboard

## 6) Definition of Done (Org Level)

- 100% source repos have baseline controls
- 100% source repos have lockfiles and runtime policy
- branch protection enabled on all critical repos
- critical repos meet N/N-1 dependency policy
- merged template repos reduced by agreed target
