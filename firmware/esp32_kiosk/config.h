#ifndef CONFIG_H
#define CONFIG_H

// ==============================================================================
// NCCT ESP32-S3 Smart Attendance Kiosk Gateway - Configuration
// ==============================================================================

// 1. Backend Server Endpoint Configuration
// Pointed directly to active backend on local network:
#define BACKEND_BASE_URL "http://10.73.49.221:8000"
#define ATTENDANCE_MARK_PATH "/api/attendance/mark"
#define ATTENDANCE_SYNC_PATH "/api/attendance/sync-batch"

// Full POST Endpoint URL
#define BACKEND_MARK_URL BACKEND_BASE_URL ATTENDANCE_MARK_PATH
#define BACKEND_SYNC_URL BACKEND_BASE_URL ATTENDANCE_SYNC_PATH

// 2. Hardware Device & Session Settings
#define DEVICE_ID "ESP32-S3-GATE-01"       // Identified as 'hardware' in backend
#define DEFAULT_SESSION_ID "SESSION-MAIN"   // Active Training Session ID

// 3. Wi-Fi Credentials (Update with your local 2.4GHz network)
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define WIFI_CONNECT_TIMEOUT_MS 15000       // Max ms to wait for Wi-Fi connection

// 4. Hardware Pin Mapping (ESP32-S3 DevKit)
#define BUZZER_PIN 4                        // Active buzzer / PWM tone pin
#define LED_GREEN_PIN 5                     // Success LED indicator (OK)
#define LED_AMBER_PIN 6                     // Warning/Duplicate LED indicator
#define LED_RED_PIN 7                       // Error/Invalid LED indicator

// Hardware UART Scanner Pins (GM65 / 2D Barcode Reader Module)
#define SCANNER_RX_PIN 18                   // ESP32 RX <- Scanner TX
#define SCANNER_TX_PIN 17                   // ESP32 TX -> Scanner RX (optional trigger)
#define SCANNER_BAUD 9600                   // GM65 default baud rate

// 5. Serial Debug & Simulation Mode
#define SERIAL_BAUD_RATE 115200             // Main USB Serial Monitor baud
#define ENABLE_VERBOSE_LOGGING true         // Enable deep tracing of every HTTP step
#define ENABLE_SERIAL_TEST_MODE true        // Allow typing Trainee ID in Serial Monitor

#endif // CONFIG_H
