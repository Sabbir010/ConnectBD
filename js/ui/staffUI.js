// js/ui/staffUI.js
import { escapeHTML, DEFAULT_AVATAR_URL } from './coreUI.js';

export function renderThemePromoGenerator(themes) {
    const selectEl = document.getElementById('theme-select-for-promo');
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="">-- Select a Theme --</option>';

    if (themes && themes.length > 0) {
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = `${escapeHTML(theme.name)} (${theme.type}) - Cost: ${theme.cost}`;
            selectEl.appendChild(option);
        });
    }
}

function renderModerationPagination(pagination, containerId, pageLinkClass) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (pagination.totalPages <= 1) return;

    for (let i = 1; i <= pagination.totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 rounded-md text-sm font-semibold ${pageLinkClass} ${i === pagination.currentPage ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'}`;
        button.textContent = i;
        button.dataset.page = i;
        container.appendChild(button);
    }
}

export function renderPremiumSettings(data) {
    const { settings, coupons } = data;

    const couponEnabledCheckbox = document.getElementById('coupon-system-enabled');
    const discountEnabledCheckbox = document.getElementById('site-wide-discount-enabled');
    const discountPercentInput = document.getElementById('site-wide-discount-percent');
    
    if(couponEnabledCheckbox) couponEnabledCheckbox.checked = settings.coupon_system_enabled == '1';
    if(discountEnabledCheckbox) discountEnabledCheckbox.checked = settings.site_wide_discount_enabled == '1';
    if(discountPercentInput) discountPercentInput.value = settings.site_wide_discount_percent || 0;

    const couponsList = document.getElementById('unused-coupons-list');
    if (couponsList) {
        couponsList.innerHTML = '';
        if (coupons.length > 0) {
            coupons.forEach(coupon => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center text-sm p-1';
                li.innerHTML = `<span>${escapeHTML(coupon.code)}</span> <span class="font-bold text-green-700">${coupon.discount_percent}%</span>`;
                couponsList.appendChild(li);
            });
        } else {
            couponsList.innerHTML = '<p class="text-center text-gray-500 text-sm">No unused coupons.</p>';
        }
    }
}

export function renderSiteSettings(settings) {
    const form = document.getElementById('site-settings-form');
    if (!form) return;

    form.innerHTML = `
        <div>
            <label class="block font-medium text-gray-700">Site Name</label>
            <input type="text" name="site_name" class="w-full p-2 mt-1 border rounded-lg" value="${escapeHTML(settings.site_name || 'ConnectBD')}">
        </div>
        <div>
            <label class="block font-medium text-gray-700">New User Registration</label>
            <select name="registration_enabled" class="w-full p-2 mt-1 border rounded-lg">
                <option value="1" ${settings.registration_enabled == '1' ? 'selected' : ''}>Enabled</option>
                <option value="0" ${settings.registration_enabled == '0' ? 'selected' : ''}>Disabled</option>
            </select>
        </div>
        <div>
            <label class="block font-medium text-gray-700">Default Gold Coins on Register</label>
            <input type="number" name="default_gold_coins" class="w-full p-2 mt-1 border rounded-lg" value="${settings.default_gold_coins || 0}">
        </div>
        <button type="submit" class="w-full py-2 font-semibold text-white bg-violet-600 rounded-lg shadow-md hover:bg-violet-700">Save Settings</button>
    `;
}

