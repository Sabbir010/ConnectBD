<?php
// api/features/gifts.php

if (!$current_user_id) {
    $response['message'] = 'You must be logged in to manage gifts.';
    echo json_encode($response);
    exit;
}

// Helper function to get all gifts data
function getAllGifts() {
    return [
        // Normal Gifts (Gold Coins) - Now with icons
        1 => ['id' => 1, 'name' => 'Rose', 'icon' => 'fas fa-rose', 'type' => 'Normal', 'cost_gold' => 5],
        2 => ['id' => 2, 'name' => 'Chocolate', 'icon' => 'fas fa-candy-cane', 'type' => 'Normal', 'cost_gold' => 5],
        3 => ['id' => 3, 'name' => 'Ice Cream', 'icon' => 'fas fa-ice-cream', 'type' => 'Normal', 'cost_gold' => 5],
        4 => ['id' => 4, 'name' => 'Teddy Bear', 'icon' => 'fas fa-teddy-bear', 'type' => 'Normal', 'cost_gold' => 5],
        5 => ['id' => 5, 'name' => 'Smiley Face', 'icon' => 'fas fa-smile', 'type' => 'Normal', 'cost_gold' => 5],
        6 => ['id' => 6, 'name' => 'Heart', 'icon' => 'fas fa-heart', 'type' => 'Normal', 'cost_gold' => 5],
        7 => ['id' => 7, 'name' => 'Star', 'icon' => 'fas fa-star', 'type' => 'Normal', 'cost_gold' => 5],
        8 => ['id' => 8, 'name' => 'Cake Slice', 'icon' => 'fas fa-birthday-cake', 'type' => 'Normal', 'cost_gold' => 5],
        9 => ['id' => 9, 'name' => 'Balloon', 'icon' => 'fas fa-balloon', 'type' => 'Normal', 'cost_gold' => 5],
        10 => ['id' => 10, 'name' => 'Coffee Cup', 'icon' => 'fas fa-coffee', 'type' => 'Normal', 'cost_gold' => 5],
        // Medium Gifts (Balance)
        11 => ['id' => 11, 'name' => 'Bouquet', 'icon' => 'fas fa-bouquet', 'type' => 'Medium', 'cost_balance' => 5.00],
        12 => ['id' => 12, 'name' => 'Watch', 'icon' => 'fas fa-watch', 'type' => 'Medium', 'cost_balance' => 5.00],
        13 => ['id' => 13, 'name' => 'Sunglasses', 'icon' => 'fas fa-sunglasses', 'type' => 'Medium', 'cost_balance' => 5.00],
        14 => ['id' => 14, 'name' => 'Perfume', 'icon' => 'fas fa-spray-can-sparkles', 'type' => 'Medium', 'cost_balance' => 5.00],
        15 => ['id' => 15, 'name' => 'Headphones', 'icon' => 'fas fa-headphones', 'type' => 'Medium', 'cost_balance' => 5.00],
        16 => ['id' => 16, 'name' => 'Gaming Mouse', 'icon' => 'fas fa-mouse', 'type' => 'Medium', 'cost_balance' => 5.00],
        17 => ['id' => 17, 'name' => 'T-Shirt', 'icon' => 'fas fa-tshirt', 'type' => 'Medium', 'cost_balance' => 5.00],
        18 => ['id' => 18, 'name' => 'Book Set', 'icon' => 'fas fa-books', 'type' => 'Medium', 'cost_balance' => 5.00],
        19 => ['id' => 19, 'name' => 'Movie Tickets', 'icon' => 'fas fa-ticket-alt', 'type' => 'Medium', 'cost_balance' => 5.00],
        20 => ['id' => 20, 'name' => 'Dinner Voucher', 'icon' => 'fas fa-utensils', 'type' => 'Medium', 'cost_balance' => 5.00],
        // Expensive Gifts (Balance)
        21 => ['id' => 21, 'name' => 'Diamond Ring', 'icon' => 'fas fa-gem', 'type' => 'Expensive', 'cost_balance' => 10.00],
        22 => ['id' => 22, 'name' => 'Smartphone', 'icon' => 'fas fa-mobile-alt', 'type' => 'Expensive', 'cost_balance' => 10.00],
        23 => ['id' => 23, 'name' => 'Laptop', 'icon' => 'fas fa-laptop', 'type' => 'Expensive', 'cost_balance' => 10.00],
        24 => ['id' => 24, 'name' => 'Bike', 'icon' => 'fas fa-bicycle', 'type' => 'Expensive', 'cost_balance' => 10.00],
        25 => ['id' => 25, 'name' => 'Vacation Package', 'icon' => 'fas fa-plane-departure', 'type' => 'Expensive', 'cost_balance' => 10.00],
        26 => ['id' => 26, 'name' => 'Gold Necklace', 'icon' => 'fas fa-loveseat', 'type' => 'Expensive', 'cost_balance' => 10.00],
        27 => ['id' => 27, 'name' => 'Designer Bag', 'icon' => 'fas fa-shopping-bag', 'type' => 'Expensive', 'cost_balance' => 10.00],
        28 => ['id' => 28, 'name' => 'Drone', 'icon' => 'fas fa-drone', 'type' => 'Expensive', 'cost_balance' => 10.00],
        29 => ['id' => 29, 'name' => 'DSLR Camera', 'icon' => 'fas fa-camera-retro', 'type' => 'Expensive', 'cost_balance' => 10.00],
        30 => ['id' => 30, 'name' => 'Smart TV', 'icon' => 'fas fa-tv', 'type' => 'Expensive', 'cost_balance' => 10.00],
    ];
}


