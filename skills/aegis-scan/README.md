# Aegis Scan — Project Secret Scanner

Scan any code project for hardcoded secrets, API keys, crypto private keys, and sensitive data patterns. Zero dependencies, runs anywhere Node.js 18+ is available.

Built by [Aegis OmniGuard](https://aegis-web4.com) — the AI-era data sovereignty guardian.

## Install & Usage

### As Claude Code Skill
```bash
# Clone the repo
git clone https://github.com/bidaiAI/aegis-omniguard.git

# Run directly
node aegis-omniguard/skills/aegis-scan/index.js /path/to/your/project
```

### Standalone CLI
```bash
# Scan current directory
node index.js

# Scan specific project
node index.js /home/user/my-dapp

# CI/CD integration (exit code: 0=clean, 1=warnings, 2=critical)
node index.js ./src && echo "Clean!" || echo "Secrets found!"
```

### Programmatic
```js
import { runScan } from './index.js';
const { findings, exitCode } = await runScan('/path/to/project');
```

## What It Detects

### CRITICAL
- **OpenAI API Keys** — `sk-proj-...`, `sk-...`
- **Anthropic API Keys** — `sk-ant-...`
- **AWS Access Keys** — `AKIA...`
- **GitHub Tokens** — `ghp_...`, `gho_...`, `github_pat_...`
- **Google API Keys** — `AIza...`
- **Stripe Secret Keys** — `sk_live_...`, `sk_test_...`
- **Ethereum Private Keys** — `0x` + 64 hex chars (context-validated)
- **BIP-39 Seed Phrases** — 12+ consecutive mnemonic words
- **Database URLs** — PostgreSQL, MySQL, MongoDB, Redis with credentials

### WARNING
- **JWT Tokens** — `eyJ...` patterns
- **Env Secret Assignments** — `SECRET=value`, `TOKEN=value`, etc.
- **High-Entropy Strings** — assigned to secret/token/password variables

## Example Output

```
  AEGIS SCAN — Project Secret Scanner
══════════════════════════════════════════════

  Target:  /home/user/my-dapp
  Files:   142 scanned
  Time:    89ms

 CRITICAL   OpenAI API Key
            ./src/config.ts:12
            Matched: sk-pro***_8xf2

 CRITICAL   BIP-39 Seed Phrase
            ./scripts/deploy.js:45
            Matched: "abandon ability ... book brave" (12 words)

 WARNING    Env Secret Assignment
            ./.env.example:3
            Matched: SECRET***prod

  Summary by type:
    1x OpenAI API Key
    1x BIP-39 Seed Phrase
    1x Env Secret Assignment

──────────────────────────────────────────────────
  Real-time browser protection:
  Install Aegis OmniGuard — https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg
──────────────────────────────────────────────────
```

## Smart Defaults

- Skips `node_modules`, `.git`, `dist`, `build`, `vendor`, `__pycache__`
- Skips binary files (images, fonts, archives)
- Skips files > 1MB
- Skips lock files (`package-lock.json`, `yarn.lock`)
- Masks matched values in output (never prints full secrets)
- Respects `NO_COLOR` environment variable

## Links

- **Chrome Extension**: [Aegis OmniGuard on Chrome Web Store](https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg)
- **Website**: [aegis-web4.com](https://aegis-web4.com)
- **GitHub**: [github.com/bidaiAI/aegis-omniguard](https://github.com/bidaiAI/aegis-omniguard)
- **Twitter**: [@bidaoofficial](https://x.com/bidaoofficial)

## License

MIT
