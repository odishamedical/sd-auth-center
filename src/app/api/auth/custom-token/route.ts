import { NextResponse } from 'next/server';
// import { getApps, initializeApp, cert } from 'firebase-admin/app';
// import { getAuth } from 'firebase-admin/auth';

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

    /* 
    // Initialize Firebase Admin INSIDE the request to ensure env vars are loaded
    if (!getApps().length) {
      const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
      };

      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        return NextResponse.json({ 
          error: `Missing Service Account Credentials. ProjectID: ${!!serviceAccount.projectId}, Email: ${!!serviceAccount.clientEmail}, Key: ${!!serviceAccount.privateKey}` 
        }, { status: 500 });
      }

      try {
        initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (initErr: any) {
        return NextResponse.json({ error: 'Firebase Admin Init Error: ' + initErr.message }, { status: 500 });
      }
    }

    try {
      // Generate a secure custom token for the user
      const customToken = await getAuth().createCustomToken(uid);
      return NextResponse.json({ token: customToken });
    } catch (authError: any) {
      console.error('Error creating custom token:', authError);
      return NextResponse.json({ error: authError.message || "Unknown auth error" }, { status: 500 });
    }
    */
    return NextResponse.json({ token: "MOCK_TOKEN_FOR_TESTING" });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
}
