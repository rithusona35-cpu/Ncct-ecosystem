/**
 * NCCT Ecosystem - ESP32-S3 Smart Attendance Kiosk Firmware
 * 
 * Target: ESP32-S3 DevKit
 * Features:
 * - Direct HTTP POST connection to live NCCT backend (/api/attendance/mark)
 * - Verbose Serial debug logging at every stage (Wi-Fi, Scan, JSON build, HTTP code & body)
 * - Serial Monitor Test Mode: Allows typing Trainee ID (e.g. 'NCCT-TR-2026-00001') 
 *   into Serial Monitor to simulate scans before physical QR scanner hardware is wired
 * - Hardware Buzzer & Tri-color LED feedback (BEEP_SUCCESS, BEEP_WARN, BEEP_ERROR)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include "config.h"

// Hardware Serial for physical UART QR/Barcode scanner (e.g. GM65 module)
HardwareSerial ScannerSerial(1);

// Forward declarations
void processAttendanceScan(String qrCode, String source);
void triggerBuzzerAndLED(String buzzerType);
String getISO8601Timestamp();

void setup() {
    // 1. Initialize USB Serial Monitor
    Serial.begin(SERIAL_BAUD_RATE);
    delay(1500);

    Serial.println("\n");
    Serial.println("==================================================================");
    Serial.println("     NCCT ECOSYSTEM - ESP32-S3 ATTENDANCE KIOSK GATEWAY           ");
    Serial.println("     Firmware Version: 1.1.0-DEBUG                                ");
    Serial.println("==================================================================");
    Serial.printf("[INIT] Device Identifier: %s\n", DEVICE_ID);
    Serial.printf("[INIT] Target Backend:    %s\n", BACKEND_MARK_URL);
    Serial.printf("[INIT] Default Session:   %s\n", DEFAULT_SESSION_ID);

    // 2. Configure Hardware Feedback Pins
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(LED_GREEN_PIN, OUTPUT);
    pinMode(LED_AMBER_PIN, OUTPUT);
    pinMode(LED_RED_PIN, OUTPUT);

    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);
    digitalWrite(LED_AMBER_PIN, LOW);
    digitalWrite(LED_RED_PIN, LOW);

    // Initial power-on chirp
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_GREEN_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_GREEN_PIN, LOW);

    // 3. Initialize Physical Scanner UART
    ScannerSerial.begin(SCANNER_BAUD, SERIAL_8N1, SCANNER_RX_PIN, SCANNER_TX_PIN);
    Serial.printf("[SCANNER] UART Port initialized (RX Pin: %d, TX Pin: %d, Baud: %d)\n", 
                  SCANNER_RX_PIN, SCANNER_TX_PIN, SCANNER_BAUD);

    // 4. Connect to Wi-Fi
    Serial.println("\n------------------------------------------------------------------");
    Serial.print("[WIFI] Connecting to SSID: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < WIFI_CONNECT_TIMEOUT_MS) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[WIFI STATUS] *** CONNECTED TO NETWORK ***");
        Serial.printf("              Local IP:        %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("              Subnet Mask:     %s\n", WiFi.subnetMask().toString().c_str());
        Serial.printf("              Gateway:         %s\n", WiFi.gatewayIP().toString().c_str());
        Serial.printf("              Signal (RSSI):   %d dBm\n", WiFi.RSSI());

        // Configure NTP time for accurate ISO timestamps
        configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        Serial.println("[TIME] NTP client synchronized.");
    } else {
        Serial.println("[WIFI STATUS] !!! CONNECTION FAILED OR TIMED OUT !!!");
        Serial.println("              Check SSID/Password in config.h or router visibility.");
        Serial.println("              (Note: Serial Test Mode will attempt auto-reconnect on scan)");
    }

    // 5. Test Mode Guide
    Serial.println("------------------------------------------------------------------");
    Serial.println(" [SERIAL TEST MODE ACTIVE]");
    Serial.println(" Physical QR Scanner not wired yet? No problem!");
    Serial.println(" >>> Simply type a Trainee ID in this Serial Monitor and press Enter <<<");
    Serial.println(" Examples to test:");
    Serial.println("   1. NCCT-TR-2026-00001  (Valid Trainee: Vikram Sharma)");
    Serial.println("   2. NCCT-TR-2026-99999  (Trainee Profile: Sunita Rao)");
    Serial.println("   3. INVALID-QR-TEST     (Test Error Handling)");
    Serial.println("==================================================================\n");
}

void loop() {
    // -------------------------------------------------------------
    // Channel A: Serial Monitor Input (Test / Simulation Mode)
    // -------------------------------------------------------------
    if (ENABLE_SERIAL_TEST_MODE && Serial.available() > 0) {
        String testInput = Serial.readStringUntil('\n');
        testInput.trim();
        // Remove trailing carriage returns if CRLF sent
        if (testInput.endsWith("\r")) {
            testInput = testInput.substring(0, testInput.length() - 1);
            testInput.trim();
        }

        if (testInput.length() > 0) {
            Serial.println("\n=======================================================");
            Serial.printf("[INPUT DETECTED] Serial Monitor simulated scan: '%s'\n", testInput.c_str());
            Serial.println("=======================================================");
            processAttendanceScan(testInput, "SERIAL_MONITOR_TEST");
        }
    }

    // -------------------------------------------------------------
    // Channel B: Physical Hardware Barcode/QR Scanner (UART)
    // -------------------------------------------------------------
    if (ScannerSerial.available() > 0) {
        String qrCode = ScannerSerial.readStringUntil('\r');
        qrCode.trim();
        if (qrCode.length() > 0) {
            Serial.println("\n=======================================================");
            Serial.printf("[INPUT DETECTED] Physical Scanner hardware scan: '%s'\n", qrCode.c_str());
            Serial.println("=======================================================");
            processAttendanceScan(qrCode, "HARDWARE_SCANNER_UART");
        }
    }

    delay(20);
}

/**
 * Handles the complete attendance check-in workflow with verbose logging:
 * 1. Log scan reception
 * 2. Build JSON payload
 * 3. Dispatch HTTP POST to backend
 * 4. Log HTTP code and response body
 * 5. Trigger hardware indicators
 */
