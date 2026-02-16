# Therapist Booking System - WordPress Plugin

A modern, iOS-style 3-step booking form designed to integrate seamlessly with the Amelia Pro booking plugin. It pulls therapist, service, and availability data directly from Amelia to provide a smooth booking experience for your users.

**Version:** 2.0.1
**Author:** Sajid Sattar
**License:** GPL v2 or later

## 🚀 Features

- ✅ **3-Step Booking Flow:** A user-friendly, step-by-step process for booking appointments.
- ✅ **Deep Amelia Pro Integration:** Fetches therapists, services, and real-time availability via the Amelia API.
- ✅ **Live Availability Calendar:** Displays up-to-date, color-coded availability for each therapist.
- ✅ **Dynamic Therapist & Service Loading:** Automatically populates based on the Amelia backend.
- ✅ **AJAX Powered:** Smooth, fast booking process without page reloads.
- ✅ **Customizable Themes:** Easily change the look and feel with a shortcode attribute.
- ✅ **Live Selection Summary:** A persistent sidebar shows user selections in real-time.
- ✅ **Responsive Design:** Looks great on all devices, from desktops to mobile phones.
- ✅ **Developer Friendly:** Includes a debug logging system and a modular file structure.

## 📦 Installation

1.  **Requires Amelia Pro:** This plugin is an add-on for Amelia and will not work without it.
2.  Upload the `therapist-booking` folder to your `/wp-content/plugins/` directory.
3.  Activate the plugin through the 'Plugins' menu in your WordPress admin area.

## 🎯 Usage

Use the `[therapist_booking]` shortcode on any page or post to render the booking form.

### Shortcode Attributes

-   `theme`: (Optional) Changes the color scheme. Defaults to `blue`.
    -   `[therapist_booking theme="blue"]`
    -   `[therapist_booking theme="green"]`
    -   `[therapist_booking theme="purple"]`
-   `service_id`: (Required) The ID of the Amelia service to be booked.
    -   `[therapist_booking service_id="84"]`
-   `location_id`: (Optional) The ID of the Amelia location. Defaults to `1`.
    -   `[therapist_booking service_id="84" location_id="1"]`

## 🔧 File Structure

```
therapist-booking/
├── therapist-booking.php           (Main plugin file)
├── includes/
│   ├── amelia-integration.php     (Handles Amelia API calls for availability)
│   ├── ajax.php                   (AJAX handlers for booking steps)
│   ├── shortcode.php              (Defines the [therapist_booking] shortcode)
│   ├── enqueue.php                (Loads CSS and JavaScript assets)
│   ├── logger.php                 (Server-side logging)
│   └── tb_create_amelia_appointment.php (Creates the final appointment in Amelia)
├── assets/
│   ├── css/
│   │   ├── main.css               (Main plugin styles)
│   │   ├── calendar.css           (Calendar-specific styles)
│   │   └── themes.css             (Color theme definitions)
│   └── js/
│       ├── common.js              (Shared utilities, state management)
│       ├── step1.js               (Handles therapist selection)
│       ├── step2.js               (Handles date/time and calendar logic)
│       └── step3.js               (Handles user information form)
├── templates/
│   ├── booking-form.php           (Main HTML structure for the form)
│   ├── available-therapists.php   (Template for listing therapists)
│   ├── booking-calendar.php       (Template for the calendar view)
│   └── user-form.php              (Template for the final user details form)
└── logs/
    └── debug.log                  (Debug log file, protected by .htaccess)
```

## 🐛 Debug Mode

To aid in development and troubleshooting, you can activate debug mode in two ways:

1.  **Frontend Logging:** Add `?testing123` to any URL where the booking form is present. This will output verbose logs to the browser console.
2.  **Backend Availability Check:** Add `?tb_debug` to any URL to test the availability fetch for a default therapist and service. This will print the raw availability data from the Amelia API.

## 📊 State Management

The booking data is managed in the `tbState` JavaScript object, which is defined in `assets/js/common.js`. It tracks the user's progress through the booking flow.

```javascript
const tbState = {
    currentStep: 1,
    selectedService: null,
    selectedTherapist: null,
    selectedDateTime: null,
    userInfo: {}
};
```

Selections are persisted using a hybrid approach of `localStorage` for the client-side and a PHP session (via AJAX) for the server-side to ensure data is not lost between steps.

## 🔐 Security

-   **Nonce Verification:** All AJAX requests are protected with WordPress nonces to prevent CSRF attacks.
-   **Output Escaping:** Data is escaped before being rendered in templates.
-   **Log Protection:** The `logs` directory is secured with an `.htaccess` file to prevent direct access.