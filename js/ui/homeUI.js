// js/ui/homeUI.js
import { generateUserDisplay } from './coreUI.js';

let dateTimeInterval = null;

export function renderHomeHeader(user, serverTime) {
    const dateTimeEl = document.getElementById('live-date-time');
    const welcomeEl = document.getElementById('welcome-message');

    if (!dateTimeEl || !welcomeEl) return;

    // Clear previous interval
    if (dateTimeInterval) clearInterval(dateTimeInterval);

    // Welcome Message
    welcomeEl.innerHTML = `Welcome, ${generateUserDisplay(user, false)}`;

    // Live Date & Time
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

    updateTime(); // Initial display
    dateTimeInterval = setInterval(updateTime, 1000);
}