// js/handlers/premiumToolsHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderPremiumToolsPage, renderActionStatus } from '../ui.js';

export const fetchData_premium_tools = {
    data: async (currentUser) => {
        const data = await apiRequest(`${API_URL}?action=get_premium_tools_data`);
        if (data.status === 'success') {
            renderPremiumToolsPage(data, currentUser);
        }
    }
};

export async function handlePremiumToolsClicks(target, currentUser) {
    // Navigation is handled by handlers.js, but keeping this structure
    // in case of other non-navigational clicks on this page.
    
    if (target.id === 'claim-bonus-btn') {
        target.disabled = true;
        target.textContent = 'Claiming...';
        const data = await apiRequest(API_URL, {
            method: 'POST',
            body: new URLSearchParams('action=claim_monthly_bonus')
        });
        alert(data.message || 'Action completed.');
        if (data.status === 'success') {
            document.dispatchEvent(new Event('userUpdated'));
            fetchData_premium_tools.data(currentUser); // Refresh the view
        } else {
            target.disabled = false;
            target.textContent = 'Claim Now';
        }
        return true;
    }

    return false;
}

export async function handlePremiumToolsSubmits(form, formData, currentUser) {
    if (form.id === 'cover-photo-upload-form') {
        formData.append('action', 'upload_cover_photo');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            alert(data.message);
            // Update the user object and the preview
            currentUser.cover_photo_url = data.cover_photo_url;
            document.getElementById('cover-photo-preview').src = data.cover_photo_url;
            document.dispatchEvent(new Event('userUpdated'));
        } else {
            alert(data.message || 'Upload failed.');
        }
        return true;
    }
    return false;
}