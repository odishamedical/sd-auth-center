
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBz0OIk4xmOZras83es5HmJc03Ae60sMg8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sd-auth-center.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sd-auth-center",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixRole() {
  const ref = doc(db, "admin_roles", "npfcodisha@gmail.com");
  await setDoc(ref, {
    role: "project_admin",
    assignedHubs: ["news"]
  });
  console.log("npfcodisha@gmail.com successfully downgraded to project_admin (news hub only).");
}

fixRole().catch(console.error).finally(() => process.exit(0));
