# 🔴 OpenClaw × Four.Meme Security Audit

> **白帽声明**: 所有漏洞已通过 GitHub Issues/PRs 向 `openclaw/openclaw` 官方提交。

## 漏洞概览

| # | 漏洞 | 严重级别 | PoC 文件 |
|:---|:---|:---|:---|
| 1 | **Prompt Injection** — 代币描述注入 LLM 上下文 | 🔴 Critical | `prompt-injection-poc.cjs` |
| 2 | **Shell Injection** — `spawnSync` + `shell: true` 导致 RCE | 🔴 Critical | `shell-injection-poc.js` |
| 3 | **Fund Drainage** — `send-token.ts` 无白名单/限额/确认 | 🔴 Critical | `fund-drainage-poc.cjs` |

## Chain Kill 攻击链

三个漏洞可串联形成完整攻击链（~10 秒）：

```
代币描述注毒 → LLM 执行流被劫持 → Shell 注入窃取私钥 → 钱包余额清零
```

## 运行 PoC

```bash
node prompt-injection-poc.cjs   # 查看注入 Payload 结构
node shell-injection-poc.js     # 验证 shell: true 可注入
node fund-drainage-poc.cjs      # 分析 send-token.ts 安全缺口
```

## BSC 主网实测结果

- 实弹代币: 2 枚 | 监控时间: 20 分钟 | **资金损失: 0 BNB**
- Agent 崩溃: 3 次静默终止（DoS 成功）
- **结论**: 攻击链每环节单独成立，实战中 LLM 选择崩溃而非执行命令

## 白帽提交记录

- [Issue #38074](https://github.com/openclaw/openclaw/issues/38074) — Context Poisoning
- [Issue #38384](https://github.com/openclaw/openclaw/issues/38384) — Silent DoS
- [PR #38390](https://github.com/openclaw/openclaw/pull/38390) — Graceful Degradation Fix
- [PR #38416](https://github.com/openclaw/openclaw/pull/38416) — Westworld Cognitive Filter
- [PR #38555](https://github.com/openclaw/openclaw/pull/38555) — Gemini 3.1 Provider Fix
