// js/ui/goldCoinUI.js
import { escapeHTML } from './coreUI.js';
// import { fetchData_goldCoin } from './handlers/goldCoinHandlers.js'; // এই লাইনটি ডিলিট করুন বা কমেন্ট আউট করুন

// --- Interval গুলোকে ট্র্যাক করার জন্য ভ্যারিয়েবল ---
let countdownInterval = null;
let timeAgoInterval = null;

// --- এই পেজ থেকে অন্য পেজে গেলে টাইমারগুলো বন্ধ করার জন্য ফাংশন ---
export function clearGoldCoinTimers() {
    if (countdownInterval) clearInterval(countdownInterval);
    if (timeAgoInterval) clearInterval(timeAgoInterval);
    countdownInterval = null;
    timeAgoInterval = null;
}

// --- সেকেন্ডকে সুন্দরভাবে ফরম্যাট করার জন্য হেল্পার ফাংশন ---
function formatSecondsToTimeAgo(seconds) {
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${Math.floor(seconds)} second${Math.floor(seconds) > 1 ? 's' : ''} ago`;

    if (seconds < 3600) { // 1 ঘণ্টার কম
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} ago`;
    }

    if (seconds < 86400) { // 1 দিনের কম
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} ago`;
    }

    // 1 দিনের বেশি
    const days = Math.floor(seconds / 86400);
    const remainingHours = Math.floor((seconds % 86400) / 3600);
    return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''} ago`;
}


export function renderGoldCoinPage(data) {
    const statusContainer = document.getElementById('gold-coin-status');
    const totalCoinsEl = document.getElementById('user-total-coins');
    const grabsTodayEl = document.getElementById('user-grabs-today');
    const lastGainerContainer = document.getElementById('last-gainer-info');
    
    if (!statusContainer || !totalCoinsEl || !grabsTodayEl || !lastGainerContainer) return;

    // --- নতুন টাইমার শুরু করার আগে পুরোনোটা বন্ধ করা হচ্ছে ---
    clearGoldCoinTimers();

    const { coin, user_stats, last_gainer } = data;
    
    if (!coin || !coin.server_time) {
        statusContainer.innerHTML = `<p class="text-lg text-yellow-700 mb-2">Could not retrieve coin status. Retrying...</p>`;
        return;
    }

    const currentTime = new Date(coin.server_time).getTime();
    const coinTime = new Date(coin.created_at).getTime();

    // --- লাইভ কাউন্টডাউন টাইমার ---
    if (currentTime < coinTime) {
        let timeLeft = Math.round((coinTime - currentTime) / 1000);
        
        statusContainer.innerHTML = `
            <p class="text-lg text-gray-700 mb-2">Next coin will be available in:</p>
            <p id="gold-coin-countdown" class="text-4xl font-bold text-violet-600">${timeLeft}s</p>
            <button id="refresh-coin-status" class="mt-4 px-6 py-2 bg-gray-200 rounded-lg animate-pulse">Searching for coin...</button>
        `;
        
        const countdownElement = document.getElementById('gold-coin-countdown');
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft >= 0 && countdownElement) {
                countdownElement.textContent = `${timeLeft}s`;
            } else {
                clearInterval(countdownInterval);
                // --- নিচের লাইনটি ডিলিট করা হয়েছে ---
                // fetchData_goldCoin.status(); // এই লাইনটি সমস্যার কারণ ছিল
            }
        }, 1000);

    } else {
        statusContainer.innerHTML = `
            <p class="text-2xl text-green-600 font-bold mb-4">A wild Gold Coin has appeared!</p>
            <button id="grab-coin-btn" data-coin-id="${coin.id}" class="px-10 py-4 bg-yellow-500 text-white font-bold text-xl rounded-lg shadow-lg transform hover:scale-110 transition-transform">
                Grab It!
            </button>
        `;
    }

    if(user_stats) {
        totalCoinsEl.textContent = user_stats.total_coins;
        grabsTodayEl.textContent = `${user_stats.grabs_last_24h} / 10`;
    }

    // --- লাইভ "Last Coin Gainer" টাইমার ---
    if (last_gainer) {
        const initialSecondsAgo = Math.floor((new Date(coin.server_time) - new Date(last_gainer.grabbed_at)) / 1000);
        const renderTime = Date.now(); // কখন রেন্ডার হচ্ছে, সেই ক্লায়েন্ট সময়

        lastGainerContainer.innerHTML = `
            Last Coin Gainer: <strong class="user-name-link text-violet-600 cursor-pointer" data-user-id="${last_gainer.user_id}">${escapeHTML(last_gainer.display_name)}</strong> 
            (<span id="live-time-ago"></span>)
        `;
        
        const timeAgoElement = document.getElementById('live-time-ago');

        const updateLiveTime = () => {
            if (timeAgoElement) {
                const elapsedSeconds = Math.floor((Date.now() - renderTime) / 1000);
                timeAgoElement.textContent = formatSecondsToTimeAgo(initialSecondsAgo + elapsedSeconds);
            }
        };

        updateLiveTime(); // প্রথমবার দেখানোর জন্য
        timeAgoInterval = setInterval(updateLiveTime, 1000); // প্রতি সেকেন্ডে আপডেট হবে

    } else {
        lastGainerContainer.innerHTML = 'Be the first one to grab a coin!';
    }
}