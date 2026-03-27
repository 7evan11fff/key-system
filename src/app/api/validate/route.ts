import { NextRequest, NextResponse } from 'next/server';
import { validateKey, getSoftware } from '@/lib/db';
import { ValidateRequest, ValidateResponse } from '@/lib/types';

// POST /api/validate - Public endpoint for validating keys
export async function POST(req: NextRequest) {
  try {
    const body: ValidateRequest = await req.json();
    
    if (!body.key) {
      return NextResponse.json(
        { valid: false, error: 'Key is required' },
        { status: 400 }
      );
    }
    
    const result = await validateKey(body.key, body.hwid);
    
    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error } as ValidateResponse,
        { status: 200 } // Still 200, validity is in response body
      );
    }
    
    // Get software name for response
    const software = result.key ? await getSoftware(result.key.softwareId) : null;
    
    const response: ValidateResponse = {
      valid: true,
      expiresAt: result.key?.expiresAt,
      software: software?.name,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/validate - Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'key-system' });
}
