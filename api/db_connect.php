<?php
// ডাটাবেস কনফিগারেশন - InfinityFree
define('DB_SERVER', 'sql211.infinityfree.com');
define('DB_USERNAME', 'if0_39874548'); 
define('DB_PASSWORD', 'zrifk7UMuHWJv'); 
define('DB_NAME', 'if0_39874548_connectbd_db'); 

// PHP স্ক্রিপ্টের জন্য ডিফল্ট টাইমজোন সেট করা হচ্ছে
date_default_timezone_set('Asia/Dhaka');

// ডাটাবেসের সাথে সংযোগ স্থাপনের চেষ্টা
$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

// কানেকশন সফল হয়েছে কিনা তা পরীক্ষা করা
if ($conn->connect_error) {
    header('Content-Type: application/json');
    die(json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]));
}

// MySQL কানেকশনের জন্য টাইমজোন সেট করা হচ্ছে, যাতে NOW() ফাংশন সঠিক সময় দেয়
$conn->query("SET time_zone = '+06:00'");
$conn->set_charset("utf8mb4");
?>