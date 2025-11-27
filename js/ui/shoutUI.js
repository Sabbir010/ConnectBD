// js/ui/shoutUI.js
import { escapeHTML, DEFAULT_AVATAR_URL, generateUserDisplay } from './coreUI.js';
import { linkify, timeAgo } from './helpers.js';

export async function renderShout(shout, currentUser) {
    const shoutElement = document.createElement('div');
    shoutElement.className = 'p-3 border bg-white/80 rounded-lg shadow-sm mb-4';
    shoutElement.dataset.shoutId = shout.id;
    shoutElement.id = `shout-${shout.id}`;
    const avatar = shout.photo_url || DEFAULT_AVATAR_URL;
    
    const shoutContent = await linkify(shout.text, currentUser, { type: 'shout', id: shout.id });
    const userDisplay = generateUserDisplay(shout);

    const reactions = shout.reactions || {};
    const reactionsMap = {
        'like': '👍', 'love': '❤️', 'haha': '😂', 'sad': '😢', 'angry': '😡'
    };
    
    let reactionsHTML = Object.entries(reactionsMap).map(([key, emoji]) => {
        const count = reactions[key] || 0;
        const countHTML = count > 0 
            ? `<a href="#" class="view-reactors-btn text-blue-600 hover:underline" data-shout-id="${shout.id}" data-reaction="${key}">(${count})</a>`
            : `<span>(${count})</span>`;
        return `<span class="react-btn cursor-pointer px-1 hover:scale-125 transition-transform" data-reaction="${key}">${emoji}</span>${countHTML}`;
    }).join(' / ');

    let controlsHTML = '';
    const isOwner = currentUser && currentUser.id === shout.user_id;
    const isStaff = currentUser && ['Admin', 'Senior Moderator', 'Moderator'].includes(currentUser.role);
    const isPremium = currentUser && currentUser.is_premium && new Date(currentUser.premium_expires_at) > new Date();

    if (isOwner || isStaff) {
        if((isOwner && isPremium) || isStaff) {
             controlsHTML += `<a href="#" class="edit-shout-btn text-blue-600 hover:underline" data-shout-id="${shout.id}">Edit</a> || `;
        }
        controlsHTML += `<a href="#" class="delete-shout-btn text-red-600 hover:underline" data-shout-id="${shout.id}">Delete</a>`;
        if((isOwner && isPremium)) {
            const isPinned = currentUser.pinned_shout_id == shout.id;
            const pinText = isPinned ? 'Unpin' : 'Pin';
            controlsHTML += ` || <a href="#" class="pin-shout-btn text-green-600 hover:underline" data-shout-id="${shout.id}">${pinText}</a>`;
        }
    }
    
    // *** নতুন ফিক্স: রিপোর্ট বাটন এখানে যোগ করা হয়েছে ***
    if (currentUser && !isOwner) {
        if(controlsHTML) controlsHTML += ' || '; // যদি আগে কোনো বাটন থাকে
        controlsHTML += `<a href="#" class="report-btn font-semibold text-gray-500 hover:text-red-500" data-type="shout" data-id="${shout.id}" data-preview="Shout by ${escapeHTML(shout.display_name)}">Report</a>`;
    }

    shoutElement.innerHTML = `
        <div class="flex items-center space-x-3">
            <img src="${escapeHTML(avatar)}" class="h-10 w-10 rounded-full object-cover">
            <p class="font-semibold text-gray-800">${userDisplay}</p>
        </div>
        <div class="mt-2 pl-12 text-gray-700 break-words">
            ${shoutContent}
        </div>
        <div class="mt-3 pt-2 border-t text-xs flex flex-col items-center space-y-1">
            <div class="text-gray-500">${timeAgo(shout.created_at)}</div>
            <div class="flex items-center gap-x-1 sm:gap-x-2 flex-wrap justify-center">
                ${reactionsHTML}
            </div>
            <div class="font-semibold text-gray-600">
                ${controlsHTML}
            </div>
        </div>
    `;
    return shoutElement;
}

export function renderShoutReactorsList(data) {
    const { reactors, reaction } = data;
    const container = document.getElementById('shout-reactors-list');
    const titleEl = document.getElementById('reactors-list-title');

    if (!container || !titleEl) return;

    const reactionsMap = {
        'like': '👍', 'love': '❤️', 'haha': '😂', 'sad': '😢', 'angry': '😡'
    };
    titleEl.innerHTML = `Users who reacted with ${reactionsMap[reaction]}`;
    
    container.innerHTML = '';
    if (reactors.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No one has given this reaction yet.</p>';
        return;
    }

    reactors.forEach(user => {
        const avatar = user.photo_url || DEFAULT_AVATAR_URL;
        const userDisplay = generateUserDisplay(user);
        const card = document.createElement('div');
        card.className = 'flex items-center space-x-4 p-3 bg-white/50 rounded-lg';
        card.innerHTML = `
            <img src="${escapeHTML(avatar)}" class="w-10 h-10 rounded-full object-cover">
            <div class="font-semibold">${userDisplay}</div>
        `;
        container.appendChild(card);
    });
}

export function renderShoutEditForm(shout) {
    const shoutIdInput = document.getElementById('edit-shout-id');
    const shoutMessageTextarea = document.getElementById('edit-shout-message');

    if (shoutIdInput && shoutMessageTextarea) {
        shoutIdInput.value = shout.id;
        shoutMessageTextarea.value = shout.text;
    }
}

export function renderShoutPagination(currentPage, totalPages) {
    const container = document.getElementById('shout-pagination-container');
    if (!container) return;

    container.innerHTML = '';
    if (totalPages <= 1) return;

    const createPageLink = (page, text, isActive = false, isDisabled = false) => {
        const button = document.createElement('button');
        button.className = `px-3 py-1 rounded-md text-sm font-semibold ${isActive ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`;
        button.textContent = text;
        if (!isDisabled) {
            button.dataset.page = page;
        }
        return button;
    };

    container.appendChild(createPageLink(currentPage - 1, '« Prev', false, currentPage === 1));

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            container.appendChild(createPageLink(i, i, true));
        } else if (Math.abs(i - currentPage) < 3 || i === 1 || i === totalPages) {
            container.appendChild(createPageLink(i, i));
        } else if (Math.abs(i - currentPage) === 3) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-3 py-1';
            container.appendChild(dots);
        }
    }

    container.appendChild(createPageLink(currentPage + 1, 'Next »', false, currentPage === totalPages));
}

export async function renderSingleShoutPage(shoutData, currentUser) {
    const container = document.getElementById('single-shout-container');
    if (container && shoutData) {
        container.innerHTML = '';
        const shoutElement = await renderShout(shoutData, currentUser);
        container.appendChild(shoutElement);
    } else if (container) {
        container.innerHTML = '<p class="text-center text-red-500">Could not load the shout.</p>';
    }
}