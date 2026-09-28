# Cloudinary File Storage Setup Guide
## NCCT Cooperative Skill Intelligence Ecosystem

This guide documents the persistent cloud media storage integration using **Cloudinary** for the NCCT ecosystem backend.

---

## 1. Architecture & Purpose

In production deployments (Docker, Render, Railway, Vercel), container file systems are **ephemeral**—any uploaded PDF files, video lectures, or generated certificates are wiped whenever containers restart or scale.

To ensure high availability and permanent persistence:
- **Trainer Content Items**: Course materials (PDF slide decks, notes, and MP4 video lectures) uploaded by trainers are automatically sent to Cloudinary.
- **Official Digital Certificates**: Cryptographically verified landscape A4 certificates generated via ReportLab are uploaded directly to Cloudinary upon completion and stored in `Certificate.pdf_url`.
- **Database Schema**: `ContentItem.url` and `Certificate.pdf_url` hold live, secure HTTPS Cloudinary URLs (`https://res.cloudinary.com/...`).

---

## 2. Cloudinary Configuration

Cloudinary is configured via the standard `CLOUDINARY_URL` environment variable:

```bash
# In backend/.env or your production cloud environment:
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>
```

### How to Retrieve Your Cloudinary URL:
1. Log in to your [Cloudinary Console](https://console.cloudinary.com).
2. Go to **Dashboard** -> **Product Environment Settings** -> **API Keys**.
3. Copy the **API Environment variable** (format: `cloudinary://...`).
4. Set this variable in your cloud provider (Render, Railway) or local `.env`.

---

## 3. Upload Validation & Limits

The backend enforces strict file size and type validation before any file is transmitted to Cloudinary:

| Asset Type | Allowed File Extensions | Allowed MIME Types | Maximum Size |
| :--- | :--- | :--- | :--- |
| **Course PDF** | `.pdf` | `application/pdf`, `application/x-pdf` | **25 MB** |
| **Course Video** | `.mp4`, `.mov`, `.webm`, `.mkv`, `.avi` | `video/mp4`, `video/quicktime`, `video/webm` | **100 MB** |
| **General Document** | `.pdf`, `.txt`, `.docx` | Standard document MIME types | **25 MB** |

> **Security Note**: Attempting to upload a non-compliant file type or a file exceeding the maximum size returns an immediate `HTTP 400 Bad Request` with an explicit diagnostic error message.

---

## 4. Endpoints & Workflows

### A. Trainer Upload Endpoint
- **URL**: `POST /api/trainer/modules/{id}/upload-content`
- **Auth**: Bearer Token (`TRAINER` or `ADMIN`)
- **Form Data**:
  - `title`: String (e.g., "Advanced PACS Audit Procedures")
  - `type`: "pdf" or "video"
  - `order`: Integer sequence
  - `file`: Multipart binary file
- **Response**:
  ```json
  {
    "id": 42,
    "module_id": 3,
    "type": "pdf",
    "title": "Advanced PACS Audit Procedures",
    "url": "https://res.cloudinary.com/ncct-prod/raw/upload/v1727500000/ncct/curriculum/modules/3/pacs_audit.pdf",
    "url_or_file_path": "https://res.cloudinary.com/ncct-prod/raw/upload/v1727500000/ncct/curriculum/modules/3/pacs_audit.pdf",
    "order": 1,
    "created_at": "2026-09-28T10:45:00"
  }
  ```

### B. Auto-Issued Certificate Generation
- When a trainee reaches 100% course completion and passes the competency assessment:
  1. `check_and_issue_certificate()` generates a unique `NCCT-CERT-YYYY-XXXXXX` credential.
  2. Generates the high-resolution vector PDF using ReportLab with verification QR code.
  3. Uploads the PDF to Cloudinary under folder `ncct/certificates/`.
  4. Stores the resulting HTTPS URL in `Certificate.pdf_url`.
- **Download Endpoint**: `GET /api/certificates/{certificate_id}/pdf`
  - Issues an HTTP 302 redirect directly to the Cloudinary-hosted file.
  - Adding `?stream=true` streams the raw PDF binary directly if required.

---

## 5. Offline & Development Fallback Mode

To guarantee uninterrupted presentations during offline events (e.g. venue internet outages):
- If `CLOUDINARY_URL` is omitted or internet is disconnected:
  - The storage service seamlessly falls back to saving files locally under `static/uploads/`.
  - Generates an accessible, simulated Cloudinary asset URL.
  - Core functionality remains 100% operational without external network requests.
