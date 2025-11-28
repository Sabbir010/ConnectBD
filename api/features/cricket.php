<?php
// api/features/cricket.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in to play cricket.';
    echo json_encode($response);
    exit;
}

// --- Helper Functions ---

function getTeamAndPlayerIds($conn, $team_id) {
    if (!$team_id) return [];
    $team_data = $conn->query("SELECT captain_id FROM cricket_teams WHERE id = $team_id")->fetch_assoc();
    if (!$team_data) return [];
    
    $player_ids = [$team_data['captain_id']];
    $players_res = $conn->query("SELECT player_id FROM cricket_team_players WHERE team_id = $team_id AND status = 'accepted'");
    while($row = $players_res->fetch_assoc()) {
        $player_ids[] = $row['player_id'];
    }
    return $player_ids;
}

function getCaptainIdForTeam($conn, $team_id) {
    if (!$team_id) return null;
    $res = $conn->query("SELECT captain_id FROM cricket_teams WHERE id = $team_id");
    return $res ? $res->fetch_assoc()['captain_id'] : null;
}

function addCommentary(&$match_data, $commentary_text) {
    if (!isset($match_data['commentary_log'])) {
        $match_data['commentary_log'] = [];
    }
    array_unshift($match_data['commentary_log'], $commentary_text);
    if (count($match_data['commentary_log']) > 10) {
        array_pop($match_data['commentary_log']);
    }
}

function resolveUnfinishedMatches($conn) {
    $twenty_four_hours_ago = date('Y-m-d H:i:s', strtotime('-24 hours'));
    $query = "SELECT * FROM cricket_matches WHERE status = 'live' AND last_action_at < '$twenty_four_hours_ago'";
    $unfinished_matches = $conn->query($query);

    while ($match = $unfinished_matches->fetch_assoc()) {
        $match_data = json_decode($match['match_data'], true);
        $team1_score = $match_data['team1_score'] ?? 0;
        $team2_score = $match_data['team2_score'] ?? 0;

        $winner_team_id = null;
        if ($team1_score > $team2_score) {
            $winner_team_id = $match['team1_id'];
        } elseif ($team2_score > $team1_score) {
            $winner_team_id = $match['team2_id'];
        } else {
            $conn->query("UPDATE cricket_matches SET status = 'abandoned' WHERE id = " . $match['id']);
            continue; 
        }

        distributePrizes($conn, $match['challenge_id'], $winner_team_id, $match_data);
        $conn->query("UPDATE cricket_matches SET status = 'completed', winner_team_id = $winner_team_id WHERE id = " . $match['id']);
        postMatchSummaryShout($conn, $match['id']);
    }
}

function distributePrizes($conn, $challenge_id, $winner_team_id, $match_data = null) {
    $timed_out_players = $match_data['timed_out_player_ids'] ?? [];

    $challenge_res = $conn->query("SELECT * FROM cricket_challenges WHERE id = " . $challenge_id);
    if ($challenge_res) {
        $challenge = $challenge_res->fetch_assoc();
        $site_fee = 3.0;
        $prize_pool = ($challenge['bet_amount'] * 2) - $site_fee;
        $currency_column = ($challenge['currency'] === 'gold') ? 'gold_coins' : 'balance';

        $winner_players = getTeamAndPlayerIds($conn, $winner_team_id);
        $winner_captain_id = getCaptainIdForTeam($conn, $winner_team_id);
        
        $captain_share = 5.0;
        $player_share = 3.0;

        foreach($winner_players as $player_id) {
            if (in_array($player_id, $timed_out_players)) {
                continue;
            }

            $share = ($player_id == $winner_captain_id) ? $captain_share : $player_share;
            if ($prize_pool >= $share) {
                $conn->query("UPDATE users SET $currency_column = $currency_column + $share WHERE id = $player_id");
                $prize_pool -= $share;
            }
        }
    }
}

function postMatchSummaryShout($conn, $match_id){
    $match_res = $conn->query("SELECT m.*, t1.team_name as team1_name, t2.team_name as team2_name FROM cricket_matches m JOIN cricket_teams t1 ON m.team1_id = t1.id JOIN cricket_teams t2 ON m.team2_id = t2.id WHERE m.id = $match_id");
    if(!$match_res || $match_res->num_rows == 0) return;

    $match = $match_res->fetch_assoc();
    $match_data = json_decode($match['match_data'], true);
    
    $winner_name = ($match['winner_team_id'] == $match['team1_id']) ? $match['team1_name'] : $match['team2_name'];
    $loser_name = ($match['winner_team_id'] == $match['team1_id']) ? $match['team2_name'] : $match['team1_name'];

    $shout_text = "Cricket Match Over! **{$winner_name}** won against **{$loser_name}**. [br/]";
    $shout_text .= "Final Score: [b]{$match['team1_name']}:[/b] {$match_data['team1_score']}/{$match_data['team1_wickets']} | [b]{$match['team2_name']}:[/b] {$match_data['team2_score']}/{$match_data['team2_wickets']}. [br/]";

    $shout_text .= "[b]Match Summary:[/b][br/]";
    if(isset($match_data['scores']) && is_array($match_data['scores'])) {
        foreach($match_data['scores'] as $player_id => $stats) {
            $player_name_res = $conn->query("SELECT display_name FROM users WHERE id=$player_id");
            if($player_name_res && $player_name_res->num_rows > 0){
                $player_name = $player_name_res->fetch_assoc()['display_name'];
                $shout_text .= "{$player_name}: {$stats['runs']} runs, {$stats['wickets']} wickets.[br/]";
            }
        }
    }
    postSystemShout($conn, $shout_text);
}

