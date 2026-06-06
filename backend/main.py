"""
main.py — FastAPI application: YOLO inference + PostgreSQL scan history.

Endpoints:
  GET  /            → health check (models status)
  POST /detect      → run YOLO inference on an uploaded image (unchanged)
  POST /scans       → save a completed scan + its detections to the DB
  GET  /scans       → retrieve scan history (newest first, paginated)
  GET  /scans/{id}  → get one scan with all its detections
  DELETE /scans/{id}→ delete a scan from the DB
"""
import io
import os
import math
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from ultralytics import YOLO
from PIL import Image

from auth import router as auth_router, get_current_user
from database import get_db, init_db
from models import Scan, Detection, User
from schemas import DetectionOut, ScanIn, ScanOut, ChatRequest
import google.generativeai as genai


# ── Application lifespan (startup / shutdown) ────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks (load models + create DB tables) before serving requests."""
    # Load YOLO models
    _load_models()
    # Create PostgreSQL tables (safe — skips existing tables)
    await init_db()
    print("✅ Database tables ready")
    yield  # ← application runs here


app = FastAPI(
    title="Analysi M3ana — YOLOv8 & YOLOv12 Backend",
    lifespan=lifespan,
)

# ── Configure Gemini ──────────────────────────────────────────────────────────
# Retrieve API Key directly from environment variable loaded by dotenv
import os
from dotenv import load_dotenv
load_dotenv()
if os.getenv("GEMINI_API_KEY"):
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    chat_model = genai.GenerativeModel('gemini-2.5-flash')
else:
    chat_model = None

# ── CORS: allow all origins so the browser never blocks the request ───────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://127.0.0.1:8080", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# ── Model paths ───────────────────────────────────────────────────────────────
YOLOV8_PATH  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "best-run8.pt")
YOLOV12_PATH = r"C:\Users\azeraa\Desktop\run9\weights\best.pt"

models: dict = {}


def _load_models():
    try:
        models["YOLOv8s"] = YOLO(YOLOV8_PATH)
        print("✅ YOLOv8s loaded")
    except Exception as e:
        print(f"❌ YOLOv8s failed: {e}")
        models["YOLOv8s"] = None

    try:
        models["YOLOv12s"] = YOLO(YOLOV12_PATH)
        print("✅ YOLOv12s loaded")
    except Exception as e:
        print(f"❌ YOLOv12s failed: {e}")
        models["YOLOv12s"] = None

    try:
        from sahi import AutoDetectionModel
        models["sahi_YOLOv8s"] = AutoDetectionModel.from_pretrained(
            model_type="yolov8",
            model_path=YOLOV8_PATH,
            confidence_threshold=0.25,
            device="cpu"
        )
        print("✅ SAHI YOLOv8s loaded")
    except Exception as e:
        print(f"❌ SAHI YOLOv8s failed: {e}")
        models["sahi_YOLOv8s"] = None

    try:
        from sahi import AutoDetectionModel
        models["sahi_YOLOv12s"] = AutoDetectionModel.from_pretrained(
            model_type="yolov8",
            model_path=YOLOV12_PATH,
            confidence_threshold=0.25,
            device="cpu"
        )
        print("✅ SAHI YOLOv12s loaded")
    except Exception as e:
        print(f"❌ SAHI YOLOv12s failed: {e}")
        models["sahi_YOLOv12s"] = None

    try:
        models["roi_model"] = YOLO(os.path.join(os.path.dirname(__file__), "models", "yolov8n.pt"))
        print("✅ ROI model (yolov8n) loaded")
    except Exception as e:
        print(f"❌ ROI model failed: {e}")
        models["roi_model"] = None

    try:
        import cv2
        import urllib.request
        model_path = os.path.join(os.path.dirname(__file__), "models", "FSRCNN_x2.pb")
        if not os.path.exists(model_path):
            print("Downloading FSRCNN_x2.pb...")
            urllib.request.urlretrieve(
                "https://github.com/Saafke/FSRCNN_Tensorflow/raw/master/models/FSRCNN_x2.pb",
                model_path
            )
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel(model_path)
        sr.setModel("fsrcnn", 2)
        models["sr_model"] = sr
        print("✅ Super Resolution model (FSRCNN) loaded")
    except Exception as e:
        print(f"❌ Super Resolution model failed: {e}")
        models["sr_model"] = None


