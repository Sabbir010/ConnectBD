// js/handlers/homeHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderHomeHeader } from '../ui.js';

export const fetchData_home = {
    details: async (currentUser) => {
        const data = await apiRequest(`${API_URL}?action=get_home_details`);
        if (data.status === 'success') {
            renderHomeHeader(currentUser, data.server_time);
        }
    }
};

export async function handleHomeClicks(target, currentUser) {
    // ভবিষ্যতে হোম পেইজের কোনো ক্লিকের জন্য প্রয়োজন হলে এখানে কোড যোগ করা যাবে
    return false;
}