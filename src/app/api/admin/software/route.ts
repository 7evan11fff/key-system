import { NextRequest, NextResponse } from 'next/server';
import { createSoftware, getAllSoftware, deleteSoftware } from '@/lib/db';
import { verifyAdminToken } from '@/lib/utils';

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

// GET /api/admin/software - List all software
export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const software = await getAllSoftware();
    return NextResponse.json({ software });
  } catch (error) {
    console.error('Error listing software:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/admin/software - Create new software
export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }
    
    const software = await createSoftware(body.name, body.description);
    return NextResponse.json({ software }, { status: 201 });
  } catch (error) {
    console.error('Error creating software:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/software - Delete software (with id in body)
export async function DELETE(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Software ID is required', code: 'MISSING_ID' },
        { status: 400 }
      );
    }
    
    await deleteSoftware(body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting software:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
