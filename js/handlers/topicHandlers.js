// js/handlers/topicHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { 
    showView, renderTopicList, renderTopicDetails, 
    renderTopicOptions, renderActionStatus, renderTopicStats,
    renderTopicReplyEditForm // *** এটি ইম্পোর্ট করা আবশ্যক ***
} from '../ui.js';

export const fetchData_topics = {
    allTopics: async (category = 'all', page = 1) => {
        const data = await apiRequest(`${API_URL}?action=get_all_topics&category=${encodeURIComponent(category)}&page=${page}`);
        if (data.status === 'success') {
            renderTopicList(data);
        }
    },
    topicDetails: async (topicId, page = 1, replyId = 0) => {
        let url = `${API_URL}?action=get_topic_details&page=${page}`;
        if (topicId) {
            url += `&topic_id=${topicId}`;
        } else if (replyId) {
            url += `&reply_id=${replyId}`;
        } else {
             await renderActionStatus({ status: 'error', message: 'Topic or Reply ID is required.', backView: 'topics' });
            return null;
        }

        const data = await apiRequest(url);
        if (data.status === 'success') {
            return data;
        } else {
            await renderActionStatus({ status: 'error', message: data.message || 'Could not load topic.', backView: 'topics' });
            return null;
        }
    },
    topicStats: async () => {
        const data = await apiRequest(`${API_URL}?action=get_topic_stats`);
        if (data.status === 'success') {
            renderTopicStats(data.stats);
        }
    },
    // *** নতুন: রিপ্লাইয়ের ডিটেইলস আনার ফাংশন ***
    replyDetails: async (replyId) => {
        const data = await apiRequest(`${API_URL}?action=get_reply_details&reply_id=${replyId}`);
        if (data.status === 'success') {
            return data;
        } else {
            alert(data.message || 'Could not load reply details.');
            return null;
        }
    }
};

