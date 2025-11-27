// js/ui/coreUI.js

export const elements = {
    authContainer: document.getElementById('auth-container'),
    appContainer: document.getElementById('app-container'),
    headerUserName: document.getElementById('header-user-name'),
    headerUserAvatar: document.getElementById('header-user-avatar'),
    centerPanel: document.getElementById('center-panel'),
    userMenuButton: document.getElementById('user-menu-button'),
    userMenuDropdown: document.getElementById('user-menu-dropdown'),
};

export const DEFAULT_AVATAR_URL = 'https://www.pngfind.com/pngs/m/610-6104451_image-placeholder-png-user-profile-placeholder-image-png.png';

export async function showView(viewName, id = null, subView = null) {
    const centerPanel = elements.centerPanel;
    if (!centerPanel) {
        console.error('CRITICAL ERROR: The main content panel with id "center-panel" was not found.');
        return;
    }

    if (elements.userMenuDropdown) {
        elements.userMenuDropdown.classList.add('hidden');
    }
    
    try {
        const response = await fetch(`/views/${viewName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to fetch view. Server responded with ${response.status} for ${viewName}.html`);
        }
        const html = await response.text();
        centerPanel.innerHTML = html;
    } catch (error) {
        console.error("Failed to load view:", error);
        centerPanel.innerHTML = `<div class="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <h3 class="text-xl font-bold">Error Loading Content</h3>
            <p class="mt-2">Could not load the requested view ('${viewName}').</p>
            <p class="text-sm text-gray-600 mt-4">Details: ${error.message}</p>
        </div>`;
    }
}


export function escapeHTML(str) {
    if (typeof str !== 'string' || str === null) return '';
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

export function showAuthView() {
    if(elements.authContainer) elements.authContainer.style.display = 'flex';
    if(elements.appContainer) elements.appContainer.style.display = 'none';
}

export function showAppView(user) {
    if(elements.authContainer) elements.authContainer.style.display = 'none';
    if(elements.appContainer) elements.appContainer.style.display = 'block';
    
    elements.headerUserName.textContent = user.display_name;
    elements.headerUserAvatar.src = user.photo_url || DEFAULT_AVATAR_URL;
}

export function renderHomePermissions(user) {
    if (!user) return;
    
    const isStaff = ['Admin', 'Senior Moderator', 'Moderator'].includes(user.role);
    const isPremium = user.is_premium && new Date(user.premium_expires_at) > new Date();

    const toolsSection = document.getElementById('tools-section-container');
    const premiumToolsBtn = document.getElementById('premium-tools-btn');
    const staffPanelBtn = document.getElementById('staff-panel-btn-home');

    if (toolsSection) {
        if (isStaff || isPremium) {
            toolsSection.classList.remove('hidden');

            if (isPremium && premiumToolsBtn) {
                premiumToolsBtn.classList.remove('hidden');
            } else if(premiumToolsBtn) {
                premiumToolsBtn.classList.add('hidden');
            }

            if (isStaff && staffPanelBtn) {
                staffPanelBtn.classList.remove('hidden');
            } else if(staffPanelBtn) {
                staffPanelBtn.classList.add('hidden');
            }
        } else {
            toolsSection.classList.add('hidden');
        }
    }
}

// Universal function to generate user display name with title and color
export function generateUserDisplay(user, withTitle = true) {
    if (!user) return '';

    const isPremium = user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date();
    const nameClass = isPremium ? 'premium-username' : '';
    let title = '';
    
    const userId = user.user_id || user.id;
    const displayRole = user.display_role || user.role;

    if (withTitle) {
        if (displayRole && displayRole !== 'Member') {
            title = ` (${escapeHTML(displayRole)}!)`;
        } else if (isPremium) {
            title = ' (Premium User!)';
        }
    }

    return `<a href="#" class="user-name-link ${nameClass}" data-user-id="${userId}">${escapeHTML(user.display_name)}</a><span class="font-semibold">${title}</span>`;
}
