// js/handlers/usernameShopHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderUsernameShop, updateCosts } from '../ui/usernameShopUI.js';

let shopInfo = null;

export const fetchData_usernameShop = {
    info: async () => {
        const data = await apiRequest(`${API_URL}?action=get_username_shop_info`);
        if (data.status === 'success') {
            shopInfo = data;
            renderUsernameShop(data);
        }
    }
};

export function handleUsernameShopClicks(target) {
    const changeBtn = target.closest('.username-change-btn');
    if (changeBtn) {
        const packageType = changeBtn.dataset.package;
        const inputId = `${packageType}-username-input`;
        const newName = document.getElementById(inputId).value;

        if (!newName) {
            alert('Please enter a new username.');
            return true;
        }

        const formData = new FormData();
        formData.append('action', 'change_username');
        formData.append('package', packageType);
        formData.append('new_name', newName);

        submitChange(formData);
        return true;
    }

    if (target.id === 'buy-color-balance' || target.id === 'buy-color-gold') {
        const colorCode = document.getElementById('color-code-input').value;
        const paymentMethod = target.id === 'buy-color-balance' ? 'balance' : 'gold';

        if (!colorCode) {
            alert('Please enter a color code.');
            return true;
        }

        const formData = new FormData();
        formData.append('action', 'change_username_color');
        formData.append('color_code', colorCode);
        formData.append('payment_method', paymentMethod);

        submitChange(formData);
        return true;
    }

    return false;
}

export function handleUsernameShopInputs(target) {
    if(target.id === 'monthly-username-input' || target.id === 'yearly-username-input') {
        if (shopInfo) {
            updateCosts(target.id, target.value, shopInfo);
        }
    }
}

async function submitChange(formData) {
    const button = document.activeElement;
    const originalButtonText = button.innerHTML;

    if (button) {
        button.disabled = true;
        button.innerHTML = 'Processing...';
    }

    const data = await apiRequest(API_URL, { method: 'POST', body: formData });
    alert(data.message || 'Action completed.');
    
    if (data.status === 'success') {
        // Force a global user data refresh without reloading the page
        document.dispatchEvent(new Event('userUpdated'));
        // Refresh shop info to reflect new balance or name
        fetchData_usernameShop.info();
    }

    // Re-enable button on success or failure
    if (button) {
        button.disabled = false;
        button.innerHTML = originalButtonText;
    }
}