export function renderAllTransactions(data) {
    const list = document.getElementById('all-transactions-list');
    if (!list) return;

    const { transactions, pagination } = data;
    list.innerHTML = '';
    if (transactions.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="text-center py-4">No transactions found.</td></tr>';
        return;
    }

    transactions.forEach(txn => {
        const tr = document.createElement('tr');
        const typeClass = txn.type === 'Recharge' ? 'text-green-600' : (txn.type === 'Withdrawal' ? 'text-red-600' : 'text-blue-600');
        const statusClass = txn.status === 'approved' ? 'bg-green-100 text-green-800' : (txn.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800');

        tr.innerHTML = `
            <td class="px-4 py-4"><strong class="user-name-link" data-user-id="${txn.user_id}">${escapeHTML(txn.display_name)}</strong></td>
            <td class="px-4 py-4"><span class="font-bold ${typeClass}">${txn.type}</span>: ${parseFloat(txn.amount).toFixed(2)}</td>
            <td class="px-4 py-4 text-sm">${escapeHTML(txn.details)}</td>
            <td class="px-4 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${txn.status}</span></td>
            <td class="px-4 py-4 text-sm text-gray-500">${new Date(txn.created_at).toLocaleString()}</td>
        `;
        list.appendChild(tr);
    });

    renderModerationPagination(pagination, 'all-transactions-pagination', 'all-txn-page-link');
}

export function renderUserRestrictions(restrictions, user) {
    const container = document.getElementById('restrictions-content');
    const userInfo = document.getElementById('restrictions-user-info');
    const backBtn = document.getElementById('back-to-admin-tools');

    if (!container || !userInfo || !backBtn) return;
    
    userInfo.textContent = `For user: ${user.display_name} (ID: ${user.id})`;
    backBtn.dataset.userId = user.id;

    const createSwitch = (type, label, isEnabled) => `
        <div class="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
            <label class="font-medium text-gray-700">${label}</label>
            <button class="toggle-restriction-btn px-4 py-1 text-sm font-semibold text-white rounded-full ${isEnabled ? 'bg-green-500' : 'bg-red-500'}" data-user-id="${user.id}" data-type="${type}">
                ${isEnabled ? 'Enabled' : 'Disabled'}
            </button>
        </div>`;

    container.innerHTML = `
        ${createSwitch('can_shout', 'Can Post in Shoutbox?', restrictions.can_shout == 1)}
        ${createSwitch('can_pm', 'Can Send Private Messages?', restrictions.can_pm == 1)}
        ${createSwitch('can_post_topic', 'Can Create Forum Topics?', restrictions.can_post_topic == 1)}
    `;
}

export function renderTransactions(transactions) {
    const pendingTransactionsList = document.getElementById('pending-transactions-list');
    if(!pendingTransactionsList) return;

    pendingTransactionsList.innerHTML = '';
    if (transactions.length === 0) {
        pendingTransactionsList.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No pending transactions.</td></tr>';
        return;
    }

    transactions.forEach(txn => {
        const tr = document.createElement('tr');
        tr.dataset.transactionId = txn.id;
        const typeClass = txn.type === 'Recharge' ? 'text-green-600' : 'text-red-600';

        tr.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 user-name-link" data-user-id="${txn.user_id}">${escapeHTML(txn.display_name)}</div>
                <div class="text-sm text-gray-500">ID: ${txn.user_id}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-semibold ${typeClass}">${escapeHTML(txn.type)}</div>
                <div class="text-sm text-gray-700 font-bold">${parseFloat(txn.amount).toFixed(2)} &#2547;</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">${escapeHTML(txn.details)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(txn.created_at).toLocaleString()}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                <button class="approve-txn-btn text-white bg-green-500 hover:bg-green-600 px-2 py-1 rounded-md text-xs" data-id="${txn.id}">Approve</button>
                <button class="reject-txn-btn text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md text-xs ml-2" data-id="${txn.id}">Reject</button>
            </td>
        `;
        pendingTransactionsList.appendChild(tr);
    });
}

export function renderPendingArchives(archives) {
    const container = document.getElementById('pending-archives-list');
    if (!container) return;
    container.innerHTML = '';
    if (archives.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No pending archives.</td></tr>';
        return;
    }
    archives.forEach(archive => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-4">
                <div class="text-sm font-medium text-gray-900">${escapeHTML(archive.title)}</div>
                <div class="text-sm text-gray-500">${escapeHTML(archive.display_name)}</div>
            </td>
            <td class="px-4 py-4 text-sm">${escapeHTML(archive.category)}</td>
            <td class="px-4 py-4 text-sm text-gray-600 truncate max-w-xs">${escapeHTML(archive.content)}</td>
            <td class="px-4 py-4 text-sm text-gray-500">${new Date(archive.created_at).toLocaleDateString()}</td>
            <td class="px-4 py-4 text-sm">
                <button class="approve-archive-btn text-white bg-green-500 px-2 py-1 rounded" data-id="${archive.id}">Approve</button>
                <button class="reject-archive-btn text-white bg-red-500 px-2 py-1 rounded ml-2" data-id="${archive.id}">Reject</button>
            </td>
        `;
        container.appendChild(tr);
    });
}

export function renderAdminTools(user) {
    const gridContainer = document.getElementById('admin-tools-grid');
    const contentContainer = document.getElementById('admin-tool-content');
    const userInfoEl = document.getElementById('admin-tools-user-info');
    
    if (!gridContainer || !contentContainer || !userInfoEl) return;

    userInfoEl.innerHTML = `For user: <strong class="user-name-link" data-user-id="${user.id}">${escapeHTML(user.display_name)}</strong> (ID: ${user.id})`;
    document.getElementById('back-to-user-profile-from-admin-tools').dataset.userId = user.id;

    gridContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    const tools = [
        { id: 'ban_user', title: 'Ban/Unban User', icon: 'fa-user-slash', color: 'border-red-500' },
        { id: 'toggle_blue_tick', title: 'Toggle Blue Tick', icon: 'fa-check-circle', color: 'border-sky-500' },
        { id: 'toggle_special_status', title: 'Toggle Special Status', icon: 'fa-star-of-life', color: 'border-red-700' },
        { id: 'change_role', title: 'Change Role', icon: 'fa-user-shield', color: 'border-purple-500' },
        { id: 'adjust_balance', title: 'Adjust Balance', icon: 'fa-wallet', color: 'border-green-500' },
        { id: 'adjust_gold_coins', title: 'Adjust Gold Coins', icon: 'fa-coins', color: 'border-yellow-500' },
        { id: 'reset_password', title: 'Reset Password', icon: 'fa-key', color: 'border-gray-500' },
        { id: 'granular_restrictions', title: 'Granular Restrictions', icon: 'fa-tasks', color: 'border-blue-400', isNav: true },
        { id: 'issue_warning', title: 'Issue Warning', icon: 'fa-exclamation-triangle', color: 'border-yellow-500' },
        { id: 'view_warnings', title: 'View Warnings', icon: 'fa-history', color: 'border-yellow-600' },
        { id: 'clear_avatar', title: 'Clear Avatar', icon: 'fa-camera', color: 'border-gray-400' },
        { id: 'login_history', title: 'Login History', icon: 'fa-network-wired', color: 'border-cyan-500' },
        { id: 'transaction_history', title: 'Transaction History', icon: 'fa-file-invoice-dollar', color: 'border-green-600' },
        { id: 'toggle_premium', title: 'Manage Premium', icon: 'fa-star', color: 'border-yellow-400' },
        { id: 'impersonate_user', title: 'Impersonate User', icon: 'fa-user-secret', color: 'border-red-700' },
        { id: 'user_notes', title: 'Add/View Notes', icon: 'fa-sticky-note', color: 'border-gray-600' },
        { id: 'delete_user', title: 'Delete User', icon: 'fa-user-times', color: 'border-black' }
    ];

    tools.forEach(tool => {
        const card = document.createElement('div');
        if (tool.isNav) {
            card.className = `admin-tool-card-nav ${tool.color}`;
            card.dataset.view = tool.id;
        } else {
            card.className = `admin-tool-card ${tool.color}`;
            card.dataset.toolId = tool.id;
        }
        card.dataset.userId = user.id;
        card.innerHTML = `
            <i class="fas ${tool.icon} text-3xl"></i>
            <h3 class="font-bold mt-2">${tool.title}</h3>
        `;
        gridContainer.appendChild(card);
    });
}

export function renderAllShoutsForStaff(data) {
    const { shouts, pagination } = data;
    const container = document.getElementById('moderate-shouts-list');
    if (!container) return;
    container.innerHTML = '';
    if (shouts.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center py-4">No shouts to moderate.</td></tr>';
        return;
    }
    shouts.forEach(shout => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-4 text-sm text-gray-600 truncate max-w-md">${escapeHTML(shout.text)}</td>
            <td class="px-4 py-4 text-sm font-medium user-name-link" data-user-id="${shout.user_id}">${escapeHTML(shout.display_name)}</td>
            <td class="px-4 py-4 text-sm text-gray-500">${new Date(shout.created_at).toLocaleString()}</td>
            <td class="px-4 py-4 text-sm">
                <button class="delete-shout-staff-btn text-xs bg-red-600 text-white px-2 py-1 rounded" data-shout-id="${shout.id}">Delete</button>
            </td>
        `;
        container.appendChild(tr);
    });
    renderModerationPagination(pagination, 'moderate-shouts-pagination', 'moderate-shouts-page-link');
}

export function renderAllTopicsForStaff(data) {
    const { topics, pagination } = data;
    const container = document.getElementById('moderate-topics-list');
    if (!container) return;
    container.innerHTML = '';
    if (topics.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center py-4">No topics to moderate.</td></tr>';
        return;
    }
    topics.forEach(topic => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-4 text-sm font-semibold text-blue-600 hover:underline view-topic-btn cursor-pointer" data-topic-id="${topic.id}">${escapeHTML(topic.title)}</td>
            <td class="px-4 py-4 text-sm font-medium user-name-link" data-user-id="${topic.user_id}">${escapeHTML(topic.display_name)}</td>
            <td class="px-4 py-4 text-sm text-gray-500">${new Date(topic.created_at).toLocaleDateString()}</td>
            <td class="px-4 py-4 text-sm">
                <button class="delete-topic-staff-btn text-xs bg-red-600 text-white px-2 py-1 rounded" data-topic-id="${topic.id}">Delete</button>
            </td>
        `;
        container.appendChild(tr);
    });
    renderModerationPagination(pagination, 'moderate-topics-pagination', 'moderate-topics-page-link');
}

