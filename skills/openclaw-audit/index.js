#!/usr/bin/env node

// ============================================================================
// openclaw-audit — Security audit skill for OpenClaw AI agent installations
// Part of the Aegis OmniGuard project
// ============================================================================

import { readdir, readFile, stat, access } from "node:fs/promises";
import { join, basename, resolve, extname } from "node:path";
import { homedir, platform } from "node:os";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY = Object.freeze({
  SAFE: "SAFE",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

const SEVERITY_ICON = Object.freeze({
  [SEVERITY.SAFE]: "\u2705",       // green check
  [SEVERITY.WARNING]: "\u26A0\uFE0F",  // warning triangle
  [SEVERITY.CRITICAL]: "\u274C",   // red X
});

const SEVERITY_ORDER = Object.freeze({
  [SEVERITY.SAFE]: 0,
  [SEVERITY.WARNING]: 1,
  [SEVERITY.CRITICAL]: 2,
});

/** Minimum Node.js version that includes all known OpenClaw-related security patches. */
const MIN_SAFE_NODE_VERSION = "22.12.0";

/** Extensions we scan inside Skills directories. */
const SCANNABLE_EXTENSIONS = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx", ".json",
]);

/** Max individual file size we will read (2 MB). */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Malicious-pattern definitions
// ---------------------------------------------------------------------------

/**
 * Each pattern detector returns an array of Finding objects when matched.
 * A Finding: { severity, title, detail, file?, line? }
 */

