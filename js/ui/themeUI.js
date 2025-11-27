// js/ui/themeUI.js
import { escapeHTML } from './coreUI.js';

export function renderThemeShop(data, type) {
    const container = document.getElementById('themes-container');
    if (!container) return;

    container.innerHTML = '';
    const { themes, user_selection, is_premium } = data;

    themes.forEach(theme => {
        const isSelected = (theme.type === 'site' && theme.id == user_selection.site) ||
                           (theme.type === 'profile' && theme.id == user_selection.profile);

        const cost = is_premium ? 'Free' : (theme.cost > 0 ? `${theme.cost} Gold Coins` : 'Free');

        const card = document.createElement('div');
        card.className = `p-4 border-2 rounded-lg cursor-pointer theme-card ${isSelected ? 'border-violet-500' : 'border-gray-200'}`;
        card.dataset.themeId = theme.id;
        
        card.innerHTML = `
            <div class="h-20 w-full rounded" style="background: ${theme.background_url || '#ccc'}"></div>
            <h4 class="font-bold mt-2">${escapeHTML(theme.name)}</h4>
            <p class="text-sm font-semibold ${is_premium && theme.cost > 0 ? 'text-green-600' : ''}">${cost}</p>
        `;

        container.appendChild(card);
    });
}

// সাইটের থিম অ্যাপ্লাই করার জন্য ফাংশন
export function applySiteTheme(user) {
    if (!user || !user.site_theme) return;
    
    document.body.classList.forEach(className => {
        if (className.startsWith('theme-site-')) {
            document.body.classList.remove(className);
        }
    });
    
    if (user.site_theme.class_name) {
        document.body.classList.add(user.site_theme.class_name);
    }
}

// প্রোফাইলের থিম অ্যাপ্লাই করার জন্য ফাংশন
export function applyProfileTheme(user) {
    if (!user || !user.profile_theme) return;

    const profileCard = document.querySelector('#user-profile-content')?.closest('.glass-card');
    if (profileCard) {
        profileCard.classList.forEach(className => {
            if (className.startsWith('theme-profile-')) {
                profileCard.classList.remove(className);
            }
        });
        if (user.profile_theme.class_name) {
            profileCard.classList.add(user.profile_theme.class_name);
        }
    }
}