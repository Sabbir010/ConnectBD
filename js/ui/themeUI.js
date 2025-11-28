// js/ui/themeUI.js
import { escapeHTML } from './coreUI.js';

// --- Helper Functions for Special Effects ---

function cleanupThemeEffects() {
    const effectContainers = document.querySelectorAll('.theme-effect-container');
    effectContainers.forEach(container => container.remove());
    if (window.eidInterval) clearInterval(window.eidInterval);
    if (window.pujaInterval) clearInterval(window.pujaInterval);
    if (window.thunderInterval) clearInterval(window.thunderInterval);
    if (window.butterflyIntervals) window.butterflyIntervals.forEach(interval => clearInterval(interval));
    if (window.eidGoatIntervals) window.eidGoatIntervals.forEach(interval => clearInterval(interval));

    if (window.thunderClickHandler) {
        document.body.removeEventListener('click', window.thunderClickHandler);
    }
}

// --- Effect for Butterfly Theme (Updated) ---
function startButterflyEffect() {
    cleanupThemeEffects();
    const container = document.createElement('div');
    container.className = 'theme-effect-container butterfly-container';
    document.body.appendChild(container);

    window.butterflyIntervals = [];

    for (let i = 0; i < 3; i++) {
        const butterfly = document.createElement('div');
        butterfly.className = 'butterfly';
        
        butterfly.style.top = `${Math.random() * 90}vh`;
        butterfly.style.left = `${Math.random() * 90}vw`;
        
        container.appendChild(butterfly);
        
        const animInterval = setInterval(() => {
            if (document.body.contains(butterfly)) {
                butterfly.style.top = `${Math.random() * 90}vh`;
                butterfly.style.left = `${Math.random() * 90}vw`;
            } else {
                clearInterval(animInterval);
            }
        }, 8000 + Math.random() * 2000);
        window.butterflyIntervals.push(animInterval);
    }
}

// --- Effect for Eid Mubarak Theme (Updated) ---
function startEidEffect() {
    cleanupThemeEffects();
    const container = document.createElement('div');
    container.className = 'theme-effect-container eid-animation-container';
    document.body.appendChild(container);
    
    window.eidGoatIntervals = [];

    const createWalkingGoat = () => {
        const goat = document.createElement('div');
        goat.className = 'walking-goat';
        
        goat.style.top = `${Math.random() * 85}vh`;
        goat.style.left = `-100px`;
        
        container.appendChild(goat);
        
        const animateGoat = () => {
            if (document.body.contains(goat)) {
                const newTop = `${Math.random() * 85}vh`;
                const newLeft = `${Math.random() * 90}vw`;
                goat.style.transform = `translate(${newLeft}, ${newTop}) scaleX(${ (parseInt(newLeft) > parseInt(goat.style.left)) ? 1 : -1 })`;
            } else {
                // Find and clear the interval for this specific goat
                const intervalId = goat.dataset.intervalId;
                if(intervalId) {
                    clearInterval(parseInt(intervalId));
                    window.eidGoatIntervals = window.eidGoatIntervals.filter(id => id !== parseInt(intervalId));
                }
            }
        };
        
        setTimeout(animateGoat, 100);
        const animInterval = setInterval(animateGoat, 5000 + Math.random() * 3000);
        goat.dataset.intervalId = animInterval;
        window.eidGoatIntervals.push(animInterval);
    };

    createWalkingGoat();
    window.eidInterval = setInterval(createWalkingGoat, 15000);
}


// --- Other Effect Functions ---
function startRainyDayEffect() {
    cleanupThemeEffects();
    const container = document.createElement('div');
    container.className = 'theme-effect-container rain-container';
    document.body.appendChild(container);

    for (let i = 0; i < 100; i++) {
        const drop = document.createElement('div');
        drop.className = 'rain-drop';
        drop.style.left = `${Math.random() * 100}%`;
        drop.style.animationDuration = `${0.5 + Math.random() * 0.5}s`;
        drop.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(drop);
    }
}

function startThunderStrikeEffect() {
    cleanupThemeEffects();
    const container = document.createElement('div');
    container.className = 'theme-effect-container thunder-container';
    document.body.appendChild(container);

    const createThunderFlash = () => {
        const flash = document.createElement('div');
        flash.className = 'thunder-flash';
        container.appendChild(flash);
        setTimeout(() => flash.remove(), 1000);
    };
    
    window.thunderInterval = setInterval(createThunderFlash, 8000 + Math.random() * 7000);

    window.thunderClickHandler = function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('.nav-link, a, .cursor-pointer')) {
            const strike = document.createElement('div');
            strike.className = 'thunder-strike';
            strike.style.left = `${e.clientX}px`;
            strike.style.top = `0px`;
            container.appendChild(strike);
            setTimeout(() => strike.remove(), 600);
        }
    };
    
    document.body.addEventListener('click', window.thunderClickHandler);
}

