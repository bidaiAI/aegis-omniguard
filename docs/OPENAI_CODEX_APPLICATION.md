# OpenAI Codex for Open Source Application Draft

This file keeps the application material reviewable in the repository before submission.

## Repository URL

<https://github.com/bidaiAI/aegis-omniguard>

## Maintainer role

Primary maintainer / core maintainer.

## Short project description

Aegis OmniGuard is an open-source, local-first Chrome extension that prevents users from leaking secrets into AI tools and web apps. It scans locally for API keys, seed phrases, private keys, credit cards, `.env` secrets, and related sensitive data before content leaves the browser.

## Why this project is eligible

Aegis OmniGuard protects developers and everyday AI users from a growing AI-era data-loss problem: accidental secret disclosure into chatbots, coding agents, and browser-based tools. It is public, MIT-licensed, already live on the Chrome Web Store, and includes a tested local detection engine with zero telemetry and no cloud dependency for core scanning.

Codex would help maintain and expand the project by improving rule coverage, automating regression tests, reviewing security-sensitive changes, generating safer browser-extension patterns, and hardening the release process.

## Chrome Web Store proof

- Official listing: <https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg>
- Extension ID: `fcgceeldnoifbaffonoaicbbcncfkjgg`
- Proof document: [`CHROME_WEB_STORE_PROOF.md`](CHROME_WEB_STORE_PROOF.md)

## Suggested application answer

```text
Aegis OmniGuard is an open-source, local-first browser security extension that prevents users from leaking API keys, seed phrases, private keys, credit cards, .env secrets, and other sensitive data into AI tools like ChatGPT, Claude, Cursor, and browser-based apps. It is MIT-licensed, live on the Chrome Web Store, and built around zero-telemetry local scanning with a tested detection engine.
```

## How API credits / Codex access would be used

```text
We would use Codex and API credits to maintain and harden Aegis OmniGuard: expand secret-detection rules, generate and review regression tests, audit browser-extension security boundaries, validate AI-output scanner patterns, improve documentation, and build safer release checks for a public Chrome Web Store security tool.
```

## Public evidence checklist

- [x] Public GitHub repository
- [x] MIT license
- [x] Chrome Web Store listing
- [x] Store listing proof document
- [x] Privacy policy
- [x] Security policy
- [x] Contribution guide
- [x] Maintainer statement
