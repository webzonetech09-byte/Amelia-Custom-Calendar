<?php
if (!defined('ABSPATH')) exit;

function tb_register_shortcode() {
    add_shortcode('therapist_booking', 'tb_render_booking_form');
}

function tb_render_booking_form($atts) {
    $atts = shortcode_atts([
        'theme' => 'blue',
        'service_id' => 84,      // Default service ID
        'location_id' => 1       // Default location ID
    ], $atts);
    
    // Convert to integers for safety
    $service_id = intval($atts['service_id']);
    $location_id = intval($atts['location_id']);
    
    // Store in global JS variable
    $js_vars = "
    <script>
        window.tbBookingConfig = window.tbBookingConfig || {};
        window.tbBookingConfig.serviceId = {$service_id};
        window.tbBookingConfig.locationId = {$location_id};
        window.tbBookingConfig.theme = '" . esc_attr($atts['theme']) . "';
        console.log('[TB Shortcode] Config loaded:', window.tbBookingConfig);
    </script>
    ";
    
    ob_start();
    include TB_DIR . 'templates/booking-form.php';
    $output = ob_get_clean();
    
    tb_log('Booking form rendered with config: ' . json_encode([
        'theme' => $atts['theme'],
        'service_id' => $service_id,
        'location_id' => $location_id
    ]));
    
    return $js_vars . $output;
}

function tb_get_demo_therapists($service_id = null) {
    global $wpdb;
    
    // If no service_id provided, return empty or default
    if (!$service_id) {
        return [];
    }
    
    // Get therapists for specific service from Amelia
    $therapists = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT u.id, u.firstName, u.lastName, u.pictureFullPath, u.note 
             FROM {$wpdb->prefix}amelia_users u
             INNER JOIN {$wpdb->prefix}amelia_providers_to_services ps ON u.id = ps.userId
             WHERE ps.serviceId = %d 
             AND u.type = 'provider'
             AND u.status = 'visible'",
            $service_id
        ),
        ARRAY_A
    );
    
    // Process therapists
    foreach ($therapists as $k => $therapist) {
        // Full name
        $therapists[$k]['name'] = trim($therapist['firstName'] . ' ' . $therapist['lastName']);
        
        // Avatar/Image
        if (!empty($therapist['pictureFullPath'])) {
            $therapists[$k]['image'] = $therapist['pictureFullPath'];
        } else {
            $therapists[$k]['image'] = 'https://i.pravatar.cc/150?img=' . ($therapist['id'] % 70);
        }
        
        // Get all services this therapist offers
        $provider_services = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT s.name
                 FROM {$wpdb->prefix}amelia_services s
                 INNER JOIN {$wpdb->prefix}amelia_providers_to_services ps 
                    ON ps.serviceId = s.id
                 WHERE ps.userId = %d",
                $therapist['id']
            ),
            ARRAY_A
        );
        
        if (!empty($provider_services)) {
            $service_names = array_column($provider_services, 'name');
            $therapists[$k]['services'] = implode(', ', $service_names);
        } else {
            $therapists[$k]['services'] = 'General Therapy';
        }
        
        // Rating (demo - you can add custom meta later)
        $therapists[$k]['rating'] = number_format(4.5 + (($therapist['id'] % 6) / 10), 1);
        
        // Clean up
        unset($therapists[$k]['firstName']);
        unset($therapists[$k]['lastName']);
        unset($therapists[$k]['pictureFullPath']);
        unset($therapists[$k]['note']);
    }
    
    return $therapists;
}

// function tb_get_demo_therapists($services) {
//     return [
//         [
//             'id' => 1,
//             'name' => 'Dr. Sarah Johnson',
//             'rating' => 4.9,
//             'services' => 'Anxiety, Depression, Stress',
//             'image' => 'https://i.pravatar.cc/150?img=1'
//         ],
//         [
//             'id' => 2,
//             'name' => 'Dr. Michael Chen',
//             'rating' => 4.8,
//             'services' => 'Relationships, Career, Family',
//             'image' => 'https://i.pravatar.cc/150?img=2'
//         ],
//         [
//             'id' => 3,
//             'name' => 'Dr. Emily Rodriguez',
//             'rating' => 5.0,
//             'services' => 'Trauma, PTSD, Grief',
//             'image' => 'https://i.pravatar.cc/150?img=3'
//         ]
//     ];
// }

function tb_get_demo_services() {
    return [
        [
            'id' => 84,
            'name' => 'Raucherentwöhnung',
            'description' => 'Einzelsitzungen für persönliches Wachstum',
            'icon' => '🚭',
            'price' => 120
        ],
        // [
        //     'id' => 85      ,
        //     'name' => 'Folgesitzung',
        //     'description' => 'Follow-up session to track your progress and adjust your quit plan as needed',
        //     'icon' => '🔁',
        //     'price' => 150
        // ],
        // [
        //     'id' => 86,
        //     'name' => 'Couples Therapy',
        //     'description' => 'Strengthen your relationship and improve communication with your partner',            'icon' => '💑',
        //     'price' => 180
        // ]
    ];
}

add_action('init', 'tb_register_shortcode');

function render_booking_calendar() {
    ob_start();
    include TB_DIR . 'templates/booking-calendar.php';
    $output = ob_get_clean();
    
    tb_log('Booking calendar rendered');
    return $output;

}
