// Core types for the key system

export interface Software {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface LicenseKey {
  id: string;
  key: string;
  softwareId: string;
  
  // Expiration
  expiresAt: number | null; // null = never expires
  
  // HWID Lock
  hwidLocked: boolean;
  hwid: string | null; // bound HWID, null until first use
  
  // Metadata
  note?: string; // e.g., customer name/email
  createdAt: number;
  lastUsedAt: number | null;
  usageCount: number;
  
  // Status
  enabled: boolean;
}

export interface ValidateRequest {
  key: string;
  hwid?: string; // required if key has HWID lock enabled
}

export interface ValidateResponse {
  valid: boolean;
  error?: string;
  expiresAt?: number | null;
  software?: string;
}

export interface CreateKeyRequest {
  softwareId: string;
  expiresAt?: number | null; // Unix timestamp or null for never
  hwidLocked?: boolean;
  note?: string;
}

export interface ApiError {
  error: string;
  code: string;
}
