// js/bbcode.js
import { apiRequest, API_URL } from './api.js';

export async function parseBBCode(text, currentUser, context = {}) {
    // *** ফিক্স: এখান থেকে প্রিমিয়াম চেকটি সরিয়ে দেওয়া হয়েছে ***
    // এখন থেকে এই ফাংশনটি সব ব্যবহারকারীর জন্য BBCode পার্স করার চেষ্টা করবে।

    const formData = new FormData();
    formData.append('action', 'parse_bbcode');
    formData.append('text', text);
    formData.append('viewer_id', currentUser.id);
    if (context.type) formData.append('context_type', context.type);
    if (context.id) formData.append('context_id', context.id);

    const data = await apiRequest(API_URL, { method: 'POST', body: formData });

    if (data.status === 'success') {
        return data.html;
    } else {
        // যদি সার্ভার থেকে কোনো কারণে এরর আসে, তবে মূল লেখাটিই দেখানো হবে।
        return text;
    }
}