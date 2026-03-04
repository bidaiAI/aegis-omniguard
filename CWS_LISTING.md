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
Scans your input locally for credit cards, API keys & crypto mnemonics before sending to AI chatbots. 100% offline, open source.
```

## 3. Detailed Description (max 16,000 chars)

```
Aegis OmniGuard - Local Input Scanner for AI Chatbots

Aegis OmniGuard is a browser-based input scanner that detects sensitive data patterns (credit card numbers, API keys, crypto mnemonics, etc.) in text you type or paste, and alerts you before submission.

COMMON SCENARIOS
Developers and everyday users often accidentally include sensitive data when using AI chat tools:
- A credit card number copied from a support ticket
- An API key (sk-proj-..., AKIA...) left in a code snippet
- A crypto wallet mnemonic phrase in a note
- A .env file containing DATABASE_URL=...

HOW IT WORKS
1. The extension monitors input fields and contenteditable elements on web pages
2. When you type, paste, or click a send button, the text is scanned locally using pattern matching and algorithmic verification
3. If sensitive data is detected, the extension shows an in-page notification and masks the detected content
4. No data ever leaves your browser — all scanning runs 100% offline

HOW TO TEST (try it yourself)
1. Install the extension and ensure the protection toggle is ON (click the extension icon to check)
2. Open any AI chatbot website (e.g., chatgpt.com or claude.ai)
3. Paste the following test credit card number into the chat input: 4111 1111 1111 1111
4. Press Enter or click the Send button
5. You will see a shield notification appear and the number will be masked with asterisks
6. Click the extension icon → Logs tab to see the interception record

DETECTION METHODS
- Credit Cards: Regex pre-filter + Luhn checksum verification (random 16-digit numbers are not flagged)
- Crypto Mnemonics: BIP-39 wordlist matching against the standard 2048-word list (12 or 24 consecutive words required)
- Private Keys: Hexadecimal pattern matching + Shannon entropy analysis
- API Keys: Pattern matching for known formats — OpenAI (sk-proj-...), Anthropic (sk-ant-...), AWS (AKIA...), GitHub (ghp_.../gho_...), Google AI (AIza...)
- .env Secrets: KEY=VALUE format detection
- PII: Chinese ID cards (18-digit with checksum), phone numbers, email addresses

KEY FEATURES
- Two-Pass Detection: Fast regex pre-filter followed by algorithmic verification to reduce false positives
- Modern UI Compatibility: Works with contenteditable elements used by ChatGPT, Claude, and similar chat interfaces
- Shadow DOM Notification: In-page alerts are isolated via Shadow DOM to avoid CSS conflicts
- Three Protection Levels: Low (high-confidence only) / Medium (recommended) / High (aggressive)
- Domain Whitelist: Disable scanning on trusted domains you specify
- Intercept Logs: View a history of detected and masked items

PRIVACY
- All scanning runs 100% locally in your browser
- Zero network requests for scanning — no data is sent to any server
- No telemetry, analytics, or tracking of any kind
- Open source under MIT License — inspect every line of code

PERMISSIONS EXPLAINED
- "storage": Saves your settings and intercept logs locally
- "activeTab": Allows the content script to scan the current page
- "<all_urls>" in content_scripts: Required because AI chatbots are hosted on many different domains; restricting to specific domains would leave users unprotected on new or lesser-known AI services

NEW IN v0.2.0
- Web3 Transaction Guard: Analyzes wallet transactions (MetaMask, etc.) before you sign, showing risk breakdown
- Multi-Chain Detection: Bitcoin, Ethereum, Solana, Tron private key and address detection
- BYOK AI Analysis: Optionally use your own OpenAI/Anthropic/DeepSeek API key for deep transaction risk analysis (off by default, no data sent unless you enable it)
- Bilingual Interface: Full English and Chinese (中文) language support
- Enhanced Detection: Improved false-positive reduction and wider API key format coverage

OPEN SOURCE
GitHub: https://github.com/bidaiAI/aegis-omniguard
Website: https://aegis-web4.com
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
https://github.com/bidaiAI/aegis-omniguard
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

## 10. Reviewer Testing Instructions (paste into "Notes to reviewer" field)

```
HOW TO VERIFY THE EXTENSION'S FUNCTIONALITY:

1. Install the extension. Click the extension icon in the toolbar — ensure the "Protection" toggle is ON (green).

2. Open https://chatgpt.com (or https://claude.ai) in a new tab.

3. TEST 1 — Credit Card Detection:
   Paste this test Visa number into the chat input box: 4111 1111 1111 1111
   Press Enter or click the Send button.
   EXPECTED: A shield notification appears in the top-right corner saying "Aegis: Data Leak Blocked". The credit card number is replaced with asterisks (e.g., **** **** **** 1111).

4. TEST 2 — API Key Detection:
   Paste this fake OpenAI key into the chat input: sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234
   Press Enter.
   EXPECTED: The key is masked and a notification appears.

5. TEST 3 — Normal text passes through:
   Type "Hello, how are you today?" and press Enter.
   EXPECTED: No blocking, no notification. Normal text is sent normally.

6. Click the extension icon → "Logs" tab to see the interception history from tests 1 and 2.

7. TEST 4 — Web3 Transaction Guard (if MetaMask installed):
   Open any dApp (e.g., app.uniswap.org), initiate a token swap.
   EXPECTED: Aegis AlertPanel appears showing transaction risk analysis before signing.

8. TEST 5 — Language Switch:
   Click extension icon → Settings → Language → 中文
   EXPECTED: Interface switches to Chinese.

NOTES:
- All detection happens locally in the browser. No network requests are made for scanning.
- The BYOK AI feature is OFF by default. Only sends transaction metadata (not personal data) to user's own LLM provider if manually enabled.
- The extension needs "storage" (for settings) and "activeTab" permissions.
- "<all_urls>" in content_scripts is required because AI chat tools exist on many different domains.
```

---

## Upload Checklist

- [ ] Developer account registered ($5 one-time fee)
- [ ] ZIP file ready: aegis-omniguard-v0.1.0.zip (87 KB)
- [ ] At least 1 screenshot (1280x800)
- [ ] Privacy policy URL or text
- [ ] Store listing text filled in
- [ ] Category selected
- [ ] Single purpose description provided
- [ ] Reviewer testing instructions filled in "Notes to reviewer" field

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
