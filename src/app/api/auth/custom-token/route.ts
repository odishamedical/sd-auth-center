import { NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    return new Response(JSON.stringify({ 
      message: "API Route is reachable!",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing'
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(`GET CRASHED: ${err.message}\nStack: ${err.stack}`, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    if (!projectId || !clientEmail || !privateKey) {
      return NextResponse.json({ 
        error: `Missing Service Account Credentials. ProjectID: ${!!projectId}, Email: ${!!clientEmail}, Key: ${!!privateKey}` 
      }, { status: 500 });
    }

    let privateKeyObj;
    try {
      privateKeyObj = await importPKCS8(privateKey, 'RS256');
    } catch (keyErr: any) {
      return NextResponse.json({ error: 'Failed to parse Private Key: ' + keyErr.message }, { status: 500 });
    }

    try {
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + 60 * 60; // 1 hour expiration

      // Generate a secure custom token manually using jose (bypasses firebase-admin)
      const customToken = await new SignJWT({ uid: uid })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .setIssuer(clientEmail)
        .setSubject(clientEmail)
        .setAudience('https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit')
        .sign(privateKeyObj);

      return NextResponse.json({ token: customToken });
    } catch (authError: any) {
      console.error('Error creating custom token:', authError);
      return NextResponse.json({ error: 'Token Gen Error: ' + authError.message }, { status: 500 });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
