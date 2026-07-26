import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // In a real production environment, you would provide the service account credentials here
    // e.g., credential: admin.credential.cert(serviceAccount)
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'sd-auth-center',
    });
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
      const customToken = await admin.auth().createCustomToken(uid);
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
