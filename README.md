<div align="center">

# Aegis OmniGuard

### AI-Era Data Sovereignty Guardian | AI 时代数据主权守护者

🛡️ **You're leaking secrets to AI right now. You just don't know it yet.**

🛡️ **你正在向 AI 泄露秘密，只是你还不知道。**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-blue.svg)]()
[![Tests](https://img.shields.io/badge/Tests-25%20passed-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)]()
[![Twitter](https://img.shields.io/badge/Twitter-@bidaoofficial-1DA1F2?logo=twitter&logoColor=white)](https://twitter.com/bidaoofficial)

[Install](#install) | [How It Works](#how-it-works) | [中文说明](#chinese)

</div>

---

## Why You Need This — Right Now

Think about the last time you pasted something into ChatGPT, Claude, or Cursor. Did you check for:

- A credit card number hiding in a support ticket?
- An API key (`sk-proj-...`, `AKIA...`) in your debug output?
- A crypto mnemonic phrase in your notes?
- A `.env` file with `DATABASE_URL=...` in your code?

**If you use any AI tool, you are a target.** Not because someone is attacking you — because you're handing your data away voluntarily, one paste at a time.

The numbers are real: 23M+ secrets leaked to public GitHub repos in 2024. 900K+ users had ChatGPT conversations stolen. 48% of AI-generated code contains vulnerabilities.

**Aegis OmniGuard is the seatbelt for the AI era.** It sits between your keyboard and the cloud, scanning everything locally in your browser before it leaves. When it finds sensitive data, it blocks it — instantly, silently, locally.

- **Zero cloud** — nothing leaves your machine
- **Zero cost** — 100% free, forever
- **Zero trust required** — 100% open source, read every line yourself
- **Zero setup** — install and forget, it just works

> **If you wouldn't shout your API key in a crowded room, you shouldn't paste it into an AI chatbot.** Aegis OmniGuard makes sure you never do — even by accident.

---

## Features

### Web2 DLP Shield (Phase 1 - Available Now)

| Detection | Method | False Positive Prevention |
|-----------|--------|--------------------------|
| Credit Cards | Regex + **Luhn algorithm** | Random 16-digit numbers pass through |
| Crypto Mnemonics | **BIP-39 wordlist** (2048 words) | Normal 12-word sentences pass through |
| Private Keys | Hex pattern + **Shannon entropy** | Low-entropy hex strings pass through |
| OpenAI Keys | `sk-proj-...` / `sk-...` pattern | Near-zero false positives |
| Anthropic Keys | `sk-ant-...` pattern | High confidence |
| AWS Keys | `AKIA...` pattern | High confidence |
| GitHub Tokens | `ghp_...` / `gho_...` pattern | High confidence |
| Google AI Keys | `AIza...` pattern | High confidence |
| `.env` Secrets | `API_KEY=...` pattern | Requires KEY=VALUE format |
| Chinese ID Cards | 18-digit + **checksum validation** | Invalid checksums pass through |
| Phone Numbers | Chinese mobile pattern | Basic format check |
| Email Addresses | Standard email regex | Standard |

### Key Technical Innovations

- **React/Vue State Sync**: Native `HTMLInputElement.prototype.value` setter override + `dispatchEvent` — frameworks see the masked value, not the original
- **contenteditable Support**: Works with ChatGPT/Claude's modern chat UIs, not just `<textarea>`
- **Shadow DOM Isolation**: Injected UI wrapped in Shadow DOM — zero CSS conflicts
- **Two-Pass Detection**: Fast regex pre-filter → algorithmic verification (Luhn/BIP-39/entropy) to kill false positives
- **Submit Button Interception**: Catches send buttons across AI platforms
- **Protection Levels**: Low (0.95) / Medium (0.80) / High (0.60) confidence thresholds

### Web3 Sentinel (Phase 2 - Coming Soon)

- Intercept MetaMask `eth_sendTransaction` / `eth_signTypedData_v4`
- LLM-powered contract analysis (Bring Your Own Key)
- Anti-prompt-injection: comment stripping before LLM analysis
- Full-screen risk warning panel

---

<a name="install"></a>
## Install

### Chrome Web Store (Recommended for everyone)

> **Submitted for review!** Search **"Aegis OmniGuard"** in Chrome Web Store in a few days (typically 1-3 business days for approval).
>
> Direct link (available after approval): [Chrome Web Store - Aegis OmniGuard](https://chrome.google.com/webstore/detail/aegis-omniguard)
>
> Don't want to build from source? Just wait for the Chrome Web Store version — one-click install, auto-updates included!

### Manual Install (30 seconds, for developers)

**Option A: Download Release (No coding needed)**

1. Go to [Releases](../../releases) → download `aegis-omniguard-vX.X.X.zip`
2. Unzip
3. Chrome → `chrome://extensions/` → Enable **Developer mode** (top-right)
4. **Load unpacked** → select the unzipped folder
5. Done. The shield icon appears in your toolbar.

**Option B: Build from Source**

```bash
git clone https://github.com/bidaiAI/aegis-omniguard.git
cd aegis-omniguard
npm install
npm run build
```

Load `dist/` in Chrome as above.

---

<a name="how-it-works"></a>
## How It Works

```
You type/paste text in ChatGPT / Claude / Cursor / any website
       |
       v
[Content Script] captures keydown / paste / click events
       |
       v
[Background Worker] runs DLP engine:
  |
  +-- Regex pre-filter (fast scan)
  |     +-- Credit card?    --> Luhn algorithm   --> Pass/Block
  |     +-- 12+ words?      --> BIP-39 wordlist  --> Pass/Block
  |     +-- sk-proj-...?    --> Direct match     --> Block
  |     +-- 64 hex chars?   --> Entropy check    --> Pass/Block
  |     +-- API_KEY=...?    --> ENV pattern       --> Block
  |
  v
[Result]
  +-- PASS: Text goes through normally
  +-- BLOCK: Masked + toast notification + logged
```

### Architecture

```
[Chrome Extension - Manifest V3]
  |
  +-- Content Script (Isolated World)
  |     +-- DOM monitoring, event interception
  |     +-- Native setter override for React/Vue state sync
  |     +-- Shadow DOM toast injection
  |
  +-- Background Service Worker
  |     +-- DLP Engine: Luhn, BIP-39, entropy, regex
  |     +-- Settings management + whitelist
  |     +-- Intercept logging
  |
  +-- Popup UI (React + Tailwind)
        +-- Dashboard / Logs / Whitelist
```

---

## Configuration

Click the Aegis shield icon:

- **Protection Shield**: Master on/off
- **Protection Level**: Low / Medium (recommended) / High
- **Whitelist**: Trusted domains where scanning is disabled
- **Intercept Log**: Review what was blocked

---

## Privacy & Security

- **All scanning happens locally.** Zero data sent to any server. Ever.
- **No telemetry, no analytics, no tracking.** Period.
- **100% open source.** You don't need to trust us — just read the code.

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev build with hot reload
npm run build        # Production build
npx tsc -b           # Type check
npx tsx test/dlp_engine.test.ts  # Run tests (25 passing)
```

### Project Structure

```
src/
  background/      Service Worker (message routing, DLP dispatch)
  content/         Content Script (DOM monitoring, event interception)
  engines/         DLP Engine (Luhn, BIP-39, entropy, PII)
  inject/          Main World scripts (Phase 2: Web3 provider proxy)
  popup/           Popup UI (Dashboard, Logs, Whitelist)
  overlay/         Shadow DOM host management
  shared/          Types, constants, message protocol, key vault
```

---

## Roadmap

- [x] **Phase 1**: Web2 DLP Shield (local scanning, zero cloud)
- [ ] **Phase 2**: Web3 Sentinel (MetaMask interception, LLM contract analysis)
- [ ] **Phase 3**: Enterprise features (team management, advanced rules)
- [ ] VS Code / Cursor extension
- [ ] Firefox support

---

## Contributing

Contributions welcome! Areas where help is needed:

- Additional API key patterns (Azure, Stripe, Twilio, etc.)
- DLP rules for more languages and regions
- Browser compatibility testing
- UI/UX improvements
- Translations

---

## License

[MIT](LICENSE) — Free forever. Use it, fork it, ship it.

---

## Support the Project | 支持项目

If Aegis OmniGuard saved your keys, consider buying the dev a coffee:

如果 Aegis OmniGuard 保护了你的密钥，可以请开发者喝杯咖啡：

**ETH/EVM**: `0xf1c1ef080e6aE6AABA999ba6E5D1545cD5Efab41`

**Twitter/X**: [@bidaoofficial](https://twitter.com/bidaoofficial)

---

<a name="chinese"></a>

<div align="center">

# 中文说明

</div>

## 为什么你现在就需要它

回想一下，你上次往 ChatGPT、Claude 或 Cursor 里粘贴内容的时候，有没有检查过：

- 客服工单里藏着的信用卡号？
- 调试输出中的 API 密钥（`sk-proj-...`、`AKIA...`）？
- 笔记中的加密货币助记词？
- 代码里带 `DATABASE_URL=...` 的 `.env` 文件？

**只要你使用任何 AI 工具，你就是潜在的泄露者。** 不是因为有人在攻击你——而是你自己在一次次粘贴中主动交出数据。

真实数据：2024 年 2300 万+ 密钥泄露到公开 GitHub 仓库。90 万+ 用户的 ChatGPT 对话被恶意插件窃取。48% 的 AI 生成代码包含安全漏洞。

**Aegis OmniGuard 是 AI 时代的安全带。** 它驻守在你的键盘和云端之间，在数据离开浏览器之前，本地扫描一切。发现敏感数据，立即拦截——即时、静默、纯本地。

- **零上云** — 数据不离开你的电脑
- **零费用** — 100% 免费，永远免费
- **零信任** — 100% 开源，每一行代码都可以自己审计
- **零配置** — 安装即用，无需设置

> **如果你不会在公共场合大喊你的 API 密钥，你也不应该把它粘贴给 AI 聊天机器人。** Aegis OmniGuard 确保你永远不会——即使是意外。

---

## 功能特性

### Web2 数据防泄露盾（第一阶段 - 已发布）

| 检测类型 | 方法 | 防误报机制 |
|----------|------|-----------|
| 信用卡号 | 正则 + **Luhn 算法** | 随机16位数字不会误报 |
| 加密货币助记词 | **BIP-39 词表**（2048 词） | 普通12词句子不会误报 |
| 私钥 | 十六进制模式 + **香农熵** | 低熵十六进制串不会误报 |
| OpenAI 密钥 | `sk-proj-...` / `sk-...` 模式 | 近零误报 |
| Anthropic 密钥 | `sk-ant-...` 模式 | 高置信度 |
| AWS 密钥 | `AKIA...` 模式 | 高置信度 |
| GitHub Token | `ghp_...` / `gho_...` 模式 | 高置信度 |
| Google AI 密钥 | `AIza...` 模式 | 高置信度 |
| `.env` 配置 | `API_KEY=...` 模式 | 需要 KEY=VALUE 格式 |
| 中国身份证号 | 18位 + **校验码验证** | 无效校验码不会误报 |
| 手机号 | 中国手机号模式 | 基本格式校验 |
| 邮箱地址 | 标准邮箱正则 | 标准 |

### 核心技术亮点

- **React/Vue 状态同步**：通过原生 setter 覆写 + dispatchEvent，确保框架内部状态同步更新
- **contenteditable 支持**：适配 ChatGPT/Claude 的现代聊天界面，而不仅仅是传统 `<textarea>`
- **Shadow DOM 隔离**：注入的 UI 完全隔离，与页面零 CSS 冲突
- **两遍检测**：快速正则预筛 → 算法验证（Luhn/BIP-39/熵值），消灭误报
- **发送按钮拦截**：跨平台捕获发送按钮点击
- **防护等级**：低（0.95）/ 中（0.80）/ 高（0.60）置信度阈值

### Web3 哨兵（第二阶段 - 即将推出）

- 拦截 MetaMask `eth_sendTransaction` / `eth_signTypedData_v4`
- LLM 驱动的合约分析（自带密钥模式）
- 反提示注入：分析前去除代码注释
- 全屏风险警告面板

---

## 安装

### Chrome 应用商店（所有人推荐）

> **已提交审核！** 预计 1-3 个工作日内通过。届时在 Chrome 应用商店搜索 **「Aegis OmniGuard」** 即可一键安装。
>
> 直达链接（审核通过后可用）：[Chrome 应用商店 - Aegis OmniGuard](https://chrome.google.com/webstore/detail/aegis-omniguard)
>
> 不想折腾代码？等 Chrome 应用商店版本就行 — 一键安装，自动更新！

### 手动安装（30 秒，适合开发者）

**方式 A：下载安装包（无需编程）**

1. 前往 [Releases](../../releases) → 下载 `aegis-omniguard-vX.X.X.zip`
2. 解压
3. Chrome → `chrome://extensions/` → 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序** → 选择解压后的文件夹
5. 完成！工具栏出现盾牌图标。

**方式 B：从源码构建**

```bash
git clone https://github.com/bidaiAI/aegis-omniguard.git
cd aegis-omniguard
npm install
npm run build
```

然后按上述方式在 Chrome 中加载 `dist/` 文件夹。

---

## 配置

点击工具栏的 Aegis 盾牌图标：

- **防护开关**：主开关
- **防护等级**：低 / 中（推荐）/ 高
- **白名单**：添加不扫描的信任域名
- **拦截日志**：查看被拦截的内容

---

## 隐私与安全

- **所有扫描纯本地执行。** 零数据发送到任何服务器。
- **无遥测、无分析、无追踪。**
- **100% 开源。** 不需要信任我们——自己看代码。

---

## 路线图

- [x] **第一阶段**：Web2 数据防泄露盾（本地扫描，零上云）
- [ ] **第二阶段**：Web3 哨兵（MetaMask 拦截，LLM 合约分析）
- [ ] **第三阶段**：企业功能（团队管理，高级规则）
- [ ] VS Code / Cursor 插件
- [ ] Firefox 支持

---

<div align="center">

**为 AI 时代而生。因为你的数据，只属于你。**

**Built for the AI era. Because your data is yours.**

[Report Bug / 报告问题](../../issues) | [Request Feature / 功能建议](../../issues) | [Security / 安全问题](SECURITY.md)

**Twitter/X**: [@bidaoofficial](https://twitter.com/bidaoofficial)

**ETH/EVM Donation**: `0xf1c1ef080e6aE6AABA999ba6E5D1545cD5Efab41`

</div>
