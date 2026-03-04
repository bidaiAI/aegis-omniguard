# Contributing openclaw-audit to the OpenClaw Ecosystem

## Strategy

The openclaw-audit tool can be contributed to the OpenClaw ecosystem in two ways:

### Option A: Publish as Independent Repo + ClawHub Skill (Recommended)

1. **Create standalone repo**: `github.com/bidaiAI/openclaw-audit`
2. **Register on ClawHub**: Submit as a security skill
3. **Open Issue on openclaw/openclaw**: Suggest adding to recommended security tools list
4. **Cross-reference**: Link from Aegis OmniGuard README

### Option B: PR to openclaw/openclaw Security Docs

1. Fork `openclaw/openclaw`
2. Add openclaw-audit reference to security documentation
3. Submit PR with description of what it detects (malicious skills, CVE checks, config audit)

## Differentiation from Existing Tools

| Tool | Focus | Our Advantage |
|------|-------|---------------|
| SecureClaw (Adversa AI) | 56 audit checks, OWASP-aligned | We focus on **skill malware detection** with 10 regex patterns |
| ClawSec (Prompt Security) | SOUL.md drift, skill integrity | We do **deep code scanning** of skill source files |
| ClawBands | Runtime middleware, human-in-loop | We are **pre-install scanner**, catch before execution |

Our unique angle: **Pre-installation skill vetting** — scan skills BEFORE they run, not during.

## PR Template for openclaw/openclaw

Title: `docs: add openclaw-audit to recommended security tools`

Body:
```
## Summary
Adding openclaw-audit to the recommended security tools list.

openclaw-audit is a zero-dependency Node.js tool that scans OpenClaw installations
for malicious skill code, insecure configurations, and known CVEs.

## What it detects
- 10 malicious code patterns in skills (HTTP exfil, base64 obfuscation, eval, etc.)
- Exposed server configurations (0.0.0.0 binding, disabled auth)
- CVE-2026-25253 vulnerable WebSocket patterns
- Plaintext credentials in config files
- Node.js version below security minimum (22.12.0)

## Links
- Repo: https://github.com/bidaiAI/aegis-omniguard/tree/main/skills/openclaw-audit
- Part of Aegis OmniGuard: https://aegis-web4.com

## Testing
node skills/openclaw-audit/index.js ~/.openclaw
```
