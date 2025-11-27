// js/ui/lotteryAdminUI.js
import { escapeHTML } from './coreUI.js';

export function renderLotteryAdminPanel(data) {
    const gamesContainer = document.getElementById('lottery-admin-games-status');
    const logsContainer = document.getElementById('lottery-admin-winner-logs');

    if (!gamesContainer || !logsContainer) return;

    // Render Live Game Status Table
    if (data.games && data.games.length > 0) {
        gamesContainer.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game Name</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${data.games.map(game => `
                        <tr>
                            <td class="px-4 py-4 font-medium">${escapeHTML(game.name)}</td>
                            <td class="px-4 py-4">${game.current_tokens} / ${game.token_limit}</td>
                            <td class="px-4 py-4">${escapeHTML(game.status)}</td>
                            <td class="px-4 py-4 space-x-2">
                                <button class="lottery-admin-action-btn text-xs bg-blue-500 text-white px-2 py-1 rounded" data-action="draw" data-game-id="${game.id}">Manual Draw</button>
                                <button class="lottery-admin-action-btn text-xs bg-red-500 text-white px-2 py-1 rounded" data-action="reset" data-game-id="${game.id}">Reset Game</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        gamesContainer.innerHTML = `<p class="text-center">No games found.</p>`;
    }

    // Render Winner Logs Table
    if (data.logs && data.logs.length > 0) {
        logsContainer.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Game Name</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winners</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin Cut</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${data.logs.map(log => {
                        const winners = JSON.parse(log.winner_details);
                        const winnerStr = winners.map(w => `${w.username} (${w.prize} টাকা)`).join(', ');
                        return `
                            <tr>
                                <td class="px-4 py-4 font-medium">${escapeHTML(log.game_name)}</td>
                                <td class="px-4 py-4 text-sm">${escapeHTML(winnerStr)}</td>
                                <td class="px-4 py-4 font-bold text-green-600">${log.admin_cut} টাকা</td>
                                <td class="px-4 py-4 text-sm">${new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else {
        logsContainer.innerHTML = `<p class="text-center">No winner logs found.</p>`;
    }
}