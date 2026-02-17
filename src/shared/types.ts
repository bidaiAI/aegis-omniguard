// ===== DLP Engine Types =====

export type SensitiveDataType =
  | 'credit_card'
  | 'mnemonic'
  | 'private_key'
  | 'private_key_bitcoin'
  | 'private_key_solana'
  | 'private_key_tron'
  | 'api_key'
  | 'pii_id_card'
  | 'pii_phone'
  | 'pii_email';

export interface DLPDetection {
  type: SensitiveDataType;
  original: string;
  masked: string;
  confidence: number; // 0-1
  position: { start: number; end: number };
}

export type DLPVerdict = 'pass' | 'block';

export interface DLPScanResult {
  verdict: DLPVerdict;
  detections: DLPDetection[];
  scannedAt: number;
}

// ===== Message Protocol =====

export interface DLPScanRequest {
  type: 'DLP_SCAN';
  payload: {
    text: string;
    url: string;
  };
}

export interface DLPScanResponse {
  type: 'DLP_SCAN_RESULT';
  payload: DLPScanResult;
}

export interface Web3InterceptRequest {
  type: 'WEB3_INTERCEPT';
  payload: {
    method: string;
    params: unknown[];
    origin: string;
  };
}

export interface Web3InterceptResponse {
  type: 'WEB3_INTERCEPT_RESULT';
  payload: {
    action: 'approve' | 'reject';
    riskLevel: 'safe' | 'warning' | 'danger';
    explanation: string;
  };
}

export type AegisMessage =
  | DLPScanRequest
  | DLPScanResponse
  | Web3InterceptRequest
  | Web3InterceptResponse;

// ===== Intercept Log =====

export interface InterceptLogEntry {
  id: string;
  timestamp: number;
  url: string;
  domain: string;
  detections: Array<{ type: SensitiveDataType; masked: string }>;
}

// ===== Settings =====

export type ProtectionLevel = 'low' | 'medium' | 'high';
export type LLMProvider = 'openai' | 'anthropic' | 'deepseek';

export interface AegisSettings {
  enabled: boolean;
  protectionLevel: ProtectionLevel;
  whitelist: string[];
  web2DlpEnabled: boolean;
  web3SentinelEnabled: boolean;
  llmProvider: LLMProvider | null; // null = use free cloud
  language: 'en' | 'zh';
}

export const DEFAULT_SETTINGS: AegisSettings = {
  enabled: true,
  protectionLevel: 'medium',
  whitelist: [],
  web2DlpEnabled: true,
  web3SentinelEnabled: true,
  llmProvider: null,
  language: 'en',
};

// ===== Sentinel Engine Types =====

export type RiskLevel = 'safe' | 'warning' | 'danger';

export interface SentinelResult {
  riskLevel: RiskLevel;
  explanation: string;
  riskFactors: string[];
  method: string;
  decodedAction?: string;
}

// ===== LLM Usage Tracking =====

export interface LLMUsageRecord {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface LLMUsageStats {
  today: number;
  dailyLimit: number;
  provider: LLMProvider | 'free_cloud';
  hasApiKey: boolean;
}
