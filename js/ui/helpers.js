// js/ui/helpers.js
import { parseBBCode } from '../bbcode.js';

/**
 * Converts total seconds into a human-readable string (Days, Hours, Minutes, Seconds).
 * @param {number} totalSeconds - The total seconds to format.
 * @returns {string} The formatted time string.
 */
export function formatSeconds(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${days} Days, ${hours} Hours, ${minutes} minutes, ${seconds} Seconds`;
}

/**
 * Calculates the session online time (resets every hour).
 * @param {number} totalSeconds - The user's total online seconds.
 * @returns {string} The formatted session time string (Minutes, Seconds).
 */
export function formatSessionTime(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;

    const sessionSeconds = totalSeconds % 3600; // Reset every hour (3600 seconds)
    const minutes = Math.floor(sessionSeconds / 60);
    const seconds = Math.floor(sessionSeconds % 60);

    return `${minutes} minutes ${seconds} seconds`;
}

/**
 * Calculates age from a birthday string.
 * @param {string} birthdayString - The birthday in 'YYYY-MM-DD' format.
 * @returns {number|string} The calculated age or 'N/A'.
 */
export function calculateAge(birthdayString) {
    if (!birthdayString) return 'N/A';
    const birthday = new Date(birthdayString);
    const ageDifMs = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

/**
 * Converts a date into a human-readable "time ago" string.
 * @param {string} date - The date string to process.
 * @returns {string} - A string like "2 hours ago".
 */
export function timeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 5) return "just now";

    const intervals = {
        year: 31536000,
        month: 2592000,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };

    let counter;
    for (const key in intervals) {
        counter = Math.floor(seconds / intervals[key]);
        if (counter > 0) {
            return `${counter} ${key}${counter > 1 ? 's' : ''} ago`;
        }
    }
    return "just now";
}

/**
 * Converts total seconds into a human-readable string (Hours:Minutes or Minutes:Seconds).
 * @param {number} totalSeconds - The total seconds to format.
 * @returns {string} The formatted time string.
 */
export function formatIdleTime(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;

    if (totalSeconds >= 3600) { // যদি ১ ঘণ্টা বা তার বেশি হয়
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours} hours ${minutes} minutes`;
    } else { // যদি ১ ঘণ্টার কম হয়
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes} minutes ${seconds} seconds`;
    }
}


function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * টেক্সটের মধ্যে থাকা URL, ট্যাগ এবং ইমোটিকনকে ছবিতে বা লিঙ্কে পরিণত করে
 * @param {string} text - The text to process.
 * @param {object} currentUser - The currently logged-in user object.
 * @param {object} context - The context of where the text is displayed (e.g., {type: 'shout', id: 123}).
 * @returns {Promise<string>} - HTML string with all conversions.
 */
export async function linkify(text, currentUser, context = {}) {
    if (!text) return '';

    // First, process BBCode which handles its own escaping
    let processedText = await parseBBCode(text, currentUser, context);

    // If the text was returned from BBCode parser, it's already HTML-safe
    // If not, we need to escape it now.
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedText;
    if (tempDiv.textContent === text && !tempDiv.querySelector('*')) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(text));
        processedText = p.innerHTML;
    }

    // Custom Emoticons
    const emoticons = {
        ':yuno:': '<img src="https://i.imgur.com/k28o4G1.png" class="inline h-10" alt="yuno">',
        ':pacman:': '<img src="https://i.imgur.com/HP65q6p.gif" class="inline h-5" alt="pacman">',
        // Add more emoticons here as needed
    };
    for (const code in emoticons) {
        processedText = processedText.replace(new RegExp(escapeRegExp(code), 'g'), emoticons[code]);
    }

    // URL Linking (ensure it doesn't mess up existing HTML from BBCode)
    const urlRegex = /(?<!href="|src=")(https?:\/\/[^\s<]+)/g;

    return processedText.replace(urlRegex, (url) => {
        // Check if the URL is already inside an anchor tag
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = processedText;
        let isLinked = false;
        tempContainer.querySelectorAll('a').forEach(a => {
            if (a.href === url) {
                isLinked = true;
            }
        });
        if (isLinked) return url;

        // Process images or create links
        if (/\.(png|jpg|jpeg|gif|webp)$/i.test(url)) {
            return `<img src="${url}" class="max-w-full h-auto rounded-lg my-2" alt="User Image">`;
        }
        return `<a href="${url}" target="_blank" class="text-blue-600 hover:underline">${url}</a>`;
    });
}