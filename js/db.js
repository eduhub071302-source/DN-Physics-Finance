import { app, auth } from './auth.js';
import { 
    getFirestore, collection, addDoc, onSnapshot, query, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const db = getFirestore(app);
let unsubscribe = null; 

// --- 1. ADD DATA ---
async function addTransaction(type, amount, currency) {
    if (!auth.currentUser) return alert("Please log in to save data!");
    
    try {
        await addDoc(collection(db, "transactions"), {
            uid: auth.currentUser.uid,
            type: type, // 'profit' or 'loss'
            currency: currency, // 'LKR' or 'USD'
            amount: parseFloat(amount),
            createdAt: serverTimestamp()
        });
        console.log("Transaction saved!");
    } catch (error) {
        alert("Failed to save transaction.");
    }
}

// Button Listeners mapped to respective Currencies
document.getElementById('add-payhere-btn').addEventListener('click', () => {
    const amount = prompt("Enter PayHere Payout Amount (Rs):");
    if (amount && !isNaN(amount) && amount > 0) addTransaction('profit', amount, 'LKR');
});

document.getElementById('add-paypal-btn').addEventListener('click', () => {
    const amount = prompt("Enter PayPal Payout Amount ($ USD):");
    if (amount && !isNaN(amount) && amount > 0) addTransaction('profit', amount, 'USD');
});

document.getElementById('add-withdrawal-btn').addEventListener('click', () => {
    const amount = prompt("Enter Withdrawal Amount to Mom's Account (Rs):");
    if (amount && !isNaN(amount) && amount > 0) addTransaction('loss', amount, 'LKR');
});

// --- 2. FETCH DATA IN REAL-TIME ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // FIXED: Removed orderBy to bypass the strict Firebase Index error
        const q = query(
            collection(db, "transactions"), 
            where("uid", "==", user.uid)
        );

        // Fetch everything, format dates, and shoot off to app.js for rendering
        unsubscribe = onSnapshot(q, (snapshot) => {
            const allTransactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Fix pending server timestamps instantly
                    dateObj: data.createdAt ? data.createdAt.toDate() : new Date() 
                };
            });

            // FIXED: Sort transactions chronologically on the frontend instead of the backend
            allTransactions.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

            // Send full array to app.js to map cleanly
            window.dispatchEvent(new CustomEvent('rawFinanceData', {
                detail: allTransactions
            }));
        }, (error) => {
            console.error("Snapshot error:", error);
        });
    } else {
        if (unsubscribe) unsubscribe();
        // Reset view if logged out
        window.dispatchEvent(new CustomEvent('rawFinanceData', { detail: [] }));
    }
});
