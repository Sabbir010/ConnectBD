// js/handlers/homeHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { 
    renderHomeHeader, 
    renderHomeStats, 
    renderHomeLatestShout, 
    renderHomePermissions, 
    renderQuizAnnouncement, 
    renderQuizButtonCounts 
} from '../ui.js';

export const fetchData_home = {
    details: async (currentUser) => {
        const data = await apiRequest(`${API_URL}?action=get_home_details`);
        if (data.status === 'success') {
            // ১. হেডার (ওয়েলকাম মেসেজ + ঘড়ি)
            renderHomeHeader(currentUser, data.server_time);
            
            // ২. সাইট স্ট্যাটিস্টিকস
            // যদি api তে site_stats আলাদা অবজেক্ট না থাকে, তবে data.stats ব্যবহার করুন
            const statsData = data.site_stats || data.stats;
            if (statsData) {
                renderHomeStats(statsData);
            }

            // ৩. লেটেস্ট সাউট
            await renderHomeLatestShout(data.latest_shout, currentUser);
            
            // ৪. কুইজ এবং পারমিশন
            renderQuizButtonCounts(data.quiz_counts);
            renderQuizAnnouncement(data.quiz_announcement);
            renderHomePermissions(currentUser);

            // ৫. স্টোরি লোড করা (নতুন ফিচার)
            // storyUI.js ফাইলটি index.html এ থাকলে এই ফাংশনটি গ্লোবালি পাওয়া যাবে
            if (typeof window.loadStories === 'function') {
                window.loadStories();
            }
        }
    }
};

export async function handleHomeClicks(target, currentUser) {
    // ভবিষ্যতে হোম পেইজের কোনো ক্লিকের জন্য প্রয়োজন হলে এখানে কোড যোগ করা যাবে
    return false;
}