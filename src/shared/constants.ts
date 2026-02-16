// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'aegis_settings',
  API_KEY: 'aegis_api_key_encrypted',
  INTERCEPT_LOG: 'aegis_intercept_log',
} as const;

// Known AI platform domains (for enhanced monitoring)
export const AI_PLATFORM_DOMAINS = [
  'chat.openai.com',
  'chatgpt.com',
  'claude.ai',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'poe.com',
  'perplexity.ai',
  'deepseek.com',
  'chat.deepseek.com',
  'groq.com',
  'huggingface.co',
] as const;

// DLP regex patterns (pre-filter stage)
export const DLP_PATTERNS = {
  // Credit card: 13-19 digits, possibly separated by spaces or dashes
  CREDIT_CARD: /\b(?:\d[ -]*?){13,19}\b/g,

  // Mnemonic: 12 or 24 words separated by spaces
  MNEMONIC_CANDIDATE: /\b([a-z]+(?:\s+[a-z]+){11}(?:\s+[a-z]+){0,12})\b/gi,

  // Ethereum private key: 0x followed by 64 hex chars
  ETH_PRIVATE_KEY: /\b0x[0-9a-fA-F]{64}\b/g,

  // Generic private key hex: 64 hex chars without 0x prefix
  HEX_PRIVATE_KEY: /\b[0-9a-fA-F]{64}\b/g,

  // API Key patterns (common formats)
  API_KEY_GENERIC: /\b(?:sk|pk|api|key|token|secret|password)[-_]?[a-zA-Z0-9]{20,}\b/gi,

  // OpenAI API Key: sk-proj-... or sk-...
  OPENAI_KEY: /\bsk-(?:proj-)?[a-zA-Z0-9]{20,}\b/g,

  // Anthropic API Key: sk-ant-...
  ANTHROPIC_KEY: /\bsk-ant-[a-zA-Z0-9-]{20,}\b/g,

  // Google AI / GCP API Key
  GOOGLE_KEY: /\bAIza[0-9A-Za-z_-]{35}\b/g,

  // GitHub Token
  GITHUB_TOKEN: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}\b/g,

  // AWS Access Key
  AWS_KEY: /\bAKIA[0-9A-Z]{16}\b/g,

  // .env KEY=VALUE pattern (detects sensitive config lines)
  ENV_KEY_VALUE: /\b(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|DATABASE_URL|DB_PASSWORD|AUTH_TOKEN|ACCESS_KEY)\s*[=:]\s*['"]?[^\s'"]{8,}['"]?\b/gi,

  // Chinese ID card (18 digits)
  CN_ID_CARD: /\b\d{17}[\dXx]\b/g,

  // Chinese phone number
  CN_PHONE: /\b1[3-9]\d{9}\b/g,

  // Email address
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
} as const;

// Masking templates
export const MASK_TEMPLATES: Record<string, string> = {
  credit_card: '**** **** **** ****',
  mnemonic: '[MNEMONIC REDACTED]',
  private_key: '[PRIVATE KEY REDACTED]',
  api_key: '[API KEY REDACTED]',
  pii_id_card: '****_****_****_**',
  pii_phone: '***_****_****',
  pii_email: '***@***.***',
} as const;
