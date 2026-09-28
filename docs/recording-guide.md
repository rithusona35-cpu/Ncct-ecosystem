# SIH Video Submission & Recording Production Guide
## NCCT Cooperative Skill Intelligence Ecosystem (SIH26087)

This production guide provides a step-by-step blueprint for recording, editing, and submitting the **winning SIH demo video**. It condenses the full 8-minute demo script into an engaging, high-impact **3-to-5 minute submission video** with picture-in-picture hardware footage and on-screen stage badges.

---

## 1. Quick Video Spec & Recording Checklist

| Parameter | Specification | Notes |
| :--- | :--- | :--- |
| **Target Length** | **3:45 to 4:30 minutes** | Safely under the strict SIH 5-minute maximum limit |
| **Resolution & FPS** | **1080p (1920x1080) @ 60fps** | Crisply renders chart labels, radar plots, and code tags |
| **OBS Audio Filter** | Noise Suppression (RNNoise) + Compressor | Eliminates room reverb and fan noise |
| **Hardware Clip** | **20–30 Seconds** (Picture-in-Picture or Split Screen) | ESP32-S3 scanning QR badge -> Instant dashboard update |
| **On-Screen Overlays** | Stage Lower-Third Badges (Stages 1 through 8) | Ensures judges watching muted/without audio understand the flow |
| **Closing Punchline** | Final slide verbatim: *"Closed-Loop Cooperative Skill Intelligence Ecosystem — not just an LMS or chatbot."* |

---

## 2. OBS Studio Setup & Scene Layouts

### A. Recommended OBS Scenes
1. **Scene 1: Fullscreen Demo (Main Display)**
   - Source: Display Capture or Window Capture (Browser at 1080p, 100% zoom).
   - Audio: Microphone (with Noise Suppression filter enabled).
2. **Scene 2: Hardware + Dashboard (PiP)**
   - Source 1 (Background): Window Capture of `/trainer/attendance` or `/kiosk`.
   - Source 2 (Bottom-Right Inset or Left Split): USB Webcam or Phone (via DroidCam/Camo/Elgato) aimed at the physical ESP32-S3 board and the printed/phone QR code badge.
3. **Scene 3: Closing Slide / Pitch Deck**
   - Fullscreen slide with the NCCT ecosystem architecture and closing punchline.

### B. OBS Recording Settings
- **Output Mode**: Advanced -> Recording
- **Format**: MP4 / MKV (remuxed to MP4)
- **Encoder**: NVIDIA NVENC H.264 (or AMD / Apple / x264 Fast)
- **Rate Control**: CBR @ 8,000–10,000 Kbps (clean 1080p text rendering)
- **Audio Bitrate**: 192 Kbps

---

## 3. Shot-by-Shot Timed Recording Script (4:15 Total)

### Shot 1: The Hook & Problem (0:00 – 0:35)
- **Visual**: Screen recording of the Landing Page (`/`). Scroll smoothly over the Problem vs. Solution cards.
- **On-Screen Text Overlay (Top-Left Badge)**:
  `[STAGE 0] THE PROBLEM: Conventional LMS Stops at Certification`
- **Voiceover Narration**:
  > *"Conventional training systems have a critical blind spot: they end the moment a certificate is printed. They have zero visibility into whether trainees get hired, cannot diagnose real-world skill gaps, and have no feedback pipeline to modernize outdated curricula.*
  >
  > *This is the NCCT Cooperative Skill Intelligence Ecosystem — India’s first closed-loop platform that connects edge IoT training nodes, AI competency diagnostics, verified skill passports, and employer feedback into an autonomous curriculum modernization loop."*

---

### Shot 2: Smart Training Node & Hardware Clip (0:35 – 1:05)
- **Visual**: **Picture-in-Picture / Split Screen**.
  - **Left / Inset**: Camera showing the physical **ESP32-S3 Smart Training Node** with camera/scanner and OLED status indicator.
  - **Right / Main**: Live Trainer Attendance screen (`/trainer/attendance`).
  - **Action**: Bring Ravi Kumar’s QR badge (`NCCT-TR-2026-DEMO01`) in front of the ESP32 camera. The device beeps/blinks, and Ravi’s row instantly turns green with a live timestamp.
- **On-Screen Text Overlay**:
  `[STAGE 1] EDGE HARDWARE: ESP32-S3 Offline Biometric Attendance & Node Sync`
