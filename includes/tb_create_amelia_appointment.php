<?php

if (!defined('ABSPATH')) exit;



function tb_boot_amelia() {

    if (!class_exists('\AmeliaBooking\Infrastructure\Common\Container')) {

        if (defined('AMELIA_PATH')) {
            require_once AMELIA_PATH . 'vendor/autoload.php';
        }

    }

    if (class_exists('\AmeliaBooking\Infrastructure\Common\Container')) {
        return true;
    }

    tb_log('Amelia container not available', 'error');
    return false;
}


/// @package TherapistBooking

// This file contains the core function to create an appointment in Amelia based on the selected service, therapist, datetime, and user information from our booking flow.
function tb_create_amelia_appointment($service, $therapist, $datetime, $userinfo) {
    tb_log("=== Starting Amelia Appointment Creation ===", 'info');
    
    if (empty($datetime['selections'])) {
        tb_log("No datetime selections found", 'error');
        return [
            'status' => 'not-confirmed',
            'data' => [
                'error' => 'No datetime selections found',
                'datetime' => $datetime
            ]
        ];
    }
    
    $serviceId  = $service['id'] ?? null;
    $providerId = $therapist['id'] ?? null;
    $locationId = 1;
    
    if (!$serviceId || !$providerId) {
        tb_log("Missing service or provider ID", 'error');
        return [
            'status' => 'not-confirmed',
            'data' => [
                'error' => 'Missing service or provider ID',
                'serviceId' => $serviceId,
                'providerId' => $providerId
            ]
        ];
    }
    
    $customerId = tb_get_or_create_customer($userinfo);
    
    if (!$customerId) {
        tb_log("Customer not available", 'error');
        return [
            'status' => 'not-confirmed',
            'data' => [
                'error' => 'Failed to create or retrieve customer',
                'userinfo' => $userinfo
            ]
        ];
    }
    
    $createdBookings = [];
    $failedBookings = [];
    
    foreach ($datetime['selections'] as $index => $selection) {
        $duration = tb_get_duration_by_index($index);
        
        $times = tb_format_booking_times(
            $selection['fullDateTime'],
            $duration
        );
        
        $booking = tb_create_single_booking(
            $serviceId,
            $providerId,
            $locationId,
            $times['start'],
            $times['end'],
            $customerId
        );
        
        if ($booking && isset($booking['appointmentId'])) {
            $createdBookings[] = $booking;
        } else {
            $failedBookings[] = [
                'index' => $index,
                'selection' => $selection,
                'reason' => 'Booking creation failed'
            ];
        }
    }
    
    tb_log("=== Appointment Creation Completed ===", 'success');
    
    // Check if all bookings succeeded
    if (count($createdBookings) === count($datetime['selections'])) {
        return [
            'status' => 'confirmed',
            'data' => [
                'message' => 'All appointments created successfully',
                'bookings' => $createdBookings,
                'customerId' => $customerId,
                'totalBooked' => count($createdBookings)
            ]
        ];
    } elseif (count($createdBookings) > 0) {
        return [
            'status' => 'not-confirmed',
            'data' => [
                'message' => 'Partial booking success',
                'successfulBookings' => $createdBookings,
                'failedBookings' => $failedBookings,
                'totalSuccessful' => count($createdBookings),
                'totalFailed' => count($failedBookings)
            ]
        ];
    } else {
        return [
            'status' => 'not-confirmed',
            'data' => [
                'message' => 'All bookings failed',
                'failedBookings' => $failedBookings,
                'totalFailed' => count($failedBookings)
            ]
        ];
    }
}

// Helper functions for booking creation
 function tb_get_duration_by_index($index) {
    $durations = [
        0 => 120, // First day → 2 hours
        1 => 60,  // Second day → 1 hour
        2 => 30   // Third day → 30 minutes
    ];

    return isset($durations[$index]) ? $durations[$index] : 60;
}

// Format booking times for Amelia API
function tb_format_booking_times($fullDateTime, $durationMinutes) {

    $start = date('Y-m-d H:i:s', strtotime($fullDateTime));
    $end   = date('Y-m-d H:i:s', strtotime($start . " +{$durationMinutes} minutes"));

    return [
        'start' => $start,
        'end'   => $end
    ];
}

