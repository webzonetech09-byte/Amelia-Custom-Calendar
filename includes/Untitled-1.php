<?php
/**
 * Plugin Name: Export WP Users to CSV
 * Description: A simple plugin to export WordPress users to a CSV file.
 * Version: 1.0.0
 * Author: Sajid Sattar
 * Author URI: https://fiverr.com/ranasattar
 */

if (!defined('ABSPATH')) exit;

//== EXPORTING WP USERS IN FILE
add_action('admin_init', 'export_users_csv');

function export_users_csv() {
    if (isset($_GET['export_users'])) {

        $filename = 'users-export.csv';

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $output = fopen('php://output', 'w');

        // Column headers
        fputcsv($output, array('ID', 'Name', 'Email'));

        $users = get_users();

        foreach ($users as $user) {
            fputcsv($output, array(
                $user->ID,
                $user->display_name,
                $user->user_email
            ));
        }

        fclose($output);
        exit;
    }
}
//== END OF WP USERS EXPORT CODE ==//