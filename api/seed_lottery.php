<?php
// /api/seed_lottery.php

require_once 'db_connect.php';

echo "<h1>Lottery Game Seeding Script</h1>";

$gameConfigs = [
    ['id' => 1, 'name' => 'লাকি টেন লটারি', 'token_cost' => 2, 'token_limit' => 10, 'winners_count' => 1, 'prize_pool' => json_encode([18]), 'admin_cut' => 2],
    ['id' => 2, 'name' => 'ডাবল চান্স ড্র', 'token_cost' => 2, 'token_limit' => 30, 'winners_count' => 2, 'prize_pool' => json_encode([35, 20]), 'admin_cut' => 5],
    ['id' => 3, 'name' => 'ট্রিপল উইনার্স লটারি', 'token_cost' => 2, 'token_limit' => 50, 'winners_count' => 3, 'prize_pool' => json_encode([40, 30, 20]), 'admin_cut' => 10],
    ['id' => 4, 'name' => 'গ্র্যান্ড ফাইভ ড্র', 'token_cost' => 5, 'token_limit' => 100, 'winners_count' => 5, 'prize_pool' => json_encode([150, 120, 80, 60, 40]), 'admin_cut' => 50],
    ['id' => 5, 'name' => 'মেগা জ্যাকপট', 'token_cost' => 50, 'token_limit' => 500, 'winners_count' => 1, 'prize_pool' => json_encode([24500]), 'admin_cut' => 500]
];

$stmt = $conn->prepare("
    INSERT INTO lottery_games (id, name, token_cost, token_limit, winners_count, prize_pool, admin_cut)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    name=VALUES(name), token_cost=VALUES(token_cost), token_limit=VALUES(token_limit), winners_count=VALUES(winners_count), prize_pool=VALUES(prize_pool), admin_cut=VALUES(admin_cut)
");

foreach ($gameConfigs as $game) {
    $stmt->bind_param(
        "isiiisi",
        $game['id'],
        $game['name'],
        $game['token_cost'],
        $game['token_limit'],
        $game['winners_count'],
        $game['prize_pool'],
        $game['admin_cut']
    );

    if ($stmt->execute()) {
        echo "<p>Successfully inserted/updated game: " . htmlspecialchars($game['name']) . "</p>";
    } else {
        echo "<p style='color:red;'>Failed to insert/update game: " . htmlspecialchars($game['name']) . ". Error: " . $stmt->error . "</p>";
    }
}

$stmt->close();
$conn->close();

echo "<h2>Seeding Complete!</h2>";
echo "<p style='color:red; font-weight:bold;'>VERY IMPORTANT: For security reasons, please DELETE this 'seed_lottery.php' file from your server now.</p>";

?>