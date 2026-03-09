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

mp_face_mesh = mp.solutions.face_mesh
mp_holistic  = mp.solutions.holistic

# Gaze deviation below this threshold = child looking roughly forward
# Derived from: Tariq et al. 2018 — forward gaze defined as < 15% deviation
SOCIAL_GAZE_THRESHOLD = 0.15

SAMPLE_EVERY = 30  # process 1 frame per second at 30fps


def extract_features(video_path: str) -> dict:
    # Master function — takes a video path, returns 4-feature vector
    # Returns None if video cannot be opened

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

    # Initialize both models once before the loop
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

    # Accumulators — collect data across all frames
    gaze_deviations  = []   # float per detected frame
    frame_distances  = []   # dict per detected frame
    left_wrist_ys    = []   # float per visible frame
    right_wrist_ys   = []   # float per visible frame

    frame_index      = 0
    frames_processed = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_index % SAMPLE_EVERY == 0:
            img_h, img_w = frame.shape[:2]
            frame_rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # --- Gaze + Expression via Face Mesh ---
            face_results = face_mesh.process(frame_rgb)

            if face_results.multi_face_landmarks:
                landmarks = face_results.multi_face_landmarks[0].landmark

                # Gaze deviation
                gaze_dev = compute_gaze_deviation(landmarks, img_w, img_h)
                gaze_deviations.append(gaze_dev)

                # Expression distances
                raw_dist  = extract_expression_distances(landmarks, img_w, img_h)
                norm_dist = normalize_distances_by_face_width(
                    raw_dist, landmarks, img_w, img_h
                )
                frame_distances.append(norm_dist)

            # --- Wrist motion via Holistic ---
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

    # --- Compute final 4 features ---

    # Feature 1: average gaze deviation across detected frames
    avg_gaze_deviation = (
        float(np.mean(gaze_deviations)) if gaze_deviations else 0.0
    )

    # Feature 2: percentage of detected frames with forward-looking gaze
    social_gaze_percentage = (
        float(sum(1 for g in gaze_deviations if g < SOCIAL_GAZE_THRESHOLD)
              / len(gaze_deviations))
        if gaze_deviations else 0.0
    )

    # Feature 3: expression variance across detected frames
    expression_variance = compute_expression_variance(frame_distances)

    # Feature 4: repetitive motion score from wrist oscillation
    repetitive_motion_score = compute_repetitive_motion_score(
        left_wrist_ys, right_wrist_ys
    )

    feature_vector = {
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

    return feature_vector


def print_feature_vector(fv: dict) -> None:
    # Prints feature vector in clean readable format
    if fv is None:
        print("[ERROR] No feature vector to display")
        return

    meta = fv["_meta"]
    print("\n" + "=" * 55)
    print(f"FEATURE VECTOR — {meta['video']}")
    print("=" * 55)
    print(f"  avg_gaze_deviation      : {fv['avg_gaze_deviation']:.4f}")
    print(f"  social_gaze_percentage  : {fv['social_gaze_percentage']:.4f}  "
          f"({fv['social_gaze_percentage']*100:.1f}% of frames)")
    print(f"  expression_variance     : {fv['expression_variance']:.4f}")
    print(f"  repetitive_motion_score : {fv['repetitive_motion_score']:.4f}")
    print("-" * 55)
    print(f"  frames processed        : {meta['frames_processed']}")
    print(f"  gaze frames             : {meta['gaze_frames']}")
    print(f"  expression frames       : {meta['expression_frames']}")
    print(f"  left wrist frames       : {meta['left_wrist_frames']}")
    print(f"  right wrist frames      : {meta['right_wrist_frames']}")
    print("=" * 55)


if __name__ == "__main__":
    base_dir   = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(base_dir, "videos")

    video_files = sorted([
        f for f in os.listdir(videos_dir) if f.endswith(".mp4")
    ])

    all_vectors = {}

    for filename in video_files:
        video_path = os.path.join(videos_dir, filename)
        fv = extract_features(video_path)
        print_feature_vector(fv)
        all_vectors[filename] = fv

    # Comparison table across all videos
    print("\n" + "=" * 75)
    print("BATCH COMPARISON — ALL VIDEOS")
    print("=" * 75)
    print(f"{'Video':<12} | {'GazeDev':>8} | {'SocialGz':>9} | "
          f"{'ExprVar':>8} | {'RepMotion':>10}")
    print("-" * 75)

    for filename, fv in all_vectors.items():
        if fv:
            print(
                f"{filename:<12} | "
                f"{fv['avg_gaze_deviation']:>8.4f} | "
                f"{fv['social_gaze_percentage']:>8.1%} | "
                f"{fv['expression_variance']:>8.4f} | "
                f"{fv['repetitive_motion_score']:>10.4f}"
            )

    print("=" * 75)