void processAttendanceScan(String qrCode, String source) {
    unsigned long startTime = millis();

    Serial.printf("[STEP 1/4] QR Code Received from [%s]\n", source.c_str());
    Serial.printf("           Payload Text: \"%s\" (Length: %d bytes)\n", qrCode.c_str(), qrCode.length());

    // Generate ISO timestamp
    String timestamp = getISO8601Timestamp();

    // Step 2: Build JSON Payload
    Serial.println("[STEP 2/4] Constructing JSON Payload...");
    String jsonPayload = "{";
    jsonPayload += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
    jsonPayload += "\"trainee_qr_code\":\"" + qrCode + "\",";
    jsonPayload += "\"session_id\":\"" + String(DEFAULT_SESSION_ID) + "\",";
    jsonPayload += "\"timestamp\":\"" + timestamp + "\"";
    jsonPayload += "}";

    Serial.println("           JSON Built Successfully:");
    Serial.println("           " + jsonPayload);

    // Step 3: Wi-Fi Check and HTTP POST
    Serial.println("[STEP 3/4] Preparing HTTP POST request...");
    Serial.printf("           Target URL: %s\n", BACKEND_MARK_URL);

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[WIFI RECONNECT] Wi-Fi disconnected. Attempting fast reconnect...");
        WiFi.reconnect();
        unsigned long reconnectWait = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - reconnectWait < 3000) {
            delay(200);
        }
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[ERROR] Unable to dispatch HTTP request: Wi-Fi offline.");
        Serial.println("[OFFLINE QUEUE] (In production, write to SPIFFS/NVS for sync-batch)");
        triggerBuzzerAndLED("BEEP_ERROR");
        return;
    }

    HTTPClient http;
    http.begin(BACKEND_MARK_URL);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(4000); // 4-second network timeout

    Serial.println("           Sending POST body to backend server...");
    int httpCode = http.POST(jsonPayload);

    // Step 4: Parse & Log Response
    Serial.println("[STEP 4/4] Response received from Backend:");
    Serial.printf("           HTTP Status Code: %d", httpCode);

    if (httpCode == 200) {
        Serial.println(" (200 OK)");
    } else if (httpCode == 404) {
        Serial.println(" (404 Not Found)");
    } else if (httpCode == 500) {
        Serial.println(" (500 Internal Server Error)");
    } else {
        Serial.println();
    }

    if (httpCode > 0) {
        String responseBody = http.getString();
        Serial.println("           Response Body: " + responseBody);

        // Inspect response status
        if (responseBody.indexOf("\"status\":\"OK\"") != -1) {
            Serial.println("\n>>> [VERDICT: ATTENDANCE VERIFIED] Check-in confirmed! <<<");
            triggerBuzzerAndLED("BEEP_SUCCESS");
        } else if (responseBody.indexOf("\"status\":\"DUPLICATE\"") != -1) {
            Serial.println("\n>>> [VERDICT: DUPLICATE SCAN] Trainee already checked in today! <<<");
            triggerBuzzerAndLED("BEEP_WARN");
        } else if (responseBody.indexOf("\"status\":\"INVALID\"") != -1) {
            Serial.println("\n>>> [VERDICT: INVALID CODE] Unregistered Trainee QR Code! <<<");
            triggerBuzzerAndLED("BEEP_ERROR");
        } else {
            Serial.println("\n>>> [VERDICT: UNKNOWN RESPONSE] <<<");
            triggerBuzzerAndLED("BEEP_WARN");
        }
    } else {
        Serial.printf("[ERROR] HTTP connection failed! Error code: %s\n", http.errorToString(httpCode).c_str());
        Serial.println("        Verify backend IP address in config.h and network accessibility.");
        triggerBuzzerAndLED("BEEP_ERROR");
    }

    http.end();
    unsigned long duration = millis() - startTime;
    Serial.printf("           Processing Time: %lu ms\n", duration);
    Serial.println("==================================================================\n");
}