function handleTurnTimeout($conn, &$match, &$match_data) {
    if ($match['status'] !== 'live') return false;

    $turn_start_time = $match_data['turn_start_time'] ?? 0;
    $time_since_turn_start = time() - $turn_start_time;
    $turn_timeout_seconds = 90;

    if ($time_since_turn_start > $turn_timeout_seconds) {
        $is_out = false;
        $batsman_id = $match_data['current_batsman_id'];
        $bowler_id = $match_data['current_bowler_id'];
        
        $batsman_name_res = $conn->query("SELECT display_name FROM users WHERE id = $batsman_id");
        $batsman_name = $batsman_name_res ? $batsman_name_res->fetch_assoc()['display_name'] : "Batsman";
        $bowler_name_res = $conn->query("SELECT display_name FROM users WHERE id = $bowler_id");
        $bowler_name = $bowler_name_res ? $bowler_name_res->fetch_assoc()['display_name'] : "Bowler";

        if(!isset($match_data['scores'][$batsman_id])) $match_data['scores'][$batsman_id] = ['runs' => 0, 'wickets' => 0];
        if(!isset($match_data['scores'][$bowler_id])) $match_data['scores'][$bowler_id] = ['runs' => 0, 'wickets' => 0];

        if (!isset($match_data['batsman_sequence']) && !isset($match_data['bowler_sequence'])) {
            $is_out = true;
            $match_data['scores'][$bowler_id]['wickets']++;
            if ($match_data['current_inning'] == 1) $match_data['team1_wickets']++; else $match_data['team2_wickets']++;
            
            $runs_scored = 15;
            $match_data['current_ball']++; 

            if ($match_data['current_inning'] == 1) $match_data['team1_score'] += $runs_scored; else $match_data['team2_score'] += $runs_scored;
            
            $match_data['timed_out_player_ids'][] = $batsman_id;
            $match_data['timed_out_player_ids'][] = $bowler_id;
            addCommentary($match_data, "Both players timed out! Batsman {$batsman_name} is OUT! Bowler {$bowler_name} is penalized, awarding 15 runs to the batting team.");

        } elseif (!isset($match_data['batsman_sequence'])) {
            $is_out = true; 
            $match_data['scores'][$bowler_id]['wickets']++;
            if ($match_data['current_inning'] == 1) $match_data['team1_wickets']++; else $match_data['team2_wickets']++;
            $match_data['current_ball']++;
            $match_data['timed_out_player_ids'][] = $batsman_id;
            addCommentary($match_data, "Batsman {$batsman_name} timed out and is declared OUT! Bowling team gets 5 penalty runs.");
            if ($match_data['current_inning'] == 1) $match_data['team2_score'] += 5; else $match_data['team1_score'] += 5;

        } else { 
            $runs_scored = array_sum(str_split($match_data['batsman_sequence'])) + 5;
            $match_data['scores'][$batsman_id]['runs'] += $runs_scored;
            if ($match_data['current_inning'] == 1) $match_data['team1_score'] += $runs_scored; else $match_data['team2_score'] += $runs_scored;
            $match_data['current_ball'] = 6;
            $match_data['timed_out_player_ids'][] = $bowler_id;
            addCommentary($match_data, "Bowler {$bowler_name} timed out! Batsman gets submitted runs + 5 penalty runs. Over finished.");
        }
        
        $match_data['timed_out_player_ids'] = array_unique($match_data['timed_out_player_ids'] ?? []);

        $inning_ended = false;
        if ($match_data['current_inning'] == 2 && $match_data['team2_score'] > $match_data['team1_score']) {
             $inning_ended = true;
        } else {
            $batting_team_id = ($match_data['current_inning'] == 1) ? $match['team1_id'] : $match['team2_id'];
            $bowling_team_id = ($batting_team_id == $match['team1_id']) ? $match['team2_id'] : $match['team1_id'];
            $batting_players = getTeamAndPlayerIds($conn, $batting_team_id);
            $bowling_players = getTeamAndPlayerIds($conn, $bowling_team_id);

            if ($is_out) {
                $current_batsman_index = array_search($batsman_id, $batting_players);
                $next_batsman_index = $current_batsman_index + 1;
                if ($next_batsman_index < count($batting_players)) {
                    $match_data['current_batsman_id'] = $batting_players[$next_batsman_index];
                } else {
                    $inning_ended = true;
                }
            }
            
            if ($match_data['current_ball'] >= 6) {
                $match_data['current_over']++;
                $match_data['current_ball'] = 0;
                $current_bowler_index = array_search($bowler_id, $bowling_players);
                $next_bowler_index = ($current_bowler_index + 1) % count($bowling_players);
                $match_data['current_bowler_id'] = $bowling_players[$next_bowler_index];
            }

            if ($match_data['current_over'] >= 5 || ($match_data['current_inning'] == 1 && $match_data['team1_wickets'] >= 4) || ($match_data['current_inning'] == 2 && $match_data['team2_wickets'] >= 4) ) {
                $inning_ended = true;
            }
        }
        
        if ($inning_ended) {
            if ($match_data['current_inning'] == 1) {
                $match_data['current_inning'] = 2; $match_data['current_over'] = 0; $match_data['current_ball'] = 0;
                $batting_team_players = getTeamAndPlayerIds($conn, $match['team2_id']);
                $bowling_team_players = getTeamAndPlayerIds($conn, $match['team1_id']);
                $match_data['current_batsman_id'] = $batting_team_players[0];
                $match_data['current_bowler_id'] = $bowling_team_players[0];
                addCommentary($match_data, "Innings break! {$match['team2_name']} needs " . ($match_data['team1_score'] + 1) . " runs to win.");
            } else {
                $winner_team_id = ($match_data['team1_score'] > $match_data['team2_score']) ? $match['team1_id'] : $match['team2_id'];
                $conn->query("UPDATE cricket_matches SET status = 'completed', winner_team_id = $winner_team_id WHERE id = " . $match['id']);
                distributePrizes($conn, $match['challenge_id'], $winner_team_id, $match_data);
                postMatchSummaryShout($conn, $match['id']);
            }
        }
        
        $match_data['balls_to_play'] = 6 - $match_data['current_ball'];
        if($match_data['balls_to_play'] <= 0) $match_data['balls_to_play'] = 6;
        $match_data['turn_start_time'] = time();
        unset($match_data['batsman_sequence'], $match_data['bowler_sequence']);

        return true; 
    }
    return false;
}


