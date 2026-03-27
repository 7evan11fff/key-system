import { NextRequest, NextResponse } from 'next/server';
import { createKey, getKeysBySoftware, getKey, updateKey, deleteKey } from '@/lib/db';
import { verifyAdminToken } from '@/lib/utils';
import { CreateKeyRequest } from '@/lib/types';

// Middleware to check admin auth
function checkAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('Authorization');
  if (!verifyAdminToken(authHeader)) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }
  return null;
}

// GET /api/admin/keys?softwareId=xxx - List keys for a software
export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const softwareId = req.nextUrl.searchParams.get('softwareId');
    
    if (!softwareId) {
      return NextResponse.json(
        { error: 'softwareId query param is required', code: 'MISSING_SOFTWARE_ID' },
        { status: 400 }
      );
    }
    
    const keys = await getKeysBySoftware(softwareId);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error listing keys:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/admin/keys - Create a new key
export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const body: CreateKeyRequest = await req.json();
    
    if (!body.softwareId) {
      return NextResponse.json(
        { error: 'softwareId is required', code: 'MISSING_SOFTWARE_ID' },
        { status: 400 }
      );
    }
    
    const key = await createKey(body.softwareId, {
      expiresAt: body.expiresAt,
      hwidLocked: body.hwidLocked,
      note: body.note,
    });
    
    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error('Error creating key:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/keys - Update a key
export async function PATCH(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Key ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }
    
    const { id, ...updates } = body;
    
    // Only allow updating certain fields
    const allowedUpdates: Record<string, unknown> = {};
    if ('enabled' in updates) allowedUpdates.enabled = updates.enabled;
    if ('expiresAt' in updates) allowedUpdates.expiresAt = updates.expiresAt;
    if ('note' in updates) allowedUpdates.note = updates.note;
    if ('hwid' in updates) allowedUpdates.hwid = updates.hwid; // Allow resetting HWID
    
    const key = await updateKey(id, allowedUpdates);
    
    if (!key) {
      return NextResponse.json(
        { error: 'Key not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ key });
  } catch (error) {
    console.error('Error updating key:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/keys - Delete a key
export async function DELETE(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Key ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }
    
    const success = await deleteKey(body.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Key not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting key:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
