# openclaw-audit

A security audit skill for [OpenClaw](https://github.com/openclaw) AI agent framework installations. It scans your local OpenClaw directory for malicious Skills, insecure configurations, known CVEs (including CVE-2026-25253 WebSocket RCE), and dangerous code patterns that have been found in the 800+ malicious packages reported on ClawHub. Zero dependencies -- runs with pure Node.js on any platform.

## Installation

### As a Claude Code Skill

Add this to your project's `.claude/commands/` directory or reference it directly:

```bash
# Clone or copy the skill directory into your project
cp -r skills/openclaw-audit .claude/commands/openclaw-audit
```

Or invoke it directly with Node.js:

```bash
node skills/openclaw-audit/index.js
```

### As a standalone tool

```bash
# Run against the default ~/.openclaw/ directory
node index.js

# Run against a specific OpenClaw installation
node index.js /path/to/openclaw
```

## Usage Examples

**Scan the default OpenClaw installation:**

```bash
node index.js
```

**Scan a specific directory:**

```bash
node index.js /home/user/projects/my-agent/.openclaw
```

**Use as a module in your own code:**

```js
import { runAudit } from "./index.js";

const { overallSeverity, findings } = await runAudit("/path/to/openclaw");

if (overallSeverity === "CRITICAL") {
  console.error("Critical issues found!");
  process.exit(2);
}
```

**Exit codes for CI integration:**

| Code | Meaning |
|------|---------|
| 0 | SAFE -- no issues detected |
| 1 | WARNING -- non-critical issues found |
| 2 | CRITICAL -- critical security issues found |

## What It Detects

### Malicious Skill Patterns

- **Suspicious outbound HTTP requests** -- `fetch()`, `axios`, `http.get()` calls to known exfiltration endpoints (pastebin, ngrok, requestbin, webhook.site, etc.)
- **Base64-encoded strings** -- Long encoded strings used to obfuscate malicious payloads
- **Sensitive file access** -- `fs.readFile()` targeting `.env`, `.ssh/id_rsa`, `.aws/credentials`, and other sensitive paths
- **Secret environment variable access** -- `process.env.SECRET_KEY`, `process.env.AWS_*`, API tokens, and other credentials
- **Crypto wallet private keys** -- Hex-encoded private keys (`0x` + 64 hex chars) and BIP-39 seed phrases
- **External WebSocket connections** -- `new WebSocket()` to non-localhost hosts (C2 channels)
- **Dangerous code execution** -- `eval()`, `Function()`, `child_process.exec()`, `child_process.spawn()`
- **DNS exfiltration patterns** -- `dns.resolve()`, `dgram.createSocket()`, data concatenated into hostnames

### Configuration Issues

- **Exposed server binding** -- WebSocket/HTTP server bound to `0.0.0.0` (all network interfaces)
- **Authentication disabled** -- Config settings like `auth: false`, `require_auth: false`, `anonymous: true`
- **Plaintext credentials** -- API keys, tokens, or passwords stored directly in config files
- **TLS/SSL disabled** -- Unencrypted traffic in production configurations

### Known Vulnerabilities

- **CVE-2026-25253** -- WebSocket RCE via unsanitized message deserialization. Checks both the vulnerable code pattern and the installed `openclaw-core` package version (< 4.2.1)
- **Node.js version** -- Verifies Node.js >= 22.12.0 which includes patches for OpenClaw-related security issues

### Report Output

The audit produces a color-coded terminal report with:

- Overall severity rating (SAFE / WARNING / CRITICAL)
- Summary counts of each finding category
- Detailed findings with file paths and line numbers
- Scan metadata (duration, files scanned, Skills scanned)

## Related

- [Aegis OmniGuard](https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg) -- Real-time browser protection against prompt injection, malicious extensions, and AI agent threats
- [OpenClaw Security Advisory](https://github.com/openclaw/openclaw-core/security) -- Official security advisories

## License

MIT
