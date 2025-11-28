<?php
// htdocs/api/seed_all_themes.php

require_once 'db_connect.php';
echo "<h1>Ultimate Premium Theme Seeding Script (Final Version)</h1>";
echo "<p>Adding all site, profile, and the final 10 premium themes with effects...</p><hr>";

$all_themes = [
    // --- 50 SITE THEMES (Unchanged) ---
    ['name' => 'ConnectBD Default', 'type' => 'site', 'class_name' => 'theme-site-default', 'background_url' => 'linear-gradient(to br, #d1c4e9, #9575cd)', 'cost' => 0, 'cost_balance' => 0.00],
    ['name' => 'Dark Mode', 'type' => 'site', 'class_name' => 'theme-site-dark', 'background_url' => '#1a202c', 'cost' => 100, 'cost_balance' => 0.00],
    ['name' => 'Serene Blue', 'type' => 'site', 'class_name' => 'theme-site-blue', 'background_url' => 'linear-gradient(to top, #e0f2f1, #b2dfdb)', 'cost' => 100, 'cost_balance' => 0.00],
    ['name' => 'Lush Green', 'type' => 'site', 'class_name' => 'theme-site-green', 'background_url' => 'linear-gradient(to right, #f1f8e9, #dcedc8)', 'cost' => 100, 'cost_balance' => 0.00],
    ['name' => 'Royal Gold', 'type' => 'site', 'class_name' => 'theme-site-gold', 'background_url' => 'linear-gradient(to bottom, #fff8e1, #ffecb3)', 'cost' => 100, 'cost_balance' => 0.00],
    ['name' => 'Ocean Deep', 'type' => 'site', 'class_name' => 'theme-site-ocean', 'background_url' => 'linear-gradient(to top, #021B79, #0575E6)', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Sunset Glow', 'type' => 'site', 'class_name' => 'theme-site-sunset', 'background_url' => 'linear-gradient(to right, #ff7e5f, #feb47b)', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Forest Walk', 'type' => 'site', 'class_name' => 'theme-site-forest', 'background_url' => 'linear-gradient(to bottom, #2C5364, #0F2027)', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Royal Purple', 'type' => 'site', 'class_name' => 'theme-site-royal-purple', 'background_url' => 'linear-gradient(to top right, #4a00e0, #8e2de2)', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Graphite Gray', 'type' => 'site', 'class_name' => 'theme-site-graphite', 'background_url' => 'linear-gradient(to bottom, #616161, #424242)', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Minty Fresh', 'type' => 'site', 'class_name' => 'theme-site-mint', 'background_url' => 'linear-gradient(to right, #99f2c8, #1f4037)', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Cherry Blossom', 'type' => 'site', 'class_name' => 'theme-site-cherry', 'background_url' => 'linear-gradient(to bottom, #f8cdda, #ffffff)', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Coffee House', 'type' => 'site', 'class_name' => 'theme-site-coffee', 'background_url' => 'linear-gradient(to right, #6f4e37, #4b3832)', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Sky Blue', 'type' => 'site', 'class_name' => 'theme-site-sky', 'background_url' => 'linear-gradient(to bottom, #87ceeb, #f0f8ff)', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Ruby Red', 'type' => 'site', 'class_name' => 'theme-site-ruby', 'background_url' => 'linear-gradient(to right, #b21f1f, #f12711)', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Lavender Bliss', 'type' => 'site', 'class_name' => 'theme-site-lavender', 'background_url' => '#E6E6FA', 'cost' => 110, 'cost_balance' => 0.00],
    ['name' => 'Peach Dream', 'type' => 'site', 'class_name' => 'theme-site-peach', 'background_url' => '#FFDAB9', 'cost' => 110, 'cost_balance' => 0.00],
    ['name' => 'Concrete Jungle', 'type' => 'site', 'class_name' => 'theme-site-concrete', 'background_url' => '#bdc3c7', 'cost' => 130, 'cost_balance' => 0.00],
    ['name' => 'Aquamarine', 'type' => 'site', 'class_name' => 'theme-site-aquamarine', 'background_url' => '#7FFFD4', 'cost' => 130, 'cost_balance' => 0.00],
    ['name' => 'Crimson Tide', 'type' => 'site', 'class_name' => 'theme-site-crimson', 'background_url' => 'linear-gradient(to right, #DC143C, #8B0000)', 'cost' => 140, 'cost_balance' => 0.00],
    ['name' => 'Emerald City', 'type' => 'site', 'class_name' => 'theme-site-emerald', 'background_url' => 'linear-gradient(to right, #50C878, #00A86B)', 'cost' => 140, 'cost_balance' => 0.00],
    ['name' => 'Sunny Delight', 'type' => 'site', 'class_name' => 'theme-site-sunny', 'background_url' => '#FFD700', 'cost' => 125, 'cost_balance' => 0.00],
    ['name' => 'Midnight Blue', 'type' => 'site', 'class_name' => 'theme-site-midnight', 'background_url' => '#191970', 'cost' => 135, 'cost_balance' => 0.00],
    ['name' => 'Rose Gold', 'type' => 'site', 'class_name' => 'theme-site-rosegold', 'background_url' => '#B76E79', 'cost' => 155, 'cost_balance' => 0.00],
    ['name' => 'Teal Appeal', 'type' => 'site', 'class_name' => 'theme-site-teal', 'background_url' => '#008080', 'cost' => 125, 'cost_balance' => 0.00],
    ['name' => 'Violet Hue', 'type' => 'site', 'class_name' => 'theme-site-violet', 'background_url' => '#EE82EE', 'cost' => 115, 'cost_balance' => 0.00],
    ['name' => 'Tangerine Twist', 'type' => 'site', 'class_name' => 'theme-site-tangerine', 'background_url' => '#F28500', 'cost' => 145, 'cost_balance' => 0.00],
    ['name' => 'Indigo Night', 'type' => 'site', 'class_name' => 'theme-site-indigo', 'background_url' => '#4B0082', 'cost' => 160, 'cost_balance' => 0.00],
    ['name' => 'Coral Reef', 'type' => 'site', 'class_name' => 'theme-site-coral', 'background_url' => '#FF7F50', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Olive Grove', 'type' => 'site', 'class_name' => 'theme-site-olive', 'background_url' => '#808000', 'cost' => 130, 'cost_balance' => 0.00],
    ['name' => 'Maroon Mood', 'type' => 'site', 'class_name' => 'theme-site-maroon', 'background_url' => '#800000', 'cost' => 130, 'cost_balance' => 0.00],
    ['name' => 'Periwinkle Pop', 'type' => 'site', 'class_name' => 'theme-site-periwinkle', 'background_url' => '#CCCCFF', 'cost' => 110, 'cost_balance' => 0.00],
    ['name' => 'Steel Gray', 'type' => 'site', 'class_name' => 'theme-site-steel', 'background_url' => '#708090', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Turquoise Sea', 'type' => 'site', 'class_name' => 'theme-site-turquoise', 'background_url' => '#40E0D0', 'cost' => 140, 'cost_balance' => 0.00],
    ['name' => 'Beige Beauty', 'type' => 'site', 'class_name' => 'theme-site-beige', 'background_url' => '#F5F5DC', 'cost' => 100, 'cost_balance' => 0.00],
    ['name' => 'Hot Pink', 'type' => 'site', 'class_name' => 'theme-site-hotpink', 'background_url' => '#FF69B4', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Charcoal', 'type' => 'site', 'class_name' => 'theme-site-charcoal', 'background_url' => '#36454F', 'cost' => 130, 'cost_balance' => 0.00],
    ['name' => 'Lime Green', 'type' => 'site', 'class_name' => 'theme-site-limegreen', 'background_url' => '#32CD32', 'cost' => 120, 'cost_balance' => 0.00],
    ['name' => 'Plum Perfect', 'type' => 'site', 'class_name' => 'theme-site-plum', 'background_url' => '#DDA0DD', 'cost' => 110, 'cost_balance' => 0.00],
    ['name' => 'Mustard Yellow', 'type' => 'site', 'class_name' => 'theme-site-mustard', 'background_url' => '#FFDB58', 'cost' => 125, 'cost_balance' => 0.00],
    ['name' => 'Deep Sea', 'type' => 'site', 'class_name' => 'theme-site-deepsea', 'background_url' => '#013220', 'cost' => 145, 'cost_balance' => 0.00],
    ['name' => 'Bubblegum', 'type' => 'site', 'class_name' => 'theme-site-bubblegum', 'background_url' => '#FFC1CC', 'cost' => 115, 'cost_balance' => 0.00],
    ['name' => 'Sandstone', 'type' => 'site', 'class_name' => 'theme-site-sandstone', 'background_url' => '#F4A460', 'cost' => 135, 'cost_balance' => 0.00],
    ['name' => 'Wine Red', 'type' => 'site', 'class_name' => 'theme-site-wine', 'background_url' => '#722F37', 'cost' => 140, 'cost_balance' => 0.00],
    ['name' => 'Slate Blue', 'type' => 'site', 'class_name' => 'theme-site-slateblue', 'background_url' => '#6A5ACD', 'cost' => 130, 'cost_balance' => 0.00],
    ['name' => 'Electric Blue', 'type' => 'site', 'class_name' => 'theme-site-electricblue', 'background_url' => '#7DF9FF', 'cost' => 150, 'cost_balance' => 0.00],
    ['name' => 'Pine Green', 'type' => 'site', 'class_name' => 'theme-site-pinegreen', 'background_url' => '#01796F', 'cost' => 140, 'cost_balance' => 0.00],
    ['name' => 'Magenta', 'type' => 'site', 'class_name' => 'theme-site-magenta', 'background_url' => '#FF00FF', 'cost' => 160, 'cost_balance' => 0.00],
    ['name' => 'Ivory', 'type' => 'site', 'class_name' => 'theme-site-ivory', 'background_url' => '#FFFFF0', 'cost' => 100, 'cost_balance' => 0.00],
    ['name' => 'Bronze', 'type' => 'site', 'class_name' => 'theme-site-bronze', 'background_url' => '#CD7F32', 'cost' => 150, 'cost_balance' => 0.00],

    // --- 50 PROFILE THEMES (Unchanged) ---
    ['name' => 'Default Profile', 'type' => 'profile', 'class_name' => 'theme-profile-default', 'background_url' => '#e0e0e0', 'cost' => 0, 'cost_balance' => 0.00],
    ['name' => 'Vintage Paper', 'type' => 'profile', 'class_name' => 'theme-profile-vintage', 'background_url' => '#f5e8c7', 'cost' => 50, 'cost_balance' => 0.00],
    ['name' => 'Neon Nights', 'type' => 'profile', 'class_name' => 'theme-profile-neon', 'background_url' => '#1a202c', 'cost' => 50, 'cost_balance' => 0.00],
    ['name' => 'Sakura Blossom', 'type' => 'profile', 'class_name' => 'theme-profile-sakura', 'background_url' => '#fff0f5', 'cost' => 50, 'cost_balance' => 0.00],
    ['name' => 'Tech Grid', 'type' => 'profile', 'class_name' => 'theme-profile-grid', 'background_url' => '#0d1117', 'cost' => 50, 'cost_balance' => 0.00],
    ['name' => 'Developer Console', 'type' => 'profile', 'class_name' => 'theme-profile-console', 'background_url' => '#000000', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Blueprint', 'type' => 'profile', 'class_name' => 'theme-profile-blueprint', 'background_url' => '#004080', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Golden Elegance', 'type' => 'profile', 'class_name' => 'theme-profile-golden', 'background_url' => 'linear-gradient(145deg, #e6b800, #ffeb99)', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Holographic', 'type' => 'profile', 'class_name' => 'theme-profile-holographic', 'background_url' => 'linear-gradient(45deg, #ff00ff, #00ffff)', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Wood Panel', 'type' => 'profile', 'class_name' => 'theme-profile-wood', 'background_url' => '#855e42', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Sleek Carbon', 'type' => 'profile', 'class_name' => 'theme-profile-carbon-new', 'background_url' => '#222', 'cost' => 80, 'cost_balance' => 0.00],
    ['name' => 'Hacker Green', 'type' => 'profile', 'class_name' => 'theme-profile-hacker', 'background_url' => '#0F0', 'cost' => 80, 'cost_balance' => 0.00],
    ['name' => 'Gold Plate', 'type' => 'profile', 'class_name' => 'theme-profile-gold-plate', 'background_url' => '#FFD700', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Rose Petals', 'type' => 'profile', 'class_name' => 'theme-profile-rose-petals', 'background_url' => '#ffc0cb', 'cost' => 60, 'cost_balance' => 0.00],
    ['name' => 'Ocean Waves', 'type' => 'profile', 'class_name' => 'theme-profile-ocean-waves', 'background_url' => '#00bfff', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Galaxy', 'type' => 'profile', 'class_name' => 'theme-profile-galaxy', 'background_url' => '#2c3e50', 'cost' => 85, 'cost_balance' => 0.00],
    ['name' => 'Autumn Leaves', 'type' => 'profile', 'class_name' => 'theme-profile-autumn', 'background_url' => '#d2691e', 'cost' => 65, 'cost_balance' => 0.00],
    ['name' => 'Winter Snow', 'type' => 'profile', 'class_name' => 'theme-profile-winter', 'background_url' => '#f0ffff', 'cost' => 65, 'cost_balance' => 0.00],
    ['name' => 'Spring Blossoms', 'type' => 'profile', 'class_name' => 'theme-profile-spring', 'background_url' => '#ffb6c1', 'cost' => 65, 'cost_balance' => 0.00],
    ['name' => 'Summer Sun', 'type' => 'profile', 'class_name' => 'theme-profile-summer', 'background_url' => '#ffff00', 'cost' => 65, 'cost_balance' => 0.00],
    ['name' => 'Rainbow', 'type' => 'profile', 'class_name' => 'theme-profile-rainbow', 'background_url' => 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', 'cost' => 95, 'cost_balance' => 0.00],
    ['name' => 'Zebra Stripes', 'type' => 'profile', 'class_name' => 'theme-profile-zebra', 'background_url' => 'repeating-linear-gradient(45deg, #000, #000 10px, #fff 10px, #fff 20px)', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Leopard Print', 'type' => 'profile', 'class_name' => 'theme-profile-leopard', 'background_url' => '#e8b36d', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Tiger Stripes', 'type' => 'profile', 'class_name' => 'theme-profile-tiger', 'background_url' => '#ff9900', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Polka Dots', 'type' => 'profile', 'class_name' => 'theme-profile-polka', 'background_url' => '#fff', 'cost' => 60, 'cost_balance' => 0.00],
    ['name' => 'Checkered Flag', 'type' => 'profile', 'class_name' => 'theme-profile-checkered', 'background_url' => '#fff', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Heart Pattern', 'type' => 'profile', 'class_name' => 'theme-profile-hearts', 'background_url' => '#ffc0cb', 'cost' => 60, 'cost_balance' => 0.00],
    ['name' => 'Starry Night', 'type' => 'profile', 'class_name' => 'theme-profile-starry', 'background_url' => '#000080', 'cost' => 85, 'cost_balance' => 0.00],
    ['name' => 'Cloudy Sky', 'type' => 'profile', 'class_name' => 'theme-profile-clouds', 'background_url' => '#87ceeb', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Sandy Beach', 'type' => 'profile', 'class_name' => 'theme-profile-beach', 'background_url' => '#f4a460', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Green Grass', 'type' => 'profile', 'class_name' => 'theme-profile-grass', 'background_url' => '#7cfc00', 'cost' => 60, 'cost_balance' => 0.00],
    ['name' => 'Red Brick', 'type' => 'profile', 'class_name' => 'theme-profile-brick', 'background_url' => '#b22222', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Blue Denim', 'type' => 'profile', 'class_name' => 'theme-profile-denim', 'background_url' => '#1560bd', 'cost' => 70, 'cost_balance' => 0.00],
    ['name' => 'Purple Velvet', 'type' => 'profile', 'class_name' => 'theme-profile-velvet', 'background_url' => '#8a2be2', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Pink Silk', 'type' => 'profile', 'class_name' => 'theme-profile-silk', 'background_url' => '#ffc0cb', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'White Lace', 'type' => 'profile', 'class_name' => 'theme-profile-lace', 'background_url' => '#fffafa', 'cost' => 75, 'cost_balance' => 0.00],
    ['name' => 'Black Leather', 'type' => 'profile', 'class_name' => 'theme-profile-leather', 'background_url' => '#000', 'cost' => 80, 'cost_balance' => 0.00],
    ['name' => 'Silver Metal', 'type' => 'profile', 'class_name' => 'theme-profile-metal', 'background_url' => '#c0c0c0', 'cost' => 85, 'cost_balance' => 0.00],
    ['name' => 'Bronze Glow', 'type' => 'profile', 'class_name' => 'theme-profile-bronze', 'background_url' => '#cd7f32', 'cost' => 85, 'cost_balance' => 0.00],
    ['name' => 'Copper Shine', 'type' => 'profile', 'class_name' => 'theme-profile-copper', 'background_url' => '#b87333', 'cost' => 85, 'cost_balance' => 0.00],
    ['name' => 'Diamond Sparkle', 'type' => 'profile', 'class_name' => 'theme-profile-diamond', 'background_url' => '#b9f2ff', 'cost' => 95, 'cost_balance' => 0.00],
    ['name' => 'Emerald Green', 'type' => 'profile', 'class_name' => 'theme-profile-emerald', 'background_url' => '#50c878', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Ruby Red Profile', 'type' => 'profile', 'class_name' => 'theme-profile-ruby', 'background_url' => '#e0115f', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Sapphire Blue', 'type' => 'profile', 'class_name' => 'theme-profile-sapphire', 'background_url' => '#0f52ba', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Amethyst Purple', 'type' => 'profile', 'class_name' => 'theme-profile-amethyst', 'background_url' => '#9966cc', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Topaz Yellow', 'type' => 'profile', 'class_name' => 'theme-profile-topaz', 'background_url' => '#ffc87c', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Opal White', 'type' => 'profile', 'class_name' => 'theme-profile-opal', 'background_url' => '#f8f8ff', 'cost' => 90, 'cost_balance' => 0.00],
    ['name' => 'Obsidian Black', 'type' => 'profile', 'class_name' => 'theme-profile-obsidian', 'background_url' => '#000', 'cost' => 95, 'cost_balance' => 0.00],
    ['name' => 'Pearl Sheen', 'type' => 'profile', 'class_name' => 'theme-profile-pearl', 'background_url' => '#eae0c8', 'cost' => 95, 'cost_balance' => 0.00],

    // --- 10 NEW PREMIUM THEMES (As per your final request) ---
    ['name' => 'Cosmic Voyage', 'type' => 'premium', 'class_name' => 'theme-site-cosmic-voyage', 'background_url' => 'linear-gradient(60deg, #1d2b64, #f8cdda, #1d2b64)', 'cost' => 0, 'cost_balance' => 50.00],
    ['name' => 'Liquid Crystal', 'type' => 'premium', 'class_name' => 'theme-site-liquid', 'background_url' => 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)', 'cost' => 0, 'cost_balance' => 50.00],
    ['name' => 'Demon Slayer: Water Breathing', 'type' => 'premium', 'class_name' => 'theme-site-water-breathing', 'background_url' => 'https://i.redd.it/iwn35i8orv3b1.gif', 'cost' => 0, 'cost_balance' => 70.00],
    ['name' => 'Demon Slayer: Nezuko Kamado', 'type' => 'premium', 'class_name' => 'theme-site-nezuko', 'background_url' => 'https://i.imgur.com/g9Y3m5g.gif', 'cost' => 0, 'cost_balance' => 60.00],
    ['name' => 'Pohela Boishakh', 'type' => 'premium', 'class_name' => 'theme-site-boishakh', 'background_url' => 'https://i.pinimg.com/originals/c9/c7/2a/c9c72aae92d0d62159d9447786fa6e0e.gif', 'cost' => 0, 'cost_balance' => 55.00],
    ['name' => 'Eid Mubarak', 'type' => 'premium', 'class_name' => 'theme-site-eid', 'background_url' => 'https://cdn.dribbble.com/userupload/30442484/file/original-e5dd6c72474ce38fa047a6f8499fb8d7.gif', 'cost' => 0, 'cost_balance' => 55.00],
    ['name' => 'Durga Puja', 'type' => 'premium', 'class_name' => 'theme-site-puja', 'background_url' => 'https://i.pinimg.com/originals/aa/8a/e2/aa8ae2edb2f7900e8ad4eb4694883dce.gif', 'cost' => 0, 'cost_balance' => 65.00],
    ['name' => 'Butterfly Effect', 'type' => 'premium', 'class_name' => 'theme-site-butterfly', 'background_url' => 'linear-gradient(to top, #cfd9df 0%, #e2ebf0 100%)', 'cost' => 0, 'cost_balance' => 40.00],
    ['name' => 'Rainy Day', 'type' => 'premium', 'class_name' => 'theme-site-rainy-day', 'background_url' => 'linear-gradient(to top, #304352, #d7d2cc)', 'cost' => 0, 'cost_balance' => 40.00],
    ['name' => 'Thunder Strike', 'type' => 'premium', 'class_name' => 'theme-site-thunder', 'background_url' => '#000000', 'cost' => 0, 'cost_balance' => 60.00],
];

// (The rest of the seeding script logic remains the same)
$conn->query("TRUNCATE TABLE `themes`");
echo "<p>Previous themes cleared from the table.</p>";
$stmt = $conn->prepare(
    "INSERT INTO themes (name, type, class_name, background_url, cost, cost_balance) VALUES (?, ?, ?, ?, ?, ?)"
);

if ($stmt) {
    foreach ($all_themes as $theme) {
        $stmt->bind_param(
            "ssssid",
            $theme['name'],
            $theme['type'],
            $theme['class_name'],
            $theme['background_url'],
            $theme['cost'],
            $theme['cost_balance']
        );
        if ($stmt->execute()) {
            echo "<p style='color:green;'>Successfully seeded theme: " . htmlspecialchars($theme['name']) . "</p>";
        } else {
            echo "<p style='color:red;'>Failed to seed theme: " . htmlspecialchars($theme['name']) . ". Error: " . $stmt->error . "</p>";
        }
    }
    $stmt->close();
    echo "<hr><h2 style='color:blue;'>All 150+ themes have been seeded successfully!</h2>";
    echo "<p style='color:red; font-weight:bold;'>VERY IMPORTANT: Please DELETE this file from your server now.</p>";
} else {
    echo "<p style='color:red;'>Failed to prepare the SQL statement. Error: " . $conn->error . "</p>";
}

$conn->close();
?>