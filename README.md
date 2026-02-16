# Therapist Booking System - WordPress Plugin

Modern, iOS-style 3-step booking form for therapist services.

## 📦 Installation

1. Upload the `therapist-booking` folder to `/wp-content/plugins/`
2. Activate the plugin in WordPress admin
3. Use shortcode `[therapist_booking]` on any page/post

## 🎨 Theme Options

Use the `theme` attribute to change colors:

```
[therapist_booking theme="blue"]   (default)
[therapist_booking theme="green"]
[therapist_booking theme="purple"]
```

## 🔧 File Structure

```
therapist-booking/
├── therapist-booking.php       (Main plugin file)
├── includes/
│   ├── logger.php             (Debug logging)
│   ├── enqueue.php            (Asset loading)
│   └── shortcode.php          (Shortcode handler)
├── assets/
│   ├── css/
│   │   ├── main.css           (Main styles)
│   │   └── themes.css         (Color themes)
│   └── js/
│       ├── common.js          (Utilities & state)
│       ├── step1.js           (Therapist selection)
│       ├── step2.js           (Date/time selection)
│       └── step3.js           (User form)
├── templates/
│   └── booking-form.php       (HTML template)
└── logs/
    └── debug.log              (Auto-generated)
```

## 🐛 Debug Mode

Add `?testing123` to any URL to see debug logs at the bottom of the page.

Example: `https://yoursite.com/booking/?testing123`

## 🚀 Features

- ✅ 3-step booking flow
- ✅ iOS-style modern UI
- ✅ Smooth animations & transitions
- ✅ Click sounds
- ✅ Responsive design
- ✅ Live selection summary
- ✅ 3 color themes
- ✅ Modular code structure
- ✅ Debug logging system
- ✅ Ready for PHP backend integration

## 📝 Adding PHP Functionality Later

The plugin is structured to easily add:

1. **Database storage** - Add in `includes/database.php`
2. **AJAX handlers** - Add in `includes/ajax.php`
3. **Admin panel** - Add in `includes/admin.php`
4. **Email notifications** - Add in `includes/email.php`

All JavaScript files use `tbData.ajaxUrl` and `tbData.nonce` for secure AJAX calls.

## 🎯 Usage Example

```php
// In your WordPress page/post editor:
[therapist_booking theme="green"]
```

## 📊 State Management

The booking data is stored in `tbState` JavaScript object:

```javascript
{
    currentStep: 1,
    selectedTherapist: { id, name },
    selectedDateTime: "10:00 AM - 11:00 AM",
    userInfo: { first_name, last_name, email, phone, address }
}
```

## 🔐 Security

- Nonce verification ready for AJAX
- Input sanitization in place
- Escaping output in templates
- Log directory protected with .htaccess

---

**Version:** 1.0.0  
**Author:** Web Zone Tech 
**License:** GPL v2 or later
