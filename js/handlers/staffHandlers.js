// js/handlers/staffHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { 
    renderAdminTools, renderTransactions,
    renderPendingArchives, renderUserProfile, renderActionStatus, escapeHTML,
    renderPremiumSettings, renderAllShoutsForStaff, renderAllTopicsForStaff, 
    renderAllArchivesForStaff, renderSiteSettings, renderAllTransactions, renderUserRestrictions,
    renderUserSearchResults, renderThemePromoGenerator, renderHiddenStaffList
} from '../ui.js';
import { fetchData_dashboard } from './dashboardHandlers.js';
import { fetchData_reports } from './reportHandlers.js';

export const fetchData_staff = {
    themesForPromo: async () => {
        const data = await apiRequest(`${API_URL}?action=get_themes_for_promo`);
        if (data.status === 'success') {
            renderThemePromoGenerator(data.themes);
        }
    },
    pendingTransactions: async () => {
        const data = await apiRequest(`${API_URL}?action=get_pending_transactions`);
        if (data.status === 'success') {
            renderTransactions(data.transactions);
        }
    },
    allTransactions: async (page = 1) => {
        const data = await apiRequest(`${API_URL}?action=get_all_transactions&page=${page}`);
        if (data.status === 'success') {
            renderAllTransactions(data);
        }
    },
    pendingArchives: async () => {
        const data = await apiRequest(`${API_URL}?action=get_pending_archives`);
        if (data.status === 'success') {
            renderPendingArchives(data.archives);
        }
    },
    premiumSettings: async () => {
        const data = await apiRequest(`${API_URL}?action=get_premium_settings`);
        if (data.status === 'success') {
            renderPremiumSettings(data);
        }
    },
    siteSettings: async () => {
        const data = await apiRequest(`${API_URL}?action=get_site_settings`);
        if (data.status === 'success') {
            renderSiteSettings(data.settings);
        }
    },
    userRestrictions: async (userId) => {
        const data = await apiRequest(`${API_URL}?action=get_user_restrictions&user_id=${userId}`);
        const userData = await apiRequest(`${API_URL}?action=get_user_profile&user_id=${userId}`);
        if (data.status === 'success' && userData.status === 'success') {
            renderUserRestrictions(data.restrictions, userData.user);
        }
    },
    allShouts: async (page = 1) => {
        const data = await apiRequest(`${API_URL}?action=get_all_shouts&page=${page}`);
        if (data.status === 'success') {
            renderAllShoutsForStaff(data);
        }
    },
    allTopics: async (page = 1) => {
        const data = await apiRequest(`${API_URL}?action=get_all_topics_staff&page=${page}`);
        if (data.status === 'success') {
            renderAllTopicsForStaff(data);
        }
    },
    allArchives: async (page = 1) => {
        const data = await apiRequest(`${API_URL}?action=get_all_archives_staff&page=${page}`);
        if (data.status === 'success') {
            renderAllArchivesForStaff(data);
        }
    },
};

