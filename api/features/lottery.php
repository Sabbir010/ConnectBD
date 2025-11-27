<?php
// api/features/lottery.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in.';
    echo json_encode($response);
    exit;
}

// Helper function to define game configurations with English details and new rules
function getGameConfigs() {
    return [
        ['id' => 1, 'name' => 'Lucky Ten Lottery', 'token_cost' => 2, 'token_limit' => 10, 'winners_count' => 1, 'purchase_limit' => 2, 'prize_pool' => json_encode([18]), 'admin_cut' => 2, 'icon' => 'fas fa-star fa-beat', 'color' => 'text-yellow-500', 'prize_breakdown' => ['1st Winner gets: 18 Taka']],
        ['id' => 2, 'name' => 'Double Chance Draw', 'token_cost' => 2, 'token_limit' => 30, 'winners_count' => 2, 'purchase_limit' => 3, 'prize_pool' => json_encode([35, 20]), 'admin_cut' => 5, 'icon' => 'fas fa-dice-two fa-beat', 'color' => 'text-green-500', 'prize_breakdown' => ['1st Winner gets: 35 Taka', '2nd Winner gets: 20 Taka']],
        ['id' => 3, 'name' => 'Triple Winners Lottery', 'token_cost' => 2, 'token_limit' => 50, 'winners_count' => 3, 'purchase_limit' => 5, 'prize_pool' => json_encode([40, 30, 20]), 'admin_cut' => 10, 'icon' => 'fas fa-gem fa-beat', 'color' => 'text-purple-500', 'prize_breakdown' => ['1st Winner gets: 40 Taka', '2nd Winner gets: 30 Taka', '3rd Winner gets: 20 Taka']],
        ['id' => 4, 'name' => 'Grand Five Draw', 'token_cost' => 5, 'token_limit' => 100, 'winners_count' => 5, 'purchase_limit' => 10, 'prize_pool' => json_encode([150, 120, 80, 60, 40]), 'admin_cut' => 50, 'icon' => 'fas fa-trophy fa-beat', 'color' => 'text-blue-500', 'prize_breakdown' => ['1st: 150 Tk', '2nd: 120 Tk', '3rd: 80 Tk', '4th: 60 Tk', '5th: 40 Tk']],
        ['id' => 5, 'name' => 'Mega Jackpot', 'token_cost' => 50, 'token_limit' => 500, 'winners_count' => 20, 'purchase_limit' => -1, 'prize_pool' => json_encode([5000, 4000, 3000, 2000, 1000, 500, 500, 500, 500, 500, 250, 250, 250, 250, 250, 100, 100, 100, 100, 100]), 'admin_cut' => 500, 'icon' => 'fas fa-bomb fa-beat', 'color' => 'text-red-500', 'prize_breakdown' => ['1st: 5000 Tk', '2nd: 4000 Tk', '3rd: 3000 Tk', '4th: 2000 Tk', '5th: 1000 Tk', '6th-10th: 500 Tk', '11th-15th: 250 Tk', '16th-20th: 100 Tk']]
    ];
}

function seedDefaultLotteryGames($conn) {
    $gameConfigs = getGameConfigs();
    $stmt = $conn->prepare("
        INSERT INTO lottery_games (id, name, token_cost, token_limit, winners_count, prize_pool, admin_cut)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name)
    ");
    foreach ($gameConfigs as $game) {
        $stmt->bind_param("isiiisi", $game['id'], $game['name'], $game['token_cost'], $game['token_limit'], $game['winners_count'], $game['prize_pool'], $game['admin_cut']);
        $stmt->execute();
    }
    $stmt->close();
}

