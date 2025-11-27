// js/handlers/gameHandlers.js
import { showView } from '../ui.js';
import { initBallSortGame } from '../games/ball_sort.js';

export async function handleGameClicks(target) {
    if (target.id === 'games-btn' || target.classList.contains('back-to-games')) {
        await showView('games');
        return true;
    }

    if (target.closest('#start-ball-sort')) {
        await showView('games/ball_sort');
        initBallSortGame();
        return true;
    }

    return false;
}