function startNezukoPetalEffect() {
    cleanupThemeEffects();
    const container = document.createElement('div');
    container.className = 'theme-effect-container petal-container';
    document.body.appendChild(container);
    for (let i = 0; i < 20; i++) {
        const petal = document.createElement('div');
        petal.className = 'rose-petal';
        petal.style.left = `${Math.random() * 100}vw`;
        petal.style.animationDuration = `${5 + Math.random() * 5}s`;
        petal.style.animationDelay = `${Math.random() * 10}s`;
        container.appendChild(petal);
    }
}

function startDurgaPujaEffect() {
    cleanupThemeEffects();
    const container = document.createElement('div');
    container.className = 'theme-effect-container durga-animation-container';
    document.body.appendChild(container);

    const showDurgaFace = () => {
        const face = document.createElement('div');
        face.className = 'durga-face';
        container.appendChild(face);
        setTimeout(() => face.remove(), 6000);
    };

    window.pujaInterval = setInterval(showDurgaFace, 12000 + Math.random() * 8000);
}


// --- Main UI Rendering Functions ---

function renderThemePagination(pagination, type) {
    const container = document.querySelector('.themes-pagination-container');
    if (!container) return;

    container.innerHTML = '';
    const { currentPage, totalPages } = pagination;
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.className = `px-3 py-1 rounded-md text-sm font-semibold theme-page-link ${i === currentPage ? 'bg-violet-600 text-white' : 'bg-white text-gray-700'}`;
        button.textContent = i;
        button.dataset.page = i;
        button.dataset.type = type;
        container.appendChild(button);
    }
}

export function renderThemeShop(data, type) {
    const container = document.getElementById('themes-container');
    if (!container) return;

    container.innerHTML = '';
    const { themes, user_selection, is_premium, pagination } = data;

    if (themes.length === 0) {
        container.innerHTML = '<p class="text-center col-span-full text-gray-500">এই ক্যাটাগরিতে কোনো থিম পাওয়া যায়নি।</p>';
        const paginationContainer = document.querySelector('.themes-pagination-container');
        if(paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    themes.forEach(theme => {
        const isSelected = (theme.type === 'site' && theme.id == user_selection.site) ||
                           (theme.type === 'profile' && theme.id == user_selection.profile) ||
                           (theme.type === 'premium' && theme.id == user_selection.site); 

        let cost = 'Free';
        if (theme.cost > 0 && (type !== 'premium' && !is_premium)) {
            cost = `${theme.cost} Gold Coins`;
        } else if (theme.cost_balance > 0) {
            cost = `৳${parseFloat(theme.cost_balance).toFixed(2)}`;
        }

        const card = document.createElement('div');
        card.className = `p-4 border-2 rounded-lg cursor-pointer theme-card ${isSelected ? 'border-violet-500 ring-2 ring-violet-300' : 'border-gray-200'}`;
        card.dataset.themeId = theme.id;
        
        card.innerHTML = `
            <div class="h-20 w-full rounded" style="background: ${theme.background_url || '#ccc'}; background-size: cover; background-position: center;"></div>
            <h4 class="font-bold mt-2">${escapeHTML(theme.name)}</h4>
            <p class="text-sm font-semibold ${is_premium && theme.cost > 0 && theme.type !== 'premium' ? 'text-green-600' : ''}">${cost}</p>
        `;

        container.appendChild(card);
    });

    renderThemePagination(pagination, type);
}

export function applySiteTheme(user) {
    if (!user || !user.site_theme) return;
    
    cleanupThemeEffects();

    document.body.classList.forEach(className => {
        if (className.startsWith('theme-site-')) {
            document.body.classList.remove(className);
        }
    });
    
    const newThemeClass = user.site_theme.class_name;
    if (newThemeClass) {
        document.body.classList.add(newThemeClass);

        if (newThemeClass === 'theme-site-butterfly') startButterflyEffect();
        else if (newThemeClass === 'theme-site-rainy-day') startRainyDayEffect();
        else if (newThemeClass === 'theme-site-thunder') startThunderStrikeEffect();
        else if (newThemeClass === 'theme-site-nezuko') startNezukoPetalEffect();
        else if (newThemeClass === 'theme-site-eid') startEidEffect();
        else if (newThemeClass === 'theme-site-puja') startDurgaPujaEffect();
    }
}

export function applyProfileTheme(user) {
    if (!user || !user.profile_theme) return;

    const profileCard = document.querySelector('#user-profile-content')?.closest('.glass-card');
    if (profileCard) {
        profileCard.classList.forEach(className => {
            if (className.startsWith('theme-profile-')) {
                profileCard.classList.remove(className);
            }
        });
        if (user.profile_theme.class_name) {
            profileCard.classList.add(user.profile_theme.class_name);
        }
    }
}