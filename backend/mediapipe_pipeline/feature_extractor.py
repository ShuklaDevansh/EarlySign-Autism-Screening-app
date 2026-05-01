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


# Constants

SOCIAL_GAZE_THRESHOLD = 0.15

SAMPLE_EVERY = 30

PROCESS_WIDTH = 640

# Blur threshold
BLUR_THRESHOLD = 80

# Brightness range 
MIN_BRIGHTNESS = 30
MAX_BRIGHTNESS = 230

def is_frame_usable(frame) -> tuple:
    
    # Checks if a frame is good enough quality for MediaPipe to process.
    # This runs BEFORE MediaPipe so bad frames never waste processing time.

    #Gray Scale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    #Blur Check
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    if blur_score < BLUR_THRESHOLD:
        return False, f"blurry (score={blur_score:.1f})"

    #Brightness Check
    brightness = float(np.mean(gray))

    if brightness < MIN_BRIGHTNESS:
        return False, f"too dark (brightness={brightness:.1f})"

    if brightness > MAX_BRIGHTNESS:
        return False, f"overexposed (brightness={brightness:.1f})"

    return True, "ok"

def resize_frame(frame):
    
    h, w = frame.shape[:2]

    # If already small enough
    if w <= PROCESS_WIDTH:
        return frame

    # Calculate new height keeping the same aspect ratio
    scale      = PROCESS_WIDTH / w
    new_width  = PROCESS_WIDTH
    new_height = int(h * scale)

    return cv2.resize(frame, (new_width, new_height),
                      interpolation=cv2.INTER_AREA)


def extract_features(video_path: str) -> dict:

    
    if not os.path.exists(video_path):
        print(f"[ERROR] Video not found: {video_path}")
        return None

    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open video: {video_path}")
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)

    if fps <= 0:
        fps = 30.0

    print(f"[INFO] Processing: {os.path.basename(video_path)}")
    print(f"[INFO] {total_frames} total frames at {fps:.1f} fps")
    print(f"[INFO] Sampling every {SAMPLE_EVERY} frames")
    print(f"[INFO] Resizing each frame to {PROCESS_WIDTH}px wide before inference")

    
    mp_holistic = mp.solutions.holistic

    holistic = mp_holistic.Holistic(
        static_image_mode        = False,  # video mode — tracks across frames
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )

    
    gaze_deviations = []   
    frame_distances = []  
    left_wrist_ys   = []    
    right_wrist_ys  = []   

    frame_index      = 0
    frames_processed = 0
    frames_rejected  = 0   

    
    while True:
        success, frame = cap.read()

        if not success:
            break

        if frame_index % SAMPLE_EVERY == 0:
            usable, reason = is_frame_usable(frame)

            if not usable:
                print(f"[SKIP] Frame {frame_index} rejected — {reason}")
                frames_rejected += 1
                frame_index += 1
                continue

            frame = resize_frame(frame)

            img_h, img_w = frame.shape[:2]

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            results = holistic.process(frame_rgb)

            if results.face_landmarks:
                landmarks = results.face_landmarks.landmark

                # Gaze deviation 
                gaze_dev = compute_gaze_deviation(landmarks, img_w, img_h)
                gaze_deviations.append(gaze_dev)

                # Expression distances 
                raw_dist  = extract_expression_distances(landmarks, img_w, img_h)
                norm_dist = normalize_distances_by_face_width(
                    raw_dist, landmarks, img_w, img_h
                )
                frame_distances.append(norm_dist)

            
            if results.pose_landmarks:
                l_y = get_wrist_y(results.pose_landmarks, 15, img_h)
                r_y = get_wrist_y(results.pose_landmarks, 16, img_h)
                if l_y is not None:
                    left_wrist_ys.append(l_y)
                if r_y is not None:
                    right_wrist_ys.append(r_y)

            frames_processed += 1

        frame_index += 1

    
    cap.release()
    holistic.close()
    

    
    if frames_processed < 5:
        raise ValueError(
            "Face not detected in most frames. "
            "Please retake the video in better lighting "
            "with the child's face clearly visible."
        )

    
    avg_gaze_deviation = (
        float(np.mean(gaze_deviations)) if gaze_deviations else 0.0
    )

    
    social_gaze_percentage = (
        float(
            sum(1 for g in gaze_deviations if g < SOCIAL_GAZE_THRESHOLD)
            / len(gaze_deviations)
        )
        if gaze_deviations else 0.0
    )

    
    expression_variance = compute_expression_variance(frame_distances)

    
    repetitive_motion_score = compute_repetitive_motion_score(
        left_wrist_ys, right_wrist_ys
    )

    
    return {
        "avg_gaze_deviation"     : round(avg_gaze_deviation,       4),
        "social_gaze_percentage" : round(social_gaze_percentage,    4),
        "expression_variance"    : round(expression_variance,       4),
        "repetitive_motion_score": round(repetitive_motion_score,   4),
        "_meta": {
            "frames_processed"  : frames_processed,
            "frames_rejected"   : frames_rejected,
            "gaze_frames"       : len(gaze_deviations),
            "expression_frames" : len(frame_distances),
            "left_wrist_frames" : len(left_wrist_ys),
            "right_wrist_frames": len(right_wrist_ys),
            "video_fps"         : fps,
            "total_frames"      : total_frames,
            "video"             : os.path.basename(video_path)
        }
    }