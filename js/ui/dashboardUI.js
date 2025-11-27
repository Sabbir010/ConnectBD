// js/ui/dashboardUI.js

export function renderDashboard(data) {
    const { stats, charts } = data;

    // Render Stat Cards
    document.getElementById('stats-new-users').textContent = stats.new_users;
    document.getElementById('stats-total-shouts').textContent = stats.total_shouts;
    document.getElementById('stats-pending-reports').textContent = stats.pending_reports;
    document.getElementById('stats-total-members').textContent = stats.total_members;

    // Render User Registrations Chart
    const userChartCtx = document.getElementById('user-registration-chart')?.getContext('2d');
    if (userChartCtx) {
        new Chart(userChartCtx, {
            type: 'line',
            data: {
                labels: charts.registrations.labels,
                datasets: [{
                    label: 'New Users',
                    data: charts.registrations.data,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 2,
                    tension: 0.3
                }]
            }
        });
    }

    // Render Content Overview Chart
    const contentChartCtx = document.getElementById('content-overview-chart')?.getContext('2d');
    if (contentChartCtx) {
        new Chart(contentChartCtx, {
            type: 'doughnut',
            data: {
                labels: charts.content_overview.labels,
                datasets: [{
                    label: 'Content Types',
                    data: charts.content_overview.data,
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.7)',
                        'rgba(139, 92, 246, 0.7)',
                        'rgba(96, 165, 250, 0.7)',
                        'rgba(249, 115, 22, 0.7)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            }
        });
    }
}