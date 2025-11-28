// js/ui/homeUI.js
import { escapeHTML, generateUserDisplay } from './coreUI.js';
import { renderShout } from './shoutUI.js';

let dateTimeInterval = null;

// ১. হেডার রেন্ডার (ওয়েলকাম মেসেজ + ঘড়ি)
export function renderHomeHeader(user, serverTime) {
    const dateTimeEl = document.getElementById('live-date-time');
    const welcomeEl = document.getElementById('welcome-message');

    if (!dateTimeEl || !welcomeEl) return;

    // আগের টাইমার ক্লিয়ার করা
    if (dateTimeInterval) clearInterval(dateTimeInterval);

    // Welcome Message (ব্লু টিক ও স্পেশাল কালার সহ)
    // generateUserDisplay ব্যবহার করায় এখন নাম লাল এবং ব্লু টিক দেখাবে
    welcomeEl.innerHTML = `Welcome back, <b>${generateUserDisplay(user, false)}</b>!`;

    // লাইভ ডেট ও টাইম
    if (serverTime) {
        let serverDate = new Date(serverTime);
        const updateTime = () => {
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            dateTimeEl.textContent = serverDate.toLocaleString('en-US', options);
            serverDate.setSeconds(serverDate.getSeconds() + 1);
        };
        updateTime();
        dateTimeInterval = setInterval(updateTime, 1000);
    }
}

// ২. সাইট স্ট্যাটিস্টিকস রেন্ডার (Newest Member সহ)
export function renderHomeStats(statsData) {
    // যদি আলাদা কন্টেইনার না থাকে, সরাসরি আইডি দিয়ে আপডেট করা হবে
    if (!statsData) return;

    const updateElementText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElementText('stats-total-online', statsData.total_online || 0);
    updateElementText('stats-male-online', statsData.male_online || 0);
    updateElementText('stats-female-online', statsData.female_online || 0);
    updateElementText('stats-premium-online', statsData.premium_online || 0);
    updateElementText('stats-staff-online', statsData.staff_online || 0);
    updateElementText('stats-active-today', statsData.active_today || 0);
    
    // Newest Member (ব্লু টিক ও স্পেশাল কালার সহ)
    const newestMemberEl = document.getElementById('stats-newest-member');
    if (newestMemberEl) {
        if (statsData.newest_member_data) {
            // generateUserDisplay ব্যবহার করা হচ্ছে যাতে নতুন মেম্বারের ব্যাজ/কালার ঠিক থাকে
            newestMemberEl.innerHTML = generateUserDisplay(statsData.newest_member_data, false);
        } else {
            newestMemberEl.textContent = 'N/A';
        }
    }
}

// ৩. হোম পেজের লেটেস্ট সাউট রেন্ডার
export async function renderHomeLatestShout(shoutData, currentUser) {
    // আইডি চেক করুন (আপনার HTML এ সম্ভবত 'home-latest-shout' বা 'latest-shout-container' আছে)
    const container = document.getElementById('home-latest-shout') || document.getElementById('latest-shout-container');
    
    if (!container) return;

    if (shoutData) {
        const newShoutElement = await renderShout(shoutData, currentUser);
        
        // কন্টেন্ট সেইম হলে রিপ্লেস করার দরকার নেই (ফ্লিকারিং কমাবে)
        const existingShout = container.querySelector('[data-shout-id]');
        if (existingShout && existingShout.dataset.shoutId == shoutData.id) {
             // শুধুমাত্র পরিবর্তন হলেই আপডেট হবে
             if (existingShout.innerHTML !== newShoutElement.innerHTML) {
                existingShout.replaceWith(newShoutElement);
             }
        } else {
            container.innerHTML = '';
            container.appendChild(newShoutElement);
        }
    } else {
        container.innerHTML = '<p class="text-center text-gray-500 italic">No shouts posted yet.</p>';
    }
}