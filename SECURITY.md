# Security Policy

## Supported Versions

We release security updates only for the latest major version. Please always use the latest release.

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |
| Older   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately.

- **Contact:** Teguh Badrusalam (teguh.badrusalam@gmail.com)
- **Do not** create a public GitHub issue for security problems.
- Include: affected component, reproduction steps, impact assessment, and any suggested fix.

## Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgement | Within 48 hours |
| Initial triage | Within 5 business days |
| Critical fix | Within 14 days |
| High fix | Within 30 days |
| Medium / Low fix | Best effort, next release cycle |

We will coordinate disclosure timing with the reporter once a fix is available.

## Severity Classification

| Severity | Examples |
|----------|----------|
| **Critical** | Unauthenticated remote code execution, full database exposure, MQTT broker open to internet with no auth |
| **High** | Authentication bypass on API/WebSocket, privilege escalation, sensitive data leak (GPS, camera frames) |
| **Medium** | Missing rate limiting abuse, CSRF on state-changing endpoints, insecure default configs in production |
| **Low** | Verbose error messages, missing security headers, documentation gaps |

## Scope

### In Scope

- NestJS backend (`backend/`) — REST API, WebSocket gateways, MQTT consumers
- Next.js frontend (`frontend/`) — dashboard and client-side data handling
- Docker infrastructure (`docker-compose.yml`, `mosquitto/`)
- GPS simulator and nuScenes replayer publish paths

### Out of Scope

- nuScenes dataset content (third-party data)
- Upstream vulnerabilities in dependencies (report via npm/GitHub advisories; we will upgrade promptly)
- Deployments outside the documented local/dev setup unless explicitly configured for production

## Current Security Posture

This project is configured for **local development and demos**. Production hardening (MQTT TLS/ACL, API & WebSocket auth, Redis auth, secrets management) is tracked as backlog work. See [ARCHITECTURE.md](ARCHITECTURE.md#security-considerations).

**Do not expose the default stack to the public internet without applying production security controls.**

Thank you for helping keep this project and its users safe!
