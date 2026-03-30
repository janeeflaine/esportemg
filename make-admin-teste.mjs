import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

async function run() {
    try {
        const q = query(collection(db, "users"), where("email", "==", "teste@teste.com"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("User teste@teste.com not found in Firestore yet.");
        } else {
            for (const docSnap of querySnapshot.docs) {
                await updateDoc(doc(db, "users", docSnap.id), {
                    role: "admin"
                });
                console.log(`Updated user ${docSnap.id} (teste@teste.com) to admin.`);
            }
        }
        setTimeout(() => { process.exit(0); }, 500);
    } catch (error) {
        console.error("Error updating user:", error);
        process.exit(1);
    }
}

run();
