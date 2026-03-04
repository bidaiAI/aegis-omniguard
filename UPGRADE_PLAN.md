# v0.2.0 Chrome Web Store Upgrade Plan

## Current Status
- v0.1.0 已上架（实际包含 v0.2.0 全部代码，version 标为 0.1.0）
- 商店链接：https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg

## Strategy: When to Submit v0.2.0

### Recommended Timeline: v0.1.0 上架后 7-14 天

**Why wait?**
1. 已上架扩展的更新审核比首次审核宽松
2. 积累一些真实用户安装量，证明扩展是合规的
3. 给 Google 审核系统建立信任记录

### What Changes in v0.2.0 Submission

| Item | v0.1.0 (current) | v0.2.0 (upgrade) |
|------|-------------------|-------------------|
| Version | 0.1.0 | 0.2.0 |
| Description | Keep same | Add Web3 Sentinel mention |
| Privacy Policy | Keep same | Update BYOK LLM section |
| Screenshots | Current set | Add Web3 alert screenshot |

### v0.2.0 Description Additions (append to existing)

```
NEW IN v0.2.0:
- Web3 Transaction Guard: Analyzes MetaMask transactions before signing
- Multi-Chain Support: Bitcoin, Solana, Tron private key detection
- BYOK AI Analysis: Use your own OpenAI/Anthropic/DeepSeek key for deep transaction analysis (optional, off by default)
- Chinese Language Support: Full EN/ZH bilingual interface
```

### v0.2.0 Submission Steps

1. [ ] Wait 7-14 days after v0.1.0 launch
2. [ ] Change manifest version to 0.2.0
3. [ ] Update description to include Web3 features
4. [ ] Update privacy policy to mention optional BYOK LLM calls
5. [ ] Add Web3 AlertPanel screenshot
6. [ ] Update reviewer testing instructions to include Web3 test case
7. [ ] Build & ZIP
8. [ ] Submit update

### v0.2.0 Reviewer Testing Instructions (draft)

```
EXISTING TESTS (same as v0.1.0):
1-6. [same credit card / API key / normal text tests]

NEW WEB3 TEST:
7. Open any dApp that uses MetaMask (e.g., app.uniswap.org)
8. Initiate a token swap or approval transaction
9. EXPECTED: Aegis AlertPanel appears showing transaction risk analysis
10. Click "Reject" or "Approve" to see the decision flow
```

## Post-v0.2.0 Roadmap

### v0.3.0 (Phase 3)
- Phishing URL database
- Cross-chain bridge monitoring
- Enhanced false positive tuning

### v0.4.0 (Phase 4)
- Enterprise/team features
- Admin dashboard
- Centralized policy management

### Future
- Firefox extension (WebExtensions API)
- VS Code extension
- Edge Add-ons store
