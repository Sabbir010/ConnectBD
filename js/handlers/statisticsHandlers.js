// js/handlers/statisticsHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderStatisticsList, renderUserListWithPagination } from '../ui.js';

export const fetchData_statistics = {
    generalStats: async () => {
        const data = await apiRequest(`${API_URL}?action=get_general_stats`);
        if (data.status === 'success') {
            document.getElementById('total-members-count').textContent = data.stats.total;
            document.getElementById('male-members-count').textContent = data.stats.male;
            document.getElementById('female-members-count').textContent = data.stats.female;
        }
    }
};

async function showListPage(listType, title, page = 1) {
    await showView('user_list');
    
    const userListTitle = document.getElementById('user-list-title');
    const userListContainer = document.getElementById('user-list-container');
    const backBtn = document.getElementById('user-list-back-button');

    if (backBtn) {
        backBtn.textContent = '← Back to Statistics';
        backBtn.classList.remove('back-to-home');
        backBtn.classList.add('back-to-statistics');
    }

    if (userListTitle) userListTitle.textContent = title;
    if (userListContainer) userListContainer.innerHTML = '<p class="text-center p-4">Loading...</p>';

    const data = await apiRequest(`${API_URL}?action=get_statistics_list&type=${listType}&page=${page}`);
    
    if (data.status === 'success') {
        const generalLists = ['total_members', 'male_members', 'female_members'];
        if (generalLists.includes(listType)) {
            renderUserListWithPagination(data, listType);
        } else {
            renderStatisticsList(data, listType);
        }
    } else {
        if (userListContainer) userListContainer.innerHTML = `<p class="text-center col-span-full text-red-500">${data.message || 'Could not load list.'}</p>`;
    }
}

export async function handleStatisticsClicks(target) {
    const statListLink = target.closest('.stat-list-link');
    if (statListLink) {
        const listType = statListLink.dataset.listType;
        const title = statListLink.textContent.trim();
        await showListPage(listType, title);
        return true;
    }

    const pageLink = target.closest('.general-list-page-link');
    if (pageLink) {
        const listType = pageLink.dataset.listType;
        const page = pageLink.dataset.page;
        const title = document.getElementById('user-list-title').textContent;
        await showListPage(listType, title, page);
        return true;
    }

    return false;
}