// Get or create customer in Amelia based on user info
function tb_get_or_create_customer($userinfo) {
    global $wpdb;

    $email = sanitize_email($userinfo['email']);

    $customerId = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}amelia_users WHERE email = %s LIMIT 1",
            $email
        )
    );

    if ($customerId) {
        tb_log("Customer exists: {$customerId}", 'success');
        return (int)$customerId;
    }

    // CREATE CUSTOMER DIRECTLY IN DATABASE (skip Amelia class)
    $inserted = $wpdb->insert(
        $wpdb->prefix . 'amelia_users',
        [
            'type'      => 'customer',
            'status'    => 'visible',
            'firstName' => sanitize_text_field($userinfo['first_name']),
            'lastName'  => sanitize_text_field($userinfo['last_name']),
            'email'     => $email,
            'phone'     => sanitize_text_field($userinfo['phone']),
        ],
        ['%s', '%s', '%s', '%s', '%s', '%s']
    );

    if ($inserted) {
        $customerId = $wpdb->insert_id;
        tb_log("Customer created: {$customerId}", 'success');
        return (int)$customerId;
    }

    tb_log("Customer creation failed: " . $wpdb->last_error, 'error');
    return null;
}
// Create a single booking in Amelia (Amelia 9.x compatible)
// Create a single booking in Amelia via REST API (Amelia v9 compatible)
function tb_create_single_booking($serviceId, $providerId, $locationId, $start, $end, $customerId) {
    global $wpdb;
    
    tb_log("Creating booking directly in database", 'info');
    
    // 1. Insert into amelia_appointments table
    $appointmentInserted = $wpdb->insert(
        $wpdb->prefix . 'amelia_appointments',
        [
            'bookingStart'       => $start,
            'bookingEnd'         => $end,
            'notifyParticipants' => 1,
            'serviceId'          => $serviceId,
            'providerId'         => $providerId,
            'locationId'         => $locationId,
            'internalNotes'      => 'Created via Therapist Booking',
            'status'             => 'approved',
        ],
        ['%s', '%s', '%d', '%d', '%d', '%d', '%s', '%s']
    );
    
    if (!$appointmentInserted) {
        tb_log("Failed to insert appointment: " . $wpdb->last_error, 'error');
        return false;
    }
    
    $appointmentId = $wpdb->insert_id;
    tb_log("Appointment created with ID: {$appointmentId}", 'success');
    
    // 2. Insert into amelia_customer_bookings table
    $bookingInserted = $wpdb->insert(
        $wpdb->prefix . 'amelia_customer_bookings',
        [
            'appointmentId' => $appointmentId,
            'customerId'    => $customerId,
            'status'        => 'approved',
            'persons'       => 1,
            'price'         => 0,
            'info'          => json_encode(['locale' => 'en_US']),
        ],
        ['%d', '%d', '%s', '%d', '%f', '%s']
    );
    
    if (!$bookingInserted) {
        tb_log("Failed to insert customer booking: " . $wpdb->last_error, 'error');
        return false;
    }
    
    $bookingId = $wpdb->insert_id;
    tb_log("Customer booking created with ID: {$bookingId}", 'success');
    
    return [
        'appointmentId' => $appointmentId,
        'bookingId'     => $bookingId,
        'status'        => 'approved'
    ];
}

    add_action('template_redirect', function() {

        if (!isset($_GET['tb_test_amelia']) || $_GET['tb_test_amelia'] !== '1') {
            return;
        }

        @ini_set('display_errors', 'On');
        error_reporting(E_ALL);


        if (!class_exists('\AmeliaBooking\Infrastructure\Common\Container')) {
            tb_log('Amelia not loaded yet', 'error');
            return;
        }
        $service = tb_get_session_selection('service');
        $therapist = tb_get_session_selection('therapist');
        $datetime = tb_get_session_selection('datetime');
        $userinfo['notes'] = 'Custom Appointment'; // Add custom note to user info
        $userinfo['first_name'] = 'Rao'; // Combine first and last name for easier use
        $userinfo['last_name'] = 'Sajid'; // Combine first and last name for easier use
        $userinfo['name'] = $userinfo['first_name'] . ' ' . $userinfo['last_name']; // Combine first and last name for easier use
        $userinfo['email'] = 'raosajid198@gmail.com'; // Set email for user info
        $userinfo['phone'] = '1234567890'; // Set phone for user info
        $userinfo['address'] = '123 Main St, Anytown'; // Set address for user info

        echo '<h2>Creating Amelia Appointment with the following data:</h2>';
        echo '<pre>';
        echo json_encode([
            'service' => $service,
            'therapist' => $therapist,
            'datetime' => $datetime,
            'userinfo' => $userinfo
        ]);
        echo '</pre>';

        $appointment_result = tb_create_amelia_appointment($service, $therapist, $datetime, $userinfo);

        echo '<pre>';
        print_r($appointment_result);
        echo '</pre>';

    });
