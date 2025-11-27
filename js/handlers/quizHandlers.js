// js/handlers/quizHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderQuizButtonCounts, renderQuizAnnouncement, renderQuizList, renderQuizForm, renderActionStatus } from '../ui.js';

export const fetchData_quizzes = {
    counts: async () => {
        const data = await apiRequest(`${API_URL}?action=get_quiz_counts`);
        if (data.status === 'success') {
            renderQuizButtonCounts(data.counts);
        }
    },
    announcement: async () => {
        const data = await apiRequest(`${API_URL}?action=get_open_quizzes_announcement`);
        if (data.status === 'success') {
            renderQuizAnnouncement(data.open_quizzes);
        }
    },
    list: async (currentUser) => {
        const data = await apiRequest(`${API_URL}?action=get_all_quizzes`);
        if (data.status === 'success') {
            renderQuizList(data.quizzes, currentUser);
        }
    },
    detailsForEdit: async (quizId) => {
        const data = await apiRequest(`${API_URL}?action=get_quiz_details&id=${quizId}`);
        if (data.status === 'success') {
            renderQuizForm(data.quiz);
        } else {
            alert(data.message || 'Could not fetch quiz details.');
        }
    }
};

export async function handleQuizClicks(target, currentUser) {
    if (target.id === 'quiz-contests-btn' || target.id === 'go-to-quizzes-from-announcement' || target.classList.contains('back-to-quizzes')) {
        await showView('quizzes');
        fetchData_quizzes.list(currentUser);
        return true;
    }

    if (target.id === 'add-quiz-btn') {
        await showView('quiz_form');
        renderQuizForm(null); // Pass null for a new quiz
        return true;
    }
    
    // *** নতুন কোড: সাবমিট বাটন ক্লিকের জন্য হ্যান্ডলার ***
    if (target.id === 'submit-quiz-btn') {
        const form = document.getElementById('quiz-form');
        if (form) {
            const formData = new FormData(form);
            const quizId = formData.get('id');
            const action = quizId ? 'edit_quiz' : 'add_quiz';
            formData.append('action', action);

            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            await renderActionStatus({
                status: data.status,
                message: data.message || 'Action completed.',
                backView: 'quizzes'
            });
        }
        return true;
    }

    const actionBtn = target.closest('.quiz-action-btn');
    if (actionBtn) {
        const action = actionBtn.dataset.action;
        const id = actionBtn.dataset.id;
        
        if (action === 'edit') {
            await showView('quiz_form');
            fetchData_quizzes.detailsForEdit(id);
        } else {
            let confirmMessage = `Are you sure you want to ${action} this quiz?`;
            if (action === 'delete' && !confirm(confirmMessage)) {
                return true;
            }
            
            const formData = new FormData();
            formData.append('action', `toggle_quiz_${action}`); // e.g., toggle_quiz_pin
            if (action === 'delete') {
                formData.set('action', 'delete_quiz');
            }
            formData.append('id', id);

            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                fetchData_quizzes.list(currentUser); // Refresh list
            } else {
                alert(data.message || 'Action failed.');
            }
        }
        return true;
    }
    return false;
}

// *** পুরনো সাবমিট হ্যান্ডলারটি মুছে ফেলা হয়েছে ***
export async function handleQuizSubmits(form, formData, currentUser) {
    // এই ফাংশনটি এখন আর ব্যবহার করা হবে না, তাই এটি খালি থাকবে বা মুছে ফেলা যাবে।
    return false;
}