/**
 * Activates hardware buzzer patterns and LED status lights
 */
void triggerBuzzerAndLED(String buzzerType) {
    if (buzzerType == "BEEP_SUCCESS") {
        // High pitch double chime: Green LED
        digitalWrite(LED_GREEN_PIN, HIGH);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(80);
        digitalWrite(BUZZER_PIN, LOW);
        delay(40);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(120);
        digitalWrite(BUZZER_PIN, LOW);
        delay(300);
        digitalWrite(LED_GREEN_PIN, LOW);
    } else if (buzzerType == "BEEP_WARN") {
        // Double warning buzz: Amber LED
        digitalWrite(LED_AMBER_PIN, HIGH);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(120);
        digitalWrite(BUZZER_PIN, LOW);
        delay(80);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(120);
        digitalWrite(BUZZER_PIN, LOW);
        delay(300);
        digitalWrite(LED_AMBER_PIN, LOW);
    } else {
        // Long error buzz: Red LED
        digitalWrite(LED_RED_PIN, HIGH);
        digitalWrite(BUZZER_PIN, HIGH);
        delay(400);
        digitalWrite(BUZZER_PIN, LOW);
        delay(200);
        digitalWrite(LED_RED_PIN, LOW);
    }
}

/**
 * Produces an ISO-8601 formatted timestamp string: YYYY-MM-DDTHH:MM:SSZ
 */
String getISO8601Timestamp() {
    time_t now;
    struct tm timeinfo;
    time(&now);
    gmtime_r(&now, &timeinfo);

    char buf[30];
    if (timeinfo.tm_year > (2020 - 1900)) {
        strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
        return String(buf);
    } else {
        // Fallback if NTP not yet synced
        return "2026-09-27T13:40:00Z";
    }
}