# ── Helper: convert a Scan ORM object → ScanOut schema ───────────────────────

def _scan_to_out(scan: Scan) -> ScanOut:
    return ScanOut(
        id=scan.id,
        filename=scan.filename,
        thumbnail=scan.thumbnail,
        model=scan.model_used,
        inference_ms=scan.inference_ms,
        date=scan.created_at.isoformat(),
        detections=[
            DetectionOut(
                id=d.id,
                class_name=d.class_name,
                class_id=d.class_id,
                confidence=d.confidence,
                bbox=[d.bbox_x, d.bbox_y, d.bbox_w, d.bbox_h],
            )
            for d in scan.detections
        ],
    )


# ═════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═════════════════════════════════════════════════════════════════════════════

# ── GET / ─────────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {
        "status": "ok",
        "models": {k: v is not None for k, v in models.items()},
    }


# ── POST /detect ──────────────────────────────────────────────────────────────

@app.post("/detect", response_model=dict)
async def detect(
    file: UploadFile = File(...),
    model: str        = Form(...),
    sahi:  str        = Form("false"),
    tta:   str        = Form("false"),
    multi_scale: str  = Form("false"),
    zoom_in: str      = Form("false"),
    super_res: str    = Form("false"),
    current_user: User = Depends(get_current_user),
):
    use_sahi = sahi.lower() == "true"
    use_tta = tta.lower() == "true"
    use_multi_scale = multi_scale.lower() == "true"
    use_zoom_in = zoom_in.lower() == "true"
    use_super_res = super_res.lower() == "true"
    
    if model not in ["YOLOv8s", "YOLOv12s"]:
        raise HTTPException(
            status_code=400,
            detail=f"Modèle inconnu: '{model}'",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image (jpg/png/webp).")

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        if use_super_res:
            import cv2
            import numpy as np
            sr_model = models.get("sr_model")
            if sr_model is None:
                raise HTTPException(status_code=503, detail="Le modèle Super-Résolution n'a pas pu être chargé.")
            
            # Convert PIL to CV2 BGR
            cv_img = np.array(image)[:, :, ::-1].copy()
            # Upscale
            upscaled_cv = sr_model.upsample(cv_img)
            # Convert back to PIL
            image = Image.fromarray(upscaled_cv[:, :, ::-1])

        width, height = image.size

        detections = []
        
        if use_sahi:
            from sahi.predict import get_sliced_prediction
            sahi_model = models.get(f"sahi_{model}")
            
            if not sahi_model:
                raise HTTPException(
                    status_code=503,
                    detail=f"Le modèle SAHI '{model}' n'a pas pu être chargé au démarrage."
                )
                
            result = get_sliced_prediction(
                image,
                sahi_model,
                slice_height=256,
                slice_width=256,
                overlap_height_ratio=0.2,
                overlap_width_ratio=0.2
            )
            
            for obj in result.object_prediction_list:
                label = obj.category.name
                conf = obj.score.value
                
                x1 = obj.bbox.minx
                y1 = obj.bbox.miny
                x2 = obj.bbox.maxx
                y2 = obj.bbox.maxy
                
                cx = ((x1 + x2) / 2) / width
                cy = ((y1 + y2) / 2) / height
                bw = (x2 - x1) / width
                bh = (y2 - y1) / height
                
                detections.append({
                    "label": label,
                    "confidence": round(float(conf), 4),
                    "bbox": [round(cx, 6), round(cy, 6), round(bw, 6), round(bh, 6)]
                })
        elif use_multi_scale:
            import torch
            import torchvision.ops
            
            selected_model = models.get(model)
            if selected_model is None:
                raise HTTPException(
                    status_code=503,
                    detail=f"Le modèle '{model}' n'a pas pu être chargé au démarrage du serveur.",
                )

            all_boxes = []
            all_scores = []
            all_labels = []
            names = {}
            
            for size in [640, 1280, 1920]:
                results = selected_model(image, imgsz=size, verbose=False, augment=use_tta)
                if results and results[0].boxes and len(results[0].boxes) > 0:
                    res = results[0]
                    names = res.names
                    
                    boxes = res.boxes.xyxy
                    scores = res.boxes.conf
                    classes = res.boxes.cls
                    
                    all_boxes.append(boxes)
                    all_scores.append(scores)
                    all_labels.append(classes)

            if all_boxes:
                all_boxes = torch.cat(all_boxes)
                all_scores = torch.cat(all_scores)
                all_labels = torch.cat(all_labels)
                
                # Perform NMS
                keep = torchvision.ops.batched_nms(all_boxes, all_scores, all_labels, iou_threshold=0.45)
                
                final_boxes = all_boxes[keep]
                final_scores = all_scores[keep]
                final_labels = all_labels[keep]
                
                for box, conf, cls in zip(final_boxes.tolist(), final_scores.tolist(), final_labels.tolist()):
                    if (math.isnan(conf) or math.isinf(conf) or any(math.isnan(c) or math.isinf(c) for c in box)):
                        continue
                        
                    x1, y1, x2, y2 = box
                    cx = ((x1 + x2) / 2) / width
                    cy = ((y1 + y2) / 2) / height
                    bw = (x2 - x1) / width
                    bh = (y2 - y1) / height
                    
                    label = names.get(int(cls), str(int(cls)))
                    detections.append({
                        "label": label,
                        "confidence": round(float(conf), 4),
                        "bbox": [round(cx, 6), round(cy, 6), round(bw, 6), round(bh, 6)]
                    })
        elif use_zoom_in:
            selected_model = models.get(model)
            roi_model = models.get("roi_model")
            
            if selected_model is None or roi_model is None:
                raise HTTPException(status_code=503, detail="Modèles (Principale ou ROI) non chargés")
            
            # Étape 1: Detection ROI
            roi_results = roi_model(image, verbose=False)
            rois = []
            if roi_results and roi_results[0].boxes and len(roi_results[0].boxes) > 0:
                for box in roi_results[0].boxes.xyxy.tolist():
                    x1, y1, x2, y2 = box
                    # Padding de 10%
                    pad_x = (x2 - x1) * 0.1
                    pad_y = (y2 - y1) * 0.1
                    rois.append((
                        max(0, x1 - pad_x),
                        max(0, y1 - pad_y),
                        min(width, x2 + pad_x),
                        min(height, y2 + pad_y)
                    ))
            
            # Fallback
            if not rois:
                rois = [(0, 0, width, height)]
                
            for rx1, ry1, rx2, ry2 in rois:
                crop = image.crop((rx1, ry1, rx2, ry2))
                results = selected_model(crop, verbose=False, augment=use_tta)
                
                if results and results[0].boxes and len(results[0].boxes) > 0:
                    res = results[0]
                    for box, conf, cls in zip(res.boxes.xyxy.tolist(), res.boxes.conf.tolist(), res.boxes.cls.tolist()):
                        if math.isnan(conf): continue
                        
                        cx1, cy1, cx2, cy2 = box
                        # Translate to original absolute coords
                        abs_x1 = rx1 + cx1
                        abs_y1 = ry1 + cy1
                        abs_x2 = rx1 + cx2
                        abs_y2 = ry1 + cy2
                        
                        cx = ((abs_x1 + abs_x2) / 2) / width
                        cy = ((abs_y1 + abs_y2) / 2) / height
                        bw = (abs_x2 - abs_x1) / width
                        bh = (abs_y2 - abs_y1) / height
                        
                        label = res.names[int(cls)]
                        detections.append({
                            "label": label,
                            "confidence": round(float(conf), 4),
                            "bbox": [round(cx, 6), round(cy, 6), round(bw, 6), round(bh, 6)]
                        })
        else:
            selected_model = models.get(model)
            if selected_model is None:
                raise HTTPException(
                    status_code=503,
                    detail=f"Le modèle '{model}' n'a pas pu être chargé au démarrage du serveur.",
                )

            results = selected_model(image, verbose=False, augment=use_tta)

            if results:
                result = results[0]
                boxes  = result.boxes
                names  = result.names

                if boxes is not None and len(boxes) > 0:
                    for box, conf, cls in zip(
                        boxes.xyxyn.tolist(),
                        boxes.conf.tolist(),
                        boxes.cls.tolist(),
                    ):
                        if (math.isnan(conf) or math.isinf(conf)
                                or any(math.isnan(c) or math.isinf(c) for c in box)):
                            continue

                        label = names[int(cls)]
                        detections.append({
                            "label":      label,
                            "confidence": round(float(conf), 4),
                            "bbox":       [round(float(c), 6) for c in box],
                        })

        # Generate model used string
        model_str = model
        if use_super_res:
            model_str += " + SR"
        
        if use_sahi:
            model_str += " (SAHI)"
        elif use_multi_scale:
            model_str += " (Multi-Scale" + (", TTA" if use_tta else "") + ")"
        elif use_zoom_in:
            model_str += " (Zoom-In" + (", TTA" if use_tta else "") + ")"
        elif use_tta:
            model_str += " (TTA)"

        return {
            "detections": detections,
            "total":      len(detections),
            "model_used": model_str,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'inférence: {str(e)}")


# ── POST /scans ───────────────────────────────────────────────────────────────

@app.post("/scans", response_model=ScanOut)
async def create_scan(
    payload: ScanIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save a completed scan (image + detections) to PostgreSQL."""
    new_scan = Scan(
        id=str(uuid.uuid4()),
        filename=payload.filename,
        thumbnail=payload.thumbnail or None,
        model_used=payload.model_used,
        inference_ms=payload.inference_ms,
        user_id=current_user.id
    )
    db.add(new_scan)
    await db.flush()  # write scan so we get its id for the FK

    for det in payload.detections:
        bbox = det.bbox  # [cx, cy, w, h]
        db.add(Detection(
            id=str(uuid.uuid4()),
            scan_id=new_scan.id,
            class_name=det.class_name,
            class_id=det.class_id,
            confidence=det.confidence,
            bbox_x=bbox[0],
            bbox_y=bbox[1],
            bbox_w=bbox[2],
            bbox_h=bbox[3],
        ))

    await db.commit()

    # Re-fetch with detections loaded
    result = await db.execute(select(Scan).where(Scan.id == new_scan.id))
    saved = result.scalar_one()
    return _scan_to_out(saved)


# ── GET /scans ─────────────────────────────────────────────────────────────────

@app.get("/scans", response_model=list[ScanOut])
async def get_scans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return all past scans for the logged-in user, ordered by newest first."""
    result = await db.execute(
        select(Scan).where(Scan.user_id == current_user.id).order_by(Scan.created_at.desc())
    )
    scans = result.scalars().all()
    return [_scan_to_out(s) for s in scans]


# ── GET /scans/{scan_id} ──────────────────────────────────────────────────────

@app.get("/scans/{scan_id}", response_model=ScanOut)
async def get_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return a single scan with all its detections."""
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.user_id == current_user.id))
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan non trouvé.")
    return _scan_to_out(scan)


# ── DELETE /scans/{scan_id} ───────────────────────────────────────────────────

@app.delete("/scans/{scan_id}", status_code=204)
async def delete_scan(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a scan and all its detections (cascade)."""
    result = await db.execute(select(Scan).where(Scan.id == scan_id, Scan.user_id == current_user.id))
    scan_to_delete = result.scalar_one_or_none()
    if scan_to_delete is None:
        raise HTTPException(status_code=404, detail="Scan non trouvé ou vous n'avez pas l'autorisation")
    await db.delete(scan_to_delete)
    await db.commit()

# ── POST /chat ────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Chatbot endpoint using Google Gemini 1.5 Flash."""
    if chat_model is None:
        raise HTTPException(status_code=503, detail="Gemini n'est pas configuré.")
    try:
        response = chat_model.generate_content(request.message)
        return {"reply": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Chatbot: {str(e)}")