function drawLotteryWinners($conn, $game_id) {
    $game_configs_by_id = array_column(getGameConfigs(), null, 'id');
    if (!isset($game_configs_by_id[$game_id])) {
        return ['status' => 'error', 'message' => 'Game configuration not found.'];
    }
    $config = $game_configs_by_id[$game_id];
    $prize_pool_array = json_decode($config['prize_pool'], true);

    $tickets_stmt = $conn->prepare("SELECT user_id, ticket_number FROM lottery_tickets WHERE game_id = ?");
    $tickets_stmt->bind_param("i", $game_id);
    $tickets_stmt->execute();
    $all_tickets = $tickets_stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    if (empty($all_tickets)) return ['status' => 'error', 'message' => 'No tickets to draw from.'];
    
    shuffle($all_tickets);
    $winners = [];
    $winner_details_log = [];

    for ($i = 0; $i < $config['winners_count']; $i++) {
        if (empty($all_tickets)) break;
        $winning_ticket = array_pop($all_tickets);
        $winner_id = $winning_ticket['user_id'];
        $prize = $prize_pool_array[$i] ?? 0;
        
        $conn->query("UPDATE users SET balance = balance + $prize WHERE id = $winner_id");
        $winner_user_res = $conn->query("SELECT display_name FROM users WHERE id = $winner_id");
        $winner_user = $winner_user_res ? $winner_user_res->fetch_assoc() : ['display_name' => 'Unknown'];
        
        $winners[] = ['username' => $winner_user['display_name'], 'prize' => $prize, 'ticket' => $winning_ticket['ticket_number']];
        $winner_details_log[] = ['username' => $winner_user['display_name'], 'prize' => $prize, 'ticket' => $winning_ticket['ticket_number']];
    }

    $admin_user_id = 1; 
    $conn->query("UPDATE users SET balance = balance + {$config['admin_cut']} WHERE id = $admin_user_id");

    $log_stmt = $conn->prepare("INSERT INTO lottery_logs (game_id, winner_details, admin_cut) VALUES (?, ?, ?)");
    $log_details_json = json_encode($winner_details_log);
    $log_stmt->bind_param("isi", $game_id, $log_details_json, $config['admin_cut']);
    $log_stmt->execute();
    
    return ['status' => 'success', 'winners' => $winners];
}

function resetLotteryGame($conn, $game_id) {
    $conn->query("DELETE FROM lottery_tickets WHERE game_id = $game_id");
    $conn->query("UPDATE lottery_games SET current_tokens = 0, status = 'waiting', last_winner_message = NULL WHERE id = $game_id");
}


