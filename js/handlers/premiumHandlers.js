// js/handlers/premiumHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderPremiumPackages, renderActionStatus } from '../ui.js';

export const fetchData_premium = {
    packages: async () => {
        const data = await apiRequest(`${API_URL}?action=get_premium_packages`);
        if (data.status === 'success') {
            renderPremiumPackages(data);
        }
    }
};

export async function handlePremiumClicks(target, currentUser) {
    // পেজে যাওয়ার বাটনটি এখন main.js এবং handlers.js দ্বারা নিয়ন্ত্রিত,
    // তাই এখানকার অপ্রয়োজনীয় কোডটি সরিয়ে দেওয়া হয়েছে।
    
    // এই কোডটি ভবিষ্যতে কুপন বাটনের জন্য ব্যবহার হতে পারে
    if (target.id === 'apply-coupon-btn') {
        alert("Coupon functionality is managed by admins.");
        return true;
    }
    
    return false;
}

export async function handlePremiumSubmits(form, formData, currentUser) {
    if (form.id === 'buy-premium-form') {
        formData.append('action', 'buy_premium');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        await renderActionStatus({
            status: data.status,
            message: data.message || 'Action completed.',
            backView: data.status === 'success' ? 'home' : 'buy_premium'
        });

        if (data.status === 'success') {
            document.dispatchEvent(new Event('userUpdated'));
        }
        return true;
    }
    return false;
}