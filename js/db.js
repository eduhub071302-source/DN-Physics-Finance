import { app, auth } from './auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Initialize the database
const db = getFirestore(app);
let unsubscribe = null; // Used to stop listening to data when logged out

// --- 1. ADD DATA TO FIRESTORE ---
async function addTransaction(type, amount) {
    if (!auth.currentUser) return alert("Please log in to save data!");
    
    try {
        await addDoc(collection(db, "transactions"), {
            uid: auth.currentUser.uid,
            type: type, // 'profit' (PayHere) or 'loss' (Mom)
            amount: parseFloat(amount),
            createdAt: serverTimestamp()
        });
        console.log("Transaction successfully saved!");
    } catch (error) {
        console.error("Error adding transaction: ", error);
        alert("Failed to save transaction.");
    }
}

// Button Listeners for adding entries
document.getElementById('add-payhere-btn').addEventListener('click', () => {
    // Using a prompt for simplicity; you can upgrade this to a nice HTML modal later
    const amount = prompt("Enter new PayHere Payout Amount ($):");
    if (amount && !isNaN(amount) && amount > 0) {
        addTransaction('profit', amount);
    }
});

document.getElementById('add-withdrawal-btn').addEventListener('click', () => {
    const amount = prompt("Enter Withdrawal Amount to Mom's Account ($):");
    if (amount && !isNaN(amount) && amount > 0) {
        addTransaction('loss', amount);
    }
});

// --- 2. READ DATA IN REAL-TIME ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Query to only get the logged-in user's transactions, sorted by time
        const q = query(
            collection(db, "transactions"), 
            where("uid", "==", user.uid),
            orderBy("createdAt", "asc")
        );

        // onSnapshot constantly listens. If you add data on your phone, your PC updates instantly.
        unsubscribe = onSnapshot(q, (snapshot) => {
            let totalProfit = 0;
            let totalLoss = 0;
            
            // Arrays to hold data for the Chart
            const chartLabels = [];
            const profitData = [];
            const lossData = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // Calculate Totals
                if (data.type === 'profit') {
                    totalProfit += data.amount;
                } else if (data.type === 'loss') {
                    totalLoss += data.amount;
                }
                
                // Format Data for the Graph
                if (data.createdAt) {
                    const dateObj = data.createdAt.toDate();
                    chartLabels.push(`${dateObj.getMonth() + 1}/${dateObj.getDate()}`);
                    profitData.push(data.type === 'profit' ? data.amount : 0);
                    lossData.push(data.type === 'loss' ? data.amount : 0);
                }
            });

            // Update the Dashboard Cards
            document.getElementById('total-profit').textContent = `$${totalProfit.toFixed(2)}`;
            document.getElementById('total-loss').textContent = `$${totalLoss.toFixed(2)}`;
            document.getElementById('net-balance').textContent = `$${(totalProfit - totalLoss).toFixed(2)}`;

            // Broadcast the new data so app.js can catch it and draw the graph
            window.dispatchEvent(new CustomEvent('financeDataUpdate', {
                detail: { labels: chartLabels, profits: profitData, losses: lossData }
            }));
        });
    } else {
        // Stop listening to data when the user logs out
        if (unsubscribe) unsubscribe();
        
        // Reset dashboard text
        document.getElementById('total-profit').textContent = "$0.00";
        document.getElementById('total-loss').textContent = "$0.00";
        document.getElementById('net-balance').textContent = "$0.00";
    }
});