export function renderAllArchivesForStaff(data) {
    const { archives, pagination } = data;
    const container = document.getElementById('moderate-archives-list');
    if (!container) return;
    container.innerHTML = '';
    if (archives.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center py-4">No archives to moderate.</td></tr>';
        return;
    }
    archives.forEach(archive => {
        const tr = document.createElement('tr');
        const statusClass = archive.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        tr.innerHTML = `
            <td class="px-4 py-4 text-sm font-semibold text-blue-600 hover:underline view-archive-btn cursor-pointer" data-archive-id="${archive.id}">${escapeHTML(archive.title)}</td>
            <td class="px-4 py-4 text-sm font-medium user-name-link" data-user-id="${archive.user_id}">${escapeHTML(archive.display_name)}</td>
            <td class="px-4 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${archive.status}</span></td>
            <td class="px-4 py-4 text-sm text-gray-500">${new Date(archive.created_at).toLocaleDateString()}</td>
            <td class="px-4 py-4 text-sm">
                <button class="delete-archive-staff-btn text-xs bg-red-600 text-white px-2 py-1 rounded" data-archive-id="${archive.id}">Delete</button>
            </td>
        `;
        container.appendChild(tr);
    });
    renderModerationPagination(pagination, 'moderate-archives-pagination', 'moderate-archives-page-link');
}

