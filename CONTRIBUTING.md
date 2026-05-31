# Contributing to Aegis OmniGuard

Thanks for helping improve Aegis OmniGuard. This project is a security and privacy tool, so contributions should prioritize user safety, local-first behavior, and clear verification.

## Good first contribution areas

- Add or improve secret-detection patterns.
- Add false-positive regression tests.
- Improve Chrome extension compatibility with AI chat UIs.
- Improve documentation, screenshots, or store listing text.
- Add translations for UI strings and docs.

## Development setup

```bash
npm install
npm run build
npx tsx test/dlp_engine.test.ts
```

For manual extension testing:

1. Build the project.
2. Open `chrome://extensions/`.
3. Enable **Developer mode**.
4. Load the generated `dist/` folder as an unpacked extension.
5. Test on a local page, ChatGPT, Claude, or another text-entry surface.

## Security and privacy requirements

- Do not add telemetry, analytics, tracking, or remote scanning to the core DLP path.
- Core scanning must remain local-first.
- Do not log raw secrets in tests, screenshots, or issue reports.
- Use fake test keys and documented test credit-card numbers only.
- Prefer high-confidence detection plus explicit false-positive tests.
- Any feature that can send data to an external model or API must be opt-in and clearly documented.

## Pull request checklist

- [ ] The change has a clear user-safety or maintainability reason.
- [ ] Tests were added or updated for detection logic changes.
- [ ] False-positive behavior was considered.
- [ ] `npm run build` passes.
- [ ] Security/privacy impact is described in the PR.
- [ ] Documentation is updated when behavior changes.

## Reporting security issues

Do not open public issues for vulnerabilities. Follow [`SECURITY.md`](SECURITY.md) instead.
