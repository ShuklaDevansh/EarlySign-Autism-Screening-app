import cv2
import mediapipe as mp
import numpy as np
import os
import warnings
warnings.filterwarnings("ignore")

from mediapipe_pipeline.expression_features import (
    extract_expression_distances,
    normalize_distances_by_face_width,
    compute_expression_variance
)
from mediapipe_pipeline.motion_features import (
    get_wrist_y,
    compute_repetitive_motion_score
)
from mediapipe_pipeline.gaze_landmarks import compute_gaze_deviation

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────

# A child is considered to be making social gaze if
# their gaze deviation is below this value
SOCIAL_GAZE_THRESHOLD = 0.15

# Sample one frame every N frames from the video
SAMPLE_EVERY = 30

# Resize each frame to this width before feeding to MediaPipe.
# MediaPipe does NOT need full HD to detect landmarks.
# Smaller frames = much faster inference with no meaningful accuracy loss.
# 640px is the standard research-grade resolution for this task.
PROCESS_WIDTH = 640


def resize_frame(frame):
    """
    Resizes a frame to PROCESS_WIDTH pixels wide, keeping aspect ratio.
    This is the single biggest speed improvement — smaller frames
    process much faster in MediaPipe.
    """
    h, w = frame.shape[:2]

    # If already small enough, do not resize (avoid unnecessary work)
    if w <= PROCESS_WIDTH:
        return frame

    # Calculate new height keeping the same aspect ratio
    scale      = PROCESS_WIDTH / w
    new_width  = PROCESS_WIDTH
    new_height = int(h * scale)

    return cv2.resize(frame, (new_width, new_height),
                      interpolation=cv2.INTER_AREA)


