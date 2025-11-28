// js/handlers/themeHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderThemeShop, renderActionStatus } from '../ui.js';

export const fetchData_themes = {
    shop: async (type, page = 1) => {
        const data = await apiRequest(`${API_URL}?action=get_themes&type=${type}&page=${page}`);
        if (data.status === 'success') {
            renderThemeShop(data, type);
        }
    }
};

export async function handleThemeClicks(target) {
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
            
            const currentPage = document.querySelector('.theme-page-link.bg-violet-600')?.dataset.page || 1;
            const viewHeader = document.querySelector('.glass-card h2');
            if (viewHeader) {
                const headerText = viewHeader.textContent;
                if (headerText.includes('Site Themes')) {
                    fetchData_themes.shop('site', currentPage);
                } else if (headerText.includes('Profile Themes')) {
                    fetchData_themes.shop('profile', currentPage);
                } else if (headerText.includes('Premium Themes')) {
                    fetchData_themes.shop('premium', currentPage);
                }
            }
        }
        return true;
    }

    const pageLink = target.closest('.theme-page-link');
    if (pageLink) {
        const page = pageLink.dataset.page;
        const type = pageLink.dataset.type;
        fetchData_themes.shop(type, page);
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