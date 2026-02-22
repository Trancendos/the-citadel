#!/usr/bin/env bash
set -euo pipefail

ORG="${1:-Trancendos}"
LIMIT="${2:-200}"
OUT_DIR="${3:-reports}"
DATE_TAG="$(date +%F)"
OUT_FILE="${OUT_DIR}/org-baseline-${ORG}-${DATE_TAG}.json"

mkdir -p "${OUT_DIR}"

repos="$(gh repo list "${ORG}" --limit "${LIMIT}" --json name,isFork --jq '.[] | select(.isFork==false) | .name')"

printf '[' > "${OUT_FILE}"
first=1
for repo in ${repos}; do
  if gh api "repos/${ORG}/${repo}/contents/.github/workflows" >/dev/null 2>&1; then has_workflows=true; else has_workflows=false; fi
  if gh api "repos/${ORG}/${repo}/contents/.github/dependabot.yml" >/dev/null 2>&1; then has_dependabot=true; else has_dependabot=false; fi
  if gh api "repos/${ORG}/${repo}/contents/SECURITY.md" >/dev/null 2>&1; then has_security_md=true; else has_security_md=false; fi
  if gh api "repos/${ORG}/${repo}/contents/.github/CODEOWNERS" >/dev/null 2>&1; then has_codeowners=true; else has_codeowners=false; fi

  item="$(jq -nc \
    --arg repo "${repo}" \
    --argjson wf "${has_workflows}" \
    --argjson dep "${has_dependabot}" \
    --argjson sec "${has_security_md}" \
    --argjson own "${has_codeowners}" \
    '{repo:$repo,has_workflows:$wf,has_dependabot:$dep,has_security_md:$sec,has_codeowners:$own}')"

  if [[ ${first} -eq 1 ]]; then first=0; else printf ',' >> "${OUT_FILE}"; fi
  printf '%s' "${item}" >> "${OUT_FILE}"
done
printf ']\n' >> "${OUT_FILE}"

echo "Wrote ${OUT_FILE}"
jq '{total:length, missing_workflows:([.[]|select(.has_workflows==false)]|length), missing_dependabot:([.[]|select(.has_dependabot==false)]|length), missing_security_md:([.[]|select(.has_security_md==false)]|length), missing_codeowners:([.[]|select(.has_codeowners==false)]|length)}' "${OUT_FILE}"
