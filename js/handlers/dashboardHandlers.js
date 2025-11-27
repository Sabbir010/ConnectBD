// js/handlers/dashboardHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderDashboard } from '../ui.js';

export const fetchData_dashboard = {
    stats: async () => {
        const data = await apiRequest(`${API_URL}?action=get_dashboard_stats`);
        if (data.status === 'success') {
            renderDashboard(data);
        }
    }
};