resolveUnfinishedMatches($conn);

switch ($action) {
    case 'get_cricket_zone_data':
        $my_team = null;
        $live_match_id = null; 

        $team_res = $conn->query("SELECT id, team_name, captain_id FROM cricket_teams WHERE captain_id = $current_user_id");
        if ($team_res->num_rows > 0) {
            $my_team = $team_res->fetch_assoc();
        } else {
            $player_res = $conn->query("SELECT t.id, t.team_name, t.captain_id FROM cricket_teams t JOIN cricket_team_players p ON t.id = p.team_id WHERE p.player_id = $current_user_id AND p.status = 'accepted'");
            if ($player_res->num_rows > 0) {
                $my_team = $player_res->fetch_assoc();
            }
        }

        if ($my_team) {
            $captain_name_res = $conn->query("SELECT display_name FROM users WHERE id = {$my_team['captain_id']}");
            $my_team['captain_name'] = $captain_name_res->fetch_assoc()['display_name'];
            $players_res = $conn->query("SELECT u.id as player_id, u.display_name, p.status FROM users u JOIN cricket_team_players p ON u.id = p.player_id WHERE p.team_id = {$my_team['id']}");
            $my_team['players'] = $players_res->fetch_all(MYSQLI_ASSOC);

            $live_match_res = $conn->query("SELECT id FROM cricket_matches WHERE (team1_id = {$my_team['id']} OR team2_id = {$my_team['id']}) AND status IN ('toss', 'live') LIMIT 1");
            if($live_match_res && $live_match_res->num_rows > 0) {
                $live_match_id = $live_match_res->fetch_assoc()['id'];
            }
        }

        $challenges = [];
        if($my_team && $my_team['captain_id'] == $current_user_id) {
            $challenges_res = $conn->query("SELECT c.*, t.team_name as challenger_team_name FROM cricket_challenges c JOIN cricket_teams t ON c.challenger_team_id = t.id WHERE c.challenged_team_id = {$my_team['id']} AND c.status = 'pending'");
            $challenges = $challenges_res->fetch_all(MYSQLI_ASSOC);
        }

        $live_matches = [];
        $live_matches_query = "
            SELECT 
                m.id as match_id, 
                t1.team_name as team1_name, 
                t2.team_name as team2_name 
            FROM cricket_matches m
            JOIN cricket_teams t1 ON m.team1_id = t1.id
            JOIN cricket_teams t2 ON m.team2_id = t2.id
            WHERE m.status IN ('live', 'toss')
            ORDER BY m.last_action_at DESC
        ";
        $live_matches_res = $conn->query($live_matches_query);
        if ($live_matches_res) {
            $live_matches = $live_matches_res->fetch_all(MYSQLI_ASSOC);
        }

        $response = [
            'status' => 'success', 
            'my_team' => $my_team, 
            'challenges' => $challenges, 
            'live_match_id' => $live_match_id,
            'live_matches' => $live_matches
        ];
        break;

    case 'create_team':
        $team_name = trim($_POST['team_name'] ?? '');
        $fee = 200;
        $user_balance = $conn->query("SELECT gold_coins FROM users WHERE id = $current_user_id")->fetch_assoc()['gold_coins'];

        if($user_balance < $fee) { $response['message'] = 'You do not have enough Gold Coins (200).'; break; }
        if (empty($team_name)) { $response['message'] = 'Team name cannot be empty.'; break; }

        $check_stmt = $conn->prepare("SELECT ct.id FROM cricket_teams ct WHERE ct.captain_id = ? UNION SELECT ctp.team_id FROM cricket_team_players ctp WHERE ctp.player_id = ? AND ctp.status IN ('accepted', 'pending')");
        $check_stmt->bind_param("ii", $current_user_id, $current_user_id);
        $check_stmt->execute();
        if ($check_stmt->get_result()->num_rows > 0) { $response['message'] = 'You are already in a team or have a pending invitation.'; break; }
        
        $conn->begin_transaction();
        try {
            $conn->query("UPDATE users SET gold_coins = gold_coins - $fee WHERE id = $current_user_id");
            $stmt = $conn->prepare("INSERT INTO cricket_teams (team_name, captain_id) VALUES (?, ?)");
            $stmt->bind_param("si", $team_name, $current_user_id);
            $stmt->execute();
            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Team created successfully!'];
        } catch(Exception $e) {
            $conn->rollback();
            $response['message'] = 'Failed to create team. Team name might be taken.';
        }
        break;

    case 'add_player':
        $player_id = (int)($_POST['player_id'] ?? 0);
        if ($player_id == $current_user_id) {
            $response['message'] = 'You cannot add yourself to your own team.';
            break;
        }

        $team_res = $conn->query("SELECT id, team_name FROM cricket_teams WHERE captain_id = $current_user_id");
        if(!$team_res || $team_res->num_rows == 0) { $response['message'] = 'You are not a captain.'; break; }
        $team_data = $team_res->fetch_assoc();
        $team_id = $team_data['id'];
        $team_name = $team_data['team_name'];

        $player_count = $conn->query("SELECT COUNT(*) as count FROM cricket_team_players WHERE team_id = $team_id AND status = 'accepted'")->fetch_assoc()['count'];
        if($player_count >= 4) { $response['message'] = 'Your team is already full.'; break; }
        
        $check_player_stmt = $conn->prepare("SELECT team_id FROM cricket_team_players WHERE player_id = ? AND status IN ('accepted', 'pending') UNION SELECT id FROM cricket_teams WHERE captain_id = ?");
        $check_player_stmt->bind_param("ii", $player_id, $player_id);
        $check_player_stmt->execute();
        if ($check_player_stmt->get_result()->num_rows > 0) {
            $response['message'] = 'This player is already in another team or has a pending invitation.';
            break;
        }

        $stmt = $conn->prepare("INSERT INTO cricket_team_players (team_id, player_id, status) VALUES (?, ?, 'pending')");
        $stmt->bind_param("ii", $team_id, $player_id);
        if($stmt->execute()){
            $invite_id = $conn->insert_id;
            $captain_name = $conn->query("SELECT display_name FROM users WHERE id=$current_user_id")->fetch_assoc()['display_name'];
            $message = "You have an invitation to join '<b>{$team_name}</b>' by captain <b>{$captain_name}</b>.<br><br><div class='gift-trade-actions'><a href='#' class='pm-button pm-button-accept cricket-invite-btn' data-invite-id='{$invite_id}' data-decision='accept'>Accept</a> <a href='#' class='pm-button pm-button-reject cricket-invite-btn' data-invite-id='{$invite_id}' data-decision='decline'>Decline</a></div>";
            sendSystemPM($conn, $player_id, $message);
            $response = ['status' => 'success', 'message' => 'Player invitation sent.'];
        } else {
            $response['message'] = 'Could not send invitation. An unknown error occurred.';
        }
        break;
        
    case 'remove_player':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $player_id_to_remove = (int)($_POST['player_id'] ?? 0);

        $team_res = $conn->query("SELECT id FROM cricket_teams WHERE captain_id = $current_user_id");
        if ($team_res->num_rows == 0) {
            $response['message'] = 'You are not a captain.';
            break;
        }
        $team_id = $team_res->fetch_assoc()['id'];

        $stmt = $conn->prepare("DELETE FROM cricket_team_players WHERE team_id = ? AND player_id = ?");
        $stmt->bind_param("ii", $team_id, $player_id_to_remove);
        
        if ($stmt->execute() && $stmt->affected_rows > 0) {
            $response = ['status' => 'success', 'message' => 'Player removed successfully.'];
        } else {
            $response['message'] = 'Failed to remove player. They might not be on your team.';
        }
        break;

    case 'respond_to_team_invite':
        $invite_id = (int)($_POST['invite_id'] ?? 0);
        $decision = $_POST['decision'] ?? '';

        $invite_res = $conn->query("SELECT * FROM cricket_team_players WHERE id = $invite_id AND player_id = $current_user_id AND status = 'pending'");
        if(!$invite_res || $invite_res->num_rows == 0) { $response['message'] = 'This invitation is invalid.'; break; }
        
        if ($decision === 'accept') {
            $conn->query("UPDATE cricket_team_players SET status = 'accepted' WHERE id = $invite_id");
            $response = ['status' => 'success', 'message' => 'You have joined the team!'];
        } else {
            $conn->query("DELETE FROM cricket_team_players WHERE id = $invite_id");
            $response = ['status' => 'success', 'message' => 'You have declined the invitation.'];
        }
        break;
        
    case 'get_teams_list':
        if (!$current_user_id) { $response['message'] = 'You must be logged in.'; break; }
        $my_team_id = 0;
        $my_team_res = $conn->query("SELECT id FROM cricket_teams WHERE captain_id = $current_user_id");
        if ($my_team_res->num_rows > 0) {
            $my_team_id = $my_team_res->fetch_assoc()['id'];
        }

        $query = "SELECT t.id, t.team_name, u.display_name as captain_name FROM cricket_teams t JOIN users u ON t.captain_id = u.id WHERE t.id != ? ORDER BY t.team_name ASC";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $my_team_id);
        $stmt->execute();
        $teams = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $response = ['status' => 'success', 'teams' => $teams];
        break;
        
    case 'send_challenge':
        $challenged_team_id = (int)($_POST['challenged_team_id'] ?? 0);
        $bet_amount = (float)($_POST['bet_amount'] ?? 0);
        $currency = $_POST['currency'] ?? 'gold';
        $match_time_pref = $_POST['match_time'] ?? 'now';

        $my_team_res = $conn->query("SELECT id FROM cricket_teams WHERE captain_id = $current_user_id");
        if(!$my_team_res || $my_team_res->num_rows == 0){
             $response['message'] = 'You are not a captain.'; break;
        }
        $my_team_id = $my_team_res->fetch_assoc()['id'];
        
        if($bet_amount < 10) { $response['message'] = 'Minimum bet is 10 Taka or Gold Coins.'; break; }
        
        $stmt = $conn->prepare("INSERT INTO cricket_challenges (challenger_team_id, challenged_team_id, bet_amount, currency, match_time_pref) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("iidsi", $my_team_id, $challenged_team_id, $bet_amount, $currency, $match_time_pref);
        $stmt->execute();
        
        $challenged_captain_id = getCaptainIdForTeam($conn, $challenged_team_id);
        sendSystemPM($conn, $challenged_captain_id, "You have a new cricket challenge!");
        $response = ['status' => 'success', 'message' => 'Challenge sent!'];
        break;

    case 'respond_to_challenge':
        $challenge_id = (int)($_POST['challenge_id'] ?? 0);
        $decision = $_POST['decision'] ?? '';

        if ($decision === 'accept') {
            $challenge = $conn->query("SELECT * FROM cricket_challenges WHERE id = $challenge_id")->fetch_assoc();
            $bet_per_player = $challenge['bet_amount'] / 5;
            $currency_column = ($challenge['currency'] === 'gold') ? 'gold_coins' : 'balance';

            $team1_players = getTeamAndPlayerIds($conn, $challenge['challenger_team_id']);
            $team2_players = getTeamAndPlayerIds($conn, $challenge['challenged_team_id']);
            
            foreach(array_merge($team1_players, $team2_players) as $player_id){
                 $conn->query("UPDATE users SET $currency_column = $currency_column - $bet_per_player WHERE id = $player_id");
            }
            
            $initial_match_data = [
                'toss_winner' => null, 'toss_choice' => null, 'batting_first_team' => null,
                'current_inning' => 1, 'current_over' => 0, 'current_ball' => 0,
                'team1_score' => 0, 'team1_wickets' => 0, 'team2_score' => 0, 'team2_wickets' => 0,
                'current_batsman_id' => null, 'current_bowler_id' => null, 'balls_to_play' => 6,
                'scores' => [], 'turn_start_time' => time(), 'commentary_log' => []
            ];
            $match_data_json = json_encode($initial_match_data);

            $stmt = $conn->prepare("INSERT INTO cricket_matches (team1_id, team2_id, challenge_id, status, match_data, last_action_at) VALUES (?, ?, ?, 'toss', ?, NOW())");
            $stmt->bind_param("iiis", $challenge['challenger_team_id'], $challenge['challenged_team_id'], $challenge_id, $match_data_json);
            $stmt->execute();
            $match_id = $conn->insert_id;

            $conn->query("UPDATE cricket_challenges SET status = 'accepted' WHERE id = $challenge_id");
            
            postSystemShout($conn, "A new cricket match is starting! Match ID: {$match_id}");
            $response = ['status' => 'success', 'message' => 'Challenge accepted!', 'match_id' => $match_id];
        } else {
            $conn->query("UPDATE cricket_challenges SET status = 'declined' WHERE id = $challenge_id");
            $response = ['status' => 'success', 'message' => 'Challenge declined.'];
        }
        break;

    case 'submit_toss':
        $match_id = (int)($_POST['match_id'] ?? 0);
        $choice = $_POST['choice'] ?? '';
        
        $conn->begin_transaction();
        try {
            $match_res = $conn->query("SELECT * FROM cricket_matches WHERE id = $match_id FOR UPDATE");
            if(!$match_res || $match_res->num_rows == 0){
                throw new Exception("Match not found.");
            }
            $match = $match_res->fetch_assoc();

            $captain1 = getCaptainIdForTeam($conn, $match['team1_id']);
            $captain2 = getCaptainIdForTeam($conn, $match['team2_id']);

            if($current_user_id != $captain1 && $current_user_id != $captain2) {
                throw new Exception("Only captains can call the toss.");
            }

            $match_data = json_decode($match['match_data'], true);
            
            if ($match_data['toss_winner'] !== null) {
                $conn->commit(); 
                $response = ['status' => 'success', 'message' => "Toss has already been decided."];
                break; 
            }
            
            $toss_result = (rand(0,1) == 0) ? 'heads' : 'tails';
            $toss_winner_captain = ($choice == $toss_result) ? $current_user_id : (($current_user_id == $captain1) ? $captain2 : $captain1);
            $toss_winner_team = ($toss_winner_captain == $captain1) ? $match['team1_id'] : $match['team2_id'];

            $match_data['toss_winner'] = $toss_winner_team;

            $updated_match_data = json_encode($match_data);
            $conn->query("UPDATE cricket_matches SET match_data = '{$conn->real_escape_string($updated_match_data)}', last_action_at = NOW() WHERE id = $match_id");
            
            $conn->commit();
            $response = ['status' => 'success', 'message' => "Toss call submitted."];
        } catch(Exception $e) {
            $conn->rollback();
            $response['message'] = $e->getMessage();
        }
        break;
        
    case 'submit_toss_decision':
        $match_id = (int)($_POST['match_id'] ?? 0);
        $choice = $_POST['choice'] ?? ''; // 'bat' or 'bowl'
        
        $match = $conn->query("SELECT * FROM cricket_matches WHERE id = $match_id")->fetch_assoc();
        $match_data = json_decode($match['match_data'], true);

        $toss_winner_captain = getCaptainIdForTeam($conn, $match_data['toss_winner']);
        if ($current_user_id != $toss_winner_captain) {
            $response['message'] = "Only the toss winner can make this decision."; break;
        }

        if ($choice === 'bat') {
            $match_data['batting_first_team'] = $match_data['toss_winner'];
        } else {
            $match_data['batting_first_team'] = ($match_data['toss_winner'] == $match['team1_id']) ? $match['team2_id'] : $match['team1_id'];
        }

        $batting_team_players = getTeamAndPlayerIds($conn, $match_data['batting_first_team']);
        $bowling_team_id = ($match_data['batting_first_team'] == $match['team1_id']) ? $match['team2_id'] : $match['team1_id'];
        $bowling_team_players = getTeamAndPlayerIds($conn, $bowling_team_id);
        
        $match_data['current_batsman_id'] = $batting_team_players[0];
        $match_data['current_bowler_id'] = $bowling_team_players[0];
        $match_data['toss_choice'] = $choice;

        addCommentary($match_data, "The match is about to begin!");

        $updated_match_data = json_encode($match_data);
        $conn->query("UPDATE cricket_matches SET status = 'live', match_data = '{$conn->real_escape_string($updated_match_data)}', last_action_at = NOW() WHERE id = $match_id");
        
        $response = ['status' => 'success', 'message' => 'Match is starting!'];
        break;

    case 'submit_play':
        $match_id = (int)($_POST['match_id'] ?? 0);
        $play_sequence = $_POST['play_sequence'] ?? '';
        
        $match_res = $conn->query("SELECT * FROM cricket_matches WHERE id = $match_id FOR UPDATE");
        $match = $match_res->fetch_assoc();
        $match_data = json_decode($match['match_data'], true);

        if (strlen($play_sequence) != $match_data['balls_to_play']) {
            $response['message'] = "Please enter exactly {$match_data['balls_to_play']} digits."; break;
        }
        
        $is_batsman = ($current_user_id == $match_data['current_batsman_id']);
        if ($is_batsman) $match_data['batsman_sequence'] = $play_sequence; else $match_data['bowler_sequence'] = $play_sequence;
        
        if (!isset($match_data['batsman_sequence']) || !isset($match_data['bowler_sequence'])) {
            $conn->query("UPDATE cricket_matches SET match_data = '{$conn->real_escape_string(json_encode($match_data))}' WHERE id = $match_id");
            $response = ['status' => 'success']; break;
        }
        
        $runs_this_turn = 0; $is_out = false;
        $batsman_id = $match_data['current_batsman_id'];
        $bowler_id = $match_data['current_bowler_id'];
        
        $batsman_name_res = $conn->query("SELECT display_name FROM users WHERE id = $batsman_id");
        $batsman_name = $batsman_name_res ? $batsman_name_res->fetch_assoc()['display_name'] : "Batsman";
        $bowler_name_res = $conn->query("SELECT display_name FROM users WHERE id = $bowler_id");
        $bowler_name = $bowler_name_res ? $bowler_name_res->fetch_assoc()['display_name'] : "Bowler";

        if(!isset($match_data['scores'][$batsman_id])) $match_data['scores'][$batsman_id] = ['runs' => 0, 'wickets' => 0];
        if(!isset($match_data['scores'][$bowler_id])) $match_data['scores'][$bowler_id] = ['runs' => 0, 'wickets' => 0];

        for($i = 0; $i < $match_data['balls_to_play']; $i++) {
            $match_data['current_ball']++;
            
            if($match_data['batsman_sequence'][$i] == $match_data['bowler_sequence'][$i]) {
                $is_out = true;
                $match_data['scores'][$bowler_id]['wickets']++;
                if ($match_data['current_inning'] == 1) $match_data['team1_wickets']++; else $match_data['team2_wickets']++;
                addCommentary($match_data, "OUT! A brilliant delivery from {$bowler_name}, and {$batsman_name} has to walk back!");
                break;
            }
            $run = (int)$match_data['batsman_sequence'][$i];
            $runs_this_turn += $run;
            
            if($run == 6) addCommentary($match_data, "SIX! That's a huge hit from {$batsman_name}! The ball is out of the park!");
            elseif($run == 4) addCommentary($match_data, "FOUR! Beautifully played by {$batsman_name} to the boundary!");
            else addCommentary($match_data, "{$batsman_name} takes {$run} run(s). Good running between the wickets.");
        }

        $match_data['scores'][$batsman_id]['runs'] += $runs_this_turn;
        if ($match_data['current_inning'] == 1) $match_data['team1_score'] += $runs_this_turn; else $match_data['team2_score'] += $runs_this_turn;

        unset($match_data['batsman_sequence'], $match_data['bowler_sequence']);
        
        $inning_ended = false;
        if ($match_data['current_inning'] == 2 && $match_data['team2_score'] > $match_data['team1_score']) {
             $inning_ended = true;
        } else if ($is_out || $match_data['current_ball'] >= 6) {
            $batting_team_id = ($match_data['current_inning'] == 1) ? $match['team1_id'] : $match['team2_id'];
            $bowling_team_id = ($batting_team_id == $match['team1_id']) ? $match['team2_id'] : $match['team1_id'];
            $batting_players = getTeamAndPlayerIds($conn, $batting_team_id);
            $bowling_players = getTeamAndPlayerIds($conn, $bowling_team_id);

            if ($is_out) {
                $current_batsman_index = array_search($batsman_id, $batting_players);
                $next_batsman_index = $current_batsman_index + 1;
                if ($next_batsman_index < count($batting_players)) {
                    $match_data['current_batsman_id'] = $batting_players[$next_batsman_index];
                } else {
                    $inning_ended = true;
                }
            }
            
            if ($match_data['current_ball'] >= 6) {
                $match_data['current_over']++;
                $match_data['current_ball'] = 0;
                $current_bowler_index = array_search($bowler_id, $bowling_players);
                $next_bowler_index = ($current_bowler_index + 1) % count($bowling_players);
                $match_data['current_bowler_id'] = $bowling_players[$next_bowler_index];
            }

            if ($match_data['current_over'] >= 5 || ($match_data['current_inning'] == 1 && $match_data['team1_wickets'] >= 4) || ($match_data['current_inning'] == 2 && $match_data['team2_wickets'] >= 4) ) {
                $inning_ended = true;
            }
        }
        
        if ($inning_ended) {
            if ($match_data['current_inning'] == 1) {
                $match_data['current_inning'] = 2; $match_data['current_over'] = 0; $match_data['current_ball'] = 0;
                $batting_team_players = getTeamAndPlayerIds($conn, $match['team2_id']);
                $bowling_team_players = getTeamAndPlayerIds($conn, $match['team1_id']);
                $match_data['current_batsman_id'] = $batting_team_players[0];
                $match_data['current_bowler_id'] = $bowling_team_players[0];
                addCommentary($match_data, "Innings break! {$match['team2_name']} needs " . ($match_data['team1_score'] + 1) . " runs to win.");
            } else {
                $winner_team_id = ($match_data['team1_score'] > $match_data['team2_score']) ? $match['team1_id'] : $match['team2_id'];
                $conn->query("UPDATE cricket_matches SET status = 'completed', winner_team_id = $winner_team_id WHERE id = " . $match['id']);
                distributePrizes($conn, $match['challenge_id'], $winner_team_id, $match_data);
                postMatchSummaryShout($conn, $match['id']);
            }
        }
        
        $match_data['balls_to_play'] = 6 - $match_data['current_ball'];
        if($match_data['balls_to_play'] <= 0) $match_data['balls_to_play'] = 6;
        $match_data['turn_start_time'] = time();
        $conn->query("UPDATE cricket_matches SET match_data = '{$conn->real_escape_string(json_encode($match_data))}', last_action_at = NOW() WHERE id = $match_id");
        $response = ['status' => 'success'];
        break;

    case 'get_team_match_state':
        $match_id = (int)($_GET['match_id'] ?? 0);

        $conn->begin_transaction();
        try {
            $match_res_for_timeout = $conn->query("SELECT * FROM cricket_matches WHERE id = $match_id FOR UPDATE");
            if ($match_res_for_timeout && $match_res_for_timeout->num_rows > 0) {
                $match_for_timeout = $match_res_for_timeout->fetch_assoc();
                $match_data_for_timeout = json_decode($match_for_timeout['match_data'], true);
                if (handleTurnTimeout($conn, $match_for_timeout, $match_data_for_timeout)) {
                    $conn->query("UPDATE cricket_matches SET match_data = '{$conn->real_escape_string(json_encode($match_data_for_timeout))}', last_action_at = NOW() WHERE id = $match_id");
                }
            }
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
        }
        
        $match_res = $conn->query("SELECT m.*, t1.team_name as team1_name, t2.team_name as team2_name FROM cricket_matches m JOIN cricket_teams t1 ON m.team1_id = t1.id JOIN cricket_teams t2 ON m.team2_id = t2.id WHERE m.id = $match_id");
        if(!$match_res || $match_res->num_rows == 0){ $response['message'] = "Match not found."; break; }
        
        $match = $match_res->fetch_assoc();
        $match['team1_captain_id'] = getCaptainIdForTeam($conn, $match['team1_id']);
        $match['team2_captain_id'] = getCaptainIdForTeam($conn, $match['team2_id']);
        $match_data = json_decode($match['match_data'], true);

        $all_player_ids = [];
        if(isset($match_data['current_batsman_id'])) $all_player_ids[] = $match_data['current_batsman_id'];
        if(isset($match_data['current_bowler_id'])) $all_player_ids[] = $match_data['current_bowler_id'];
        
        $all_player_ids = array_unique($all_player_ids);

        if (!empty($all_player_ids)) {
            $player_ids_string = implode(',', $all_player_ids);
            $player_names_res = $conn->query("SELECT id, display_name FROM users WHERE id IN ($player_ids_string)");
            $player_names = [];
            while($row = $player_names_res->fetch_assoc()){
                $player_names[$row['id']] = $row['display_name'];
            }
            if(isset($match_data['current_batsman_id'])) {
                $match_data['batsman_name'] = $player_names[$match_data['current_batsman_id']] ?? 'N/A';
            }
            if(isset($match_data['current_bowler_id'])) {
                $match_data['bowler_name'] = $player_names[$match_data['current_bowler_id']] ?? 'N/A';
            }
        }

        $match['match_data'] = $match_data;

        $response = ['status' => 'success', 'match' => $match];
        break;

    default:
        $response['message'] = "Unknown cricket action: {$action}";
        break;
}
?>