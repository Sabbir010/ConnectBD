<?php
// এই ফাইলটি api.php দ্বারা কল হবে।

// একটি টেম্পোরারি ফাইল ব্যবহার করে শেষবার কখন রান হয়েছে তা ট্র্যাক করা হচ্ছে
$last_run_file = __DIR__ . '/cron_last_run.tmp';
$run_interval = 60; // ৬০ সেকেন্ড (১ মিনিট) পর পর রান করবে

// যদি নির্দিষ্ট সময়ের আগে হয়, তবে কিছু না করে মূল api.php ফাইলে ফিরে যাবে
if (file_exists($last_run_file) && (time() - filemtime($last_run_file)) < $run_interval) {
    // এখানে `exit;` কমান্ডটি সরিয়ে দেওয়া হয়েছে, যা মূল সমস্যা ছিল।
    return;
}

// বর্তমান সময় রেকর্ড করা হচ্ছে, যাতে পরের এক মিনিট এটি আবার না চলে
touch($last_run_file);

// $conn ভ্যারিয়েবলটি api.php থেকে আসবে, তাই এখানে ডাটাবেস কানেকশনের প্রয়োজন নেই
if (isset($conn) && $conn->ping()) {
    
    // ডাটাবেস থেকে একটি পেন্ডিং কাজ খোঁজা হচ্ছে
    $result = $conn->query("SELECT * FROM image_generation_queue WHERE status = 'pending' ORDER BY id ASC LIMIT 1");

    if ($result && $result->num_rows > 0) {
        $job = $result->fetch_assoc();
        $job_id = $job['id'];
        $user_id = $job['user_id'];
        $prompt = $job['prompt'];

        // কাজটি 'processing' হিসেবে মার্ক করা হচ্ছে
        $conn->query("UPDATE image_generation_queue SET status = 'processing', processed_at = NOW() WHERE id = $job_id");

        // ইমেজ তৈরির জন্য API কল করা হচ্ছে
        $image_url = callImageGenerationAPI($prompt);

        // API থেকে পাওয়া ফলাফল পরীক্ষা করা হচ্ছে
        if (strpos($image_url, 'http') === 0) {
            // সফলভাবে ইমেজ তৈরি হয়েছে
            $final_message = "আপনার অনুরোধ করা \"{$prompt}\" এর ছবিটি নিচে দেওয়া হলো:\n" . $image_url;
            $conn->query("UPDATE image_generation_queue SET status = 'completed', image_url = '{$conn->real_escape_string($image_url)}' WHERE id = $job_id");
        } else {
            // ইমেজ তৈরিতে ব্যর্থ হয়েছে
            $final_message = "দুঃখিত, আপনার অনুরোধ করা \"{$prompt}\" এর ছবিটি তৈরি করা সম্ভব হয়নি। \nসার্ভারের উত্তর: " . $image_url;
            $conn->query("UPDATE image_generation_queue SET status = 'failed' WHERE id = $job_id");
        }

        // ব্যবহারকারীকে চূড়ান্ত বার্তা পাঠানো হচ্ছে
        sendSystemPM($conn, $user_id, $final_message);
    }
}

// ডাটাবেস কানেকশন এখানে বন্ধ করা হবে না, কারণ মূল api.php ফাইলের কাজ এখনো বাকি আছে।
?>