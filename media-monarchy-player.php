<?php
/*
Plugin Name: Media Monarchy 24/7 Radio Stream
Description: A streaming media player that supports 8 distinct streams: use 'onair' for live broadcasts, 'news' for all news content, 'stream' for all music content, and genre-specific streams including 'rock', 'techno', 'country', 'ecclectic', and 'pop'. Example shortcode: [media_monarchy stream="country"]
Version: 1.2.8
Author: Better Call Jason
*/

// Enqueue the player script
function media_monarchy_enqueue_scripts() {
    wp_enqueue_script(
        'media-monarchy-player', 
        plugins_url('js/media-monarchy-player.js', __FILE__),
        array(),
        '1.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'media_monarchy_enqueue_scripts');

// Register shortcode
function media_monarchy_player_shortcode($atts) {
    $atts = shortcode_atts(array(
        'stream' => 'music',
        'theme' => 'dark',
        'width' => '300px',
        'height' => '300px'
    ), $atts);
    
    $id = 'mm-player-' . uniqid();
    
    return sprintf(
        '<div id="%s"></div>
        <script>
        document.addEventListener("DOMContentLoaded", function() {
            MediaMonarchy.createPlayer("%s", {
                stream: "%s",
                theme: "%s",
                width: "%s",
                height: "%s"
            });
        });
        </script>',
        $id, $id, $atts['stream'], $atts['theme'], $atts['width'], $atts['height']
    );
}
add_shortcode('media_monarchy', 'media_monarchy_player_shortcode');
