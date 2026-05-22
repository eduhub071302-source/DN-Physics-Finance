document.addEventListener('DOMContentLoaded', () => {
    // UI Toggles
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Chart.js Setup
    const ctx = document.getElementById('financeChart').getContext('2d');
    let financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'PayHere Payouts (Profit)',
                    data: [120, 190, 300, 500, 200, 300, 450],
                    borderColor: '#10b981',
                    tension: 0.4
                },
                {
                    label: 'Mom Withdrawals (Loss)',
                    data: [0, 50, 0, 200, 0, 100, 0],
                    borderColor: '#ef4444',
                    tension: 0.4
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Chart Time Filters Logic
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const timeFrame = e.target.getAttribute('data-time');
            // TODO: In db.js, fetch data based on 'timeFrame' and update chart here
            console.log(`Switching graph to: ${timeFrame}`);
        });
    });

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Failed', err));
    }
});

// Listen for the custom event sent from db.js
window.addEventListener('financeDataUpdate', (e) => {
    const { labels, profits, losses } = e.detail;
    
    // Inject the real data into the chart
    financeChart.data.labels = labels;
    financeChart.data.datasets[0].data = profits;
    financeChart.data.datasets[1].data = losses;
    
    // Tell Chart.js to re-draw the graph
    financeChart.update();
});