async function renderToolContent(toolId, userId, contentContainer) {
    contentContainer.innerHTML = '<p class="text-center p-4">Loading tool...</p>';
    
    const userData = await apiRequest(`${API_URL}?action=get_user_profile&user_id=${userId}`);
    if (!userData || userData.status !== 'success') {
        contentContainer.innerHTML = '<p class="text-red-500 p-4">Could not load user data for this tool.</p>';
        return;
    }
    const user = userData.user;

    switch(toolId) {
        case 'ban_user':
            const banText = user.is_banned ? 'Unban User' : 'Ban User';
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto text-center">
                    <p>Current Status: <strong>${user.is_banned ? 'Banned' : 'Active'}</strong></p>
                    <button class="action-btn mt-2 bg-red-500 text-white p-2 rounded" data-action="toggle_ban_status" data-user-id="${userId}">${banText}</button>
                </div>`;
            break;
        case 'change_role':
            const isHiddenChecked = user.display_role === 'Member' && user.role !== 'Member';
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Change User Role</h4>
                    <form id="change-role-form">
                        <input type="hidden" name="user_id" value="${userId}">
                        <select name="role" class="w-full p-2 border rounded">
                            <option value="Member" ${user.role === 'Member' ? 'selected' : ''}>Member</option>
                            <option value="Moderator" ${user.role === 'Moderator' ? 'selected' : ''}>Moderator</option>
                            <option value="Senior Moderator" ${user.role === 'Senior Moderator' ? 'selected' : ''}>Sr. Moderator</option>
                            <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <div class="flex items-center mt-2">
                            <input type="checkbox" id="is-hidden-role" name="is_hidden" value="true" class="h-4 w-4 rounded" ${isHiddenChecked ? 'checked' : ''}>
                            <label for="is-hidden-role" class="ml-2 text-sm">Hide Role (Show as Member)</label>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded mt-2">Update Role</button>
                    </form>
                </div>`;
            break;
        case 'adjust_balance':
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Adjust Balance (Current: ${user.balance})</h4>
                    <form id="adjust-balance-form">
                        <input type="hidden" name="user_id" value="${userId}">
                        <input type="number" step="0.001" name="amount" class="w-full p-2 border rounded" placeholder="Amount" required>
                        <select name="type" class="w-full p-2 border rounded mt-2">
                            <option value="add">Add to balance</option>
                            <option value="remove">Remove from balance</option>
                        </select>
                        <button type="submit" class="w-full bg-blue-600 text-white p-2 rounded mt-2">Submit</button>
                    </form>
                </div>`;
            break;
        case 'adjust_gold_coins':
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Adjust Gold Coins (Current: ${user.gold_coins})</h4>
                    <form id="adjust-gold-coins-form">
                        <input type="hidden" name="user_id" value="${userId}">
                        <input type="number" name="amount" class="w-full p-2 border rounded" placeholder="Amount" required>
                        <select name="type" class="w-full p-2 border rounded mt-2">
                            <option value="add">Add Coins</option>
                            <option value="remove">Remove Coins</option>
                        </select>
                        <button type="submit" class="w-full bg-yellow-500 text-black p-2 rounded mt-2">Submit</button>
                    </form>
                </div>`;
            break;
        case 'reset_password':
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Reset Password</h4>
                    <form id="reset-password-form">
                        <input type="hidden" name="user_id" value="${userId}">
                        <input type="password" name="new_password" class="w-full p-2 border rounded" placeholder="Enter new password (min 6 chars)" required>
                        <button type="submit" class="w-full bg-gray-600 text-white p-2 rounded mt-2">Reset Password</button>
                    </form>
                </div>`;
            break;
        case 'issue_warning':
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Issue Warning</h4>
                    <form id="issue-warning-form">
                        <input type="hidden" name="user_id" value="${userId}">
                        <textarea name="reason" class="w-full p-2 border rounded" placeholder="Reason for the warning..." required></textarea>
                        <button type="submit" class="w-full bg-yellow-500 text-white p-2 rounded mt-2">Issue Warning</button>
                    </form>
                </div>`;
            break;
        case 'view_warnings': {
            const data = await apiRequest(`${API_URL}?action=get_user_warnings&user_id=${userId}`);
            let warningsHTML = '<p>No warnings found for this user.</p>';
            if (data.status === 'success' && data.warnings.length > 0) {
                warningsHTML = data.warnings.map(w => `
                    <div class="border-b p-2">
                        <p>${escapeHTML(w.reason)}</p>
                        <p class="text-xs text-gray-500">By ${escapeHTML(w.issuer_name)} on ${new Date(w.created_at).toLocaleString()}</p>
                    </div>
                `).join('');
            }
            contentContainer.innerHTML = `<div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto"><h4 class="font-bold mb-2">Warning History</h4>${warningsHTML}</div>`;
            break;
        }
        case 'clear_avatar':
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto text-center">
                    <p>Are you sure you want to clear this user's avatar?</p>
                    <button class="action-btn mt-2 bg-yellow-600 text-white p-2 rounded" data-action="clear_avatar" data-user-id="${userId}">Yes, Clear Avatar</button>
                </div>`;
            break;
        case 'toggle_premium':
            const isPremium = user.is_premium && new Date(user.premium_expires_at) > new Date();
            let currentStatusHTML = '<p>Current Status: <strong>Standard User</strong></p>';
            if (isPremium) {
                const expiryDate = new Date(user.premium_expires_at).toLocaleString();
                currentStatusHTML = `<p>Current Status: <strong class="text-green-600">Premium</strong> (Expires: ${expiryDate})</p>
                <button class="action-btn mt-4 w-full bg-red-500 text-white p-2 rounded" data-action="remove_premium_admin" data-user-id="${userId}">Remove Premium Status</button>
                <hr class="my-4">`;
            }

            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Manage Premium Status</h4>
                    ${currentStatusHTML}
                    <form id="grant-premium-form" class="mt-4">
                        <input type="hidden" name="user_id" value="${userId}">
                        <label for="premium-duration" class="block font-medium text-sm text-gray-700">Grant/Extend Premium for:</label>
                        <select name="duration_days" id="premium-duration" class="w-full p-2 border rounded mt-1">
                            <option value="1">1 Day</option>
                            <option value="7">7 Days</option>
                            <option value="14">14 Days</option>
                            <option value="30" selected>30 Days</option>
                            <option value="90">90 Days</option>
                            <option value="180">180 Days</option>
                            <option value="365">365 Days (1 Year)</option>
                        </select>
                        <button type="submit" class="w-full bg-green-600 text-white p-2 rounded mt-2">Grant / Extend</button>
                    </form>
                </div>`;
            break;
        case 'user_notes': {
            const data = await apiRequest(`${API_URL}?action=get_user_notes&user_id=${userId}`);
            let notesHTML = '<p>No private notes for this user.</p>';
            if (data.status === 'success' && data.notes.length > 0) {
                notesHTML = data.notes.map(n => `
                    <div class="border-b p-2">
                        <p>${escapeHTML(n.note)}</p>
                        <p class="text-xs text-gray-500">By ${escapeHTML(n.admin_name)} on ${new Date(n.created_at).toLocaleString()}</p>
                    </div>
                `).join('');
            }
             contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto">
                    <h4 class="font-bold mb-2">Private Notes</h4>
                    <div class="max-h-48 overflow-y-auto mb-4">${notesHTML}</div>
                    <form id="add-note-form">
                        <input type="hidden" name="user_id" value="${userId}">
                        <textarea name="note" class="w-full p-2 border rounded" placeholder="Add a new private note..." required></textarea>
                        <button type="submit" class="w-full bg-gray-600 text-white p-2 rounded mt-2">Add Note</button>
                    </form>
                </div>`;
            break;
        }
        case 'login_history': {
            const data = await apiRequest(`${API_URL}?action=get_login_history&user_id=${userId}`);
            let historyHTML = '<tr><td colspan="3" class="text-center p-4">No login history found.</td></tr>';
            if (data.status === 'success' && data.history.length > 0) {
                historyHTML = data.history.map(h => `
                    <tr>
                        <td class="p-2 border">${h.ip_address}</td>
                        <td class="p-2 border">${new Date(h.login_time).toLocaleString()}</td>
                        <td class="p-2 border text-xs">${escapeHTML(h.user_agent)}</td>
                    </tr>
                `).join('');
            }
            contentContainer.innerHTML = `<div class="bg-gray-50 p-4 rounded-lg"><h4 class="font-bold mb-2">Login History</h4><table class="w-full text-left border-collapse"><thead><tr><th class="p-2 border">IP Address</th><th class="p-2 border">Time</th><th class="p-2 border">User Agent</th></tr></thead><tbody>${historyHTML}</tbody></table></div>`;
            break;
        }
        case 'transaction_history': {
            const data = await apiRequest(`${API_URL}?action=get_transaction_history&user_id=${userId}`);
             let historyHTML = '<tr><td colspan="5" class="text-center p-4">No transaction history found.</td></tr>';
            if (data.status === 'success' && data.history.length > 0) {
                historyHTML = data.history.map(t => `
                    <tr>
                        <td class="p-2 border">${t.id}</td>
                        <td class="p-2 border ${t.type === 'Recharge' ? 'text-green-600' : 'text-red-600'}">${t.type}</td>
                        <td class="p-2 border">${t.amount}</td>
                        <td class="p-2 border">${t.status}</td>
                        <td class="p-2 border">${new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                `).join('');
            }
            contentContainer.innerHTML = `<div class="bg-gray-50 p-4 rounded-lg"><h4 class="font-bold mb-2">Transaction History</h4><table class="w-full text-left border-collapse"><thead><tr><th class="p-2 border">ID</th><th class="p-2 border">Type</th><th class="p-2 border">Amount</th><th class="p-2 border">Status</th><th class="p-2 border">Date</th></tr></thead><tbody>${historyHTML}</tbody></table></div>`;
            break;
        }
         case 'impersonate_user':
            contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto text-center">
                    <p class="font-bold">Are you sure you want to log in as this user?</p>
                    <p class="text-sm text-gray-600">You will be able to see the site exactly as they do. You can return to your account from the user menu.</p>
                    <button class="action-btn mt-2 bg-red-700 text-white p-2 rounded" data-action="impersonate_user" data-user-id="${userId}">Yes, Impersonate User</button>
                </div>`;
            break;
        case 'delete_user':
             contentContainer.innerHTML = `
                <div class="bg-gray-50 p-4 rounded-lg max-w-md mx-auto text-center">
                    <p class="text-red-600 font-bold">Are you sure you want to permanently delete this user? This action cannot be undone and will remove all their content.</p>
                    <button class="action-btn mt-2 bg-black text-white p-2 rounded" data-action="delete_user" data-user-id="${userId}">Yes, I understand, Delete User</button>
                </div>`;
            break;
        default:
             contentContainer.innerHTML = `<p class="text-center text-gray-500 p-4">This tool is not yet implemented.</p>`;
    }
}

export async function handleStaffClicks(target, currentUser) {
    if (target.id === 'generate-promo-code-btn') {
        const themeSelect = document.getElementById('theme-select-for-promo');
        const themeId = themeSelect.value;
        if (!themeId) {
            alert('Please select a theme first.');
            return true;
        }

        const formData = new FormData();
        formData.append('action', 'generate_theme_promo_code');
        formData.append('theme_id', themeId);

        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            document.getElementById('generated-code-text').textContent = data.code;
            document.getElementById('generated-code-container').classList.remove('hidden');
        } else {
            alert(data.message || 'Failed to generate code.');
        }
        return true;
    }

    const allTxnPageLink = target.closest('.all-txn-page-link');
    if (allTxnPageLink) {
        const page = allTxnPageLink.dataset.page;
        fetchData_staff.allTransactions(page);
        return true;
    }

    const toggleRestrictionBtn = target.closest('.toggle-restriction-btn');
    if (toggleRestrictionBtn) {
        const userId = toggleRestrictionBtn.dataset.userId;
        const type = toggleRestrictionBtn.dataset.type;
        const formData = new FormData();
        formData.append('action', 'toggle_restriction');
        formData.append('user_id', userId);
        formData.append('type', type);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            fetchData_staff.userRestrictions(userId);
        } else {
            alert(data.message || 'Failed to toggle restriction.');
        }
        return true;
    }

    const moderateShoutsPageLink = target.closest('.moderate-shouts-page-link');
    if(moderateShoutsPageLink) {
        const page = moderateShoutsPageLink.dataset.page;
        fetchData_staff.allShouts(page);
        return true;
    }

    const moderateTopicsPageLink = target.closest('.moderate-topics-page-link');
    if(moderateTopicsPageLink) {
        const page = moderateTopicsPageLink.dataset.page;
        fetchData_staff.allTopics(page);
        return true;
    }

    const moderateArchivesPageLink = target.closest('.moderate-archives-page-link');
    if(moderateArchivesPageLink) {
        const page = moderateArchivesPageLink.dataset.page;
        fetchData_staff.allArchives(page);
        return true;
    }

    const approveBtn = target.closest('.approve-txn-btn');
    const rejectBtn = target.closest('.reject-txn-btn');
    if (approveBtn || rejectBtn) {
        const transactionId = approveBtn ? approveBtn.dataset.id : rejectBtn.dataset.id;
        const newStatus = approveBtn ? 'approved' : 'rejected';
        const formData = new FormData();
        formData.append('action', 'update_transaction_status');
        formData.append('transaction_id', transactionId);
        formData.append('new_status', newStatus);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') { target.closest('tr').remove(); } 
        else { alert(data.message || 'Action failed.'); }
        return true;
    }
    
    const approveArchiveBtn = target.closest('.approve-archive-btn');
    const rejectArchiveBtn = target.closest('.reject-archive-btn');
    if(approveArchiveBtn || rejectArchiveBtn){
        const archiveId = approveArchiveBtn ? approveArchiveBtn.dataset.id : rejectArchiveBtn.dataset.id;
        const newStatus = approveArchiveBtn ? 'approved' : 'rejected';
        const formData = new FormData();
        formData.append('action', 'update_archive_status');
        formData.append('archive_id', archiveId);
        formData.append('new_status', newStatus);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if(data.status === 'success'){ target.closest('tr').remove(); } 
        else { alert(data.message || 'Action failed.'); }
        return true;
    }

    const toolCard = target.closest('.admin-tool-card');
    if (toolCard) {
        const toolId = toolCard.dataset.toolId;
        const userId = toolCard.dataset.userId;
        const contentContainer = document.getElementById('admin-tool-content');
        await renderToolContent(toolId, userId, contentContainer);
        return true;
    }
    
    if (target.matches('.action-btn')) {
        const action = target.dataset.action;
        const userId = target.dataset.userId;
        const formData = new FormData();
        formData.append('action', action);
        formData.append('user_id', userId);
        
        if (action === 'remove_premium_admin' && !confirm('Are you sure you want to remove premium status from this user?')) {
            return true;
        }

        if (action === 'delete_user' && !confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) {
            return true;
        }

        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        if (action === 'impersonate_user' && data.status === 'success') {
            alert(data.message);
            location.reload();
            return true;
        }

        if (action === 'delete_user' && data.status === 'success') {
            await renderActionStatus({ status: 'success', message: 'User has been deleted.', backView: 'home' });
        } else {
            await renderActionStatus({ status: data.status, message: data.message, backView: 'admin_tools', backViewId: userId });
        }
        return true;
    }

    const deleteShoutBtn = target.closest('.delete-shout-staff-btn');
    if (deleteShoutBtn) {
        const shoutId = deleteShoutBtn.dataset.shoutId;
        if (confirm('Are you sure you want to delete this shout?')) {
            const formData = new FormData();
            formData.append('action', 'delete_shout_staff');
            formData.append('shout_id', shoutId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                const currentPage = document.querySelector('.moderate-shouts-page-link.bg-violet-600')?.dataset.page || 1;
                fetchData_staff.allShouts(currentPage);
            } else { alert(data.message); }
        }
        return true;
    }

    const deleteTopicBtn = target.closest('.delete-topic-staff-btn');
    if (deleteTopicBtn) {
        const topicId = deleteTopicBtn.dataset.topicId;
        if (confirm('Are you sure you want to delete this topic and all its replies?')) {
            const formData = new FormData();
            formData.append('action', 'delete_topic');
            formData.append('topic_id', topicId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                const currentPage = document.querySelector('.moderate-topics-page-link.bg-violet-600')?.dataset.page || 1;
                fetchData_staff.allTopics(currentPage);
            } else { alert(data.message); }
        }
        return true;
    }

    const deleteArchiveBtn = target.closest('.delete-archive-staff-btn');
    if (deleteArchiveBtn) {
        const archiveId = deleteArchiveBtn.dataset.archiveId;
        if (confirm('Are you sure you want to delete this archive?')) {
            const formData = new FormData();
            formData.append('action', 'delete_archive');
            formData.append('archive_id', archiveId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                const currentPage = document.querySelector('.moderate-archives-page-link.bg-violet-600')?.dataset.page || 1;
                fetchData_staff.allArchives(currentPage);
            } else { alert(data.message); }
        }
        return true;
    }
    
    return false;
}

