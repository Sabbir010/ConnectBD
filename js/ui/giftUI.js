// js/ui/giftUI.js
import { escapeHTML } from './coreUI.js';

export function renderGiftShop(giftCategories) {
    const container = document.getElementById('gift-shop-container');
    if (!container) return;
    container.innerHTML = '';

    for (const category in giftCategories) {
        const section = document.createElement('div');
        section.className = 'mb-8';

        let categoryTitleHTML = '';
        if (category === 'Normal') {
            categoryTitleHTML = `<h3 class="text-xl font-bold text-yellow-600 border-b-2 border-yellow-300 pb-2 mb-4">Normal Gifts (5 Gold Coins)</h3>`;
        } else if (category === 'Medium') {
            categoryTitleHTML = `<h3 class="text-xl font-bold text-blue-600 border-b-2 border-blue-300 pb-2 mb-4">Medium Gifts (৳5.00)</h3>`;
        } else {
            categoryTitleHTML = `<h3 class="text-xl font-bold text-purple-600 border-b-2 border-purple-300 pb-2 mb-4">Expensive Gifts (৳10.00)</h3>`;
        }

        const giftsHTML = giftCategories[category].map(gift => `
            <div class="text-center p-2 bg-white/50 rounded-lg">
                <i class="${escapeHTML(gift.icon)} text-5xl text-gray-700 h-20 w-20 mx-auto flex items-center justify-center"></i>
                <p class="text-sm font-semibold mt-2">${escapeHTML(gift.name)}</p>
                <button class="send-gift-btn text-xs bg-violet-600 text-white px-3 py-1 rounded-full mt-1 w-full hover:bg-violet-700" 
                        data-gift-id="${gift.id}" 
                        data-gift-name="${escapeHTML(gift.name)}"
                        data-gift-type="${escapeHTML(gift.type)}">
                    Send
                </button>
            </div>
        `).join('');

        section.innerHTML = `
            ${categoryTitleHTML}
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                ${giftsHTML}
            </div>
        `;
        container.appendChild(section);
    }
}

export function renderUserGiftList(gifts, isOwnProfile) {
    const container = document.getElementById('user-gifts-container');
    if (!container) return;
    
    if (gifts.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">This user has no gifts yet.</p>`;
        return;
    }

    container.innerHTML = gifts.map(gift => `
        <div class="text-center p-2 bg-white/50 rounded-lg border">
            <i class="${escapeHTML(gift.icon)} text-5xl text-gray-700 h-20 w-20 mx-auto flex items-center justify-center"></i>
            <p class="text-sm font-semibold mt-2">${escapeHTML(gift.name)}</p>
            <p class="text-xs text-gray-500">from ${escapeHTML(gift.sender_name)}</p>
            ${isOwnProfile 
                ? `<button class="sell-gift-btn text-xs bg-green-600 text-white px-3 py-1 rounded-full mt-1 w-full hover:bg-green-700" 
                            data-inventory-id="${gift.inventory_id}" 
                            data-gift-name="${escapeHTML(gift.name)}"
                            data-gift-type="${escapeHTML(gift.type)}">Sell</button>`
                : `<button class="buy-gift-btn text-xs bg-blue-600 text-white px-3 py-1 rounded-full mt-1 w-full hover:bg-blue-700" 
                            data-inventory-id="${gift.inventory_id}" 
                            data-gift-name="${escapeHTML(gift.name)}"
                            data-gift-type="${escapeHTML(gift.type)}">Buy</button>`
            }
        </div>
    `).join('');
}