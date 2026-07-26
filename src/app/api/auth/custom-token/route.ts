import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newline characters in the private key from Vercel environment variables
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // Fallback for local testing without service account
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sd-auth-center',
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing UID' }, { status: 400 });
    }

    try {
      // Generate a secure custom token for the user
      const customToken = await getAuth().createCustomToken(uid);
      return NextResponse.json({ token: customToken });
    } catch (authError) {
      console.error('Error creating custom token:', authError);
      
      // FALLBACK FOR DEVELOPMENT MVP
      // If Firebase Admin fails (due to missing service account credentials locally),
      // we return a mock token prefix so the frontend can handle the fallback routing
      return NextResponse.json({ token: `mock_token_${uid}` });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
