import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST = "localhost:8081";

if (!getApps().length) {
  initializeApp({ projectId: "local" });
}

const adminDb = getFirestore();

export async function POST() {
  const collections = await adminDb.listCollections();
  let found = false;

  for (const col of collections) {
    const snapshot = await col.limit(1).get();
    if (!snapshot.empty) {
      console.log(snapshot.docs[0].ref.path, snapshot.docs[0].data());
      found = true;
      break;
    }
  }

  if (!found) console.log("boo");

  return new Response(null, { status: 204 });
}
