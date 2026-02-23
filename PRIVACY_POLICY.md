# Aegis OmniGuard Privacy Policy

**Last updated: February 23, 2026**

## Data Collection

Aegis OmniGuard collects **NO** user data whatsoever.

## How It Works

All scanning and detection of sensitive data patterns (credit card numbers, API keys, crypto mnemonics, etc.) happens **100% locally** within your browser. No data is ever transmitted to any external server.

## Local Storage

Extension settings (protection level, whitelist, language preference) and intercept logs are stored locally using Chrome's `chrome.storage.local` API. This data is:
- Isolated to the extension sandbox
- Inaccessible to websites
- Never transmitted externally
- Deleted when the extension is uninstalled

## Third-Party Services

Aegis OmniGuard does **not** use any third-party analytics, tracking, advertising, or data collection services.

## Network Requests

The core DLP scanning functionality makes **zero** network requests. All pattern matching and algorithmic verification runs entirely in your browser.

The optional BYOK (Bring Your Own Key) LLM analysis feature, if manually enabled by the user, sends only transaction metadata (not personal data) to the user's chosen LLM provider using the user's own API key. This feature is off by default and requires explicit user configuration.

## Permissions

- **storage**: Used to save extension settings and intercept logs locally
- **activeTab**: Used to access the current tab for input scanning
- **content_scripts on all URLs**: Required because AI chatbots are hosted on many different domains

## Open Source

Aegis OmniGuard is fully open source under the MIT License. You can audit every line of code at: https://github.com/anthropic-user/aegis-omniguard

## Contact

For privacy-related questions: [@bidaoofficial](https://x.com/bidaoofficial) on X/Twitter
