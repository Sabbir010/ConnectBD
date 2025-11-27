// js/handlers/lotteryHandlers.js
import { apiRequest, API_URL } from '/js/api.js';
import { showView, renderLotteryGames, renderLotteryGameDetails } from '/js/ui.js';

export const fetchData_lottery = {
    games: async () => {
        const data = await apiRequest(`${API_URL}?action=get_lottery_games`);
        if (data.status === 'success') {
            renderLotteryGames(data.games);
        }
    },
    gameDetails: async (gameId, currentUser) => {
        const data = await apiRequest(`${API_URL}?action=get_lottery_game_details&id=${gameId}`);
        if (data.status === 'success' && currentUser) {
            renderLotteryGameDetails(data, currentUser);
        }
    }
};

export async function handleLotteryClicks(target, currentUser) {
    if (target.id === 'win-money-btn' || target.classList.contains('back-to-lottery')) {
        // This is handled by handlers.js navigate() function
        return false;
    }

    const gameCard = target.closest('.lottery-game-card');
    if (gameCard) {
        const gameId = gameCard.dataset.gameId;
        // This navigation is now handled by navigate() in handlers.js
        // await showView('lottery_game');
        // fetchData_lottery.gameDetails(gameId, currentUser);
        return false; // Let navigate() handle it
    }

    const buyBtn = target.closest('.buy-lottery-token-btn');
    if (buyBtn) {
        const gameId = document.querySelector('#lottery-game-details [data-game-id]')?.dataset.gameId || buyBtn.dataset.gameId;
        const amountInput = document.getElementById('buy-token-amount');
        const count = amountInput ? amountInput.value : buyBtn.dataset.count;

        if (!gameId || !count || count < 1) {
            alert("Please enter a valid amount of tokens to buy.");
            return true;
        }

        const formData = new FormData();
        formData.append('action', 'buy_lottery_token');
        formData.append('game_id', gameId);
        formData.append('token_count', count);
        
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        
        alert(data.message || 'Action completed.');

        if (data.status === 'success') {
            const statusData = await apiRequest(`${API_URL}?action=check_status`);
            if (statusData.user) {
                Object.assign(currentUser, statusData.user); 
                document.dispatchEvent(new Event('userUpdated'));
                await fetchData_lottery.gameDetails(gameId, currentUser);
            }
        }
        return true;
    }

    return false;
}