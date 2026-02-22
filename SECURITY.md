# Security Policy

## Supported Versions

The project targets an N/N-1 runtime policy for Node.js and dependency majors:

- **Node.js**: latest supported major and previous major (currently Node 22 and 20)
- **Dependencies**: latest major (**N**) or previous major (**N-1**)

## Reporting a Vulnerability

If you discover a vulnerability:

1. **Do not open a public issue with exploit details.**
2. Open a private security report through GitHub Security Advisories (preferred), or contact the maintainers directly.
3. Include:
   - impact summary
   - affected versions/paths
   - proof of concept (if safe)
   - proposed mitigation (if known)

## Response Targets

- Initial triage: **within 1 business day**
- Severity assessment: **within 2 business days**
- Patch plan: **within 5 business days**
- Critical vulnerability fix target: **within 24-72 hours**

## Automated Controls

This repository includes:

- Dependabot updates (`.github/dependabot.yml`)
- PR dependency risk review (`dependency-review-action`)
- scheduled CVE checks (`pnpm audit`, Trivy, CodeQL)
- secret scanning (`gitleaks`)
- scheduled SBOM generation (CycloneDX)

## Hardening Expectations

- Branch protection on `main` with required status checks
- signed commits/tags for release branches
- least-privilege token permissions in workflows
