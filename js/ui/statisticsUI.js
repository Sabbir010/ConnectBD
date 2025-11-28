// js/ui/statisticsUI.js
import { escapeHTML, DEFAULT_AVATAR_URL, generateUserDisplay } from './coreUI.js';
import { formatSeconds } from './helpers.js';

function renderStaffList(users) {
    const container = document.getElementById('user-list-container');
    if (!container) return;

    const staffByRole = { 'Admin': [], 'Senior Moderator': [], 'Moderator': [] };
    users.forEach(user => {
        if (staffByRole[user.role]) staffByRole[user.role].push(user);
    });

    let html = '';
    for (const role in staffByRole) {
        if (staffByRole[role].length > 0) {
            html += `<h3 class="text-xl font-bold text-center my-4">${role}!</h3><div class="space-y-3">`;
            staffByRole[role].forEach(user => {
                const avatar = user.photo_url || DEFAULT_AVATAR_URL;
                const userDisplay = generateUserDisplay(user, false);
                html += `
                    <div class="flex items-center space-x-4 p-3 bg-white/50 rounded-lg">
                        <img src="${escapeHTML(avatar)}" class="w-10 h-10 rounded-full object-cover">
                        <div class="text-lg">${userDisplay}</div>
                    </div>`;
            });
            html += '</div>';
        }
    }
    container.innerHTML = html;
}

function renderGeneralTopList(users, unit, listType) {
    const container = document.getElementById('user-list-container');
    if (!container) return;
    
    container.innerHTML = '<div class="space-y-3"></div>';
    const listWrapper = container.querySelector('div');

    if (users.length === 0) {
        listWrapper.innerHTML = `<p class="text-center p-4">No users found in this list.</p>`;
        return;
    }

    let rank = 1;
    users.forEach(user => {
        const avatar = user.photo_url || DEFAULT_AVATAR_URL;
        let statValue = user.stat_value || '';
        
        if (listType === 'longest_online') {
            statValue = formatSeconds(parseInt(statValue, 10));
        }
        
        const userDisplay = generateUserDisplay(user, false);

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-white/50 rounded-lg text-lg';
        item.innerHTML = `
            <div class="flex items-center space-x-4">
                <span class="font-bold w-6">${rank}.</span>
                <img src="${escapeHTML(avatar)}" class="w-10 h-10 rounded-full object-cover">
                <div>${userDisplay}</div>
            </div>
            <span class="font-semibold text-gray-600 text-sm sm:text-base">${statValue} ${listType !== 'longest_online' ? unit : ''}</span>
        `;
        listWrapper.appendChild(item);
        rank++;
    });
}

export function renderStatisticsList(data, listType) {
    const userListContainer = document.getElementById('user-list-container');
    if (userListContainer) {
        userListContainer.className = 'space-y-2';
    }
    
    if (listType === 'staff_list') {
        renderStaffList(data.users);
    } else {
        renderGeneralTopList(data.users, data.unit, listType);
    }
}

export function renderUserListWithPagination(data, listType) {
    const container = document.getElementById('user-list-container');
    const { users, pagination } = data;
    if (!container) return;

    container.innerHTML = '';
    const listWrapper = document.createElement('div');
    listWrapper.className = 'space-y-3'; 
    
    if (users.length === 0) {
        container.innerHTML = `<p class="text-center p-4">No users found.</p>`;
    } else {
        users.forEach(user => {
            const avatar = user.photo_url || DEFAULT_AVATAR_URL;
            const userDisplayHTML = generateUserDisplay(user, true);
            const card = document.createElement('div');
            card.className = 'flex items-center space-x-4 p-3 bg-white/50 rounded-lg';
            card.innerHTML = `
                <img class="h-12 w-12 rounded-full object-cover" src="${escapeHTML(avatar)}" alt="avatar">
                <div class="flex-grow">
                    ${userDisplayHTML}
                </div>`;
            listWrapper.appendChild(card);
        });
        container.appendChild(listWrapper);
    }

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'flex justify-center items-center mt-6 space-x-2';
    if (pagination.totalPages > 1) {
        for (let i = 1; i <= pagination.totalPages; i++) {
            const button = document.createElement('button');
            button.className = `px-3 py-1 rounded-md text-sm font-semibold general-list-page-link ${i === pagination.currentPage ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'}`;
            button.textContent = i;
            button.dataset.page = i;
            button.dataset.listType = listType;
            paginationContainer.appendChild(button);
        }
        container.appendChild(paginationContainer);
    }
}