- **Voiceover Narration**:
  > *"The loop begins at the physical institute. Our ESP32-S3 Smart Training Node operates completely offline in rural areas, caching attendance and training telemetry with cryptographic signatures, and automatically synchronizing with the central apex server when connectivity returns."*

---

### Shot 3: AI Skill-Gap Diagnosis Engine (1:05 – 1:50)
- **Visual**: Log into Trainee Portal as Ravi Kumar (`demo.trainee@ncct.gov.in`).
  - Open `/trainee/dashboard` -> click into `/trainee/skill-gap`.
  - Zoom slightly on the Radar Chart showing competency benchmarks vs. actual scores (88% Accounting, 52% ERP Reconciliation, 48% GST Compliance).
  - Show the AI Recommendation Engine suggesting remedial modules.
- **On-Screen Text Overlay**:
  `[STAGE 2] AI SKILL-GAP ENGINE: Micro-Competency Diagnosis & Target Benchmarking`
- **Voiceover Narration**:
  > *"Logging in as trainee Ravi Kumar: after completing his Cooperative Accounting programme and assessments, our AI skill-gap engine analyzes micro-competency evidence across 35 cooperative job roles.*
  >
  > *Ravi scores 88% in Accounting Principles, but the engine immediately diagnoses critical gaps: 52% in ERP Reconciliation and 48% in GST Compliance. Instead of generic retraining, Ravi receives targeted micro-learning recommendations to bridge those exact deficits before entering the job market."*

---

### Shot 4: Tamper-Proof Skill Passport & Public Verification (1:50 – 2:30)
- **Visual**: Navigate to `/trainee/skill-passport` -> show the dynamic Skill Passport card with cryptographic hash and QR code.
  - Open a new tab to `/verify` -> show public cryptographic instant verification of certificate `NCCT-CERT-2026-000101`.
- **On-Screen Text Overlay**:
  `[STAGE 3] VERIFIED SKILL PASSPORT: Cryptographic, QR-Verifiable Competency Proof`
- **Voiceover Narration**:
  > *"Once competencies are mastered, NCCT issues a cryptographically signed Skill Passport and dynamic QR certificate. Any bank, cooperative society, or registrar can scan this QR code publicly — without needing login credentials — to instantly verify authenticity, issued competencies, and assessment scores."*

---

### Shot 5: Employer Hiring & AI Candidate Matching (2:30 – 3:15)
- **Visual**: Switch to Employer Portal (`demo.employer@ncct.gov.in` - Tamil Nadu Apex Cooperative Bank).
  - Open `/employer/matches`.
  - Show Ravi Kumar ranked at the top of the candidate match pipeline with a **91% competency match badge**.
  - Click **View Skill Breakdown** showing matched vs. gap skills.
  - Click **Record Hire** button -> select candidate as Hired.
- **On-Screen Text Overlay**:
  `[STAGE 4] EMPLOYMENT MATCHING: Role-Based Competency Ranking & Verified Placement`
- **Voiceover Narration**:
  > *"Now switching to the employer view: Tamil Nadu Apex Cooperative Bank posts a requisition for a Cooperative Accountant with specific competency benchmarks.*
  >
  > *Our matching algorithm scores candidates strictly on verified skills rather than keyword resumes. Ravi Kumar surfaces as the #1 match at 91% alignment. The employer reviews his verified breakdown and records the official hire on-chain."*

---

### Shot 6: Closing the Loop — Employer Feedback & Curriculum Evolution (3:15 – 3:55)
- **Visual**: On the Employer Hires page (`/employer/hires`), submit 90-day workplace feedback on Ravi Kumar.
  - Rate *Cooperative Auditing* as High and *GST E-Way Bill Filing* as Medium.
  - Switch immediately to the NCCT Apex Admin Dashboard (`demo.admin@ncct.gov.in` -> `/admin/dashboard`).
  - Highlight the National Skill Gap Heatmap and Institute Performance charts dynamically recalculating.
- **On-Screen Text Overlay**:
  `[STAGE 5 & 6] THE CLOSED LOOP: Post-Placement Feedback Driving Curriculum Upgrades`
- **Voiceover Narration**:
  > *"Here is what makes our system truly revolutionary — the loop doesn't end at hiring. Ninety days into employment, the bank submits competency feedback on Ravi’s on-the-job performance.*
  >
  > *This feedback feeds directly into the NCCT Apex Intelligence Dashboard. If multiple employers flag deficits in GST filings, the system flags the curriculum across all 14 Regional Institutes for mandatory syllabus recalibration. The training is continually modernized by real market demand."*

