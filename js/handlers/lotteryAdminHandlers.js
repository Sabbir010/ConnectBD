// js/handlers/lotteryAdminHandlers.js
import { apiRequest, API_URL } from '/js/api.js';
import { showView, renderLotteryAdminPanel } from '/js/ui.js';

export const fetchData_lottery_admin = {
    data: async () => {
        const data = await apiRequest(`${API_URL}?action=get_lottery_admin_data`);
        if (data.status === 'success') {
            renderLotteryAdminPanel(data);
        }
    }
};

export async function handleLotteryAdminClicks(target) {
    if (target.closest('.lottery-admin-action-btn')) {
        const button = target.closest('.lottery-admin-action-btn');
        const action = button.dataset.action;
        const gameId = button.dataset.gameId;

        if (confirm(`Are you sure you want to '${action}' this game? This action cannot be undone.`)) {
            const formData = new FormData();
            formData.append('action', `lottery_${action}_admin`);
            formData.append('game_id', gameId);

            const result = await apiRequest(API_URL, { method: 'POST', body: formData });
            alert(result.message || 'Action completed.');

            if (result.status === 'success') {
                fetchData_lottery_admin.data(); // Refresh the panel
            }
        }
        return true;
    }
    return false;
}