export async function handleStaffSubmits(form, formData, currentUser) {
    if (form.id === 'hidden-staff-password-form') {
        formData.append('action', 'get_hidden_staff');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            renderHiddenStaffList(data.hidden_staff);
        } else {
            alert(data.message || 'An error occurred.');
        }
        return true;
    }

    if (form.id === 'user-search-form') {
        const searchTerm = formData.get('search');
        const resultsContainer = document.getElementById('user-search-results');
        if (resultsContainer) resultsContainer.innerHTML = '<tr><td colspan="4" class="text-center py-4">Searching...</td></tr>';
        
        const data = await apiRequest(`${API_URL}?action=get_all_users_for_staff&search=${encodeURIComponent(searchTerm)}`);
        
        if (data.status === 'success') {
            renderUserSearchResults(data.users);
        } else {
            if (resultsContainer) resultsContainer.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">${data.message || 'Search failed.'}</td></tr>`;
        }
        return true;
    }
    if (form.id === 'site-settings-form') {
        const settings = {};
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                settings[input.name] = input.checked ? '1' : '0';
            } else {
                settings[input.name] = input.value;
            }
        });

        const postData = new FormData();
        postData.append('action', 'update_site_settings');
        for (const key in settings) {
            postData.append(`settings[${key}]`, settings[key]);
        }
        
        const data = await apiRequest(API_URL, { method: 'POST', body: postData });
        alert(data.message || 'Action completed.');
        return true;
    }
    if (form.id === 'premium-settings-form') {
        formData.append('action', 'update_premium_settings');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(data.message || 'Action completed.');
        if (data.status === 'success') {
            await fetchData_staff.premiumSettings();
        }
        return true;
    }
    if (form.id === 'generate-coupon-form') {
        formData.append('action', 'generate_coupon');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(data.message || 'Action completed.');
        if (data.status === 'success') {
            form.reset();
            await fetchData_staff.premiumSettings();
        }
        return true;
    }
    
    let action = '';
    let backView = 'admin_tools';
    let userId = formData.get('user_id');

    if (form.id === 'change-role-form') {
        action = 'update_user_role_admin';
        const isHiddenCheckbox = form.querySelector('#is-hidden-role');
        if (isHiddenCheckbox) {
            formData.append('is_hidden', isHiddenCheckbox.checked);
        }
    } else {
        switch(form.id) {
            case 'adjust-balance-form': action = 'adjust_balance'; break;
            case 'adjust-gold-coins-form': action = 'adjust_gold_coins'; break;
            case 'reset-password-form': action = 'reset_password'; break;
            case 'issue-warning-form': action = 'issue_warning'; break;
            case 'add-note-form': action = 'add_user_note'; break;
            case 'grant-premium-form': action = 'grant_premium_admin'; break;
            default: return false;
        }
    }

    formData.append('action', action);
    const data = await apiRequest(API_URL, { method: 'POST', body: formData });
    await renderActionStatus({ status: data.status, message: data.message, backView: backView, backViewId: userId });
    
    if (data.status === 'success') {
        const contentContainer = document.getElementById('admin-tool-content');
        if (contentContainer) {
            contentContainer.innerHTML = `<p class="text-center text-green-500 p-4">${data.message}</p>`;
        }
    }
    return true;
}