---

### Shot 7: The Grand Finale & Positioning (3:55 – 4:15)
- **Visual**: Full-screen slide with the 10-stage circular flow diagram and the bold closing statement.
- **On-Screen Banner**:
  `NCCT COOPERATIVE SKILL INTELLIGENCE ECOSYSTEM`
  `From Training to Employment — A Production-Ready Closed-Loop System`
- **Voiceover Narration (Clear, deliberate, confident)**:
  > *"From offline edge IoT hardware to AI competency diagnosis, verified skill passports, employer matching, and automated curriculum modernization:*
  >
  > ***NCCT is a Closed-Loop Cooperative Skill Intelligence Ecosystem — not just an LMS, and not just a chatbot.***
  >
  > *Thank you."*

---

## 4. Hardware Clip Production Guide (ESP32-S3)

To capture the physical 20–30 second hardware clip smoothly:

1. **Hardware Preparation**:
   - Power the ESP32-S3 via USB-C to your laptop.
   - Run the serial simulator or kiosk runner if using serial tethering:
     ```bash
     cd scripts
     python serial_kiosk_runner.py
     ```
   - Print or display Ravi’s QR attendance badge on a smartphone:
     - Badge Text / QR Payload: `{"trainee_id": 9, "code": "NCCT-TR-2026-DEMO01"}` (or navigate to `/trainee/dashboard` and click *View QR Badge*).

2. **Camera Placement**:
   - Angle the camera so the ESP32 camera lens, onboard LED, and small breadboard/housing are visible.
   - In OBS, crop the webcam source to a clean 16:9 box in the lower-right corner of the browser window.

3. **The Scan Moment**:
   - Move the phone with the QR code into the ESP32’s field of view (~10–15 cm away).
   - Show the green LED flash on the ESP32.
   - Point out the instant UI refresh on the attendance dashboard (`/trainer/attendance`) showing *Present* with green badge.

---

## 5. Caption & Text Overlay Style Guide

Judges frequently watch submissions on laptops or mobile devices with audio muted. Use these bold lower-third banners in CapCut, Premiere, or DaVinci Resolve:

| Timestamp | Banner Title | Sub-Bullet / Metric Highlight |
| :--- | :--- | :--- |
| **0:10** | `CLOSED-LOOP SKILL INTELLIGENCE` | *Connecting classroom training directly to employment outcomes* |
| **0:40** | `SMART TRAINING NODE (IoT)` | *ESP32-S3 edge device with offline caching & cryptographic QR verification* |
| **1:15** | `AI SKILL-GAP ENGINE` | *Diagnoses micro-gaps (88% Accounting vs 48% GST) & generates remedial paths* |
| **1:55** | `VERIFIED SKILL PASSPORT` | *Cryptographic QR certificates instantly verifiable without login* |
| **2:35** | `AI EMPLOYMENT MATCHING` | *Competency-based candidate ranking (Ravi Kumar: 91% match)* |
| **3:20** | `THE CLOSED-LOOP ADVANTAGE` | *Employer 90-day feedback automatically triggers curriculum updates* |
| **4:00** | `CORE POSITIONING` | *Not just an LMS or chatbot — A complete Skill Intelligence Ecosystem* |

---

## 6. Pre-Recording Dry-Run Checklist

Before pressing record in OBS:
- [ ] Backend running (`http://localhost:8000/api/health` returns `200 OK`).
- [ ] Frontend running (`http://localhost:3000` loads instantly).
- [ ] Fresh seed data loaded (`python -m scripts.demo_seed`).
- [ ] Browser tabs prepared in order:
  - Tab 1: `/` (Landing Page)
  - Tab 2: `/trainer/attendance` (Hardware Scan demo)
  - Tab 3: `/trainee/dashboard` (Ravi Kumar logged in)
  - Tab 4: `/trainee/skill-passport`
  - Tab 5: `/verify` (Public certificate check)
  - Tab 6: `/employer/matches` (Apex Bank logged in)
  - Tab 7: `/employer/hires` (Feedback submission)
  - Tab 8: `/admin/dashboard` (National Analytics)
- [ ] Close all personal notifications, Slack/Discord, and bookmarks bar (`Ctrl + Shift + B`).
- [ ] Do a 15-second test recording and listen back with headphones to verify audio levels are in the -6dB to -12dB sweet spot.
