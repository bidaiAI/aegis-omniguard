# Aegis OmniGuard v0.3.0 Launch Materials

## 你需要做的操作清单

### Step 1: 推送代码到 GitHub
```bash
cd E:\anquan\aegis-omniguard
git add .
git commit -m "feat: v0.3.0 - AI Output Scanner, Clipboard Guard, Skills"
git push origin main
```

### Step 2: 发布 Skills（引流）

#### 2a. 在 OpenClaw 社区推广 openclaw-audit
1. 去 https://github.com/openclaw/openclaw/issues
2. 新建 Issue，标题：`[Security Tool] openclaw-audit — Pre-install skill malware scanner`
3. 内容用下面的模板（见"OpenClaw Issue 模板"部分）
4. 在 OpenClaw Discord (discord.gg/clawd) 的 #security 频道分享

#### 2b. 在推特推广 Skills
用下面的推文模板发推

### Step 3: 宣布 v0.2.0 商店通过
用下面的推文模板

### Step 4: v0.3.0 本地安装测试
1. 打开 Chrome → `chrome://extensions/`
2. 打开"开发者模式"
3. 点"加载已解压的扩展程序" → 选择 `E:\anquan\aegis-omniguard\dist`
4. 测试 AI Output Scanner: 打开 ChatGPT，让它生成包含钱包地址的回复
5. 测试 Clipboard Guard: 复制一个 ETH 地址，粘贴到输入框
6. 确认无 bug 后提交到 Chrome Web Store

---

## 推文 1: v0.2.0 商店通过公告

```
Aegis OmniGuard v0.2.0 is now LIVE on the Chrome Web Store

What's new:
 Web3 Transaction Guard — intercepts wallet signatures, shows risk before you sign
 Multi-chain detection — BTC, ETH, SOL, TRON private keys & addresses
 Bilingual UI — English + Chinese
 BYOK AI — use your own LLM key for deep transaction analysis

All scanning runs 100% locally. Zero data collection. Open source.

Install free:
https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg

GitHub: https://github.com/bidaiAI/aegis-omniguard
Website: https://aegis-web4.com

Built by @bidaoofficial

#Web3Security #ChromeExtension #OpenSource #CryptoSecurity
```

## 推文 2: v0.3.0 预告 + Skills 发布

```
Building v0.3.0 of Aegis OmniGuard with 3 features NO other tool has:

1. AI Output Scanner
Every security tool protects what you SEND to AI.
Nobody protects what AI SENDS BACK to you.
Aegis v0.3 scans ChatGPT/Claude/Gemini responses for phishing links, fake contract addresses, and backdoored code.

2. Clipboard Guard
Copy a crypto address, paste it — but malware swapped it.
StilachiRAT, ClipBanker do this silently.
No Chrome extension detects this. Aegis v0.3 does.

3. /openclaw-audit
OpenClaw has 215K+ GitHub stars but 800+ malicious Skills (20% of ClawHub).
Our free scanner detects:
- Malicious HTTP exfiltration in skills
- eval() / child_process abuse
- CVE-2026-25253 WebSocket hijack patterns
- Disabled authentication
- Exposed server configs

Try it now:
git clone https://github.com/bidaiAI/aegis-omniguard
node skills/openclaw-audit/index.js ~/.openclaw

v0.1-0.2: "Protect what you send to AI"
v0.3: "Protect what AI sends back to you"

GitHub: https://github.com/bidaiAI/aegis-omniguard
Website: https://aegis-web4.com
Chrome Store: https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg

@bidaoofficial

#OpenClaw #AIAgentSecurity #Web3 #CryptoSecurity #OpenSource #BuildInPublic
```

## 推文 3: /aegis-scan 开发者工具推广

```
Developers: Are you leaking secrets to AI coding tools?

/aegis-scan is a free, zero-dependency secret scanner for your projects.

Detects:
- OpenAI, Anthropic, AWS, GitHub, Stripe API keys
- Ethereum private keys & BIP-39 seed phrases
- Database URLs with credentials
- JWT tokens & high-entropy secrets
- .env file patterns

Run it:
git clone https://github.com/bidaiAI/aegis-omniguard
node skills/aegis-scan/index.js /path/to/your/project

Exit code 0 = clean, 2 = secrets found.
Works in CI/CD pipelines.

Part of @bidaoofficial's Aegis OmniGuard — AI-era data sovereignty.

https://github.com/bidaiAI/aegis-omniguard

#DevSecOps #SecurityTools #OpenSource #CodeSecurity
```

