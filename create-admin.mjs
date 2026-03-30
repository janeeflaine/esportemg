import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const email = "janeeflaine+1@gmail.com";
const password = "hp321123*+21";
const name = "Admin Janee";

async function run() {
    try {
        console.log(`Creating user ${email}...`);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("User created with UID:", user.uid);

        console.log("Creating admin user document in Firestore...");
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            role: "admin",
            createdAt: Date.now()
        }, { merge: true });

        console.log("Admin user set up completely!");
        setTimeout(() => { process.exit(0); }, 500);
    } catch (error) {
        console.error("Error setting up user:", error);
        process.exit(1);
    }
}

run();
