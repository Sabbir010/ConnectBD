<?php
// প্রয়োজনীয় ফাইলগুলো যুক্ত করা হচ্ছে
require_once 'db_connect.php';

echo "<h1>Counter Synchronization Script</h1>";

// --- সব ব্যবহারকারীর তালিকা আনা হচ্ছে ---
$users_result = $conn->query("SELECT id FROM users");
if ($users_result->num_rows > 0) {
    
    echo "<p>Found " . $users_result->num_rows . " users. Starting synchronization...</p>";
    
    while($user = $users_result->fetch_assoc()) {
        $user_id = $user['id'];
        
        // --- প্রতিটি ইউজারের জন্য পোস্ট গণনা করা হচ্ছে ---
        $shouts_count = $conn->query("SELECT COUNT(id) as count FROM shouts WHERE user_id = $user_id")->fetch_assoc()['count'];
        $topics_count = $conn->query("SELECT COUNT(id) as count FROM topics WHERE user_id = $user_id")->fetch_assoc()['count'];
        $archives_count = $conn->query("SELECT COUNT(id) as count FROM archives WHERE user_id = $user_id")->fetch_assoc()['count'];
        
        // --- users টেবিলে মোট সংখ্যা আপডেট করা হচ্ছে ---
        $update_stmt = $conn->prepare("UPDATE users SET total_shouts = ?, total_topics = ?, total_archives = ? WHERE id = ?");
        $update_stmt->bind_param("iiii", $shouts_count, $topics_count, $archives_count, $user_id);
        $update_stmt->execute();
        
        echo "<p>User ID: $user_id -> Shouts: $shouts_count, Topics: $topics_count, Archives: $archives_count... ✔ Updated</p>";
    }
    
    echo "<h2>Synchronization Complete!</h2>";
    echo "<p style='color:red; font-weight:bold;'>IMPORTANT: For security reasons, please delete this 'sync_counters.php' file from your server now.</p>";

} else {
    echo "<p>No users found in the database.</p>";
}

$conn->close();
?>