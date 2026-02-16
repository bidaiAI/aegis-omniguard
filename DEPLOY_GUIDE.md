# Aegis OmniGuard - Deployment Guide

## Part 1: Push to GitHub (Non-Claude-bound Account)

Since this project was built locally without git, you need to manually set up a repo.

### First-time Setup

```bash
# 1. Navigate to project
cd E:\anquan\aegis-omniguard

# 2. Initialize git repo
git init

# 3. Configure git for THIS repo only (won't affect global config)
git config user.name "YourGitHubUsername"
git config user.email "your-email@example.com"

# 4. Add all files
git add .

# 5. First commit
git commit -m "feat: Aegis OmniGuard Phase 1 - Web2 DLP Shield

- DLP engine with Luhn, BIP-39, Shannon entropy, PII detection
- 12 sensitive data type detections (credit cards, API keys, mnemonics, etc.)
- React/Vue state sync via native setter override
- contenteditable support for ChatGPT/Claude UIs
- Shadow DOM toast notifications
- Popup UI with Dashboard, Logs, Whitelist
- 25 passing tests
- Chrome MV3 manifest"

# 6. Create the repo on GitHub first:
#    Go to https://github.com/new
#    Repo name: aegis-omniguard
#    Description: AI-era data sovereignty guardian. Prevent sensitive data leakage to AI tools.
#    Visibility: Public
#    Do NOT add README/LICENSE (we already have them)
#    Click "Create repository"

# 7. Connect and push
git remote add origin https://github.com/YOUR_USERNAME/aegis-omniguard.git
git branch -M main
git push -u origin main
```

### Subsequent Updates

```bash
# After making changes:
git add .
git commit -m "fix: description of what changed"
git push
```

### Creating a Release (Triggers auto-build + zip)

```bash
# Tag a version
git tag v0.1.0
git push origin v0.1.0

# GitHub Actions will automatically:
# 1. Build the extension
# 2. Run tests
# 3. Create a zip file
# 4. Publish a GitHub Release with the zip attached
```

---

## Part 2: Chrome Web Store Publishing

### Prerequisites

1. A Google account (can be separate from your personal one)
2. $5 one-time developer registration fee
3. The built extension zip

### Step-by-step

```
1. Go to https://chrome.google.com/webstore/devconsole/
2. Pay the $5 registration fee (one-time)
3. Click "New Item"
4. Upload the zip file (build with: npm run build, then zip the dist/ folder)
5. Fill in the listing details:

   Name: Aegis OmniGuard - AI Data Leak Protection

   Short Description (132 chars max):
   Prevent sensitive data leaks to AI tools. Blocks credit cards, API keys,
   mnemonics before they leave your browser.

   Detailed Description:
   [Copy from README.md, adapt for non-technical audience]

   Category: Productivity (or Security / Privacy)
   Language: English

   Screenshots: (need 1280x800 or 640x400)
   - Screenshot of popup dashboard
   - Screenshot of toast notification blocking a credit card
   - Screenshot of the intercept log

   Icon: 128x128 PNG (replace the placeholder icon!)

6. Set permissions justification:
   - storage: "Store user settings and interception logs locally"
   - activeTab: "Scan user input on the current tab for sensitive data"

7. Privacy practices:
   - Single purpose: "Prevent sensitive data leakage to websites"
   - Data use: "This extension does not collect, transmit, or store
     any user data externally. All processing happens locally."
   - Remote code: No

8. Click "Submit for Review"
9. Wait 1-3 business days for review
```

### Updating on Chrome Web Store

```bash
# 1. Bump version in manifest.json AND package.json
# 2. Build: npm run build
# 3. Zip: cd dist && zip -r ../aegis-update.zip .
# 4. Go to Chrome Web Store Developer Console
# 5. Click your extension → "Package" tab → "Upload new package"
# 6. Upload the new zip
# 7. Submit for review
```

---

## Part 3: Distribution Strategy for Maximum Reach

### For Small-White (Non-Technical) Users

Priority: **Chrome Web Store** is the ONLY viable path.

They will never:
- Clone a git repo
- Run npm commands
- Enable developer mode

The Chrome Web Store listing IS your product page. Invest in:
- A clean icon (not the placeholder!)
- Good screenshots
- A simple, benefit-focused description
- Keywords: "AI privacy", "data leak prevention", "ChatGPT security"

### For Developers / Crypto Users

Priority: **GitHub + Hacker News + Reddit**

They prefer:
- Reading source code before installing
- Building from source
- Contributing improvements
- BYOK mode (Phase 2)

### Release Cadence

```
v0.1.0  - Phase 1 MVP (now)
v0.2.0  - Bug fixes from real-world testing
v0.3.0  - More API key patterns, improved UI
v1.0.0  - Phase 2: Web3 Sentinel + BYOK
v1.1.0  - Chrome Web Store verified publisher
v2.0.0  - Phase 3: Pro subscription
```
