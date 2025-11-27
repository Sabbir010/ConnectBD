// js/ui/quizUI.js
import { escapeHTML, generateUserDisplay } from './coreUI.js';
import { timeAgo } from './helpers.js';

export function renderQuizButtonCounts(counts) {
    const btn = document.getElementById('quiz-contests-btn');
    if (btn) {
        btn.innerHTML = `<i class="fas fa-trophy"></i> Quiz/Contests [${counts.open}/${counts.total}]`;
    }
}

export function renderQuizAnnouncement(openQuizzes) {
    const container = document.getElementById('quiz-announcement-container');
    if (!container) return;

    if (openQuizzes && openQuizzes.length > 0) {
        const count = openQuizzes.length;
        const quizText = count > 1 ? 'Quizzes' : 'Quiz';
        container.innerHTML = `
            <div class="text-center mb-4 p-2 bg-yellow-100 text-yellow-800 rounded-lg font-bold cursor-pointer" id="go-to-quizzes-from-announcement">
                🔶 ${count} ${quizText} Open! 🔶
            </div>
        `;
        container.classList.remove('hidden');
    } else {
        container.innerHTML = '';
        container.classList.add('hidden');
    }
}

export function renderQuizList(quizzes, currentUser) {
    const container = document.getElementById('quiz-list-container');
    if (!container) return;
    
    const isStaff = currentUser && ['Admin', 'Senior Moderator', 'Moderator'].includes(currentUser.role);
    const addQuizBtn = document.getElementById('add-quiz-btn');
    if(addQuizBtn && isStaff) {
        addQuizBtn.classList.remove('hidden');
    }

    container.innerHTML = '';
    if (quizzes.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">No quizzes found.</p>';
        return;
    }

    quizzes.forEach(quiz => {
        const card = document.createElement('div');
        card.className = 'p-4 bg-white/60 rounded-lg border';

        const statusClass = quiz.status === 'open' ? 'text-green-600' : 'text-red-500';
        
        let staffControls = '';
        if (isStaff) {
            const pinText = quiz.is_pinned == 1 ? 'Unpin' : 'Pin';
            const statusText = quiz.status === 'open' ? 'Close' : 'Open';
            staffControls = `
                <div class="mt-2 pt-2 border-t text-sm font-semibold text-blue-600 space-x-2">
                    <a href="#" class="quiz-action-btn" data-action="pin" data-id="${quiz.id}">${pinText} Quiz</a> ||
                    <a href="#" class="quiz-action-btn" data-action="status" data-id="${quiz.id}">${statusText} Quiz</a> ||
                    <a href="#" class="quiz-action-btn text-red-600" data-action="delete" data-id="${quiz.id}">Delete This Quiz</a> ||
                    <a href="#" class="quiz-action-btn" data-action="edit" data-id="${quiz.id}">Edit This Quiz</a>
                </div>
            `;
        }

        card.innerHTML = `
            <p>» <strong>Quiz ID:</strong> ${quiz.id}</p>
            <p>» <strong>Quiz:</strong> <a href="#" class="view-topic-btn text-blue-700 font-bold" data-topic-id="${quiz.topic_id}">${escapeHTML(quiz.quiz_title)}</a> By ${escapeHTML(quiz.host)}</p>
            <p>» <strong>Short Description:</strong> ${escapeHTML(quiz.description)}</p>
            <p>» <strong>Status:</strong> <span class="font-bold ${statusClass}">${quiz.status.toUpperCase()}</span></p>
            <p>» <strong>Last Update:</strong> ${timeAgo(quiz.updated_at)}</p>
            ${staffControls}
        `;
        container.appendChild(card);
    });
}

export function renderQuizForm(quiz = null) {
    const formTitle = document.getElementById('quiz-form-title');
    const idInput = document.getElementById('quiz-id-input');
    const statusSelect = document.getElementById('quiz-status-select');
    const topicIdInput = document.getElementById('quiz-topic-id-input');
    const titleInput = document.getElementById('quiz-title-input');
    const hostInput = document.getElementById('quiz-host-input');
    const descriptionInput = document.getElementById('quiz-description-input');

    if (quiz) {
        if (formTitle) formTitle.textContent = `Edit Quiz #${quiz.id}`;
        if (idInput) idInput.value = quiz.id;
        if (statusSelect) statusSelect.value = quiz.status;
        if (topicIdInput) topicIdInput.value = quiz.topic_id;
        if (titleInput) titleInput.value = quiz.quiz_title;
        if (hostInput) hostInput.value = quiz.host;
        if (descriptionInput) descriptionInput.value = quiz.description;
    } else {
        if (formTitle) formTitle.textContent = 'Add New Quiz';
        const quizForm = document.getElementById('quiz-form');
        if (quizForm) quizForm.reset();
        if (idInput) idInput.value = '';
    }
}