// js/handlers/giftHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderGiftShop, renderActionStatus } from '../ui.js';

export const fetchData_gifts = {
    shopItems: async () => {
        const data = await apiRequest(`${API_URL}?action=get_gift_shop_items`);
        if (data.status === 'success') {
            renderGiftShop(data.gifts);
        }
    }
};

export async function handleGiftClicks(target, currentUser) {
    const sendGiftBtn = target.closest('.send-gift-btn');
    if (sendGiftBtn) {
        const giftId = sendGiftBtn.dataset.giftId;
        const giftName = sendGiftBtn.dataset.giftName;
        const receiverId = prompt(`Who do you want to send the "${giftName}" to?\nPlease enter their User ID:`);
        
        if (receiverId && !isNaN(receiverId)) {
            const formData = new FormData();
            formData.append('action', 'send_gift');
            formData.append('receiver_id', receiverId);
            formData.append('gift_id', giftId);

            const result = await apiRequest(API_URL, { method: 'POST', body: formData });
            await renderActionStatus({
                status: result.status,
                message: result.message,
                backView: 'gifts'
            });
             if (result.status === 'success') {
                document.dispatchEvent(new Event('userUpdated'));
            }
        } else if (receiverId !== null) {
            alert('Invalid User ID provided.');
        }
        return true;
    }

    const sellGiftBtn = target.closest('.sell-gift-btn');
    if (sellGiftBtn) {
        const inventoryId = sellGiftBtn.dataset.inventoryId;
        const giftName = sellGiftBtn.dataset.giftName;
        const giftType = sellGiftBtn.dataset.giftType;
        const currency = giftType === 'Normal' ? 'Gold Coins' : 'Taka';

        const targetUserId = prompt(`Who do you want to sell the "${giftName}" to?\nEnter their User ID:`);
        if (!targetUserId || isNaN(targetUserId)) {
            if (targetUserId !== null) alert('Invalid User ID.');
            return true;
        }
        const price = prompt(`Enter the selling price for "${giftName}" in ${currency}:`);
        if (!price || isNaN(price) || price <= 0) {
            if (price !== null) alert('Invalid price.');
            return true;
        }
        
        const formData = new FormData();
        formData.append('action', 'initiate_gift_trade');
        formData.append('inventory_id', inventoryId);
        formData.append('target_user_id', targetUserId);
        formData.append('price', price);
        formData.append('trade_type', 'sell');

        const result = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(result.message);
        return true;
    }

    const buyGiftBtn = target.closest('.buy-gift-btn');
    if (buyGiftBtn) {
        const inventoryId = buyGiftBtn.dataset.inventoryId;
        const giftName = buyGiftBtn.dataset.giftName;
        const giftType = buyGiftBtn.dataset.giftType;
        const currency = giftType === 'Normal' ? 'Gold Coins' : 'Taka';
        const ownerId = document.getElementById('back-to-profile-from-gifts').dataset.userId;

        const price = prompt(`How much ${currency} do you want to offer for "${giftName}"?`);
        if (!price || isNaN(price) || price <= 0) {
            if (price !== null) alert('Invalid price.');
            return true;
        }

        const formData = new FormData();
        formData.append('action', 'initiate_gift_trade');
        formData.append('inventory_id', inventoryId);
        formData.append('target_user_id', ownerId);
        formData.append('price', price);
        formData.append('trade_type', 'buy_request');

        const result = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(result.message);
        return true;
    }
    
    return false;
}