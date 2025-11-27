// js/handlers/goldCoinHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { renderGoldCoinPage, renderActionStatus } from '../ui.js';
import { clearGoldCoinTimers } from '../ui/goldCoinUI.js';

let coinStatusInterval = null;

export const fetchData_goldCoin = {
    status: async () => {
        const data = await apiRequest(`${API_URL}?action=get_coin_status`);
        if (data.status === 'success') {
            renderGoldCoinPage(data);
        } else {
            // এরর হলে পেজে বার্তা দেখানোর ব্যবস্থা
            const statusContainer = document.getElementById('gold-coin-status');
            if (statusContainer) {
                statusContainer.innerHTML = `<p class="text-red-500">Error: ${data.message || 'Could not load coin status.'}</p>`;
            }
        }
    },
};

// *** গুরুত্বপূর্ণ: এই ফাংশনটির আগে 'export' শব্দটি থাকা আবশ্যক ***
// এই export কীওয়ার্ডটিই main.js ফাইলকে ফাংশনটি ব্যবহার করার অনুমতি দেয়।
export function initGoldCoinPage() {
    fetchData_goldCoin.status(); // পেজ লোড হওয়ার সাথে সাথে ডেটা আনা হয়
    if (coinStatusInterval) clearInterval(coinStatusInterval);
    // প্রতি ৫ সেকেন্ড পর পর স্ট্যাটাস চেক করার জন্য টাইমার সেট করা হয়
    coinStatusInterval = setInterval(fetchData_goldCoin.status, 5000);
}

// এই ফাংশনটি এখন শুধুমাত্র গোল্ড কয়েন পেজের ভেতরের বাটনগুলো (যেমন Grab It, Refresh) নিয়ন্ত্রণ করবে
export async function handleGoldCoinClicks(target, currentUser) {
    if (target.id === 'refresh-coin-status') {
        target.textContent = 'Checking...';
        await fetchData_goldCoin.status();
        return true;
    }

    if (target.id === 'grab-coin-btn') {
        const coinId = target.dataset.coinId;
        const formData = new FormData();
        formData.append('action', 'grab_coin');
        formData.append('coin_id', coinId);
        
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        await renderActionStatus({
            status: data.status,
            message: data.message || 'Action complete!',
            backView: 'gold_coin'
        });

        if(data.status === 'success') {
            document.dispatchEvent(new Event('userUpdated'));
        }
        return true;
    }

    return false;
}

// এই পেজ থেকে অন্য পেজে গেলে চলমান টাইমার বন্ধ করার জন্য এই ফাংশনটি কল করা হয়
export function stopGoldCoinInterval() {
    if (coinStatusInterval) clearInterval(coinStatusInterval);
    clearGoldCoinTimers();
}