// js/handlers/cricketHandlers.js
import { apiRequest, API_URL } from '../api.js';
import { showView, renderCricketZone, renderTeamMatch, clearCricketTimers } from '../ui.js';

let matchStateInterval = null;

function stopMatchInterval() {
    if (matchStateInterval) clearInterval(matchStateInterval);
    matchStateInterval = null;
    clearCricketTimers();
}

async function fetchMatchState(matchId, currentUser) {
    const data = await apiRequest(`${API_URL}?action=get_team_match_state&match_id=${matchId}`);
    if (data.status === 'success') {
        const match = data.match;
        const state = match.match_data;

        const amIBatsman = state.current_batsman_id == currentUser.id;
        const amIBowler = state.current_bowler_id == currentUser.id;
        const isMyTurnToSubmit = (amIBatsman && !state.batsman_sequence) || (amIBowler && !state.bowler_sequence);

        renderTeamMatch(match, currentUser);

        if (match.status === 'completed' || match.status === 'abandoned') {
            stopMatchInterval();
            alert(`Match finished! Winner: ${match.winner_team_id}`);
        } else if (isMyTurnToSubmit) { 
            stopMatchInterval();
        }
    } else {
        stopMatchInterval();
        alert(data.message || 'Error fetching match state.');
    }
}

function startPollingMatchState(matchId, currentUser) {
    stopMatchInterval(); 
    fetchMatchState(matchId, currentUser); 
    matchStateInterval = setInterval(() => fetchMatchState(matchId, currentUser), 5000);
}

export const fetchData_cricket = {
    zone: async (currentUser) => {
        stopMatchInterval(); 
        const [zoneData, teamsData] = await Promise.all([
            apiRequest(`${API_URL}?action=get_cricket_zone_data`),
            apiRequest(`${API_URL}?action=get_teams_list`)
        ]);
        
        if (zoneData.status === 'success' && teamsData.status === 'success') {
            const combinedData = { ...zoneData, teams: teamsData.teams };
            renderCricketZone(combinedData, currentUser);
        }
    }
};

export async function handleCricketClicks(target, currentUser) {
    if (target.id === 'how-to-play-cricket-btn') {
        await showView('cricket_rules');
        return true;
    }

    const removePlayerBtn = target.closest('.remove-player-btn');
    if (removePlayerBtn) {
        if (confirm('Are you sure you want to remove this player?')) {
            const playerId = removePlayerBtn.dataset.playerId;
            const formData = new FormData();
            formData.append('action', 'remove_player');
            formData.append('player_id', playerId);
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            alert(data.message || 'Action completed.');
            if (data.status === 'success') {
                fetchData_cricket.zone(currentUser);
            }
        }
        return true;
    }

    const challengeBtn = target.closest('.challenge-team-btn');
    if (challengeBtn) {
        const teamId = challengeBtn.dataset.teamId;
        const teamName = challengeBtn.dataset.teamName;
        const betAmount = prompt(`Enter bet amount to challenge "${teamName}" (min 10):`);
        
        if (betAmount && !isNaN(betAmount) && betAmount >= 10) {
            const currency = confirm('Bet with Gold Coins? (Cancel for Taka)') ? 'gold' : 'balance';
            const formData = new FormData();
            formData.append('action', 'send_challenge');
            formData.append('challenged_team_id', teamId);
            formData.append('bet_amount', betAmount);
            formData.append('currency', currency);
            
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            alert(data.message || 'Action completed.');
            if (data.status === 'success') {
                fetchData_cricket.zone(currentUser);
            }
        } else if (betAmount !== null) {
            alert('Invalid bet amount.');
        }
        return true;
    }

    const inviteBtn = target.closest('.cricket-invite-btn');
    if (inviteBtn) {
        inviteBtn.closest('.gift-trade-actions').innerHTML = '<p>Processing...</p>';
        const inviteId = inviteBtn.dataset.inviteId;
        const decision = inviteBtn.dataset.decision;
        const formData = new FormData();
        formData.append('action', 'respond_to_team_invite');
        formData.append('invite_id', inviteId);
        formData.append('decision', decision);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(data.message || 'Action completed.');
        return true;
    }

    if (target.closest('.back-to-cricket')) {
        fetchData_cricket.zone(currentUser);
        return true;
    }
    
    const respondBtn = target.closest('.respond-challenge-btn');
    if (respondBtn) {
        const challengeId = respondBtn.dataset.challengeId;
        const decision = respondBtn.dataset.decision;
        const formData = new FormData();
        formData.append('action', 'respond_to_challenge');
        formData.append('challenge_id', challengeId);
        formData.append('decision', decision);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if(data.status === 'success' && data.match_id) {
             startPollingMatchState(data.match_id, currentUser);
        } else {
            alert(data.message || 'Action failed');
            fetchData_cricket.zone(currentUser);
        }
        return true;
    }

    const tossBtn = target.closest('.toss-btn');
    if (tossBtn) {
        const matchId = tossBtn.dataset.matchId;
        const choice = tossBtn.dataset.choice;

        document.querySelectorAll('.toss-btn').forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Tossing...';
        });

        const formData = new FormData();
        formData.append('action', 'submit_toss');
        formData.append('match_id', matchId);
        formData.append('choice', choice);
        
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });

        if (data.status === 'success') {
            stopMatchInterval();
            startPollingMatchState(matchId, currentUser);
        } else {
            alert(data.message || 'Toss call failed.');
            document.querySelectorAll('.toss-btn').forEach(btn => {
                btn.disabled = false;
                if (btn.dataset.choice === 'heads') btn.textContent = 'Heads';
                if (btn.dataset.choice === 'tails') btn.textContent = 'Tails';
            });
        }
        return true;
    }
    
    const tossDecisionBtn = target.closest('.toss-decision-btn');
    if (tossDecisionBtn) {
        const matchId = tossDecisionBtn.dataset.matchId;
        const choice = tossDecisionBtn.dataset.choice;
        const formData = new FormData();
        formData.append('action', 'submit_toss_decision');
        formData.append('match_id', matchId);
        formData.append('choice', choice);
        await apiRequest(API_URL, { method: 'POST', body: formData });
        return true;
    }

    const viewMatchBtn = target.closest('.view-cricket-match-btn');
    if (viewMatchBtn) {
        const matchId = viewMatchBtn.dataset.matchId;
        startPollingMatchState(matchId, currentUser);
        return true;
    }
    return false;
}

export async function handleCricketSubmits(form, formData, currentUser) {
    if (form.id === 'create-cricket-team-form') {
        formData.append('action', 'create_team');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(data.message || 'Action completed');
        if(data.status === 'success') {
            fetchData_cricket.zone(currentUser);
        }
        return true;
    }
    
    if (form.id === 'add-player-form') {
        formData.append('action', 'add_player');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        alert(data.message || 'Action completed');
        if(data.status === 'success') {
            fetchData_cricket.zone(currentUser);
        }
        return true;
    }
    
    if (form.id === 'cricket-play-form') {
        formData.append('action', 'submit_play');
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status !== 'success') {
            alert(data.message || 'Could not submit play.');
        } else {
            const matchId = formData.get('match_id');
            startPollingMatchState(matchId, currentUser);
        }
        return true;
    }
    
    return false;
}