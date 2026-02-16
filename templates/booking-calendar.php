<?php
if (!defined('ABSPATH')) exit;

// Get calendar data
// require_once TB_DIR . 'includes/calendar-data.php';
// $calendar_data = tb_get_calendar_data();
?>

<h2 class="tb-step-title">Datum & Uhrzeit wählen</h2>

<div class="tb-calendar-wrapper">
    
    <!-- Calendar Section -->
    <div class="tb-calendar-section">
        <div id="tb-flatpickr"></div>
    </div>
    
    <!-- Time Slots Section -->
    <div class="tb-timeslots-section">
        <div class="tb-timeslot-progress"></div>
        <h3 class="tb-timeslots-title">Zeitfenster wählen</h3>
        <p class="tb-timeslots-prompt">Bitte wählen Sie zuerst ein Datum</p>
        <div class="tb-timeslots-grid" id="tb-timeslots"></div>
    </div>

</div>

<script>
    // Pass PHP data to JavaScript
    // window.tbCalendarData = <?php echo json_encode($calendar_data); ?>;
</script>
