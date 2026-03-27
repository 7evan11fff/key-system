// Generate a license key in format: XXXX-XXXX-XXXX-XXXX
export function generateKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  const segments: string[] = [];
  
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let c = 0; c < 4; c++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  
  return segments.join('-');
}

// Format timestamp to readable date
export function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Check if key is expired
export function isExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > expiresAt;
}

// Verify admin token
export function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.ADMIN_SECRET;
}

// Time helpers
export function daysFromNow(days: number): number {
  return Date.now() + (days * 24 * 60 * 60 * 1000);
}

export function hoursFromNow(hours: number): number {
  return Date.now() + (hours * 60 * 60 * 1000);
}
