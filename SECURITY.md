# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Aegis OmniGuard, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email: **security@aegis-guard.dev** (replace with your actual email)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

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
