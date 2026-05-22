let globalTransactions = [];
let currentMainFilter = '7d';
let currentRate = 320; // Default fallback

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Toggles (Auth) ---
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });

    // --- Graph Initialization ---
    const ctx = document.getElementById('financeChart').getContext('2d');
    window.financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], 
            datasets: [
                // CHANGED: Graph label updated to Total Payouts
                { label: 'Total Payouts (PayHere + PayPal)', data: [], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3 },
                { label: 'Deductions (Withdrawals)', data: [], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, // Allows the fixed height 350px CSS to work perfectly
            scales: { y: { beginAtZero: true } }
        }
    });

    // --- Daily Exchange Rate Logic ---
    checkDailyRate();

    document.getElementById('save-rate-btn').addEventListener('click', () => {
        const rate = parseFloat(document.getElementById('exchange-rate-input').value);
        if (rate && rate > 0) {
            localStorage.setItem('usdRate', rate);
            localStorage.setItem('rateDate', new Date().toLocaleDateString());
            currentRate = rate;
            document.getElementById('exchange-modal').classList.add('hidden');
            processMainDashboard(); // Re-render everything with new rate
        }
    });

    // --- Filter Buttons (Main Graph) ---
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMainFilter = e.target.getAttribute('data-time');
            processMainDashboard();
        });
    });

    // --- Summary Modal Logic ---
    document.getElementById('summary-btn').addEventListener('click', () => {
        document.getElementById('summary-modal').classList.remove('hidden');
        updateSummaryView('7d'); // Default to 7d inside summary
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    document.querySelectorAll('.sum-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sum-tab').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateSummaryView(e.target.getAttribute('data-range'));
        });
    });

    // --- PDF Export & Share Logic ---
    document.getElementById('export-pdf-btn').addEventListener('click', async () => {
        const element = document.getElementById('dashboard-content');
        const opt = {
            margin: 0.3,
            filename: `Finance_Report_${currentMainFilter}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // If on Mobile, Share. If on PC, Download.
        if (navigator.share) {
            const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
            const file = new File([pdfBlob], opt.filename, { type: "application/pdf" });
            try {
                await navigator.share({
                    title: 'Financial Report',
                    text: `Here is my financial report for the period: ${currentMainFilter.toUpperCase()}`,
                    files: [file]
                });
            } catch (err) {
                // If user cancels share popup, auto-download
                html2pdf().set(opt).from(element).save();
            }
        } else {
            html2pdf().set(opt).from(element).save();
        }
    });
});

// --- Receives clean data stream from db.js ---
window.addEventListener('rawFinanceData', (e) => {
    globalTransactions = e.detail;
    processMainDashboard();
});

function checkDailyRate() {
    const today = new Date().toLocaleDateString();
    const storedDate = localStorage.getItem('rateDate');
    if (storedDate !== today) {
        document.getElementById('exchange-modal').classList.remove('hidden');
    } else {
        currentRate = parseFloat(localStorage.getItem('usdRate')) || 320;
    }
}

// Filter data depending on time period selected
function filterDataByTime(txs, timeframe) {
    if (timeframe === 'all') return txs;
    const cutoff = new Date();
    if (timeframe === '7d') cutoff.setDate(cutoff.getDate() - 7);
    if (timeframe === '1m') cutoff.setMonth(cutoff.getMonth() - 1);
    if (timeframe === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);
    return txs.filter(t => t.dateObj >= cutoff);
}

// Core Math & Graph Grouping Logic
function groupDataAndCalculate(txs) {
    let totalProfitLKR = 0;
    let totalLossLKR = 0;
    const grouped = {};

    // Group items by DAY to ensure a perfect Line Graph (avoids stretching)
    txs.forEach(t => {
        const dateStr = t.dateObj.toLocaleDateString();
        if (!grouped[dateStr]) grouped[dateStr] = { profit: 0, loss: 0 };
        
        let amountInLKR = t.currency === 'USD' ? t.amount * currentRate : t.amount;

        if (t.type === 'profit') {
            totalProfitLKR += amountInLKR;
            grouped[dateStr].profit += amountInLKR;
        } else if (t.type === 'loss') {
            totalLossLKR += amountInLKR;
            grouped[dateStr].loss += amountInLKR;
        }
    });

    const sortedDates = Object.keys(grouped).sort((a,b) => new Date(a) - new Date(b));
    const labels = sortedDates;
    const profits = sortedDates.map(d => grouped[d].profit);
    const losses = sortedDates.map(d => grouped[d].loss);

    return { totalProfitLKR, totalLossLKR, labels, profits, losses };
}

// Updates Cards and Graph entirely
function processMainDashboard() {
    const filtered = filterDataByTime(globalTransactions, currentMainFilter);
    const { totalProfitLKR, totalLossLKR, labels, profits, losses } = groupDataAndCalculate(filtered);
    
    const netLKR = totalProfitLKR - totalLossLKR;

    // Update Cards with both LKR and USD
    document.getElementById('total-profit').innerHTML = `Rs. ${totalProfitLKR.toFixed(2)} <br><small>($ ${(totalProfitLKR/currentRate).toFixed(2)})</small>`;
    document.getElementById('total-loss').innerHTML = `Rs. ${totalLossLKR.toFixed(2)} <br><small>($ ${(totalLossLKR/currentRate).toFixed(2)})</small>`;
    document.getElementById('net-balance').innerHTML = `Rs. ${netLKR.toFixed(2)} <br><small>($ ${(netLKR/currentRate).toFixed(2)})</small>`;

    // Hard replace Graph arrays to prevent Infinite Loop bug
    window.financeChart.data.labels = [...labels];
    window.financeChart.data.datasets[0].data = [...profits];
    window.financeChart.data.datasets[1].data = [...losses];
    window.financeChart.update();
}

function updateSummaryView(timeframe) {
    const filtered = filterDataByTime(globalTransactions, timeframe);
    const { totalProfitLKR, totalLossLKR } = groupDataAndCalculate(filtered);
    const net = totalProfitLKR - totalLossLKR;
    
    let status = net >= 0 
        ? `<strong style="color: var(--success);">✅ Net Profit: Rs. ${net.toFixed(2)}</strong>` 
        : `<strong style="color: var(--danger);">🚨 Net Loss: Rs. ${Math.abs(net).toFixed(2)}</strong>`;

    document.getElementById('summary-content').innerHTML = `
        <p><strong>Total Income:</strong> Rs. ${totalProfitLKR.toFixed(2)}</p>
        <p><strong>Total Deductions:</strong> Rs. ${totalLossLKR.toFixed(2)}</p>
        <hr style="margin: 10px 0; border: 0.5px solid #ccc;">
        <p style="font-size: 18px;">${status}</p>
    `;
}
