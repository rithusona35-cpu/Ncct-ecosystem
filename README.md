# MineGuard AI — Quantized YOLO Inference Backend (Render Deployment)
**Branch: `minegaurdai-backend`** | **SIH 26008**

Ultra-lightweight FastAPI defect detection inference backend optimized for Render free tier (**512 MB RAM, 0.1 vCPU**).

## Render One-Click Deployment
1. Connect this repository branch (`minegaurdai-backend`) on [render.com](https://render.com/).
2. Select **Web Service** with **Free Plan**.
3. Configuration:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn fastapi_app:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   - `ALLOWED_ORIGINS`: `*`
   - `PORT`: `8000`
5. Click **Create Web Service**.

## Quantization & Resource Specification
- **Engine**: ONNX Runtime INT8 dynamic quantization
- **Idle Memory**: ~65 MB (leaves >400 MB headroom under Render 512 MB limit)
- **Peak Inference Memory**: ~185 MB
- **Concurrency**: 1-thread sequential execution tuned for 0.1 vCPU
- **Endpoints**: `/health`, `/model-info`, `POST /api/detect`, `POST /api/models/cross_check`
