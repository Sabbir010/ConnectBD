// ConnectBD/js/ui/storyUI.js

let allStories = [];
let currentStoryUserIndex = 0;
let currentStoryItemIndex = 0;
let storyTimer;
let isPaused = false;

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('stories-container')) {
        loadStories();
    }
});

// Event Delegation for Create Story Form
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'story-form') {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerText : 'Share';
        if(submitBtn) submitBtn.innerText = 'Posting...';

        fetch('api/api.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            alert(data.message);
            if(data.status === 'success') {
                closeCreateStoryModal();
                loadStories();
                form.reset();
            }
        })
        .finally(() => { if(submitBtn) submitBtn.innerText = originalText; });
    }
});

function loadStories() {
    const formData = new FormData();
    formData.append('action', 'get_stories');
    fetch('api/api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            allStories = data.stories;
            renderStoriesList(allStories);
        }
    });
}

function renderStoriesList(stories) {
    const container = document.getElementById('stories-container');
    if (!container) return;

    const addButton = container.firstElementChild; 
    container.innerHTML = '';
    if (addButton) container.appendChild(addButton);

    stories.forEach((userStory, index) => {
        const div = document.createElement('div');
        div.className = 'flex-shrink-0 flex flex-col items-center cursor-pointer';
        div.onclick = () => openStoryViewer(index);
        
        div.innerHTML = `
            <div class="w-16 h-16 rounded-full border-2 border-violet-500 p-0.5 relative">
                <img src="${userStory.photo_url || 'uploads/avatars/default.png'}" class="w-full h-full rounded-full object-cover">
            </div>
            <span class="text-xs mt-1 font-medium truncate w-16 text-center">${userStory.display_name}</span>
        `;
        container.appendChild(div);
    });
}

// --- Story Viewer Functions ---

function openStoryViewer(userIndex) {
    currentStoryUserIndex = userIndex;
    currentStoryItemIndex = 0;
    const modal = document.getElementById('story-viewer-modal');
    if(modal) {
        modal.classList.remove('hidden');
        showStory();
    }
}

function closeStoryViewer() {
    clearTimeout(storyTimer);
    const modal = document.getElementById('story-viewer-modal');
    if(modal) modal.classList.add('hidden');
    isPaused = false;
}