function getGiftById($gift_id) {
    $all_gifts = getAllGifts();
    return $all_gifts[$gift_id] ?? null;
}

function getUserBalance($conn, $user_id) {
    $stmt = $conn->prepare("SELECT balance, gold_coins FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    return $stmt->get_result()->fetch_assoc();
}

switch ($action) {
    case 'get_gift_shop_items':
        $all_gifts = getAllGifts();
        $categorized_gifts = [];
        foreach ($all_gifts as $gift) {
            $categorized_gifts[$gift['type']][] = $gift;
        }
        $response = ['status' => 'success', 'gifts' => $categorized_gifts];
        break;

    case 'send_gift':
        $receiver_id = (int)($_POST['receiver_id'] ?? 0);
        $gift_id = (int)($_POST['gift_id'] ?? 0);
        
        if ($receiver_id <= 0 || $gift_id <= 0 || $receiver_id == $current_user_id) {
            $response['message'] = 'Invalid receiver or gift ID. You cannot send a gift to yourself.';
            break;
        }

        $gift = getGiftById($gift_id);
        if (!$gift) {
            $response['message'] = 'Gift not found.';
            break;
        }

        $sender_balance = getUserBalance($conn, $current_user_id);
        
        $conn->begin_transaction();
        try {
            if (isset($gift['cost_gold'])) {
                if ($sender_balance['gold_coins'] < $gift['cost_gold']) throw new Exception('Not enough Gold Coins.');
                $conn->query("UPDATE users SET gold_coins = gold_coins - {$gift['cost_gold']} WHERE id = $current_user_id");
            } else {
                if ($sender_balance['balance'] < $gift['cost_balance']) throw new Exception('Not enough balance.');
                $conn->query("UPDATE users SET balance = balance - {$gift['cost_balance']} WHERE id = $current_user_id");
            }

            $stmt = $conn->prepare("INSERT INTO user_gifts (owner_id, gift_id, sender_id) VALUES (?, ?, ?)");
            $stmt->bind_param("iii", $receiver_id, $gift_id, $current_user_id);
            $stmt->execute();

            $conn->commit();
            
            $sender_name_stmt = $conn->prepare("SELECT display_name FROM users WHERE id = ?");
            $sender_name_stmt->bind_param("i", $current_user_id);
            $sender_name_stmt->execute();
            $sender_name = $sender_name_stmt->get_result()->fetch_assoc()['display_name'];

            $notification_message = "<b>" . htmlspecialchars($sender_name) . "</b> sent you a <b>" . htmlspecialchars($gift['name']) . "</b>!";
            sendNotification($conn, $receiver_id, $notification_message, "user_gifts:$receiver_id");
            
            $response = ['status' => 'success', 'message' => 'Gift sent successfully!'];
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = $e->getMessage();
        }
        break;

    case 'get_user_gifts':
        $user_id = (int)($_GET['user_id'] ?? 0);
        if ($user_id <= 0) {
            $response['message'] = 'Invalid user ID.';
            break;
        }

        $query = "SELECT ug.id as inventory_id, ug.gift_id, u.display_name as sender_name 
                  FROM user_gifts ug 
                  LEFT JOIN users u ON ug.sender_id = u.id 
                  WHERE ug.owner_id = ? 
                  ORDER BY ug.id DESC";
        $stmt = $conn->prepare($query);

        if ($stmt === false) {
            $response['message'] = 'Database query failed to prepare.';
            break;
        }

        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $user_gifts_raw = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        $gifts_with_details = [];
        foreach ($user_gifts_raw as $gift) {
            $gift_details = getGiftById($gift['gift_id']);
            if ($gift_details) {
                if (is_null($gift['sender_name'])) {
                    $gift['sender_name'] = 'System';
                }
                $gifts_with_details[] = array_merge($gift, $gift_details);
            }
        }
        $response = ['status' => 'success', 'gifts' => $gifts_with_details];
        break;

    case 'initiate_gift_trade':
        $inventory_id = (int)($_POST['inventory_id'] ?? 0);
        $target_user_id = (int)($_POST['target_user_id'] ?? 0);
        $price = (float)($_POST['price'] ?? 0);
        $trade_type = $_POST['trade_type'] ?? '';

        if ($inventory_id <= 0 || $target_user_id <= 0 || $price <= 0 || !in_array($trade_type, ['sell', 'buy_request'])) {
            $response['message'] = 'Invalid trade data provided.';
            break;
        }
        
        $seller_id = ($trade_type == 'sell') ? $current_user_id : $target_user_id;
        $buyer_id = ($trade_type == 'sell') ? $target_user_id : $current_user_id;
        
        $gift_info_stmt = $conn->prepare("SELECT gift_id FROM user_gifts WHERE id = ? AND owner_id = ?");
        $gift_info_stmt->bind_param("ii", $inventory_id, $seller_id);
        $gift_info_stmt->execute();
        $gift_info = $gift_info_stmt->get_result()->fetch_assoc();

        if (!$gift_info) {
            $response['message'] = 'You do not own this gift or it does not exist.';
            break;
        }

        $gift = getGiftById($gift_info['gift_id']);
        $trade_currency = ($gift['type'] === 'Normal') ? 'gold' : 'balance';
        $commission_rate = ($trade_currency === 'balance') ? 0.05 : 0; // 5% commission for balance, 0 for gold
        $commission = $price * $commission_rate;

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("INSERT INTO gift_transactions (inventory_id, seller_id, buyer_id, price, commission, status, trade_currency) VALUES (?, ?, ?, ?, ?, 'pending', ?)");
            $stmt->bind_param("iiidds", $inventory_id, $seller_id, $buyer_id, $price, $commission, $trade_currency);
            $stmt->execute();
            $trade_id = $conn->insert_id;
            
            $initiator_name_res = $conn->query("SELECT display_name FROM users WHERE id = $current_user_id");
            $initiator_name = $initiator_name_res->fetch_assoc()['display_name'];

            $price_display = ($trade_currency === 'gold') ? (int)$price . " Gold Coins" : "৳" . number_format($price, 2);

            if ($trade_type == 'sell') {
                $message = "<b>" . htmlspecialchars($initiator_name) . "</b> wants to sell their <b>" . htmlspecialchars($gift['name']) . "</b> to you for <b>" . $price_display . "</b>.";
            } else {
                $message = "<b>" . htmlspecialchars($initiator_name) . "</b> wants to buy your <b>" . htmlspecialchars($gift['name']) . "</b> for <b>" . $price_display . "</b>.";
            }

            $message .= "<br><br><div class='gift-trade-actions'>" .
                        "<a href='#' class='pm-button pm-button-accept gift-trade-btn' data-trade-id='{$trade_id}' data-action='accept'>Accept</a> " .
                        "<a href='#' class='pm-button pm-button-reject gift-trade-btn' data-trade-id='{$trade_id}' data-action='reject'>Reject</a></div>";
            
            sendSystemPM($conn, $target_user_id, $message);

            $conn->commit();
            $response = ['status' => 'success', 'message' => 'Your request has been sent successfully.'];

        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = 'An error occurred: ' . $e->getMessage();
        }
        break;

    case 'respond_to_gift_trade':
        $trade_id = (int)($_POST['trade_id'] ?? 0);
        $decision = $_POST['decision'] ?? '';

        if ($trade_id <= 0 || !in_array($decision, ['accept', 'reject'])) {
            $response['message'] = 'Invalid response data.';
            break;
        }

        $conn->begin_transaction();
        try {
            $trade_stmt = $conn->prepare("SELECT * FROM gift_transactions WHERE id = ? AND status = 'pending' FOR UPDATE");
            $trade_stmt->bind_param("i", $trade_id);
            $trade_stmt->execute();
            $trade = $trade_stmt->get_result()->fetch_assoc();

            if (!$trade) throw new Exception('Trade not found or already completed.');
            
            if ($trade['buyer_id'] != $current_user_id && $trade['seller_id'] != $current_user_id) {
                throw new Exception('You are not part of this trade.');
            }

            $requester_id = ($trade['buyer_id'] == $current_user_id) ? $trade['seller_id'] : $trade['buyer_id'];
            
            if ($decision == 'reject') {
                $conn->query("UPDATE gift_transactions SET status = 'rejected' WHERE id = $trade_id");
                sendSystemPM($conn, $requester_id, "Your gift trade request (ID: $trade_id) was rejected.");
                $response = ['status' => 'success', 'message' => 'Trade rejected.'];
            } else { // accept
                $buyer_funds = getUserBalance($conn, $trade['buyer_id']);
                
                if ($trade['trade_currency'] === 'gold') {
                    if ($buyer_funds['gold_coins'] < $trade['price']) throw new Exception('Buyer has insufficient Gold Coins.');
                    
                    $seller_earning = $trade['price']; // No commission on gold trades
                    
                    $conn->query("UPDATE users SET gold_coins = gold_coins - {$trade['price']} WHERE id = {$trade['buyer_id']}");
                    $conn->query("UPDATE users SET gold_coins = gold_coins + $seller_earning WHERE id = {$trade['seller_id']}");
                    $pm_price_display = (int)$seller_earning . " Gold Coins";

                } else { // balance
                    if ($buyer_funds['balance'] < $trade['price']) throw new Exception('Buyer has insufficient balance.');

                    $seller_earning = $trade['price'] - $trade['commission'];

                    $conn->query("UPDATE users SET balance = balance - {$trade['price']} WHERE id = {$trade['buyer_id']}");
                    $conn->query("UPDATE users SET balance = balance + $seller_earning WHERE id = {$trade['seller_id']}");
                    $pm_price_display = "৳" . number_format($seller_earning, 2);
                }
                
                $conn->query("UPDATE user_gifts SET owner_id = {$trade['buyer_id']}, sender_id = {$trade['seller_id']} WHERE id = {$trade['inventory_id']}");
                
                $conn->query("UPDATE gift_transactions SET status = 'completed' WHERE id = $trade_id");
                
                sendSystemPM($conn, $trade['buyer_id'], "Your gift trade (ID: $trade_id) was successful. The gift is now in your inventory.");
                sendSystemPM($conn, $trade['seller_id'], "Your gift trade (ID: $trade_id) was successful. You have received " . $pm_price_display . ".");
                
                $response = ['status' => 'success', 'message' => 'Trade successful!'];
            }
            $conn->commit();
        } catch (Exception $e) {
            $conn->rollback();
            $response['message'] = $e->getMessage();
        }
        break;
}
?>