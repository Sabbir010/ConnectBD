// js/ui/lotteryUI.js
import { escapeHTML } from './coreUI.js';

export function renderLotteryGames(games) {
    const container = document.getElementById('lottery-games-list');
    if (!container) return;
    if (!games || games.length === 0) {
        container.innerHTML = `<p class="text-center col-span-full text-gray-500">No lottery games available right now. Please check back later.</p>`;
        return;
    }
    const gamesHTML = games.map(game => {
        const icon = game.icon || 'fas fa-ticket-alt';
        const color = game.color || 'text-gray-500';
        return `
        <div class="p-6 bg-white/60 rounded-lg border cursor-pointer lottery-game-card" data-game-id="${game.id}">
            <h3 class="text-2xl font-bold text-violet-700 flex items-center gap-3">
                <i class="${escapeHTML(icon)} ${escapeHTML(color)}" style="--fa-animation-duration: 2s;"></i>
                <span>${escapeHTML(game.name)}</span>
            </h3>
            <p class="text-gray-600">Token Price: ${game.token_cost} Taka</p>
            <div class="progress-bar mt-4">
                <div class="progress-fill" style="width: ${(game.current_tokens / game.token_limit) * 100}%;"></div>
            </div>
            <p class="text-sm text-gray-500 mt-2">${game.current_tokens} / ${game.token_limit} Tokens</p>
            ${game.status === 'drawing' ? `<p class="mt-2 text-green-600 font-bold">${escapeHTML(game.last_winner_message)}</p>` : ''}
        </div>
    `}).join('');
    // --- কোড আপডেট করা হয়েছে: আগের ஹெדר লেখাটি সরানো হয়েছে ---
    container.innerHTML = gamesHTML;
}

export function renderLotteryGameDetails(data, currentUser) {
    const titleEl = document.getElementById('lottery-game-title');
    const container = document.getElementById('lottery-game-details');
    if (!titleEl || !container || !currentUser) return;

    const { game, participants, my_tickets, history } = data;
    titleEl.textContent = game.name;

    const userBalance = currentUser.balance ? parseFloat(currentUser.balance).toFixed(2) : '0.00';
    const totalPrize = game.prize_pool ? JSON.parse(game.prize_pool).reduce((a, b) => a + b, 0) : 0;
    const purchaseLimitText = game.purchase_limit === -1 ? 'Unlimited' : `a maximum of <span class="font-semibold">${game.purchase_limit}</span> tokens`;

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h4 class="font-bold text-xl mb-2 text-gray-700">Game Rules</h4>
                    <ul class="list-disc list-inside text-gray-700 space-y-1">
                        <li>Token Price: <span class="font-semibold">${game.token_cost}</span> Taka</li>
                        <li>Total Tokens for this game: <span class="font-semibold">${game.token_limit}</span></li>
                        <li>A user can buy ${purchaseLimitText}.</li>
                        <li>Total Winners: <span class="font-semibold">${game.winners_count}</span></li>
                        <li>Total Prize Pool: <span class="font-semibold">${totalPrize}</span> Taka</li>
                        <li>Draw will start automatically after all tokens are sold.</li>
                    </ul>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                    <h4 class="font-bold text-xl mb-2 text-gray-700">Prize Details</h4>
                    <ul class="list-disc list-inside text-gray-700">
                        ${game.prize_breakdown.map(item => `<li>${escapeHTML(item)}</li>`).join('')}
                    </ul>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-bold text-xl mb-2">Buy Tokens</h4>
                    <p><strong>Your Current Balance:</strong> ${userBalance} Taka</p>
                    <div class="flex space-x-2 mt-4">
                        <input type="number" id="buy-token-amount" class="w-24 p-2 border rounded-lg" value="1" min="1">
                        <button class="buy-lottery-token-btn flex-1 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md" data-game-id="${game.id}">Buy Now</button>
                    </div>
                </div>
            </div>

            <div>
                 <div class="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 class="font-bold text-xl mb-2">Live Status</h4>
                    <div class="progress-bar mt-2">
                        <div class="progress-fill" style="width: ${(game.current_tokens / game.token_limit) * 100}%;"></div>
                    </div>
                    <p class="text-sm text-gray-500 mt-2">${game.current_tokens} / ${game.token_limit} Tokens sold</p>
                    ${game.status === 'drawing' ? `<p class="mt-2 text-green-600 font-bold">${escapeHTML(game.last_winner_message)}</p>` : ''}
                </div>

                <div class="bg-indigo-50 p-4 rounded-lg mb-6">
                    <h4 class="font-bold text-xl mb-2 text-indigo-800">Your Ticket Numbers</h4>
                    <div class="max-h-20 overflow-y-auto text-center p-2 rounded-lg bg-white">
                        ${my_tickets.length > 0 ? my_tickets.map(t => `<span class="inline-block bg-indigo-200 text-indigo-800 font-bold px-2 py-1 m-1 rounded">${t}</span>`).join('') : '<p class="text-sm text-gray-500">You have not bought any tickets for this game yet.</p>'}
                    </div>
                </div>

                <div>
                    <h4 class="font-bold text-xl mb-2">Participants (${participants.length})</h4>
                    <div class="max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-lg mb-6">
                        ${participants.length > 0 ? participants.map(p => `<p>${escapeHTML(p.display_name)} - ${p.tokens_bought} Token(s)</p>`).join('') : '<p class="text-center text-sm text-gray-500">No participants yet.</p>'}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-bold text-xl mb-2">Recent Winners</h4>
                    <div class="bg-gray-50 p-2 rounded-lg">
                        ${history.length > 0 ? history.map(h => {
                            const winners = JSON.parse(h.winner_details);
                            return `<div class="border-b py-1 text-sm"><p class="font-semibold">${new Date(h.created_at).toLocaleString()}</p><p>${winners.map(w => `${w.username} (Ticket: ${w.ticket})`).join(', ')}</p></div>`
                        }).join('') : '<p class="text-center text-sm text-gray-500">No winner history yet.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}