function showStory() {
    clearTimeout(storyTimer);
    if (currentStoryUserIndex >= allStories.length) { closeStoryViewer(); return; }

    const userStories = allStories[currentStoryUserIndex];
    if (!userStories || !userStories.items || currentStoryItemIndex >= userStories.items.length) {
        currentStoryUserIndex++;
        currentStoryItemIndex = 0;
        showStory();
        return;
    }

    const story = userStories.items[currentStoryItemIndex];
    
    // UI Elements
    const nameEl = document.getElementById('viewer-user-name');
    const imgEl = document.getElementById('viewer-user-img');
    const display = document.getElementById('story-display');
    const progressContainer = document.getElementById('story-progress-container');

    // Update Header
    if(nameEl) nameEl.innerText = userStories.display_name;
    if(imgEl) imgEl.src = userStories.photo_url || 'uploads/avatars/default.png';

    // Update Content
    if(display) {
        display.innerHTML = '';
        if (story.type === 'text') {
            display.innerHTML = `<h2 class="text-white text-2xl font-bold p-4 break-words select-none">${story.content}</h2>`;
            display.style.backgroundColor = story.bg_color || '#000';
            display.style.backgroundImage = 'none';
        } else {
            // FIX: Removed 'api/' prefix from image URL
            display.style.backgroundColor = '#000';
            display.style.backgroundImage = `url('${story.content}')`;
            display.style.backgroundSize = 'contain';
            display.style.backgroundRepeat = 'no-repeat';
            display.style.backgroundPosition = 'center';
        }
        
        // --- Delete Button (If authorized) ---
        let deleteBtnHTML = '';
        if (story.can_delete) {
            deleteBtnHTML = `
                <button class="absolute top-6 right-16 text-white bg-red-600/50 hover:bg-red-600 p-2 rounded-full z-30 pointer-events-auto" onclick="deleteStory(${story.id})" title="Delete Story">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        // --- Comments Display ---
        let commentsHtml = '';
        if (story.comments && story.comments.length > 0) {
            const recentComments = story.comments.slice(0, 3).reverse(); 
            commentsHtml = `<div id="story-comments-${story.id}" class="max-h-24 overflow-y-auto mb-2 space-y-1 text-sm text-white text-shadow scrollbar-hide pointer-events-auto">`;
            recentComments.forEach(c => {
                 commentsHtml += `<div class="bg-black/30 px-2 py-1 rounded w-fit max-w-full break-words"><span class="font-bold text-yellow-300">${c.display_name}:</span> ${c.comment}</div>`;
            });
            commentsHtml += `</div>`;
        } else {
            commentsHtml = `<div id="story-comments-${story.id}" class="max-h-24 overflow-y-auto mb-2 space-y-1 text-sm text-white text-shadow scrollbar-hide pointer-events-auto"></div>`;
        }

        // --- Interaction Overlay ---
        const interactionDiv = document.createElement('div');
        interactionDiv.className = 'absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 flex flex-col gap-2';
        
        const likedClass = story.has_liked ? 'text-red-500' : 'text-white';
        interactionDiv.innerHTML = `
            <div class="flex justify-between items-center text-white mb-2 pointer-events-auto">
                <div class="flex gap-4">
                    <button class="flex items-center gap-1 ${likedClass} hover:scale-110 transition" onclick="toggleStoryLike(${story.id}, this)">
                        <i class="fas fa-heart text-2xl"></i> <span class="text-sm font-bold">${story.like_count}</span>
                    </button>
                    <button class="flex items-center gap-1 text-white hover:text-blue-400" onclick="shareStoryToShout(${story.id})">
                        <i class="fas fa-share text-2xl"></i>
                    </button>
                </div>
                <div class="flex items-center gap-1 opacity-80" title="Views">
                    <i class="fas fa-eye text-sm"></i> <span class="text-xs">${story.view_count}</span>
                </div>
            </div>
            
            ${commentsHtml}

            <div class="flex gap-2 pointer-events-auto">
                <input type="text" id="story-comment-input-${story.id}" class="flex-1 bg-white/20 border border-white/30 rounded-full px-4 py-2 text-white placeholder-gray-300 text-sm focus:outline-none focus:bg-white/30 backdrop-blur-sm" placeholder="Send a message..." onfocus="pauseStory()" onblur="resumeStory()">
                <button class="text-white bg-blue-600/80 hover:bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center transition" onclick="sendStoryComment(${story.id})"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
        
        interactionDiv.addEventListener('click', (e) => e.stopPropagation());

        display.innerHTML += deleteBtnHTML;
        display.appendChild(interactionDiv);
    }

    // Progress Bars
    if(progressContainer) {
        progressContainer.innerHTML = '';
        userStories.items.forEach((_, idx) => {
            const bar = document.createElement('div');
            bar.className = 'h-1 flex-1 bg-white/30 rounded overflow-hidden mx-0.5';
            if (idx < currentStoryItemIndex) {
                bar.innerHTML = '<div class="h-full bg-white w-full"></div>';
            } else if (idx === currentStoryItemIndex) {
                bar.innerHTML = `<div id="story-progress-bar" class="h-full bg-white w-full animate-progress origin-left" style="animation-duration: 5s; ${isPaused ? 'animation-play-state: paused;' : 'animation-play-state: running;'}"></div>`;
            }
            progressContainer.appendChild(bar);
        });
    }

    recordStoryView(story.id);

    if(!isPaused) {
        storyTimer = setTimeout(() => {
            nextStory();
        }, 5000);
    }
}

function nextStory() {
    if(isPaused) return; 
    currentStoryItemIndex++;
    showStory();
}

function prevStory() {
    if (currentStoryItemIndex > 0) {
        currentStoryItemIndex--;
        showStory();
    } else {
        if (currentStoryUserIndex > 0) {
            currentStoryUserIndex--;
            currentStoryItemIndex = 0; 
            showStory();
        } else {
            showStory(); 
        }
    }
}

// Pause/Resume Helpers
window.pauseStory = function() {
    isPaused = true;
    clearTimeout(storyTimer);
    const bar = document.getElementById('story-progress-bar');
    if(bar) bar.style.animationPlayState = 'paused';
}

window.resumeStory = function() {
    if(document.activeElement.tagName === 'INPUT') return; 
    isPaused = false;
    const bar = document.getElementById('story-progress-bar');
    if(bar) bar.style.animationPlayState = 'running';
    clearTimeout(storyTimer);
    storyTimer = setTimeout(nextStory, 5000);
}

// Navigation Click Handler
const storyContentArea = document.getElementById('story-content-area');
if(storyContentArea) {
    storyContentArea.addEventListener('click', (e) => {
        if(e.target.closest('input') || e.target.closest('button') || e.target.closest('.pointer-events-auto')) return;

        const width = window.innerWidth;
        const x = e.clientX;
        
        if (x < width * 0.30) {
            prevStory();
        } else {
            nextStory();
        }
    });
}

// --- API Actions ---

window.toggleStoryLike = function(storyId, btn) {
    const formData = new FormData();
    formData.append('action', 'like_story');
    formData.append('story_id', storyId);
    
    fetch('api/api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
        if(data.status === 'success') {
            const span = btn.querySelector('span');
            span.innerText = data.count;
            if(data.action === 'liked') btn.classList.add('text-red-500');
            else btn.classList.remove('text-red-500');
        }
    });
}

