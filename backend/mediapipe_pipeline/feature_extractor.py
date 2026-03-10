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

# initialize models using legacy solutions API
mp_face_mesh = mp.solutions.face_mesh
mp_holistic  = mp.solutions.holistic

# gaze deviation below this = looking roughly forward (Tariq et al. 2018)
SOCIAL_GAZE_THRESHOLD = 0.15

# sample 1 frame per second at 30fps
SAMPLE_EVERY = 30


def extract_features(video_path: str) -> dict:
    # master function — takes video path, returns 4-feature vector + meta

    if not os.path.exists(video_path):
        print(f"[ERROR] Video not found: {video_path}")
        return None

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open video: {video_path}")
        return None

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)

    print(f"[INFO] Processing: {os.path.basename(video_path)}")
    print(f"[INFO] {total_frames} frames at {fps:.1f}fps — "
          f"sampling every {SAMPLE_EVERY} frames")

    # initialize both models once before the loop
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode        = False,
        max_num_faces            = 1,
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )
    holistic = mp_holistic.Holistic(
        static_image_mode        = False,
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )

    # accumulators — collect data across all sampled frames
    gaze_deviations = []
    frame_distances = []
    left_wrist_ys   = []
    right_wrist_ys  = []

    frame_index      = 0
    frames_processed = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_index % SAMPLE_EVERY == 0:
            img_h, img_w = frame.shape[:2]
            frame_rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # --- gaze + expression via face mesh ---
            face_results = face_mesh.process(frame_rgb)

            if face_results.multi_face_landmarks:
                landmarks = face_results.multi_face_landmarks[0].landmark

                # gaze deviation
                gaze_dev = compute_gaze_deviation(landmarks, img_w, img_h)
                gaze_deviations.append(gaze_dev)

                # expression distances
                raw_dist  = extract_expression_distances(landmarks, img_w, img_h)
                norm_dist = normalize_distances_by_face_width(
                    raw_dist, landmarks, img_w, img_h
                )
                frame_distances.append(norm_dist)

            # --- wrist motion via holistic ---
            pose_results = holistic.process(frame_rgb)

            if pose_results.pose_landmarks:
                l_y = get_wrist_y(pose_results.pose_landmarks, 15, img_h)
                r_y = get_wrist_y(pose_results.pose_landmarks, 16, img_h)
                if l_y is not None:
                    left_wrist_ys.append(l_y)
                if r_y is not None:
                    right_wrist_ys.append(r_y)

            frames_processed += 1

        frame_index += 1

    cap.release()
    face_mesh.close()
    holistic.close()

    # --- compute final 4 features ---
    avg_gaze_deviation = (
        float(np.mean(gaze_deviations)) if gaze_deviations else 0.0
    )
    social_gaze_percentage = (
        float(sum(1 for g in gaze_deviations if g < SOCIAL_GAZE_THRESHOLD)
              / len(gaze_deviations))
        if gaze_deviations else 0.0
    )
    expression_variance     = compute_expression_variance(frame_distances)
    repetitive_motion_score = compute_repetitive_motion_score(
        left_wrist_ys, right_wrist_ys
    )

    return {
        "avg_gaze_deviation"     : round(avg_gaze_deviation,      4),
        "social_gaze_percentage" : round(social_gaze_percentage,   4),
        "expression_variance"    : round(expression_variance,      4),
        "repetitive_motion_score": round(repetitive_motion_score,  4),
        "_meta": {
            "frames_processed"  : frames_processed,
            "gaze_frames"       : len(gaze_deviations),
            "expression_frames" : len(frame_distances),
            "left_wrist_frames" : len(left_wrist_ys),
            "right_wrist_frames": len(right_wrist_ys),
            "video"             : os.path.basename(video_path)
        }
    }