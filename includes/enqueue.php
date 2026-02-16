<?php
if (!defined('ABSPATH')) exit;

function tb_enqueue_assets() {
    if (!is_singular()) return;
    
    global $post;
    if (!has_shortcode($post->post_content, 'therapist_booking')) return;
    
    tb_enqueue_styles();
    tb_enqueue_scripts();
    tb_log('Assets enqueued for booking form');
}
add_action('wp_enqueue_scripts', 'tb_enqueue_assets');

function tb_enqueue_styles() {
    $version = date('YmdHis');
    
    // Flatpickr CSS
    wp_enqueue_style('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css', [], '4.6.13');
    
    // Plugin styles
    wp_enqueue_style('tb-main', TB_URL . 'assets/css/main.css', [], $version);
    wp_enqueue_style('tb-themes', TB_URL . 'assets/css/themes.css', [], $version);
    wp_enqueue_style('tb-calendar', TB_URL . 'assets/css/calendar.css', ['flatpickr'], $version);
}

function tb_enqueue_scripts() {
    $version = date('YmdHis');
    
    // Flatpickr JS
    wp_enqueue_script('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr', [], '4.6.13', true);
    
    // Plugin scripts
    wp_enqueue_script('tb-common', TB_URL . 'assets/js/common.js', [], $version, true);
    wp_enqueue_script('tb-calendar', TB_URL . 'assets/js/calendar.js', ['flatpickr', 'tb-common'], $version, true);
    wp_enqueue_script('tb-step1', TB_URL . 'assets/js/step1.js', ['tb-common'], $version, true);
    wp_enqueue_script('tb-step2', TB_URL . 'assets/js/step2.js', ['tb-common', 'tb-calendar'], $version, true);
    wp_enqueue_script('tb-step3', TB_URL . 'assets/js/step3.js', ['tb-common'], $version, true);
    wp_enqueue_script('tb-step-watcher', TB_URL . 'assets/js/step-watcher.js', ['tb-common'], $version, true);
    
    wp_enqueue_script('tb-live-dom',  TB_URL . 'assets/js/live-dom.js',  [],  $version, true );

    wp_localize_script('tb-common', 'tbData', ['ajaxUrl' => admin_url('admin-ajax.php'),'nonce' => wp_create_nonce('tb_booking')]);

}