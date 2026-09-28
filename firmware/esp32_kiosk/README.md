# NCCT ESP32-S3 Smart Attendance Kiosk Firmware

This directory contains the production-grade Arduino/C++ firmware for the **NCCT ESP32-S3 Smart Attendance Kiosk Gateway**, configured with live backend connectivity, verbose serial tracing, and interactive Serial Monitor test simulation.

---

## 1. Directory Structure

```
firmware/esp32_kiosk/
├── config.h          # Target backend URL, Wi-Fi credentials, pin mappings
├── esp32_kiosk.ino   # Main firmware sketch with verbose serial debug logging
└── README.md         # Hardware wiring & testing guide
```

---

## 2. Configuration (`config.h`)

- **Backend Target**:
  ```cpp
  #define BACKEND_BASE_URL "http://10.73.49.221:8000"
  #define ATTENDANCE_MARK_PATH "/api/attendance/mark"
  #define BACKEND_MARK_URL BACKEND_BASE_URL ATTENDANCE_MARK_PATH
  ```
  *(Bound to `0.0.0.0:8000` on your host PC, accessible across the local 2.4GHz Wi-Fi network)*
- **Device ID**:
  ```cpp
  #define DEVICE_ID "ESP32-S3-GATE-01"
  ```
  *(Identified as `hardware` source in backend analytics and trainer attendance roster)*
- **Wi-Fi Credentials**:
  ```cpp
  #define WIFI_SSID "YOUR_WIFI_SSID"
  #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
  ```

---

## 3. Hardware Pin Mapping

| Peripheral | ESP32-S3 Pin | Description |
| :--- | :--- | :--- |
| **Buzzer** | `GPIO 4` | Active Buzzer / PWM tone output |
| **Green LED** | `GPIO 5` | Success verification light (`OK`) |
| **Amber LED** | `GPIO 6` | Warning light (`DUPLICATE`) |
| **Red LED** | `GPIO 7` | Error indicator (`INVALID` / network error) |
| **Scanner RX** | `GPIO 18` | ESP32 RX <- GM65 Scanner TX (`9600` baud) |
| **Scanner TX** | `GPIO 17` | ESP32 TX -> GM65 Scanner RX (optional trigger) |

---

## 4. Verbose Serial Logging (Every Step Traced)

When connected to the USB Serial Monitor at **`115200` baud**, the firmware provides step-by-step telemetry:

```
[INIT] Device Identifier: ESP32-S3-GATE-01
[INIT] Target Backend:    http://10.73.49.221:8000/api/attendance/mark
[WIFI] Connecting to SSID: HomeWiFi_2.4G......
[WIFI STATUS] *** CONNECTED TO NETWORK ***
              Local IP:        10.73.49.105
              Signal (RSSI):   -54 dBm

[STEP 1/4] QR Code Received from [SERIAL_MONITOR_TEST]
           Payload Text: "NCCT-TR-2026-00001" (Length: 18 bytes)
[STEP 2/4] Constructing JSON Payload...
           JSON Built Successfully:
           {"device_id":"ESP32-S3-GATE-01","trainee_qr_code":"NCCT-TR-2026-00001","session_id":"SESSION-MAIN","timestamp":"2026-09-27T13:39:43Z"}
[STEP 3/4] Preparing HTTP POST request...
           Target URL: http://10.73.49.221:8000/api/attendance/mark
           Sending POST body to backend server...
[STEP 4/4] Response received from Backend:
           HTTP Status Code: 200 (200 OK)
           Response Body: {"status":"OK","buzzer":"BEEP_SUCCESS","message":"Check-in verified: Vikram Sharma (NCCT-TR-2026-00001)","trainee_id":"NCCT-TR-2026-00001","trainee_name":"Vikram Sharma","check_in_time":"2026-09-27T13:39:43","attendance_id":2,"synced_from":"hardware"}

>>> [VERDICT: ATTENDANCE VERIFIED] Check-in confirmed! <<<
    Trainee: Vikram Sharma (NCCT-TR-2026-00001)
    Buzzer:  BEEP_SUCCESS [GREEN LED CHIRP]
    Source:  hardware (Hardware IoT Gateway)
```

---

## 5. Serial Test Mode (No Hardware Scanner Required)

If your physical 2D barcode/QR scanner module hasn't arrived or isn't wired yet:
1. Open Arduino IDE Serial Monitor (set line ending to `Newline` or `Both NL & CR`, baud `115200`).
2. Type any Trainee ID or QR text into the input field and press **Enter**:
   - `NCCT-TR-2026-00001` (Vikram Sharma)
   - `NCCT-TR-2026-00002` (Kavita Rao)
   - `INVALID-QR-CODE` (Simulates unlisted trainee)
3. The firmware immediately triggers the full pipeline, displays verbose traces, and records attendance on the backend!

---

## 6. Software Interactive Serial Runner

You can also run the companion Python Serial Monitor Simulator on your PC:
```bash
# Interactive Serial Monitor console:
python scripts/serial_kiosk_runner.py --simulate

# Direct scan:
python scripts/serial_kiosk_runner.py --scan NCCT-TR-2026-00001
```

Once marked, check **`http://localhost:3000/trainer/attendance`** to watch the new entry appear in real-time under the **Hardware ESP32** filter badge!
