// js/ui/cricketUI.js
import { escapeHTML } from './coreUI.js';

let turnTimerInterval = null;

export function clearCricketTimers() {
    if (turnTimerInterval) clearInterval(turnTimerInterval);
}

export function renderCricketZone(data, currentUser) {
    const container = document.getElementById('cricket-container');
    if (!container) return;

    const { my_team, challenges, teams, live_match_id, live_matches } = data;

    if (live_match_id && my_team && (my_team.captain_id == currentUser.id || my_team.players.some(p => p.player_id == currentUser.id && p.status == 'accepted'))) {
        container.innerHTML = `
            <div class="text-center bg-white/50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-gray-800">Match in Progress!</h3>
                <p class="my-4">You have a cricket match currently running.</p>
                <button class="view-cricket-match-btn px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-lg animate-pulse" data-match-id="${live_match_id}">
                    <i class="fas fa-play-circle mr-2"></i> View Your Match
                </button>
            </div>
        `;
        return;
    }

    let myTeamHTML = `
        <div class="text-center bg-white/50 p-6 rounded-lg">
            <p class="mb-4">You don't have a team. Creating a team costs 200 Gold Coins.</p>
            <form id="create-cricket-team-form">
                <input type="text" name="team_name" class="w-full max-w-sm p-2 border rounded" placeholder="Enter Your Team Name" required>
                <button type="submit" class="mt-2 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg">Create Team (200 Gold)</button>
            </form>
        </div>
    `;

    if (my_team) {
        const isCaptain = my_team.captain_id == currentUser.id;
        const addPlayerForm = isCaptain && my_team.players.length < 4 ? `
            <form id="add-player-form" class="mt-4 flex gap-2">
                <input type="number" name="player_id" class="w-full p-2 border rounded" placeholder="Enter Player ID to Invite" required>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg">Invite Player</button>
            </form>
        ` : '';
        
        const captainAsPlayer = `<li>${escapeHTML(my_team.captain_name)} (Captain) <span class="text-sm text-green-600">(accepted)</span></li>`;
        
        const otherPlayers = my_team.players.map(p => {
            let removeButton = '';
            if (isCaptain) {
                removeButton = ` <button class="remove-player-btn text-xs text-red-500 hover:underline" data-player-id="${p.player_id}">(Remove)</button>`;
            }
            return `<li>${escapeHTML(p.display_name)} <span class="text-sm ${p.status === 'accepted' ? 'text-green-600' : 'text-yellow-600'}">(${p.status})</span>${removeButton}</li>`;
        }).join('');

        myTeamHTML = `
            <div class="bg-white/50 p-6 rounded-lg">
                <h3 class="text-xl font-bold text-gray-800">${escapeHTML(my_team.team_name)}</h3>
                <p class="font-semibold mt-2">Players:</p>
                <ul class="list-disc list-inside">
                    ${captainAsPlayer}
                    ${otherPlayers}
                </ul>
                ${addPlayerForm}
            </div>
        `;
    }

    const challengesHTML = challenges && challenges.length > 0 ? `
        <div class="mt-6 bg-white/50 p-6 rounded-lg">
             <h3 class="text-xl font-bold text-gray-800 mb-2">Your Challenges</h3>
             ${challenges.map(c => `
                <div class="p-2 border-b">
                    <p>From: <strong>${escapeHTML(c.challenger_team_name)}</strong> | Bet: ${c.bet_amount} ${c.currency}</p>
                    <div class="mt-1">
                        <button class="respond-challenge-btn px-3 py-1 text-xs bg-green-500 text-white rounded" data-challenge-id="${c.id}" data-decision="accept">Accept</button>
                        <button class="respond-challenge-btn px-3 py-1 text-xs bg-red-500 text-white rounded ml-2" data-challenge-id="${c.id}" data-decision="decline">Decline</button>
                    </div>
                </div>
             `).join('')}
        </div>
    ` : '';
    
    const teamsListHTML = teams && teams.length > 0 && my_team && my_team.captain_id == currentUser.id ? `
        <div class="mt-6 bg-white/50 p-6 rounded-lg">
            <h3 class="text-xl font-bold text-gray-800 mb-2">Challenge a Team</h3>
            <div class="space-y-2">
            ${teams.map(team => `
                <div class="p-2 border-b flex justify-between items-center">
                    <div>
                        <p><strong>${escapeHTML(team.team_name)}</strong></p>
                        <p class="text-sm">Captain: ${escapeHTML(team.captain_name)}</p>
                    </div>
                    <button class="challenge-team-btn px-4 py-1 bg-red-600 text-white font-semibold rounded-lg" data-team-id="${team.id}" data-team-name="${escapeHTML(team.team_name)}">Challenge</button>
                </div>
            `).join('')}
            </div>
        </div>
    ` : '';

    let liveMatchesHTML = `
        <div class="mt-8 bg-white/50 p-6 rounded-lg">
            <h3 class="text-xl font-bold text-gray-800 mb-4 border-b pb-2">
                <i class="fas fa-broadcast-tower text-red-500 animate-pulse"></i> Live Matches
            </h3>
            <div id="live-matches-list" class="space-y-3">
    `;

    if (live_matches && live_matches.length > 0) {
        liveMatchesHTML += live_matches.map(match => `
            <div class="p-3 bg-white rounded-md shadow-sm border flex justify-between items-center">
                <div>
                    <p class="font-bold text-gray-800">
                        ${escapeHTML(match.team1_name)} vs ${escapeHTML(match.team2_name)}
                    </p>
                    <p class="text-xs text-gray-500">Match ID: ${match.match_id}</p>
                </div>
                <button class="view-cricket-match-btn px-4 py-2 bg-green-600 text-white font-semibold rounded-lg text-sm" data-match-id="${match.match_id}">
                    Watch Live
                </button>
            </div>
        `).join('');
    } else {
        liveMatchesHTML += '<p class="text-center text-gray-500">There are no live matches right now.</p>';
    }

    liveMatchesHTML += `
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-700">Cricket Zone</h2>
            <div>
                <button id="how-to-play-cricket-btn" class="text-violet-600 font-semibold hover:underline mr-4">How to Play</button>
                <button class="back-to-home text-violet-600 font-semibold hover:underline">&larr; Back to Home</button>
            </div>
        </div>
        ${myTeamHTML}
        ${challengesHTML}
        ${teamsListHTML}
        ${liveMatchesHTML}
    `;
}

