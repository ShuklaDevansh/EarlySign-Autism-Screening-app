# main.py — FastAPI entry point for autism screening backend

import os
import sys
import uuid
import tempfile

# Add backend folder to path so mediapipe_pipeline imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from mediapipe_pipeline.feature_extractor import extract_features
from mediapipe_pipeline.scoring_model import compute_risk_score

# Create the FastAPI app
app = FastAPI(
    title="EarlySign Autism Screening API",
    version="1.0.0"
)

# Allow React Native app to call this server from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/")
def health_check():
    # Simple check to confirm server is running
    return {"status": "ok", "message": "EarlySign API is running"}


@app.post("/analyze-video")
async def analyze_video(
    video: UploadFile = File(...),
    questionnaire_score: int = Form(...)
):
    # Validate questionnaire score range
    if not (0 <= questionnaire_score <= 20):
        raise HTTPException(
            status_code=400,
            detail="questionnaire_score must be between 0 and 20"
        )

    # Validate file is a video
    if not video.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be a video (.mp4, .mov, .avi, .mkv)"
        )

    # Save uploaded video to a temp file so MediaPipe can read it
    suffix     = os.path.splitext(video.filename)[1]
    temp_path  = os.path.join(tempfile.gettempdir(), f"earlysign_{uuid.uuid4().hex}{suffix}")

    try:
        # Write uploaded bytes to temp file
        contents = await video.read()

        # Reject files larger than 200MB
        if len(contents) > 200 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Video file too large. Please upload a video under 200MB."
            )

        with open(temp_path, "wb") as f:
            f.write(contents)

        # Run feature extraction pipeline
        feature_vector = extract_features(temp_path)

        # Handle case where video could not be processed
        if feature_vector is None:
            raise HTTPException(
                status_code=422,
                detail="Could not process video. Ensure the video is valid and the child's face is visible."
            )

        # Handle case where too few frames were detected
        if feature_vector["_meta"]["frames_processed"] == 0:
            raise HTTPException(
                status_code=422,
                detail="No frames could be processed from this video. Please try a different video."
            )

        # Run scoring model
        result = compute_risk_score(feature_vector, questionnaire_score)

        # Add raw features and meta to response for frontend explainability screen
        result["raw_features"] = {
            "avg_gaze_deviation"     : feature_vector["avg_gaze_deviation"],
            "social_gaze_percentage" : feature_vector["social_gaze_percentage"],
            "expression_variance"    : feature_vector["expression_variance"],
            "repetitive_motion_score": feature_vector["repetitive_motion_score"]
        }
        result["meta"] = feature_vector["_meta"]

        return result

    finally:
        # Always delete temp file whether or not processing succeeded
        if os.path.exists(temp_path):
            os.remove(temp_path)