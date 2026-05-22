import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TODO: Paste your Firebase Config object here
const firebaseConfig = {
  apiKey: "AIzaSyCtGfUOC7p_RyP6hEgXjJ6zWJ6UE6H7QWk",
  authDomain: "dn-physics-finance.firebaseapp.com",
  projectId: "dn-physics-finance",
  storageBucket: "dn-physics-finance.firebasestorage.app",
  messagingSenderId: "345091214520",
  appId: "1:345091214520:web:97391bf2c00fc9f11eb84d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Handle UI switching based on Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('dashboard-container').classList.remove('hidden');
    } else {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('dashboard-container').classList.add('hidden');
    }
});

// Google Login
document.getElementById('google-login-btn').addEventListener('click', () => {
    signInWithPopup(auth, provider).catch(error => alert(error.message));
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// Export these so db.js can use the same connection
export { app, auth };