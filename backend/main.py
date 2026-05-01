# main.py — FastAPI entry point for autism screening backend

import os
import sys
import uuid
import tempfile
import time

# Add backend folder to path so mediapipe_pipeline imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from mediapipe_pipeline.feature_extractor import extract_features
from mediapipe_pipeline.scoring_model import compute_risk_score

# Create the FastAPI app
app = FastAPI(title="EarlySign Autism Screening API", version="1.0.0")

# Allow React Native app to call this server from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    # Simple check to confirm server is running
    return {"status": "ok", "message": "EarlySign API is running"}

@app.get("/explain")
def explain_result(
    risk_level: str,
    top_feature: str,
    social_gaze: float,
    expression_var: float,
    rep_motion: float,
    frames: int,
    questionnaire_score: int,
    final_score: float
):
    sentences = []

    # opening sentence about frames analyzed
    sentences.append(f"The video analysis processed {frames} frames.")

    # explain social gaze finding
    if social_gaze < 0.40:
        sentences.append(
            f"Social gaze was detected in {round(social_gaze * 100)}% of frames — "
            "well below the typical range of 60% or more, suggesting significantly reduced social attention."
        )
    elif social_gaze < 0.60:
        sentences.append(
            f"Social gaze was detected in {round(social_gaze * 100)}% of frames — "
            "below the typical range of 60% or more, which may indicate reduced social attention."
        )
    else:
        sentences.append(
            f"Social gaze was detected in {round(social_gaze * 100)}% of frames — "
            "within the typical range."
        )

    # explain expression variance finding
    if expression_var < 0.015:
        sentences.append(
            "Facial expression variation was low across the video, suggesting reduced affect."
        )
    else:
        sentences.append(
            "Facial expression variation was within a typical range."
        )

    # explain repetitive motion finding
    if rep_motion > 0.50:
        sentences.append(
            "Elevated repetitive movement patterns were detected in the child's wrist motion."
        )
    elif rep_motion > 0.0:
        sentences.append(
            "Repetitive movement levels were within a typical range."
        )
    else:
        sentences.append(
            "Wrist landmarks were not visible in this video, so repetitive motion could not be assessed."
        )

    # questionnaire summary
    sentences.append(
        f"The questionnaire flagged {questionnaire_score} out of 20 risk indicators."
    )

    # overall risk conclusion
    if risk_level == "LOW":
        sentences.append(
            f"Combined, these signals produce a LOW risk score of {round(final_score * 100)}%. "
            "No immediate concerns were flagged, but continue monitoring development."
        )
    elif risk_level == "MEDIUM":
        sentences.append(
            f"Combined, these signals produce a MEDIUM risk score of {round(final_score * 100)}%. "
            "Professional evaluation is recommended."
        )
    else:
        sentences.append(
            f"Combined, these signals produce a HIGH risk score of {round(final_score * 100)}%. "
            "Please consult a pediatric specialist as soon as possible."
        )

    # join all sentences into one paragraph
    explanation = " ".join(sentences)
    return {"explanation": explanation}

@app.post("/analyze-video")
async def analyze_video(
    video: UploadFile = File(...), questionnaire_score: int = Form(...)
):
    # Validate questionnaire score range
    if not (0 <= questionnaire_score <= 20):
        raise HTTPException(
            status_code=400, detail="questionnaire_score must be between 0 and 20"
        )

    # Validate file is a video
    if not video.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be a video (.mp4, .mov, .avi, .mkv)",
        )

    # Save uploaded video to a temp file so MediaPipe can read it
    suffix = os.path.splitext(video.filename)[1]
    temp_path = os.path.join(
        tempfile.gettempdir(), f"earlysign_{uuid.uuid4().hex}{suffix}"
    )

    try:
        # Check file size and write in chunks to avoid loading whole video into RAM
        MAX_SIZE = 200 * 1024 * 1024  # 200MB
        bytes_written = 0
        chunk_size = 1 * 1024 * 1024  # read 1MB at a time

        with open(temp_path, "wb") as f:
            while True:
                chunk = await video.read(chunk_size)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > MAX_SIZE:
                    os.remove(temp_path)
                    raise HTTPException(
                        status_code=413,
                        detail="Video file too large. Please upload a video under 200MB.",
                    )
                f.write(chunk)

        # record time before processing starts
        start_time = time.time()

        # Run feature extraction pipeline
        try:
            feature_vector = extract_features(temp_path)
        except ValueError as e:
            # face not detected error raised by feature_extractor
            raise HTTPException(status_code=422, detail=str(e))

        # Handle case where video could not be processed
        if feature_vector is None:
            raise HTTPException(
                status_code=422,
                detail="Could not process video. Ensure the video is valid and the child's face is visible.",
            )

        # Handle case where too few frames were detected
        if feature_vector["_meta"]["frames_processed"] < 5:
            raise HTTPException(
                status_code=422,
                detail="Face not detected in most frames. Please retake the video in better lighting with the child's face clearly visible.",
            )

        # Run scoring model
        result = compute_risk_score(feature_vector, questionnaire_score)

        # Add raw features and meta to response for frontend explainability screen
        result["raw_features"] = {
            "avg_gaze_deviation": feature_vector["avg_gaze_deviation"],
            "social_gaze_percentage": feature_vector["social_gaze_percentage"],
            "expression_variance": feature_vector["expression_variance"],
            "repetitive_motion_score": feature_vector["repetitive_motion_score"],
        }
        result["meta"] = feature_vector["_meta"]

        result["frames_analyzed"] = feature_vector["_meta"]["frames_processed"]
        result["frames_rejected"] = feature_vector["_meta"]["frames_rejected"]
        # calculate total processing time and round to 2 decimal places
        result["processing_time_seconds"] = round(time.time() - start_time, 2)
        return result

    finally:
        # Always delete temp file whether or not processing succeeded
        if os.path.exists(temp_path):
            os.remove(temp_path)