window.sendStoryComment = function(storyId) {
    const input = document.getElementById(`story-comment-input-${storyId}`);
    const comment = input.value;
    if(!comment) return;

    isPaused = true;
    clearTimeout(storyTimer);

    const formData = new FormData();
    formData.append('action', 'comment_story');
    formData.append('story_id', storyId);
    formData.append('comment', comment);

    fetch('api/api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
        if(data.status === 'success') {
            const commentsDiv = document.getElementById(`story-comments-${storyId}`);
            if(commentsDiv) {
                const newComment = document.createElement('div');
                newComment.className = "bg-black/30 px-2 py-1 rounded w-fit max-w-full break-words animate-fade-in";
                newComment.innerHTML = `<span class="font-bold text-yellow-300">You:</span> ${comment}`;
                commentsDiv.appendChild(newComment);
                commentsDiv.scrollTop = commentsDiv.scrollHeight;
            }
            input.value = '';
            setTimeout(() => {
                input.blur(); 
                window.resumeStory();
            }, 2000);
        }
    });
}

window.shareStoryToShout = function(storyId) {
    isPaused = true;
    clearTimeout(storyTimer);
    if(!confirm('Share this story to shoutbox?')) {
        window.resumeStory();
        return;
    }
    
    const formData = new FormData();
    formData.append('action', 'share_story');
    formData.append('story_id', storyId);

    fetch('api/api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
        alert(data.message);
        window.resumeStory();
    });
}

window.deleteStory = function(storyId) {
    isPaused = true;
    clearTimeout(storyTimer);
    if(!confirm('Are you sure you want to delete this story?')) {
        window.resumeStory();
        return;
    }

    const formData = new FormData();
    formData.append('action', 'delete_story');
    formData.append('story_id', storyId);

    fetch('api/api.php', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
        if(data.status === 'success') {
            loadStories(); 
        } else {
            alert(data.message);
            window.resumeStory();
        }
    });
}

function recordStoryView(storyId) {
    const formData = new FormData();
    formData.append('action', 'view_story');
    formData.append('story_id', storyId);
    fetch('api/api.php', { method: 'POST', body: formData });
}

// --- Deep Link Function ---
window.openStoryFromShout = function(storyId) {
    if (allStories.length === 0) {
        const formData = new FormData();
        formData.append('action', 'get_stories');
        fetch('api/api.php', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (data.status === 'success') {
                allStories = data.stories;
                findAndOpenStory(storyId);
            }
        });
    } else {
        findAndOpenStory(storyId);
    }
};

function findAndOpenStory(targetStoryId) {
    let userIndex = -1;
    let itemIndex = -1;

    for (let u = 0; u < allStories.length; u++) {
        const userItems = allStories[u].items;
        for (let i = 0; i < userItems.length; i++) {
            if (userItems[i].id == targetStoryId) {
                userIndex = u;
                itemIndex = i;
                break;
            }
        }
        if (userIndex !== -1) break;
    }

    if (userIndex !== -1) {
        currentStoryUserIndex = userIndex;
        currentStoryItemIndex = itemIndex;
        openStoryViewer(userIndex);
    } else {
        alert('Story expired or not found.');
    }
}

// Globals
window.openCreateStoryModal = openCreateStoryModal;
window.closeCreateStoryModal = closeCreateStoryModal;
window.toggleStoryInputs = toggleStoryInputs;
window.openStoryViewer = openStoryViewer;
window.closeStoryViewer = closeStoryViewer;
window.loadStories = loadStories;

function openCreateStoryModal() {
    const modal = document.getElementById('create-story-modal');
    if(modal) modal.classList.remove('hidden');
}
function closeCreateStoryModal() {
    const modal = document.getElementById('create-story-modal');
    if(modal) modal.classList.add('hidden');
}
function toggleStoryInputs() {
    const type = document.getElementById('story-type').value;
    const textGroup = document.getElementById('text-input-group');
    const imageGroup = document.getElementById('image-input-group');
    if(type === 'text') {
        textGroup?.classList.remove('hidden');
        imageGroup?.classList.add('hidden');
    } else {
        textGroup?.classList.add('hidden');
        imageGroup?.classList.remove('hidden');
    }
}