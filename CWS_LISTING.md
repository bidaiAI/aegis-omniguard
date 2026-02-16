# Chrome Web Store Listing - Copy/Paste Reference

> This file contains all text you need to copy/paste into the Chrome Web Store Developer Dashboard.
> Keep this file for future updates.

---

## 1. Extension Name (max 75 chars)

```
Aegis OmniGuard - AI Data Leak Shield
```

## 2. Summary / Short Description (max 132 chars)

```
Stop leaking credit cards, API keys & crypto mnemonics to ChatGPT, Claude, Cursor. 100% local scanning, zero cloud, open source.
```

## 3. Detailed Description (max 16,000 chars)

```
Aegis OmniGuard - AI-Era Data Sovereignty Guardian
AI 时代数据主权守护者

You're leaking secrets to AI tools right now. You just don't know it yet.

Every day, millions of people paste sensitive data into AI chatbots without thinking:
- Credit card numbers into ChatGPT for "help with a payment issue"
- API keys (sk-proj-..., AKIA...) into Claude while debugging code
- Crypto wallet mnemonics into AI assistants for "backup help"
- .env files with DATABASE_URL=... into Cursor or Copilot

Your data leaves your browser and never comes back.

HOW IT WORKS
Aegis OmniGuard sits between your keyboard and the cloud. It scans everything you type or paste into AI chat interfaces locally in your browser and blocks sensitive data before it's sent.

WHAT IT DETECTS
- Credit Cards: Regex + Luhn algorithm verification (random 16-digit numbers pass through)
- Crypto Mnemonics: BIP-39 wordlist matching (2048 words, normal sentences pass through)
- Private Keys: Hex pattern + Shannon entropy analysis
- OpenAI Keys: sk-proj-... / sk-... patterns
- Anthropic Keys: sk-ant-... patterns
- AWS Keys: AKIA... patterns
- GitHub Tokens: ghp_... / gho_... patterns
- Google AI Keys: AIza... patterns
- .env Secrets: KEY=VALUE format detection
- Chinese ID Cards: 18-digit with checksum validation
- Phone Numbers & Emails

KEY FEATURES
- Two-Pass Detection: Fast regex pre-filter, then algorithmic verification to eliminate false positives
- React/Vue State Sync: Works with modern AI chat UIs using contenteditable, not just textarea
- Shadow DOM Isolation: Injected UI has zero CSS conflicts with websites
- Submit Button Interception: Catches send buttons across AI platforms
- Protection Levels: Low / Medium / High confidence thresholds
- Whitelist: Add trusted domains where scanning is disabled
- Intercept Logs: Review what was blocked and when

PRIVACY FIRST
- All scanning happens 100% locally in your browser
- Zero data sent to any server. Ever.
- No telemetry, no analytics, no tracking
- 100% open source - audit every line yourself
- MIT License

OPEN SOURCE
GitHub: https://github.com/anthropic-user/aegis-omniguard

Twitter/X: @bidaoofficial
```

## 4. Category

```
Productivity
```

(Alternative: "Developer Tools" - choose based on target audience)

## 5. Language

```
English (United States)
```

## 6. Website (optional)

```
https://github.com/anthropic-user/aegis-omniguard
```

## 7. Privacy Policy

Since we collect NO data, you can use this inline text or host it on GitHub:

```
Aegis OmniGuard Privacy Policy

Data Collection: Aegis OmniGuard collects NO user data whatsoever.

All scanning and detection happens 100% locally within your browser. No data is ever transmitted to any external server.

Storage: Extension settings and intercept logs are stored locally using Chrome's chrome.storage.local API, which is isolated to the extension and inaccessible to websites.

Third Parties: We do not use any third-party analytics, tracking, or data collection services.

Contact: @bidaoofficial on Twitter/X
```

## 8. Required Screenshots

Chrome Web Store requires 1-5 screenshots (1280x800 or 640x400 pixels).

Suggested screenshots to create:
1. Popup dashboard showing the protection toggle and settings
2. Toast notification blocking a credit card number on ChatGPT
3. Toast notification blocking an API key on Claude
4. Intercept logs page showing blocked items
5. Whitelist management page

> Note: You need to install the extension locally first, then take real screenshots.
> Steps:
> 1. chrome://extensions/ -> Load unpacked -> select dist/ folder
> 2. Open ChatGPT or Claude in browser
> 3. Try pasting a test credit card: 4111 1111 1111 1111
> 4. Screenshot the toast notification that appears
> 5. Screenshot the popup dashboard
> 6. Resize screenshots to 1280x800 if needed

## 9. Promotional Images (Optional but Recommended)

- Small Promo Tile: 440x280 pixels
- Large Promo Tile: 920x680 pixels
- Marquee Promo Tile: 1400x560 pixels

---

## Upload Checklist

- [ ] Developer account registered ($5 one-time fee)
- [ ] ZIP file ready: aegis-omniguard-v0.1.0.zip (87 KB)
- [ ] At least 1 screenshot (1280x800)
- [ ] Privacy policy URL or text
- [ ] Store listing text filled in
- [ ] Category selected
- [ ] Single purpose description provided

---

## Review Timeline

- Google typically reviews new extensions in 1-3 business days
- First submission may take longer (up to 7 days)
- Common rejection reasons:
  - "<all_urls>" permission requires justification
  - Missing privacy policy
  - Screenshots don't match functionality
  - Description is misleading

## Justification for <all_urls> Permission

If Google asks why you need <all_urls>, use this:

```
Aegis OmniGuard needs <all_urls> permission because it must monitor user input across ALL websites where AI tools are accessed. AI chatbots like ChatGPT, Claude, and many others are hosted on various domains, and new AI tools launch daily. The extension intercepts sensitive data (credit cards, API keys, crypto mnemonics) before it's sent to any website, not just known AI platforms. Restricting to specific domains would leave users unprotected on new or unknown AI services. All scanning happens 100% locally with zero data transmission.
```
