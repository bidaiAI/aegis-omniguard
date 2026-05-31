# Chrome Web Store Launch Proof

This document records public evidence that Aegis OmniGuard is live on the official Chrome Web Store.

## Official listing

- **Extension name:** Aegis OmniGuard
- **Official Chrome Web Store URL:** <https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg>
- **Chrome extension ID:** `fcgceeldnoifbaffonoaicbbcncfkjgg`
- **Repository:** <https://github.com/bidaiAI/aegis-omniguard>
- **Website:** <https://aegis-web4.com>

## Availability check

Verified on **2026-05-31**:

```bash
curl -I https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg
```

Result:

```text
HTTP/2 200
content-type: text/html; charset=utf-8
server: ESF
```

## Why this matters

The Chrome Web Store listing provides public distribution proof beyond source code:

- users can install Aegis OmniGuard through Google's official extension distribution channel;
- the listing uses the same public source repository and privacy posture described in this repo;
- the extension is distributed as a Chrome Manifest V3 browser security tool.

## Store listing source material

The listing copy, reviewer testing notes, permission justification, and privacy text are tracked in [`CWS_LISTING.md`](../CWS_LISTING.md) so store updates can be reviewed like code.