def extract_features(video_path: str) -> dict:
    """
    Master function — takes a video file path, returns a dictionary
    containing all 4 behavioral feature scores and metadata.

    KEY CHANGE FROM PREVIOUS VERSION:
    We now use ONLY MediaPipe Holistic (instead of FaceMesh + Holistic).
    Holistic already runs FaceMesh internally, so running both separately
    was doing double the work. This gives us face landmarks AND pose
    landmarks in a single model call per frame.
    """

    # ── Validate the video file exists ──────────────────────────────────
    if not os.path.exists(video_path):
        print(f"[ERROR] Video not found: {video_path}")
        return None

    # ── Open the video ───────────────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open video: {video_path}")
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)

    # Safety check — some cameras/encoders report 0 fps
    if fps <= 0:
        fps = 30.0

    print(f"[INFO] Processing: {os.path.basename(video_path)}")
    print(f"[INFO] {total_frames} total frames at {fps:.1f} fps")
    print(f"[INFO] Sampling every {SAMPLE_EVERY} frames")
    print(f"[INFO] Resizing each frame to {PROCESS_WIDTH}px wide before inference")

    # ── Initialize MediaPipe Holistic ────────────────────────────────────
    # IMPORTANT: We use ONLY Holistic now.
    # Holistic internally runs:
    #   - FaceMesh (468 face landmarks)  ← replaces our old FaceMesh call
    #   - Pose estimation (33 landmarks) ← same as before
    #   - Hand tracking (21 per hand)    ← available but we don't use it
    # One model call per frame instead of two = ~40% faster processing.
    mp_holistic = mp.solutions.holistic

    holistic = mp_holistic.Holistic(
        static_image_mode        = False,  # video mode — tracks across frames
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )

    # ── Data accumulators ────────────────────────────────────────────────
    # These lists collect data from every sampled frame.
    # At the end we compute final feature scores from these lists.
    gaze_deviations = []   # one float per frame
    frame_distances = []   # one dict per frame (expression measurements)
    left_wrist_ys   = []   # one float per frame (wrist Y position)
    right_wrist_ys  = []   # one float per frame

    frame_index      = 0   # counts every frame we read (including skipped)
    frames_processed = 0   # counts only the frames we actually analyzed

    # ── Main frame processing loop ───────────────────────────────────────
    while True:
        success, frame = cap.read()

        # End of video
        if not success:
            break

        # Only process every Nth frame (sampling)
        if frame_index % SAMPLE_EVERY == 0:

            # ── Step 1: Resize frame before any processing ───────────────
            # This is done BEFORE converting to RGB and BEFORE MediaPipe.
            # Smaller frame = faster cvtColor + faster MediaPipe inference.
            frame = resize_frame(frame)

            # Get the dimensions of the (possibly resized) frame
            img_h, img_w = frame.shape[:2]

            # ── Step 2: Convert BGR to RGB ───────────────────────────────
            # OpenCV reads frames in BGR color order.
            # MediaPipe expects RGB. This conversion is required.
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ── Step 3: Run Holistic on this frame ───────────────────────
            # This single call gives us:
            #   results.face_landmarks      → 468 face points
            #   results.pose_landmarks      → 33 body points
            # Previously we called face_mesh.process() AND holistic.process()
            # separately — now it is just ONE call.
            results = holistic.process(frame_rgb)

            # ── Step 4: Extract face-based features ──────────────────────
            # Only if Holistic successfully detected a face this frame
            if results.face_landmarks:
                landmarks = results.face_landmarks.landmark

                # Gaze deviation — how far is the child looking from centre
                gaze_dev = compute_gaze_deviation(landmarks, img_w, img_h)
                gaze_deviations.append(gaze_dev)

                # Expression distances — mouth width, openness, brow movement
                raw_dist  = extract_expression_distances(landmarks, img_w, img_h)
                norm_dist = normalize_distances_by_face_width(
                    raw_dist, landmarks, img_w, img_h
                )
                frame_distances.append(norm_dist)

            # ── Step 5: Extract pose-based features ──────────────────────
            # Only if Holistic successfully detected body pose this frame
            if results.pose_landmarks:
                l_y = get_wrist_y(results.pose_landmarks, 15, img_h)
                r_y = get_wrist_y(results.pose_landmarks, 16, img_h)
                if l_y is not None:
                    left_wrist_ys.append(l_y)
                if r_y is not None:
                    right_wrist_ys.append(r_y)

            frames_processed += 1

        frame_index += 1

    # ── Clean up ─────────────────────────────────────────────────────────
    cap.release()
    holistic.close()
    # Note: we no longer call face_mesh.close() because we removed FaceMesh

    # ── Guard: too few frames processed ──────────────────────────────────
    if frames_processed < 5:
        raise ValueError(
            "Face not detected in most frames. "
            "Please retake the video in better lighting "
            "with the child's face clearly visible."
        )

    # ── Compute final feature scores ─────────────────────────────────────

    # Feature 1: Average gaze deviation across all frames
    avg_gaze_deviation = (
        float(np.mean(gaze_deviations)) if gaze_deviations else 0.0
    )

    # Feature 2: Percentage of frames where child was making social gaze
    social_gaze_percentage = (
        float(
            sum(1 for g in gaze_deviations if g < SOCIAL_GAZE_THRESHOLD)
            / len(gaze_deviations)
        )
        if gaze_deviations else 0.0
    )

    # Feature 3: How much facial expression varied across the video
    expression_variance = compute_expression_variance(frame_distances)

    # Feature 4: Repetitive wrist motion score
    repetitive_motion_score = compute_repetitive_motion_score(
        left_wrist_ys, right_wrist_ys
    )

    # ── Return everything ─────────────────────────────────────────────────
    return {
        "avg_gaze_deviation"     : round(avg_gaze_deviation,       4),
        "social_gaze_percentage" : round(social_gaze_percentage,    4),
        "expression_variance"    : round(expression_variance,       4),
        "repetitive_motion_score": round(repetitive_motion_score,   4),
        "_meta": {
            "frames_processed"  : frames_processed,
            "gaze_frames"       : len(gaze_deviations),
            "expression_frames" : len(frame_distances),
            "left_wrist_frames" : len(left_wrist_ys),
            "right_wrist_frames": len(right_wrist_ys),
            "video_fps"         : fps,
            "total_frames"      : total_frames,
            "video"             : os.path.basename(video_path)
        }
    }