export function renderTeamMatch(matchData, currentUser) {
    const container = document.getElementById('cricket-container');
    if (!container) return;
    clearCricketTimers();

    const state = matchData.match_data;
    const amICaptain = (currentUser.id == matchData.team1_captain_id || currentUser.id == matchData.team2_captain_id);

    let contentHTML = '';

    if (matchData.status === 'toss') {
        if (state.toss_winner && !state.toss_choice) {
            const tossWinnerName = state.toss_winner == matchData.team1_id ? matchData.team1_name : matchData.team2_name;
            const isMyTeamWinner = (state.toss_winner == matchData.team1_id && currentUser.id == matchData.team1_captain_id) || (state.toss_winner == matchData.team2_id && currentUser.id == matchData.team2_captain_id);
            contentHTML = `
                 <h3 class="text-xl font-bold mb-4">${tossWinnerName} won the toss!</h3>
                 ${isMyTeamWinner ? `
                    <p>What do you want to do first?</p>
                     <div class="flex gap-4 justify-center mt-2">
                        <button class="toss-decision-btn px-6 py-3 bg-orange-500 text-white font-bold rounded-lg" data-match-id="${matchData.id}" data-choice="bat">Bat</button>
                        <button class="toss-decision-btn px-6 py-3 bg-sky-500 text-white font-bold rounded-lg" data-match-id="${matchData.id}" data-choice="bowl">Bowl</button>
                    </div>
                 ` : `<p>Waiting for ${tossWinnerName} to make a decision...</p>`}
            `;
        } else {
            contentHTML = `
                <h3 class="text-xl font-bold mb-4">Toss Time!</h3>
                ${amICaptain ? `
                    <p>Call the toss:</p>
                    <div class="flex gap-4 justify-center mt-2">
                        <button class="toss-btn px-6 py-3 bg-blue-500 text-white font-bold rounded-lg" data-match-id="${matchData.id}" data-choice="heads">Heads</button>
                        <button class="toss-btn px-6 py-3 bg-green-500 text-white font-bold rounded-lg" data-match-id="${matchData.id}" data-choice="tails">Tails</button>
                    </div>
                ` : `<p>Waiting for captains to toss...</p>`}
            `;
        }
    } else {
        const remainingSeconds = 90 - (Math.floor(Date.now() / 1000) - state.turn_start_time);
        let timerHTML = `<div id="turn-timer" class="text-2xl font-bold">${remainingSeconds > 0 ? remainingSeconds : 0}s</div>`;
        turnTimerInterval = setInterval(() => {
            const timerEl = document.getElementById('turn-timer');
            if(timerEl) {
                const newRemaining = 90 - (Math.floor(Date.now() / 1000) - state.turn_start_time);
                timerEl.textContent = `${newRemaining > 0 ? newRemaining : 0}s`;
            }
        }, 1000);

        const amIBatsman = state.current_batsman_id == currentUser.id;
        const amIBowler = state.current_bowler_id == currentUser.id;
        const isMyTurnToSubmit = (amIBatsman && !state.batsman_sequence) || (amIBowler && !state.bowler_sequence);
        const amIPlayingThisTurn = amIBatsman || amIBowler;

        let instructionText = '';
        if (isMyTurnToSubmit) {
            instructionText = amIBatsman 
                ? `Batsman: ${escapeHTML(state.batsman_name)}, submit your ${state.balls_to_play} digits.` 
                : `Bowler: ${escapeHTML(state.bowler_name)}, submit your ${state.balls_to_play} digits.`;
        }

        let playInputHTML = `
            <form id="cricket-play-form" class="mt-4">
                <p class="font-semibold text-lg mb-2">${instructionText}</p>
                <input type="hidden" name="match_id" value="${matchData.id}">
                <input type="text" name="play_sequence" class="w-full p-3 text-center text-2xl font-mono border rounded" placeholder="Enter digits (1,2,3,4,6)" required pattern="[12346]{${state.balls_to_play}}" maxlength="${state.balls_to_play}" ${!isMyTurnToSubmit ? 'disabled' : ''}>
                <button type="submit" class="mt-2 w-full py-2 bg-violet-600 text-white font-semibold rounded-lg" ${!isMyTurnToSubmit ? 'disabled' : ''}>Submit Play</button>
            </form>`;

        let turnDisplayHTML = '';
        if (isMyTurnToSubmit) {
            turnDisplayHTML = playInputHTML;
        } else if (amIPlayingThisTurn) {
            turnDisplayHTML = '<p class="font-semibold mt-4">Waiting for opponent...</p>';
        } else {
            turnDisplayHTML = '<p class="font-semibold mt-4">Waiting for players to make a move...</p>';
        }

        const commentaryLog = state.commentary_log || [];
        const commentaryHTML = `
            <div class="mt-6 bg-gray-100 p-4 rounded-lg">
                <h4 class="font-bold text-lg mb-2 text-gray-800">Live Commentary</h4>
                <div class="text-sm text-left space-y-2 max-h-40 overflow-y-auto">
                    ${commentaryLog.length > 0 ? commentaryLog.map(c => `<p>${escapeHTML(c)}</p>`).join('') : '<p>The match is about to begin!</p>'}
                </div>
            </div>
        `;

        contentHTML = `
            <div class="grid grid-cols-2 gap-4 my-4">
                <div class="bg-blue-100 p-2 rounded">
                    <p class="font-bold">${escapeHTML(matchData.team1_name)}</p>
                    <p class="text-3xl">${state.team1_score}/${state.team1_wickets}</p>
                </div>
                <div class="bg-red-100 p-2 rounded">
                     <p class="font-bold">${escapeHTML(matchData.team2_name)}</p>
                    <p class="text-3xl">${state.team2_score}/${state.team2_wickets}</p>
                </div>
            </div>
            <div>
                <p><strong>Batsman:</strong> ${escapeHTML(state.batsman_name || 'N/A')} | <strong>Bowler:</strong> ${escapeHTML(state.bowler_name || 'N/A')}</p>
                <p>Over: ${state.current_over}.${state.current_ball}</p>
            </div>
            ${timerHTML}
            ${turnDisplayHTML}
            ${commentaryHTML} 
        `;
    }

    container.innerHTML = `
        <div class="text-center">
             <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-700">${escapeHTML(matchData.team1_name)} vs ${escapeHTML(matchData.team2_name)}</h2>
                <button class="back-to-cricket text-violet-600 font-semibold hover:underline">&larr; Back to Cricket Zone</button>
            </div>
            ${contentHTML}
        </div>
    `;
}