export async function handleTopicClicks(target, currentUser) {
    if (target.id === 'topics-btn' || target.classList.contains('back-to-topics')) {
        await showView('topics');
        fetchData_topics.topicStats();
        fetchData_topics.allTopics();
        return true;
    }
    
    if (target.id === 'create-topic-btn') {
        await showView('topic_create');
        return true;
    }
    
    const categoryLink = target.closest('.topic-category-link');
    if (categoryLink) {
        const category = categoryLink.dataset.category;
        await showView('topics');
        
        setTimeout(async () => {
            await fetchData_topics.topicStats();
            await fetchData_topics.allTopics(category, 1);
            
            const header = document.getElementById('topic-list-header');
            const title = document.getElementById('topic-list-title');
            const stats = document.getElementById('forum-stats-container');
            const categories = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');

            if (stats) stats.classList.add('hidden');
            if (categories) categories.classList.add('hidden');
            if (header && title) {
                header.classList.remove('hidden');
                title.textContent = `Topics in: ${category}`;
            }
        }, 100);
        return true;
    }

    const topicPageLink = target.closest('.topic-page-link');
    if (topicPageLink) {
        const page = topicPageLink.dataset.page;
        const category = topicPageLink.dataset.category;
        fetchData_topics.allTopics(category, page);
        return true;
    }

    const viewTopicBtn = target.closest('.view-topic-btn') || target.closest('#back-to-topic-view');
    if (viewTopicBtn) {
        const topicId = viewTopicBtn.dataset.topicId;
        if (topicId) {
            await showView('topic_view');
            const data = await fetchData_topics.topicDetails(topicId);
            if(data) renderTopicDetails(data, currentUser);
        }
        return true;
    }
    
    if (target.id === 'topic-options-link') {
        const topicId = target.dataset.topicId;
        await showView('topic_options');
        const data = await fetchData_topics.topicDetails(topicId);
        if (data) renderTopicOptions(data.topic, currentUser);
        return true;
    }

    if (target.id === 'shout-topic-link') {
        const topicId = target.dataset.topicId;
        if (confirm('Are you sure you want to shout this topic?')) {
            const formData = new FormData();
            formData.append('action', 'shout_topic');
            formData.append('topic_id', topicId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            alert(data.message);
        }
        return true;
    }

    const replyPageLink = target.closest('.reply-page-link');
    if (replyPageLink) {
        const page = replyPageLink.dataset.page;
        const topicId = replyPageLink.dataset.topicId;
        const data = await fetchData_topics.topicDetails(topicId, page);
        if (data) renderTopicDetails(data, currentUser);
        return true;
    }

    // *** নতুন: এডিট বাটন ক্লিক হ্যান্ডলার ***
    if (target.classList.contains('edit-reply-btn')) {
        const replyId = target.dataset.replyId;
        history.pushState(null, '', `/topic_reply_edit?id=${replyId}`);
        await showView('topic_reply_edit');
        const data = await fetchData_topics.replyDetails(replyId);
        if (data && data.reply) {
            renderTopicReplyEditForm(data.reply);
        }
        return true;
    }

    // *** নতুন: এডিট পেজ থেকে ফিরে আসার বাটন ***
    if (target.id === 'back-to-topic-from-edit') {
        const topicId = target.dataset.topicId;
        await showView('topic_view');
        const data = await fetchData_topics.topicDetails(topicId);
        if(data) renderTopicDetails(data, currentUser);
        return true;
    }

    const topicId = target.dataset.topicId;
    let action = '';
    if (target.id === 'toggle-pin-topic-btn') action = 'toggle_pin_topic';
    if (target.id === 'toggle-close-topic-btn') action = 'toggle_close_topic';
    if (target.id === 'toggle-replies-visibility-btn') action = 'toggle_replies_visibility';
    if (target.id === 'delete-topic-btn') {
        if (confirm('Are you sure you want to permanently delete this topic and all its replies?')) {
            action = 'delete_topic';
        }
    }
    
    if (action && topicId) {
        const formData = new FormData();
        formData.append('action', action);
        formData.append('topic_id', topicId);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        if (data.status === 'success') {
            if (action === 'delete_topic') {
                await renderActionStatus({ status: 'success', message: 'Topic deleted successfully.', backView: 'topics' });
            } else {
                const topicData = await fetchData_topics.topicDetails(topicId);
                if (topicData) {
                     if (target.closest('#topic-options-content')) {
                        renderTopicOptions(topicData.topic, currentUser);
                     } else {
                        renderTopicDetails(topicData, currentUser);
                     }
                }
            }
        } else {
            alert(data.message || 'Action failed.');
        }
        return true;
    }
    
    return false;
}

export async function handleTopicSubmits(form, formData, currentUser) {
    if (form.id === 'topic-create-form') {
        formData.append('action', 'create_topic');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        await renderActionStatus({ status: data.status, message: data.message, backView: 'topics' });
        return true;
    }
    
    if (form.id === 'topic-edit-form-options') {
        formData.append('action', 'edit_topic');
        const topicId = form.elements.topic_id.value;
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            alert('Topic updated successfully!');
            const topicData = await fetchData_topics.topicDetails(topicId);
            if (topicData) renderTopicOptions(topicData.topic, currentUser);
        } else {
            alert(data.message || 'Update failed.');
        }
        return true;
    }

    // *** নতুন: রিপ্লাই এডিট ফর্ম সাবমিট হ্যান্ডলার ***
    if (form.id === 'topic-reply-edit-form') {
        formData.append('action', 'edit_reply');
        const topicId = form.elements.topic_id.value;
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        if (data.status === 'success') {
            alert('Reply updated successfully!');
            await showView('topic_view');
            const topicData = await fetchData_topics.topicDetails(topicId);
            if (topicData) renderTopicDetails(topicData, currentUser);
        } else {
            alert(data.message || 'Update failed.');
        }
        return true;
    }

    if (form.id === 'move-topic-form') {
        formData.append('action', 'move_topic');
        const topicId = form.elements.topic_id.value;
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            alert(data.message);
            const topicData = await fetchData_topics.topicDetails(topicId);
            if (topicData) renderTopicOptions(topicData.topic, currentUser);
        } else {
            alert(data.message || 'Move failed.');
        }
        return true;
    }
    
    if (form.id === 'topic-reply-form') {
        formData.append('action', 'post_topic_reply');
        const topicId = form.elements.topic_id.value;
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            form.reset();
            const topicData = await fetchData_topics.topicDetails(topicId, 999);
            return { needsRender: true, topicData };
        } else {
            alert(data.message);
        }
        return true;
    }
    
    if (form.id === 'topic-search-form') {
        const text = formData.get('text').trim();
        if(!text) return true;
        
        const inField = formData.get('in');
        const order = formData.get('order');
        
        await showView('topics');
        
        setTimeout(async () => {
            const data = await apiRequest(`${API_URL}?action=search_topics&text=${encodeURIComponent(text)}&in=${inField}&order=${order}`);
            
            const header = document.getElementById('topic-list-header');
            const title = document.getElementById('topic-list-title');
            const listContainer = document.getElementById('topic-list');
            const paginationContainer = document.getElementById('topic-list-pagination');
            const statsContainer = document.getElementById('forum-stats-container');
            const categoriesContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');

            if (statsContainer) statsContainer.classList.add('hidden');
            if (categoriesContainer) categoriesContainer.classList.add('hidden');
            if (header && title) {
                header.classList.remove('hidden');
                title.textContent = `Search Results for: "${text}"`;
            }
            if (listContainer) {
                listContainer.innerHTML = '';
                if (data.status === 'success' && data.results.length > 0) {
                     data.results.forEach(topic => listContainer.appendChild(createTopicElement(topic, false)));
                } else {
                     listContainer.innerHTML = '<p class="text-center text-gray-500">No topics found matching your criteria.</p>';
                }
            }
            if(paginationContainer) paginationContainer.innerHTML = '';
        }, 100);
        
        return true;
    }

    return false;
}