    <?php
        if (!defined('ABSPATH')) exit;
    ?>
    <h2 class="tb-step-title">Ihre Informationen</h2>
    <form class="tb-form" id="tb-booking-form">
        <div class="tb-form-group-parent">
            <div class="tb-form-group">
                <label>👤 Vorname</label>
                <input type="text" name="first_name" required>
            </div>
            <div class="tb-form-group">
                <label>👤 Nachname</label>
                <input type="text" name="last_name" required>
            </div>
        </div>
        <div class="tb-form-group-parent">
            <div class="tb-form-group">
                <label>📧 E-Mail</label>
                <input type="email" name="email" required>
            </div>
            <div class="tb-form-group">
                <label>📱 Telefon</label>
                <input type="tel" name="phone" required>
            </div>
        </div>
        <div class="tb-form-group">
            <label>🏠 Adresse</label>
            <textarea name="address" rows="3" required></textarea>
        </div>
        <div class="tb-form-group submit-container">
            <button type="submit" class="tb-submit-btn">📅 Termin buchen</button>
        </div>
    </form>
