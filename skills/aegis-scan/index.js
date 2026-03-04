#!/usr/bin/env node
/**
 * @aegis-omniguard/aegis-scan
 * Scan code projects for hardcoded secrets, API keys, private keys & crypto security issues.
 * Zero dependencies. Pure Node.js.
 *
 * Usage:
 *   node index.js [directory]
 *   import { runScan } from './index.js'
 *
 * License: MIT
 * https://github.com/bidaiAI/aegis-omniguard
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Color helpers ───
const NO_COLOR = !!process.env.NO_COLOR;
const c = {
  red:    s => NO_COLOR ? s : `\x1b[31m${s}\x1b[0m`,
  yellow: s => NO_COLOR ? s : `\x1b[33m${s}\x1b[0m`,
  green:  s => NO_COLOR ? s : `\x1b[32m${s}\x1b[0m`,
  cyan:   s => NO_COLOR ? s : `\x1b[36m${s}\x1b[0m`,
  dim:    s => NO_COLOR ? s : `\x1b[2m${s}\x1b[0m`,
  bold:   s => NO_COLOR ? s : `\x1b[1m${s}\x1b[0m`,
  bgRed:  s => NO_COLOR ? s : `\x1b[41m\x1b[37m${s}\x1b[0m`,
  bgYel:  s => NO_COLOR ? s : `\x1b[43m\x1b[30m${s}\x1b[0m`,
};

// ─── Skip patterns ───
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__',
  '.next', 'vendor', '.venv', 'venv', '.tox', 'coverage',
  '.nyc_output', '.cache', '.parcel-cache', 'target', 'out'
]);

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
  '.zip', '.gz', '.tar', '.rar', '.7z', '.bz2',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
  '.pyc', '.pyo', '.class', '.o', '.obj',
  '.lock', '.sum'
]);

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// ─── BIP-39 wordlist subset (200 words, enough for detection) ───
const BIP39_WORDS = new Set([
  'abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse',
  'access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act',
  'action','actor','actress','actual','adapt','add','addict','address','adjust','admit',
  'adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent',
  'agree','ahead','aim','air','airport','aisle','alarm','album','alert','alien',
  'all','alley','allow','almost','alone','alpha','already','also','alter','always',
  'amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle',
  'angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety',
  'any','apart','apology','appear','apple','approve','april','arch','arctic','area',
  'arena','argue','arm','armed','armor','army','around','arrange','arrest','arrive',
  'arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist',
  'assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit',
  'august','aunt','author','auto','autumn','average','avocado','avoid','awake','aware',
  'awesome','awful','awkward','axis','baby','bachelor','bacon','badge','bag','balance',
  'balcony','ball','bamboo','banana','banner','bar','barely','bargain','barrel','base',
  'basic','basket','battle','beach','bean','beauty','because','become','beef','before',
  'begin','behave','behind','believe','below','belt','bench','benefit','best','betray',
  'better','between','beyond','bicycle','bid','bike','bind','biology','bird','birth',
  'bitter','black','blade','blame','blanket','blast','bleak','bless','blind','blood',
  'blossom','blow','blue','blur','blush','board','boat','body','boil','bomb',
]);

// ─── Detection patterns ───
const PATTERNS = [
  {
    id: 'openai-key',
    title: 'OpenAI API Key',
    severity: 'CRITICAL',
    regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: 'anthropic-key',
    title: 'Anthropic API Key',
    severity: 'CRITICAL',
    regex: /sk-ant-[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: 'aws-key',
    title: 'AWS Access Key',
    severity: 'CRITICAL',
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    id: 'github-token',
    title: 'GitHub Token',
    severity: 'CRITICAL',
    regex: /(?:ghp_|gho_|github_pat_)[A-Za-z0-9_]{20,}/g,
  },
  {
    id: 'google-api',
    title: 'Google API Key',
    severity: 'CRITICAL',
    regex: /AIza[0-9A-Za-z_-]{35}/g,
  },
  {
    id: 'stripe-key',
    title: 'Stripe Secret Key',
    severity: 'CRITICAL',
    regex: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g,
  },
  {
    id: 'eth-private-key',
    title: 'Ethereum Private Key',
    severity: 'CRITICAL',
    regex: /(?:0x)?[0-9a-fA-F]{64}/g,
    validate: (match, line) => {
      // Must be near a key-like context word
      const ctx = line.toLowerCase();
      return /(?:private|secret|key|wallet|sign|account|hex)/.test(ctx);
    }
  },
  {
    id: 'database-url',
    title: 'Database Connection URL',
    severity: 'CRITICAL',
    regex: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s'"`,;}{)]+/gi,
  },
  {
    id: 'jwt-token',
    title: 'JWT Token',
    severity: 'WARNING',
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    id: 'env-secret',
    title: 'Env Secret Assignment',
    severity: 'WARNING',
    regex: /(?:SECRET|TOKEN|PASSWORD|PASSPHRASE|API_KEY|APIKEY|PRIVATE_KEY|AUTH)[\s]*[=:]\s*['"]?[A-Za-z0-9/+=_-]{16,}['"]?/gi,
    validate: (match) => {
      // Skip template/placeholder values
      if (/\{\{|\$\{|<.*>|YOUR_|CHANGE_ME|xxx|placeholder/i.test(match)) return false;
      return true;
    }
  },
  {
    id: 'generic-high-entropy',
    title: 'High-Entropy Secret',
    severity: 'WARNING',
    regex: /(?:secret|token|password|apikey|api_key|auth_token|access_key)[\s]*[=:]\s*['"]([A-Za-z0-9/+=_-]{20,})['"]/gi,
    validate: (match, line, groups) => {
      if (!groups || !groups[0]) return false;
      const val = groups[0];
      if (/\{\{|\$\{|<.*>|YOUR_|CHANGE_ME|xxx|placeholder/i.test(val)) return false;
      return shannonEntropy(val) > 4.0;
    }
  }
];

// ─── Shannon entropy calculator ───
function shannonEntropy(str) {
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  const len = str.length;
  let entropy = 0;
  for (const ch in freq) {
    const p = freq[ch] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ─── BIP-39 seed phrase detection ───
function detectSeedPhrase(line) {
  const words = line.toLowerCase().match(/[a-z]{3,}/g);
  if (!words || words.length < 12) return null;

  let consecutive = 0;
  let maxConsecutive = 0;
  let matchStart = -1;
  let bestStart = -1;

  for (let i = 0; i < words.length; i++) {
    if (BIP39_WORDS.has(words[i])) {
      if (consecutive === 0) matchStart = i;
      consecutive++;
      if (consecutive > maxConsecutive) {
        maxConsecutive = consecutive;
        bestStart = matchStart;
      }
    } else {
      consecutive = 0;
    }
  }

  if (maxConsecutive >= 12) {
    const phrase = words.slice(bestStart, bestStart + maxConsecutive).join(' ');
    return phrase;
  }
  return null;
}

// ─── File walker ───
async function* walkFiles(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      yield* walkFiles(fullPath);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (BINARY_EXTS.has(ext)) continue;
      if (entry.name === 'package-lock.json' || entry.name === 'yarn.lock') continue;
      try {
        const st = await stat(fullPath);
        if (st.size > MAX_FILE_SIZE) continue;
      } catch {
        continue;
      }
      yield fullPath;
    }
  }
}

// ─── Scan a single file ───
async function scanFile(filePath) {
  const findings = [];
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return findings;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments that look like documentation/examples
    const trimmed = line.trim();
    if (trimmed.startsWith('//') && /example|sample|placeholder|TODO|FIXME/i.test(trimmed)) continue;

    // Check regex patterns
    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        const matchStr = match[0];
        const groups = match.slice(1);

        if (pattern.validate && !pattern.validate(matchStr, line, groups)) continue;

        // Mask the finding for display
        const masked = matchStr.length > 12
          ? matchStr.slice(0, 6) + '***' + matchStr.slice(-4)
          : matchStr.slice(0, 3) + '***';

        findings.push({
          severity: pattern.severity,
          title: pattern.title,
          file: filePath,
          line: lineNum,
          matched: masked,
          id: pattern.id,
        });
        break; // One match per pattern per line
      }
    }

    // BIP-39 seed phrase check
    const seed = detectSeedPhrase(line);
    if (seed) {
      const words = seed.split(' ');
      const masked = words.slice(0, 2).join(' ') + ' ... ' + words.slice(-2).join(' ');
      findings.push({
        severity: 'CRITICAL',
        title: 'BIP-39 Seed Phrase',
        file: filePath,
        line: lineNum,
        matched: `"${masked}" (${words.length} words)`,
        id: 'bip39-seed',
      });
    }
  }

  return findings;
}

// ─── Render report ───
function renderReport(findings, targetDir, filesScanned, duration) {
  const criticals = findings.filter(f => f.severity === 'CRITICAL');
  const warnings = findings.filter(f => f.severity === 'WARNING');

  console.log('');
  console.log(c.bold('══════════════════════════════════════════════'));
  console.log(c.bold('  AEGIS SCAN — Project Secret Scanner'));
  console.log(c.bold('══════════════════════════════════════════════'));
  console.log('');
  console.log(`  Target:  ${c.cyan(targetDir)}`);
  console.log(`  Files:   ${filesScanned} scanned`);
  console.log(`  Time:    ${duration}ms`);
  console.log('');

  if (findings.length === 0) {
    console.log(c.green('  ✅ CLEAN — No secrets or sensitive data found.'));
    console.log('');
    console.log(c.dim('  Tip: Keep using Aegis to stay protected.'));
  } else {
    // Summary bar
    if (criticals.length > 0) {
      console.log(c.bgRed(` CRITICAL: ${criticals.length} `), c.red('issues require immediate attention'));
    }
    if (warnings.length > 0) {
      console.log(c.bgYel(` WARNING: ${warnings.length} `), c.yellow('potential issues detected'));
    }
    console.log('');

    // Sort: critical first
    const sorted = [...criticals, ...warnings];

    for (const f of sorted) {
      const sev = f.severity === 'CRITICAL'
        ? c.red('CRITICAL')
        : c.yellow('WARNING ');
      const relPath = f.file.replace(targetDir, '.').replace(/\\/g, '/');
      console.log(`  ${sev}  ${c.bold(f.title)}`);
      console.log(`           ${c.dim(relPath)}:${f.line}`);
      console.log(`           ${c.dim('Matched:')} ${f.matched}`);
      console.log('');
    }

    // Dedup summary by type
    const typeCounts = {};
    for (const f of findings) {
      typeCounts[f.title] = (typeCounts[f.title] || 0) + 1;
    }
    console.log(c.bold('  Summary by type:'));
    for (const [title, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${count}x ${title}`);
    }
  }

  console.log('');
  console.log(c.dim('─'.repeat(50)));
  console.log(`  ${c.cyan('Real-time browser protection:')}`);
  console.log(`  ${c.bold('Install Aegis OmniGuard')} — https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg`);
  console.log(c.dim('─'.repeat(50)));
  console.log('');

  return criticals.length > 0 ? 2 : warnings.length > 0 ? 1 : 0;
}

// ─── Main export ───
export async function runScan(targetDir) {
  const startTime = Date.now();
  const allFindings = [];
  let filesScanned = 0;

  for await (const filePath of walkFiles(targetDir)) {
    filesScanned++;
    const findings = await scanFile(filePath);
    allFindings.push(...findings);
  }

  const duration = Date.now() - startTime;
  const exitCode = renderReport(allFindings, targetDir, filesScanned, duration);

  return { findings: allFindings, filesScanned, duration, exitCode };
}

// ─── CLI entry ───
const isMain = (() => {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    return process.argv[1] && (
      process.argv[1] === thisFile ||
      process.argv[1].replace(/\\/g, '/') === thisFile.replace(/\\/g, '/')
    );
  } catch { return false; }
})();

if (isMain) {
  const target = process.argv[2] || process.cwd();
  console.log(`\n  Scanning ${target} ...\n`);
  const { exitCode } = await runScan(target);
  process.exit(exitCode);
}
