// js/handlers/themeHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderThemeShop, renderActionStatus } from '../ui.js';

export const fetchData_themes = {
    shop: async (type) => {
        const data = await apiRequest(`${API_URL}?action=get_themes&type=${type}`);
        if (data.status === 'success') {
            renderThemeShop(data, type);
        }
    }
};

export async function handleThemeClicks(target) {
    // Navigation logic is handled by handlers.js for consistency.

    const themeCard = target.closest('.theme-card');
    if (themeCard) {
        const themeId = themeCard.dataset.themeId;
        const formData = new FormData();
        formData.append('action', 'set_theme');
        formData.append('theme_id', themeId);
        
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(data.message || 'Action completed.');
        
        if (data.status === 'success') {
            document.dispatchEvent(new Event('userUpdated'));
            
            // Refresh the current theme view to show the new selection
            const siteThemesContainer = document.querySelector('div[id="site_themes"]');
            const profileThemesContainer = document.querySelector('div[id="profile_themes"]');

            if (siteThemesContainer) {
                fetchData_themes.shop('site');
            } else if (profileThemesContainer) {
                fetchData_themes.shop('profile');
            }
        }
        return true;
    }
    
    return false;
}

export async function handleThemeSubmits(form, formData) {
    if (form.id === 'redeem-code-form') {
        formData.append('action', 'redeem_theme_promo_code');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });

        await renderActionStatus({
            status: data.status,
            message: data.message || 'Action completed.',
            backView: data.status === 'success' ? 'home' : 'redeem_code'
        });

        if (data.status === 'success') {
            document.dispatchEvent(new Event('userUpdated'));
        }
        return true;
    }
    return false;
}