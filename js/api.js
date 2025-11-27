// js/api.js

// আপনার API ফাইলের সঠিক পাথ (path) এখানে দিন।
export const API_URL = '/api/api.php';

/**
 * API সার্ভারে ডেটা পাঠানোর জন্য একটি সাধারণ ফাংশন।
 * @param {string} url - API এন্ডপয়েন্টের URL।
 * @param {object} options - fetch() ফাংশনের জন্য অপশন (e.g., method, body)।
 * @returns {Promise<object>} - সার্ভার থেকে প্রাপ্ত JSON ডেটা।
 */
export async function apiRequest(url, options = {}) {
    // ক্রেডেনশিয়াল (যেমন কুকি) পাঠানোর জন্য এই অপশনটি জরুরি
    options.credentials = 'include'; 

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error('API Error Response:', response.statusText);
            return { status: 'error', message: `Server responded with status: ${response.status}` };
        }
        return await response.json();
    } catch (error) {
        console.error('API Request Failed:', error);
        return { status: 'error', message: 'Network error or server is unreachable.' };
    }
}