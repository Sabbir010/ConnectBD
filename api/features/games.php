<?php
// api/features/games.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in to play games.';
    echo json_encode($response);
    exit;
}

function getUserGoldCoins($conn, $user_id) {
    $stmt = $conn->prepare("SELECT gold_coins FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc()['gold_coins'] ?? 0;
}


switch ($action) {
    // --- Ball Sort Cases ---
    case 'get_ball_sort_progress':
        $stmt = $conn->prepare("SELECT current_level, gold_coins FROM user_game_progress ugp JOIN users u ON ugp.user_id = u.id WHERE user_id = ? AND game_name = 'ball_sort'");
        $stmt->bind_param("i", $current_user_id);
        $stmt->execute();
        $progress = $stmt->get_result()->fetch_assoc();
        if ($progress) {
            $response = ['status' => 'success', 'level' => $progress['current_level'], 'gold_coins' => $progress['gold_coins']];
        } else {
            $conn->query("INSERT INTO user_game_progress (user_id, game_name) VALUES ($current_user_id, 'ball_sort') ON DUPLICATE KEY UPDATE user_id = user_id");
            $gold_coins = getUserGoldCoins($conn, $current_user_id);
            $response = ['status' => 'success', 'level' => 1, 'gold_coins' => $gold_coins];
        }
        break;

    case 'get_ball_sort_level':
        set_time_limit(60);

        $level = (int)($_GET['level'] ?? 1);
        mt_srand($level);

        $num_tubes_with_balls = 0;
        if ($level <= 10) { $num_tubes_with_balls = 3; }
        elseif ($level <= 20) { $num_tubes_with_balls = 5; }
        elseif ($level <= 30) { $num_tubes_with_balls = 6; }
        elseif ($level <= 50) { $num_tubes_with_balls = 8; }
        else { $num_tubes_with_balls = 10; }

        $num_colors = $num_tubes_with_balls;
        $num_empty_tubes = 1;
        
        $colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink', 'lime', 'teal', 'brown', 'grey'];
        $used_colors = array_slice($colors, 0, $num_colors);
        
        $ball_pool = [];
        foreach ($used_colors as $color) {
            for ($i = 0; $i < 4; $i++) {
                $ball_pool[] = $color;
            }
        }
        shuffle($ball_pool);

        $tubes = [];
        for ($i = 0; $i < $num_tubes_with_balls; $i++) {
            $tubes[] = array_slice($ball_pool, $i * 4, 4);
        }

        $swapping_iterations = 100 + ($level * 5);
        for ($i = 0; $i < $swapping_iterations; $i++) {
            $tube1_idx = mt_rand(0, $num_tubes_with_balls - 1);
            $tube2_idx = mt_rand(0, $num_tubes_with_balls - 1);
            if ($tube1_idx === $tube2_idx) continue;
            
            $ball1_idx = mt_rand(0, 3);
            $ball2_idx = mt_rand(0, 3);

            if (isset($tubes[$tube1_idx][$ball1_idx]) && isset($tubes[$tube2_idx][$ball2_idx])) {
                $temp_ball = $tubes[$tube1_idx][$ball1_idx];
                $tubes[$tube1_idx][$ball1_idx] = $tubes[$tube2_idx][$ball2_idx];
                $tubes[$tube2_idx][$ball2_idx] = $temp_ball;
            }
        }

        $de_pairing_attempts = 50;
        for ($attempt = 0; $attempt < $de_pairing_attempts; $attempt++) {
            $pair_found = false;
            for ($i = 0; $i < $num_tubes_with_balls; $i++) {
                for ($j = 0; $j < 3; $j++) {
                    if (isset($tubes[$i][$j]) && isset($tubes[$i][$j+1]) && $tubes[$i][$j] === $tubes[$i][$j+1]) {
                        $pair_found = true;
                        
                        $swap_tube_idx = mt_rand(0, $num_tubes_with_balls - 1);
                        $swap_ball_idx = mt_rand(0, 3);
                        $max_tries = 20;
                        $tries = 0;
                        while (($swap_tube_idx === $i || !isset($tubes[$swap_tube_idx][$swap_ball_idx]) || $tubes[$swap_tube_idx][$swap_ball_idx] === $tubes[$i][$j]) && $tries < $max_tries) {
                            $swap_tube_idx = mt_rand(0, $num_tubes_with_balls - 1);
                            $swap_ball_idx = mt_rand(0, 3);
                            $tries++;
                        }
                        
                        if(isset($tubes[$swap_tube_idx][$swap_ball_idx])) {
                            $temp_ball = $tubes[$i][$j];
                            $tubes[$i][$j] = $tubes[$swap_tube_idx][$swap_ball_idx];
                            $tubes[$swap_tube_idx][$swap_ball_idx] = $temp_ball;
                        }
                        
                        break 2;
                    }
                }
            }
            if (!$pair_found) {
                break;
            }
        }

        for ($i = 0; $i < $num_empty_tubes; $i++) {
            $tubes[] = [];
        }
        
        $response = ['status' => 'success', 'levelData' => $tubes];
        break;

    case 'complete_ball_sort_level':
        $completed_level = (int)($_POST['level'] ?? 0);
        if ($completed_level <= 0) { $response['message'] = 'Invalid level.'; break; }
        $reward_map = [ 10 => 5, 25 => 7, 50 => 15, 75 => 20, 100 => 30, 125 => 35, 150 => 40, 175 => 45, 200 => 50, 225 => 55, 250 => 60, 275 => 65, 300 => 70, 325 => 75, 350 => 80, 375 => 85, 400 => 90, 425 => 95, 450 => 100, 475 => 125, 500 => 200 ];
        $reward = $reward_map[$completed_level] ?? 1;
        $conn->begin_transaction();
        try {
            $conn->query("UPDATE users SET gold_coins = gold_coins + $reward WHERE id = $current_user_id");
            $conn->query("UPDATE user_game_progress SET current_level = current_level + 1, highest_level_completed = GREATEST(highest_level_completed, $completed_level) WHERE user_id = $current_user_id AND game_name = 'ball_sort'");
            $conn->commit();
            $new_gold_coins = getUserGoldCoins($conn, $current_user_id);
            $response = ['status' => 'success', 'reward' => $reward, 'new_gold_coins' => $new_gold_coins];
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'An error occurred while saving progress.';
        }
        break;

    case 'use_ball_sort_feature':
        $feature_type = $_POST['feature'] ?? '';
        $cost = 0;
        if ($feature_type === 'undo') { $cost = 2; }
        elseif ($feature_type === 'add_tube') {
            $tubes_added = (int)($_POST['tubes_added'] ?? 0);
            $cost_map = [0 => 2, 1 => 5, 2 => 5];
            if (isset($cost_map[$tubes_added])) { $cost = $cost_map[$tubes_added]; }
            else { $response['message'] = 'Maximum extra tubes added.'; break; }
        } else { $response['message'] = 'Invalid feature.'; break; }
        $current_coins = getUserGoldCoins($conn, $current_user_id);
        if ($current_coins < $cost) { $response['message'] = 'Not enough Gold Coins.'; break; }
        $conn->query("UPDATE users SET gold_coins = gold_coins - $cost WHERE id = $current_user_id");
        $new_gold_coins = $current_coins - $cost;
        $response = ['status' => 'success', 'message' => 'Purchase successful.', 'new_gold_coins' => $new_gold_coins];
        break;
}
?>