const SUSPICIOUS_URL_RE =
  /(?:fetch|axios|got|request|http\.get|https\.get|XMLHttpRequest)\s*\(\s*['"`](https?:\/\/[^'"`\s]+)['"`]/gi;

const SUSPICIOUS_HOSTS = [
  /pastebin\.com/i,
  /ngrok\.io/i,
  /requestbin/i,
  /pipedream/i,
  /burpcollaborator/i,
  /interact\.sh/i,
  /oast\./i,
  /webhook\.site/i,
  /hookbin\.com/i,
  /evil\./i,
  /exfil/i,
  /c2\./i,
  /cnc\./i,
  /attacker/i,
];

const BASE64_LONG_RE = /['"`]([A-Za-z0-9+/]{60,}={0,2})['"`]/g;

const SENSITIVE_PATH_RE =
  /(?:readFile|readFileSync|createReadStream)\s*\(\s*['"`]?[^)]*(?:\.env|\.ssh|id_rsa|id_ed25519|credentials|\.aws\/|\.kube\/config|shadow|passwd|known_hosts|\.gnupg|\.npmrc|\.pypirc)/gi;

const ENV_ACCESS_RE =
  /process\.env\s*(?:\[|\.)\s*['"`]?(?:SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL|API_KEY|PRIVATE|AWS_|GITHUB_TOKEN|OPENAI_API|ANTHROPIC_API)/gi;

const WALLET_PRIVATE_KEY_RE = /0x[0-9a-fA-F]{64}/g;

const SEED_PHRASE_WORDS = new Set([
  "abandon", "ability", "able", "about", "above", "absent", "absorb",
  "abstract", "absurd", "abuse", "access", "accident", "account", "accuse",
  "achieve", "acid", "acoustic", "acquire", "across", "act", "action",
  "actor", "actress", "actual", "adapt", "add", "addict", "address",
  "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair",
  "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim",
  "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
  "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already",
  "also", "alter", "always", "amateur", "amazing", "among", "amount",
  "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
  "animal", "ankle", "announce", "annual", "another", "answer", "antenna",
  "antique", "anxiety", "any", "apart", "apology", "appear", "apple",
  "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm",
  "armed", "armor", "army", "around", "arrange", "arrest", "arrive",
  "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect",
  "assault", "asset", "assist", "assume", "asthma", "athlete", "atom",
  "attack", "attend", "attitude", "attract", "auction", "audit", "august",
  "aunt", "author", "auto", "autumn", "average", "avocado", "avoid",
  "awake", "aware", "awesome", "awful", "awkward", "axis",
]);

const SEED_PHRASE_RE = /['"`](\b\w+(?:\s+\w+){11,23}\b)['"`]/g;

const WEBSOCKET_EXTERNAL_RE =
  /new\s+WebSocket\s*\(\s*['"`](wss?:\/\/[^'"`\s]+)['"`]/gi;

const DANGEROUS_EXEC_RE =
  /\b(?:eval|Function)\s*\(|child_process\s*(?:\.\s*exec|\.\s*execSync|\.\s*spawn|\.\s*fork)|require\s*\(\s*['"`]child_process['"`]\)/g;

const DNS_EXFIL_RE =
  /(?:dns\.resolve|dns\.lookup|dgram\.createSocket|\.setServers)\s*\(/g;

const DNS_CONCAT_RE =
  /['"`]\s*\+\s*[^+]+\s*\+\s*['"`]\s*\.(?:attacker|evil|exfil|oast|ns\d)/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorText(text, colorCode) {
  // Support NO_COLOR / dumb terminals gracefully.
  if (process.env.NO_COLOR || process.env.TERM === "dumb") return text;
  return `\x1b[${colorCode}m${text}\x1b[0m`;
}

const red    = (t) => colorText(t, "31");
const green  = (t) => colorText(t, "32");
const yellow = (t) => colorText(t, "33");
const cyan   = (t) => colorText(t, "36");
const bold   = (t) => colorText(t, "1");
const dim    = (t) => colorText(t, "2");

function severityColor(sev) {
  if (sev === SEVERITY.CRITICAL) return red(sev);
  if (sev === SEVERITY.WARNING)  return yellow(sev);
  return green(sev);
}

/** Compare semver strings. Returns -1 if a < b, 0 if equal, 1 if a > b. */
function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function safeReadFile(filePath) {
  try {
    const s = await stat(filePath);
    if (s.size > MAX_FILE_SIZE) return null;
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function walkDir(dir, fileList = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return fileList;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and .git to avoid noise.
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      await walkDir(fullPath, fileList);
    } else if (entry.isFile() && SCANNABLE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function lineNumber(content, index) {
  return content.substring(0, index).split("\n").length;
}

function isSeedPhrase(candidate) {
  const words = candidate.trim().split(/\s+/);
  if (words.length < 12 || words.length > 24) return false;
  let bip39Count = 0;
  for (const w of words) {
    if (SEED_PHRASE_WORDS.has(w.toLowerCase())) bip39Count++;
  }
  // Require at least 75% BIP-39 words to flag.
  return bip39Count / words.length >= 0.75;
}

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

/**
 * Scan a single file's contents for malicious patterns.
 * Returns an array of Finding objects.
 */
function scanFileContent(filePath, content) {
  const findings = [];
  const relativePath = filePath; // caller can make relative if desired
  let m;

  // --- Outbound HTTP to suspicious URLs ---
  SUSPICIOUS_URL_RE.lastIndex = 0;
  while ((m = SUSPICIOUS_URL_RE.exec(content)) !== null) {
    const url = m[1];
    const isSuspicious = SUSPICIOUS_HOSTS.some((re) => re.test(url));
    if (isSuspicious) {
      findings.push({
        severity: SEVERITY.CRITICAL,
        title: "Suspicious outbound HTTP request",
        detail: `URL: ${url}`,
        file: relativePath,
        line: lineNumber(content, m.index),
      });
    } else {
      findings.push({
        severity: SEVERITY.WARNING,
        title: "Outbound HTTP request detected",
        detail: `URL: ${url}`,
        file: relativePath,
        line: lineNumber(content, m.index),
      });
    }
  }

  // --- Base64-encoded strings (obfuscation) ---
  BASE64_LONG_RE.lastIndex = 0;
  while ((m = BASE64_LONG_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.WARNING,
      title: "Long Base64-encoded string (possible obfuscation)",
      detail: `Length: ${m[1].length} chars`,
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  // --- Sensitive file reads ---
  SENSITIVE_PATH_RE.lastIndex = 0;
  while ((m = SENSITIVE_PATH_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: "Read of sensitive file path",
      detail: m[0].trim(),
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  // --- Sensitive env var access ---
  ENV_ACCESS_RE.lastIndex = 0;
  while ((m = ENV_ACCESS_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: "Access to sensitive environment variable",
      detail: m[0].trim(),
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  // --- Crypto wallet private keys ---
  WALLET_PRIVATE_KEY_RE.lastIndex = 0;
  while ((m = WALLET_PRIVATE_KEY_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: "Possible crypto wallet private key",
      detail: `${m[0].substring(0, 10)}...${m[0].substring(m[0].length - 6)}`,
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  // --- Seed phrases ---
  SEED_PHRASE_RE.lastIndex = 0;
  while ((m = SEED_PHRASE_RE.exec(content)) !== null) {
    if (isSeedPhrase(m[1])) {
      findings.push({
        severity: SEVERITY.CRITICAL,
        title: "Possible BIP-39 seed phrase",
        detail: `${m[1].split(/\s+/).length} words detected`,
        file: relativePath,
        line: lineNumber(content, m.index),
      });
    }
  }

  // --- External WebSocket connections ---
  WEBSOCKET_EXTERNAL_RE.lastIndex = 0;
  while ((m = WEBSOCKET_EXTERNAL_RE.exec(content)) !== null) {
    const wsUrl = m[1];
    // localhost / 127.0.0.1 are generally safe
    if (/localhost|127\.0\.0\.1/i.test(wsUrl)) continue;
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: "WebSocket connection to external host",
      detail: `URL: ${wsUrl}`,
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  // --- Dangerous eval / child_process usage ---
  DANGEROUS_EXEC_RE.lastIndex = 0;
  while ((m = DANGEROUS_EXEC_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: "Dangerous code execution primitive",
      detail: m[0].trim(),
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  // --- DNS exfiltration patterns ---
  DNS_EXFIL_RE.lastIndex = 0;
  while ((m = DNS_EXFIL_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.WARNING,
      title: "DNS resolution API usage (potential exfiltration vector)",
      detail: m[0].trim(),
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  DNS_CONCAT_RE.lastIndex = 0;
  while ((m = DNS_CONCAT_RE.exec(content)) !== null) {
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: "DNS exfiltration pattern (data concatenated into hostname)",
      detail: m[0].trim(),
      file: relativePath,
      line: lineNumber(content, m.index),
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Config checks
// ---------------------------------------------------------------------------

/**
 * Inspect openclaw config files for insecure settings.
 * Returns findings array.
 */
async function checkConfig(openclawDir) {
  const findings = [];

  // Possible config locations
  const configCandidates = [
    join(openclawDir, "config.json"),
    join(openclawDir, "config.yaml"),
    join(openclawDir, "config.yml"),
    join(openclawDir, "openclaw.config.json"),
    join(openclawDir, "openclaw.config.js"),
    join(openclawDir, ".openclawrc"),
    join(openclawDir, ".openclawrc.json"),
  ];

  let configFound = false;

  for (const configPath of configCandidates) {
    const content = await safeReadFile(configPath);
    if (content === null) continue;
    configFound = true;

    // -- Exposed port on 0.0.0.0 --
    if (/0\.0\.0\.0/i.test(content)) {
      findings.push({
        severity: SEVERITY.CRITICAL,
        title: "WebSocket/HTTP server bound to 0.0.0.0 (all interfaces)",
        detail: "The server is exposed to all network interfaces. Bind to 127.0.0.1 instead.",
        file: configPath,
      });
    }

    // -- Authentication disabled --
    const authDisabledPatterns = [
      /["']?auth(?:entication)?["']?\s*[:=]\s*(?:false|["']?none["']?|["']?disabled["']?)/i,
      /["']?require_?auth["']?\s*[:=]\s*false/i,
      /["']?no_?auth["']?\s*[:=]\s*true/i,
      /["']?anonymous["']?\s*[:=]\s*true/i,
    ];

    for (const pattern of authDisabledPatterns) {
      if (pattern.test(content)) {
        findings.push({
          severity: SEVERITY.CRITICAL,
          title: "Authentication is disabled",
          detail: "Any client can connect without credentials. Enable authentication immediately.",
          file: configPath,
        });
        break;
      }
    }

    // -- Token/key in plaintext config --
    if (/["']?(?:api[_-]?key|token|secret|password)["']?\s*[:=]\s*["'][^"']{8,}["']/i.test(content)) {
      findings.push({
        severity: SEVERITY.WARNING,
        title: "Possible plaintext credential in config file",
        detail: "Secrets should be stored in environment variables or a vault, not config files.",
        file: configPath,
      });
    }

    // -- TLS / SSL disabled --
    if (/["']?(?:tls|ssl)["']?\s*[:=]\s*false/i.test(content)) {
      findings.push({
        severity: SEVERITY.WARNING,
        title: "TLS/SSL is disabled",
        detail: "Traffic will be unencrypted. Enable TLS for production deployments.",
        file: configPath,
      });
    }
  }

  if (!configFound) {
    findings.push({
      severity: SEVERITY.WARNING,
      title: "No configuration file found",
      detail: "Could not locate an OpenClaw config file. Default settings may be insecure.",
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Node.js version check
// ---------------------------------------------------------------------------

function checkNodeVersion() {
  const findings = [];
  let nodeVersion;

  try {
    nodeVersion = execSync("node --version", { encoding: "utf-8" }).trim().replace(/^v/, "");
  } catch {
    findings.push({
      severity: SEVERITY.WARNING,
      title: "Could not determine Node.js version",
      detail: "Ensure Node.js >= " + MIN_SAFE_NODE_VERSION + " is installed for security patches.",
    });
    return { findings, nodeVersion: "unknown" };
  }

  if (compareSemver(nodeVersion, MIN_SAFE_NODE_VERSION) < 0) {
    findings.push({
      severity: SEVERITY.CRITICAL,
      title: `Node.js version ${nodeVersion} is below minimum safe version`,
      detail: `Upgrade to Node.js >= ${MIN_SAFE_NODE_VERSION} to include security patches for CVE-2026-25253 and related vulnerabilities.`,
    });
  } else {
    findings.push({
      severity: SEVERITY.SAFE,
      title: `Node.js version ${nodeVersion} meets minimum requirement`,
      detail: `>= ${MIN_SAFE_NODE_VERSION}`,
    });
  }

  return { findings, nodeVersion };
}

// ---------------------------------------------------------------------------
// CVE-2026-25253 specific check
// ---------------------------------------------------------------------------

async function checkCVE202625253(openclawDir) {
  const findings = [];

  // This CVE is a WebSocket RCE. Check for the vulnerable handler pattern.
  const wsHandlerPaths = [
    join(openclawDir, "server", "ws.js"),
    join(openclawDir, "server", "websocket.js"),
    join(openclawDir, "lib", "ws-handler.js"),
    join(openclawDir, "node_modules", "openclaw-core", "lib", "ws.js"),
  ];

  for (const wsPath of wsHandlerPaths) {
    const content = await safeReadFile(wsPath);
    if (content === null) continue;

    // The vulnerable pattern: deserializing WebSocket messages without validation
    if (
      /JSON\.parse\s*\([^)]*\)\s*(?:\.|\[)/.test(content) &&
      !/(?:validate|sanitize|schema|zod|joi|ajv)\s*[\.(]/i.test(content)
    ) {
      findings.push({
        severity: SEVERITY.CRITICAL,
        title: "CVE-2026-25253: Potential WebSocket RCE vulnerability",
        detail: "WebSocket handler deserializes messages without input validation. Apply the official patch or upgrade openclaw-core.",
        file: wsPath,
      });
    }
  }

  // Also check the installed openclaw-core version if available.
  const corePkgPath = join(openclawDir, "node_modules", "openclaw-core", "package.json");
  const corePkg = await safeReadFile(corePkgPath);
  if (corePkg) {
    try {
      const parsed = JSON.parse(corePkg);
      const version = parsed.version || "0.0.0";
      // Versions before 4.2.1 are vulnerable.
      if (compareSemver(version, "4.2.1") < 0) {
        findings.push({
          severity: SEVERITY.CRITICAL,
          title: `CVE-2026-25253: openclaw-core@${version} is vulnerable`,
          detail: "Upgrade to openclaw-core >= 4.2.1 which contains the RCE fix.",
          file: corePkgPath,
        });
      }
    } catch {
      // Malformed package.json is itself suspicious.
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

function renderReport(allFindings, openclawDir, nodeVersion, skillsScanned, filesScanned, elapsedMs) {
  const lines = [];
  const hr = dim("\u2500".repeat(70));

  lines.push("");
  lines.push(hr);
  lines.push(bold("  \uD83D\uDD0D  OpenClaw Security Audit Report"));
  lines.push(hr);
  lines.push("");
  lines.push(`  ${cyan("Target:")}        ${openclawDir}`);
  lines.push(`  ${cyan("Node.js:")}       ${nodeVersion}`);
  lines.push(`  ${cyan("Skills scanned:")} ${skillsScanned}`);
  lines.push(`  ${cyan("Files scanned:")}  ${filesScanned}`);
  lines.push(`  ${cyan("Duration:")}       ${elapsedMs} ms`);
  lines.push("");

  // Tally
  const counts = { [SEVERITY.SAFE]: 0, [SEVERITY.WARNING]: 0, [SEVERITY.CRITICAL]: 0 };
  for (const f of allFindings) counts[f.severity]++;

  // Overall verdict
  let overallSeverity = SEVERITY.SAFE;
  if (counts[SEVERITY.WARNING] > 0) overallSeverity = SEVERITY.WARNING;
  if (counts[SEVERITY.CRITICAL] > 0) overallSeverity = SEVERITY.CRITICAL;

  const icon = SEVERITY_ICON[overallSeverity];
  lines.push(`  ${bold("Overall:")} ${icon}  ${severityColor(overallSeverity)}`);
  lines.push("");
  lines.push(
    `  ${green(`${counts[SEVERITY.SAFE]} safe`)}  |  ` +
    `${yellow(`${counts[SEVERITY.WARNING]} warnings`)}  |  ` +
    `${red(`${counts[SEVERITY.CRITICAL]} critical`)}`
  );
  lines.push("");
  lines.push(hr);

  // Group findings by severity (critical first)
  const sorted = [...allFindings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );

  if (sorted.length === 0 || (sorted.length === 1 && sorted[0].severity === SEVERITY.SAFE)) {
    lines.push("");
    lines.push(`  ${green("\u2705  No issues detected. Installation appears clean.")}`);
    lines.push("");
  } else {
    for (const finding of sorted) {
      if (finding.severity === SEVERITY.SAFE) continue; // don't clutter with safe items
      const fIcon = SEVERITY_ICON[finding.severity];
      const fColor = finding.severity === SEVERITY.CRITICAL ? red : yellow;
      lines.push("");
      lines.push(`  ${fIcon}  ${fColor(bold(finding.title))}`);
      if (finding.file) {
        const loc = finding.line ? `${finding.file}:${finding.line}` : finding.file;
        lines.push(`     ${dim("Location:")} ${loc}`);
      }
      lines.push(`     ${dim("Detail:")}   ${finding.detail}`);
    }
    lines.push("");
  }

  lines.push(hr);
  lines.push("");
  lines.push("  \uD83D\uDEE1\uFE0F  Real-time browser protection \u2192 Install Aegis OmniGuard: https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runAudit(targetDir) {
  const startTime = Date.now();

  // Resolve the OpenClaw directory.
  let openclawDir;
  if (targetDir) {
    openclawDir = resolve(targetDir);
  } else {
    // Default: ~/.openclaw/
    const defaultDir = join(homedir(), ".openclaw");
    openclawDir = defaultDir;
  }

  console.log("");
  console.log(bold("  \uD83D\uDD0D  openclaw-audit v1.0.0"));
  console.log(dim(`  Scanning ${openclawDir} ...`));
  console.log("");

  // Verify the directory exists.
  if (!(await exists(openclawDir))) {
    console.log(yellow(`  \u26A0\uFE0F  Directory not found: ${openclawDir}`));
    console.log(dim("  Provide a path to your OpenClaw installation, e.g.:"));
    console.log(dim("    node index.js /path/to/openclaw"));
    console.log("");
    console.log("  \uD83D\uDEE1\uFE0F  Real-time browser protection \u2192 Install Aegis OmniGuard: https://chromewebstore.google.com/detail/aegis-omniguard/fcgceeldnoifbaffonoaicbbcncfkjgg");
    console.log("");
    return { overallSeverity: null, findings: [] };
  }

  const allFindings = [];

  // 1. Node.js version check
  const { findings: nodeFindings, nodeVersion } = checkNodeVersion();
  allFindings.push(...nodeFindings);

  // 2. Config checks
  const configFindings = await checkConfig(openclawDir);
  allFindings.push(...configFindings);

  // 3. CVE-2026-25253 specific check
  const cveFindings = await checkCVE202625253(openclawDir);
  allFindings.push(...cveFindings);

  // 4. Scan skills/ directory for malicious patterns
  const skillsDir = join(openclawDir, "skills");
  let skillsScanned = 0;
  let filesScanned = 0;

  if (await exists(skillsDir)) {
    let skillDirs;
    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      skillDirs = entries.filter((e) => e.isDirectory()).map((e) => join(skillsDir, e.name));
    } catch {
      skillDirs = [];
    }

    skillsScanned = skillDirs.length;

    for (const skillDir of skillDirs) {
      const files = await walkDir(skillDir);
      for (const filePath of files) {
        filesScanned++;
        const content = await safeReadFile(filePath);
        if (content === null) continue;
        const fileFindings = scanFileContent(filePath, content);
        allFindings.push(...fileFindings);
      }
    }

    if (skillsScanned === 0) {
      allFindings.push({
        severity: SEVERITY.SAFE,
        title: "No Skills installed",
        detail: "The skills/ directory exists but contains no Skills.",
      });
    }
  } else {
    allFindings.push({
      severity: SEVERITY.SAFE,
      title: "No skills/ directory found",
      detail: "No third-party Skills are installed.",
    });
  }

  // Also scan the top-level directory files (server configs, etc.)
  const topLevelFiles = await walkDir(openclawDir, []);
  // Filter out files already scanned inside skills/
  const alreadyScanned = new Set();
  if (await exists(skillsDir)) {
    // Mark all files under skills/ as already scanned
    for (const f of topLevelFiles) {
      if (f.startsWith(skillsDir)) alreadyScanned.add(f);
    }
  }
  for (const filePath of topLevelFiles) {
    if (alreadyScanned.has(filePath)) continue;
    filesScanned++;
    const content = await safeReadFile(filePath);
    if (content === null) continue;
    const fileFindings = scanFileContent(filePath, content);
    allFindings.push(...fileFindings);
  }

  const elapsedMs = Date.now() - startTime;

  // Render the report
  const report = renderReport(allFindings, openclawDir, nodeVersion, skillsScanned, filesScanned, elapsedMs);
  console.log(report);

  // Determine overall severity for programmatic use.
  let overallSeverity = SEVERITY.SAFE;
  for (const f of allFindings) {
    if (SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[overallSeverity]) {
      overallSeverity = f.severity;
    }
  }

  return { overallSeverity, findings: allFindings };
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function isRunDirectly() {
  if (!process.argv[1]) return false;
  const argvResolved = resolve(process.argv[1]);
  // import.meta.url is a file:// URL. On Windows it produces "/E:/path",
  // so we strip the leading slash for comparison.
  let scriptPath;
  try {
    scriptPath = new URL(import.meta.url).pathname;
  } catch {
    return false;
  }
  if (platform() === "win32") {
    scriptPath = scriptPath.replace(/^\//, "");
  }
  scriptPath = decodeURIComponent(scriptPath);
  return argvResolved === resolve(scriptPath);
}

if (isRunDirectly()) {
  const targetDir = process.argv[2] || null;
  runAudit(targetDir).then(({ overallSeverity }) => {
    if (overallSeverity === SEVERITY.CRITICAL) process.exitCode = 2;
    else if (overallSeverity === SEVERITY.WARNING) process.exitCode = 1;
    else process.exitCode = 0;
  });
}