---

## OpenClaw Issue 模板

标题: `[Security Tool] openclaw-audit — Pre-install skill malware scanner`

内容:
```markdown
## What

A free, zero-dependency security scanner for OpenClaw installations. Focuses on **detecting malicious skills before they execute** — a gap not covered by existing security tools.

## Why

- 800+ malicious skills detected in ClawHub (20% of registry)
- CVE-2026-25253 WebSocket hijack still affects unpatched instances
- Most security tools (SecureClaw, ClawSec) focus on runtime protection
- No tool specifically vets skill source code before installation

## What it detects

| Category | Patterns |
|----------|----------|
| Data exfiltration | HTTP calls to pastebin, ngrok, webhook.site, burpcollaborator |
| Code obfuscation | Long base64 strings, encoded payloads |
| Sensitive file access | .env, .ssh/id_rsa, .aws/credentials reads |
| Credential theft | process.env access for SECRET, TOKEN, API_KEY |
| Crypto theft | Private key patterns, BIP-39 seed phrase extraction |
| Remote execution | eval(), Function(), child_process.exec() |
| Network attack | External WebSocket connections |
| DNS exfiltration | dns.resolve with concatenated hostnames |
| Config issues | 0.0.0.0 binding, disabled auth, plaintext credentials |
| CVE check | CVE-2026-25253 WebSocket handler vulnerability |

## Usage

```bash
git clone https://github.com/bidaiAI/aegis-omniguard
node skills/openclaw-audit/index.js ~/.openclaw
```

## Differentiation

| Tool | Focus | openclaw-audit |
|------|-------|---------------|
| SecureClaw | Runtime audit, OWASP | **Pre-install** code scanning |
| ClawSec | SOUL.md integrity | **Skill source** pattern matching |
| ClawBands | Runtime middleware | **Static analysis** before execution |

## Links

- Source: https://github.com/bidaiAI/aegis-omniguard/tree/main/skills/openclaw-audit
- Part of Aegis OmniGuard: https://aegis-web4.com
- MIT License
```

---

## 功能介绍（通俗易懂版，用于官网/README）

### Aegis OmniGuard — 让你安全使用 AI 的浏览器插件

**用一句话说清楚每个功能：**

| 版本 | 功能 | 一句话解释 |
|------|------|-----------|
| v0.1 | DLP 数据泄露防护 | 你往 ChatGPT 粘贴信用卡号，它帮你挡住 |
| v0.1 | API Key 检测 | 你不小心把密钥发给 AI，它帮你打码 |
| v0.1 | 助记词拦截 | 12/24 个单词的钱包密码，粘贴时自动拦截 |
| v0.2 | Web3 交易守卫 | MetaMask 弹出签名，它先告诉你这笔交易有没有风险 |
| v0.2 | 多链私钥检测 | BTC、ETH、SOL、TRON 的私钥都能识别 |
| v0.2 | 双语界面 | 中文/英文随时切换 |
| v0.3 | AI 回复扫描 | ChatGPT 给你的回复里有钓鱼链接？它帮你标红 |
| v0.3 | 剪贴板守卫 | 复制钱包地址后被病毒偷换？粘贴时它警告你 |
| v0.3 | OpenClaw 审计 | 扫描 AI Agent 的插件有没有恶意代码 |
| v0.3 | 代码秘密扫描 | 一键检查你的项目有没有泄露密钥 |

**核心理念：**
> v0.1-0.2 保护你 → AI 方向的数据
> v0.3 保护 AI → 你方向的数据
> 双向防护，闭环安全

---

## 文件清单

| 文件 | 大小 | 用途 |
|------|------|------|
| `aegis-omniguard-v0.3.0.zip` | 117 KB | Chrome Web Store 提交 |
| `skills/openclaw-audit/index.js` | 775 行 | OpenClaw 安全审计 Skill |
| `skills/aegis-scan/index.js` | 310 行 | 项目秘密扫描 Skill |
| `src/content/ai_output_scanner.ts` | 619 行 | AI 回复扫描模块 |
| `src/content/clipboard_guard.ts` | 433 行 | 剪贴板守卫模块 |
