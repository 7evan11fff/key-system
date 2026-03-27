import { Redis } from '@upstash/redis';
import { Software, LicenseKey } from './types';
import { generateKey } from './utils';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key prefixes
const KEYS = {
  software: (id: string) => `software:${id}`,
  softwareList: 'software:list',
  key: (id: string) => `key:${id}`,
  keyByValue: (key: string) => `key:lookup:${key}`,
  keysBySoftware: (softwareId: string) => `software:${softwareId}:keys`,
};

// Software operations
export async function createSoftware(name: string, description?: string): Promise<Software> {
  const id = crypto.randomUUID();
  const software: Software = {
    id,
    name,
    description,
    createdAt: Date.now(),
  };
  
  await redis.set(KEYS.software(id), JSON.stringify(software));
  await redis.sadd(KEYS.softwareList, id);
  
  return software;
}

export async function getSoftware(id: string): Promise<Software | null> {
  const data = await redis.get<string>(KEYS.software(id));
  return data ? JSON.parse(data) : null;
}

export async function getAllSoftware(): Promise<Software[]> {
  const ids = await redis.smembers(KEYS.softwareList);
  if (!ids.length) return [];
  
  const software: Software[] = [];
  for (const id of ids) {
    const s = await getSoftware(id);
    if (s) software.push(s);
  }
  
  return software.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSoftware(id: string): Promise<boolean> {
  // Delete all keys for this software first
  const keyIds = await redis.smembers(KEYS.keysBySoftware(id));
  for (const keyId of keyIds) {
    await deleteKey(keyId);
  }
  
  await redis.del(KEYS.software(id));
  await redis.srem(KEYS.softwareList, id);
  
  return true;
}

// License key operations
export async function createKey(
  softwareId: string,
  options: {
    expiresAt?: number | null;
    hwidLocked?: boolean;
    note?: string;
  } = {}
): Promise<LicenseKey> {
  const id = crypto.randomUUID();
  const keyValue = generateKey();
  
  const key: LicenseKey = {
    id,
    key: keyValue,
    softwareId,
    expiresAt: options.expiresAt ?? null,
    hwidLocked: options.hwidLocked ?? false,
    hwid: null,
    note: options.note,
    createdAt: Date.now(),
    lastUsedAt: null,
    usageCount: 0,
    enabled: true,
  };
  
  await redis.set(KEYS.key(id), JSON.stringify(key));
  await redis.set(KEYS.keyByValue(keyValue), id);
  await redis.sadd(KEYS.keysBySoftware(softwareId), id);
  
  return key;
}

export async function getKey(id: string): Promise<LicenseKey | null> {
  const data = await redis.get<string>(KEYS.key(id));
  return data ? JSON.parse(data) : null;
}

export async function getKeyByValue(keyValue: string): Promise<LicenseKey | null> {
  const id = await redis.get<string>(KEYS.keyByValue(keyValue));
  if (!id) return null;
  return getKey(id);
}

export async function getKeysBySoftware(softwareId: string): Promise<LicenseKey[]> {
  const ids = await redis.smembers(KEYS.keysBySoftware(softwareId));
  if (!ids.length) return [];
  
  const keys: LicenseKey[] = [];
  for (const id of ids) {
    const k = await getKey(id);
    if (k) keys.push(k);
  }
  
  return keys.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateKey(id: string, updates: Partial<LicenseKey>): Promise<LicenseKey | null> {
  const key = await getKey(id);
  if (!key) return null;
  
  const updated = { ...key, ...updates };
  await redis.set(KEYS.key(id), JSON.stringify(updated));
  
  return updated;
}

export async function deleteKey(id: string): Promise<boolean> {
  const key = await getKey(id);
  if (!key) return false;
  
  await redis.del(KEYS.key(id));
  await redis.del(KEYS.keyByValue(key.key));
  await redis.srem(KEYS.keysBySoftware(key.softwareId), id);
  
  return true;
}

// Validation
export async function validateKey(
  keyValue: string,
  hwid?: string
): Promise<{ valid: boolean; error?: string; key?: LicenseKey }> {
  const key = await getKeyByValue(keyValue);
  
  if (!key) {
    return { valid: false, error: 'Invalid key' };
  }
  
  if (!key.enabled) {
    return { valid: false, error: 'Key is disabled' };
  }
  
  if (key.expiresAt && Date.now() > key.expiresAt) {
    return { valid: false, error: 'Key has expired' };
  }
  
  if (key.hwidLocked) {
    if (!hwid) {
      return { valid: false, error: 'HWID required for this key' };
    }
    
    if (key.hwid === null) {
      // First use - bind HWID
      await updateKey(key.id, { 
        hwid, 
        lastUsedAt: Date.now(),
        usageCount: key.usageCount + 1 
      });
    } else if (key.hwid !== hwid) {
      return { valid: false, error: 'HWID mismatch - key is locked to another device' };
    } else {
      // Valid - update usage
      await updateKey(key.id, { 
        lastUsedAt: Date.now(),
        usageCount: key.usageCount + 1 
      });
    }
  } else {
    // No HWID lock - just update usage
    await updateKey(key.id, { 
      lastUsedAt: Date.now(),
      usageCount: key.usageCount + 1 
    });
  }
  
  return { valid: true, key };
}
