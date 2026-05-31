# Security Policy

## Project security posture

Aegis OmniGuard is designed as a local-first browser security tool:

- core DLP scanning runs locally in the browser;
- raw secrets must not be sent to project servers;
- telemetry, analytics, and tracking are not part of the project;
- optional AI/BYOK analysis must remain opt-in and documented.

## Reporting a Vulnerability

If you discover a security vulnerability in Aegis OmniGuard, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

Preferred reporting path:

1. Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available.
2. If private reporting is unavailable, contact the maintainer through the public maintainer profile and share only a minimal, non-exploitable summary until a private channel is established.

Please include:

- affected version or commit;
- browser and extension version;
- reproduction steps;
- expected vs actual behavior;
- impact assessment;
- whether any real user data or secrets were exposed.

We aim to acknowledge valid reports within 72 hours and provide a remediation plan or status update within 7 days.

## Scope

The following are in scope:
- Chrome extension code (content scripts, background worker, popup)
- DLP engine detection logic
- API key storage and encryption
- Message passing between extension components

## Our Commitments

- We will never collect, store, or transmit user data
- All DLP scanning happens locally in your browser
- API keys are encrypted with AES-GCM and stored in extension-isolated storage
- Content scripts never have access to stored API keys
- We will avoid public discussion of exploitable details until a fix or mitigation is available
