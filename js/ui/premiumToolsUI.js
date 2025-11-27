// js/ui/premiumToolsUI.js
import { escapeHTML, DEFAULT_AVATAR_URL } from './coreUI.js';
import { timeAgo } from './helpers.js';

export function renderPremiumToolsPage(data, currentUser) {
    const coverPreview = document.getElementById('cover-photo-preview');
    const bonusBtn = document.getElementById('claim-bonus-btn');
    const bonusStatusText = document.getElementById('bonus-status-text');
    const visitorsList = document.getElementById('profile-visitors-list');

    if (coverPreview) {
        // *** চূড়ান্ত সংশোধন: Placeholder লিঙ্ক পরিবর্তন করা হয়েছে ***
        coverPreview.src = currentUser.cover_photo_url || 'https://placehold.co/800x200/A4B3F7/FFFFFF?text=Upload+Cover+Photo';
    }

    if (bonusBtn && bonusStatusText) {
        if (data.bonus_info.can_claim) {
            bonusBtn.disabled = false;
            bonusBtn.textContent = 'Claim Now';
            bonusStatusText.textContent = 'You can claim your monthly 20 Gold Coins bonus now!';
        } else {
            bonusBtn.disabled = true;
            bonusBtn.textContent = 'Already Claimed';
            const lastClaimedDate = new Date(data.bonus_info.last_claimed).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            bonusStatusText.textContent = `You have claimed your bonus for ${lastClaimedDate}.`;
        }
    }

    if (visitorsList) {
        visitorsList.innerHTML = '';
        if (data.profile_visitors && data.profile_visitors.length > 0) {
            data.profile_visitors.forEach(visitor => {
                const visitorEl = document.createElement('div');
                visitorEl.className = 'flex items-center space-x-2 text-sm';
                const avatar = visitor.photo_url || DEFAULT_AVATAR_URL;
                visitorEl.innerHTML = `
                    <img src="${escapeHTML(avatar)}" class="w-8 h-8 rounded-full object-cover">
                    <div class="flex-grow">
                        <p class="font-bold user-name-link cursor-pointer" data-user-id="${visitor.id}">${escapeHTML(visitor.display_name)}</p>
                        <p class="text-xs text-gray-500">${timeAgo(visitor.viewed_at)}</p>
                    </div>
                `;
                visitorsList.appendChild(visitorEl);
            });
        } else {
            visitorsList.innerHTML = '<p class="text-center text-sm text-gray-500">No one has viewed your profile recently.</p>';
        }
    }
}