switch ($action) {
    case 'get_lottery_games':
        $game_count_res = $conn->query("SELECT COUNT(id) as count FROM lottery_games");
        if ($game_count_res && $game_count_res->fetch_assoc()['count'] == 0) {
            seedDefaultLotteryGames($conn);
        }

        $drawn_games_res = $conn->query("SELECT id FROM lottery_games WHERE status = 'drawing' AND last_winner_message IS NOT NULL");
        if ($drawn_games_res && $drawn_games_res->num_rows > 0) {
            while ($game = $drawn_games_res->fetch_assoc()) {
                resetLotteryGame($conn, $game['id']);
            }
        }
        
        $games_db = $conn->query("SELECT * FROM lottery_games")->fetch_all(MYSQLI_ASSOC);
        $game_configs_by_id = array_column(getGameConfigs(), null, 'id');
        
        $games_merged = [];
        foreach($games_db as $game_db) {
            $config = $game_configs_by_id[$game_db['id']] ?? [];
            $games_merged[] = array_merge($game_db, $config);
        }

        $response = ['status' => 'success', 'games' => $games_merged];
        break;

    case 'get_lottery_game_details':
        $game_id = (int)($_GET['id'] ?? 0);
        
        $game_db = $conn->query("SELECT * FROM lottery_games WHERE id = $game_id")->fetch_assoc();
        if (!$game_db) {
            $response = ['status' => 'error', 'message' => 'Game not found.'];
            break;
        }

        $game_configs_by_id = array_column(getGameConfigs(), null, 'id');
        $game_config = $game_configs_by_id[$game_id] ?? [];
        $game_full_details = array_merge($game_db, $game_config);

        $participants_query = "SELECT u.display_name, COUNT(lt.id) as tokens_bought FROM lottery_tickets lt JOIN users u ON lt.user_id = u.id WHERE lt.game_id = $game_id GROUP BY u.id, u.display_name ORDER BY tokens_bought DESC";
        $participants = $conn->query($participants_query)->fetch_all(MYSQLI_ASSOC);
        
        $my_tickets_query = "SELECT ticket_number FROM lottery_tickets WHERE game_id = ? AND user_id = ? ORDER BY ticket_number ASC";
        $my_tickets_stmt = $conn->prepare($my_tickets_query);
        $my_tickets_stmt->bind_param("ii", $game_id, $current_user_id);
        $my_tickets_stmt->execute();
        $my_tickets_res = $my_tickets_stmt->get_result();
        $my_tickets = array_column($my_tickets_res->fetch_all(MYSQLI_ASSOC), 'ticket_number');

        $history_query = "SELECT winner_details, created_at FROM lottery_logs WHERE game_id = $game_id ORDER BY created_at DESC LIMIT 5";
        $history = $conn->query($history_query)->fetch_all(MYSQLI_ASSOC);

        $response = ['status' => 'success', 'game' => $game_full_details, 'participants' => $participants, 'my_tickets' => $my_tickets, 'history' => $history];
        break;

    case 'buy_lottery_token':
        $game_id = (int)($_POST['game_id'] ?? 0);
        $token_count = (int)($_POST['token_count'] ?? 0);
        
        $game_configs_by_id = array_column(getGameConfigs(), null, 'id');

        if (!isset($game_configs_by_id[$game_id]) || $token_count <= 0) {
            $response['message'] = 'Invalid game or token count.';
            break;
        }
        $config = $game_configs_by_id[$game_id];
        $cost = $config['token_cost'] * $token_count;

        $conn->begin_transaction();
        try {
            $user = $conn->query("SELECT balance FROM users WHERE id = $current_user_id FOR UPDATE")->fetch_assoc();
            if ($user['balance'] < $cost) throw new Exception('Insufficient balance.');

            $game = $conn->query("SELECT current_tokens, token_limit, status FROM lottery_games WHERE id = $game_id FOR UPDATE")->fetch_assoc();
            if ($game['status'] !== 'waiting' || ($game['current_tokens'] + $token_count) > $game['token_limit']) {
                throw new Exception('This lottery is full or not enough space for this purchase.');
            }

            if($config['purchase_limit'] != -1) {
                $my_tickets_count_res = $conn->query("SELECT COUNT(id) as count FROM lottery_tickets WHERE game_id = $game_id AND user_id = $current_user_id FOR UPDATE");
                $my_tickets_count = $my_tickets_count_res->fetch_assoc()['count'];
                if ($my_tickets_count + $token_count > $config['purchase_limit']) {
                    throw new Exception("You cannot buy more than {$config['purchase_limit']} tokens for this game.");
                }
            }

            $conn->query("UPDATE users SET balance = balance - $cost WHERE id = $current_user_id");
            
            $ticket_check_stmt = $conn->prepare("SELECT id FROM lottery_tickets WHERE game_id = ? AND ticket_number = ?");
            $ticket_insert_stmt = $conn->prepare("INSERT INTO lottery_tickets (game_id, user_id, ticket_number) VALUES (?, ?, ?)");

            for ($i = 0; $i < $token_count; $i++) {
                $is_unique = false;
                $new_ticket_num = 0;
                $max_attempts = 20;
                $attempts = 0;

                while (!$is_unique && $attempts < $max_attempts) {
                    $new_ticket_num = rand(10000, 999999);
                    $ticket_check_stmt->bind_param("ii", $game_id, $new_ticket_num);
                    $ticket_check_stmt->execute();
                    $result = $ticket_check_stmt->get_result();
                    if ($result->num_rows === 0) {
                        $is_unique = true;
                    }
                    $attempts++;
                }

                if ($is_unique) {
                    $ticket_insert_stmt->bind_param("iii", $game_id, $current_user_id, $new_ticket_num);
                    $ticket_insert_stmt->execute();
                } else {
                    throw new Exception("Could not generate a unique ticket number. Please try again.");
                }
            }

            $new_total_tokens = $game['current_tokens'] + $token_count;
            $conn->query("UPDATE lottery_games SET current_tokens = $new_total_tokens WHERE id = $game_id");

            if ($new_total_tokens >= $game['token_limit']) {
                $draw_result = drawLotteryWinners($conn, $game_id);
                if($draw_result['status'] === 'success') {
                    $winner_message = "Winners: " . implode(', ', array_map(function($w) {
                        return "{$w['username']} (Ticket: {$w['ticket']})";
                    }, $draw_result['winners']));
                    $conn->query("UPDATE lottery_games SET status = 'drawing', last_winner_message = '".$conn->real_escape_string($winner_message)."' WHERE id = $game_id");
                }
            }
            
            $conn->commit();
            $response = ['status' => 'success', 'message' => "{$token_count} token(s) purchased successfully!"];

        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = $e->getMessage();
        }
        break;

    case 'get_lottery_admin_data':
        if (!$is_admin) { $response['message'] = 'Permission denied.'; break; }
        
        $games = $conn->query("SELECT * FROM lottery_games ORDER BY id ASC")->fetch_all(MYSQLI_ASSOC);
        
        $logs_query = "
            SELECT ll.*, lg.name as game_name 
            FROM lottery_logs ll
            JOIN lottery_games lg ON ll.game_id = lg.id
            ORDER BY ll.created_at DESC LIMIT 20
        ";
        $logs = $conn->query($logs_query)->fetch_all(MYSQLI_ASSOC);
        
        $response = ['status' => 'success', 'games' => $games, 'logs' => $logs];
        break;
        
    case 'lottery_draw_admin':
        if (!$is_admin) { $response['message'] = 'Permission denied.'; break; }
        
        $game_id = (int)($_POST['game_id'] ?? 0);
        $game = $conn->query("SELECT * FROM lottery_games WHERE id = $game_id")->fetch_assoc();
        $participants_count_res = $conn->query("SELECT COUNT(id) as count FROM lottery_tickets WHERE game_id = $game_id");
        $participants_count = $participants_count_res ? $participants_count_res->fetch_assoc()['count'] : 0;

        if ($game && $participants_count > 0) {
            $draw_result = drawLotteryWinners($conn, $game_id);
            if($draw_result['status'] === 'success') {
                $winner_message = "Winners: " . implode(', ', array_map(function($w) {
                    return "{$w['username']} (Ticket: {$w['ticket']})";
                }, $draw_result['winners']));
                $conn->query("UPDATE lottery_games SET status = 'drawing', last_winner_message = '".$conn->real_escape_string($winner_message)."' WHERE id = $game_id");
                resetLotteryGame($conn, $game_id);
                $response = ['status' => 'success', 'message' => 'Game has been manually drawn and reset.'];
            } else {
                $response['message'] = 'Failed to draw winners.';
            }
        } else {
            $response['message'] = 'Cannot draw. Game not found or has no participants.';
        }
        break;
        
    case 'lottery_reset_admin':
        if (!$is_admin) { $response['message'] = 'Permission denied.'; break; }
        
        $game_id = (int)($_POST['game_id'] ?? 0);
        if ($game_id > 0) {
            resetLotteryGame($conn, $game_id);
            $response = ['status' => 'success', 'message' => 'Game has been reset successfully.'];
        } else {
            $response['message'] = 'Invalid game ID.';
        }
        break;
}
?>