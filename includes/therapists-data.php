<?php

    function tb_get_therapists_data($service_id = 84) { 

        global $wpdb;

        $employees = $providers = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT u.id, u.firstName, u.lastName, u.note 
            FROM {$wpdb->prefix}amelia_users u
            INNER JOIN {$wpdb->prefix}amelia_providers_to_services ps ON u.id = ps.userId
            WHERE ps.serviceId = %d 
            AND u.type = 'provider'
            AND u.status = 'visible'",
                    $service_id
                ),
                ARRAY_A
            );

        foreach ($employees as $k => $emp) {

            // Profile image URL
            $employees[$k]['avatar'] = $emp['image'] ? wp_get_attachment_url($emp['image']) : '';

            // Services offered by employee
            $employees[$k]['services'] = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT s.id, s.name, ps.price
                    FROM {$wpdb->prefix}amelia_services s
                    INNER JOIN {$wpdb->prefix}amelia_providers_to_services ps 
                        ON ps.serviceId = s.id
                    WHERE ps.userId = %d",
                    $emp['id']
                ),
                ARRAY_A
            );

            // Experience / rating (if you store it)
            $employees[$k]['rating'] = $emp['rating'] ?? 0;
        }

        // Add avatar support
        foreach ($employees as $k => $emp) {
            $employees[$k]['avatar'] = ebc_get_employee_avatar($emp);
        }

        $output['service_id'] = $service_id;
        $output['employee_count'] = count($employees);
        $output['employees'] = $employees;

        return [
            'disabledDates' => tb_get_disabled_dates(),
            'bookedDates' => tb_get_booked_dates(),
            'timeSlots' => tb_get_time_slots()
        ]; 

    }
function ebc_get_employee_avatar($emp) {

    global $wpdb;
    $table = $wpdb->prefix . 'amelia_users';
    $employee_id = $emp['id'];

    // Get avatar id if exists


    if (!empty($emp['pictureThumbPath'])) {
        $avatar = $emp['pictureThumbPath'];
    } elseif (!empty($emp['pictureFullPath'])) {
        $avatar = $emp['pictureFullPath'];
    } else {
        // clean modern fallback
        $avatar = 'https://ui-avatars.com/api/?name=' .
                  urlencode($emp['firstName'].' '.$emp['lastName']) .
                  '&background=0D8ABC&color=fff&size=256';
    }

    return esc_url($avatar);

}