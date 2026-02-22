#!/usr/bin/env bash

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  local level="$1"
  shift
  local msg="$*"
  printf '%s [%s] %s\n' "$(timestamp_utc)" "${level}" "${msg}"
}

log_info() {
  log "INFO" "$@"
}

log_warn() {
  log "WARN" "$@"
}

log_error() {
  log "ERROR" "$@"
}