export function renderUserSearchResults(users) {
    const container = document.getElementById('user-search-results');
    if (!container) return;

    container.innerHTML = '';
    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="4" class="text-center py-4">No users found matching the criteria.</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');
        const displayRole = user.display_role || user.role;
        tr.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900 user-name-link cursor-pointer hover:text-blue-600" data-user-id="${user.id}">${escapeHTML(user.display_name)}</div>
                <div class="text-sm text-gray-500">ID: ${user.id}</div>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-600">${escapeHTML(user.email)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold">${escapeHTML(displayRole)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString()}</td>
        `;
        container.appendChild(tr);
    });
}

export function renderHiddenStaffPage() {
    const container = document.getElementById('hidden-staff-container');
    if (!container) return;
    container.innerHTML = `
        <div class="max-w-md mx-auto bg-white/50 p-4 rounded-lg">
            <h3 class="font-bold text-lg mb-4 text-center">Enter Password to View List</h3>
            <form id="hidden-staff-password-form">
                <input type="password" name="password" class="w-full p-2 border rounded" placeholder="Enter password..." required>
                <button type="submit" class="w-full mt-2 py-2 font-semibold text-white bg-violet-600 rounded-lg shadow-md hover:bg-violet-700">View List</button>
            </form>
        </div>
    `;
}

export function renderHiddenStaffList(users) {
    const container = document.getElementById('hidden-staff-container');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No hidden staff members found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Role</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${users.map(user => `
                        <tr>
                            <td class="px-4 py-4 whitespace-nowrap">
                                <strong class="user-name-link cursor-pointer" data-user-id="${user.id}">${escapeHTML(user.display_name)}</strong> (ID: ${user.id})
                            </td>
                            <td class="px-4 py-4 whitespace-nowrap font-semibold">${escapeHTML(user.role)}</td>
                            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.last_seen).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}