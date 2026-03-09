import numpy as np
import cv2
import mediapipe as mp
import os
import warnings
warnings.filterwarnings("ignore")

mp_holistic = mp.solutions.holistic

# Pose landmark indices for wrists
LEFT_WRIST  = 15
RIGHT_WRIST = 16


def get_wrist_y(pose_landmarks, wrist_index: int, img_height: int) -> float | None:
    # Returns wrist Y pixel coordinate, or None if landmark not visible
    lm = pose_landmarks.landmark[wrist_index]
    if lm.visibility < 0.5:
        return None
    return lm.y * img_height


def compute_mean_crossing_rate(signal: list[float]) -> float:
    # Counts how many times signal crosses its mean value, normalized by length
    # High rate = oscillatory/repetitive. Low rate = smooth purposeful movement.
    if len(signal) < 3:
        return 0.0
    arr  = np.array(signal)
    mean = np.mean(arr)
    centered   = arr - mean
    crossings  = np.sum(np.diff(np.sign(centered)) != 0)
    return float(crossings / len(signal))


def compute_repetitive_motion_score(left_wrist_ys: list[float],
                                     right_wrist_ys: list[float]) -> float:
    # Combines left and right wrist mean crossing rates into one score
    # Uses whichever wrist has more data points
    scores = []
    if len(left_wrist_ys) >= 3:
        scores.append(compute_mean_crossing_rate(left_wrist_ys))
    if len(right_wrist_ys) >= 3:
        scores.append(compute_mean_crossing_rate(right_wrist_ys))
    if not scores:
        return 0.0
    return float(np.mean(scores))


if __name__ == "__main__":
    base_dir   = os.path.dirname(os.path.abspath(__file__))
    video_path = os.path.join(base_dir, "videos", "test1.mp4")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open {video_path}")
        exit(1)

    holistic = mp_holistic.Holistic(
        static_image_mode        = False,
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )

    left_ys  = []
    right_ys = []
    frame_index = 0
    SAMPLE_EVERY = 30

    print("[INFO] Extracting wrist motion from test1.mp4...")
    print(f"{'Frame':>8} | {'Left Wrist Y':>14} | {'Right Wrist Y':>14}")
    print("-" * 45)

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_index % SAMPLE_EVERY == 0:
            img_h, img_w = frame.shape[:2]
            frame_rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results      = holistic.process(frame_rgb)

            l_y = r_y = None

            if results.pose_landmarks:
                l_y = get_wrist_y(results.pose_landmarks, LEFT_WRIST,  img_h)
                r_y = get_wrist_y(results.pose_landmarks, RIGHT_WRIST, img_h)

                if l_y is not None:
                    left_ys.append(l_y)
                if r_y is not None:
                    right_ys.append(r_y)

            l_str = f"{l_y:>14.2f}" if l_y is not None else "     NOT SEEN"
            r_str = f"{r_y:>14.2f}" if r_y is not None else "     NOT SEEN"
            print(f"{frame_index:>8} | {l_str} | {r_str}")

        frame_index += 1

    cap.release()
    holistic.close()

    score = compute_repetitive_motion_score(left_ys, right_ys)

    print("-" * 45)
    print(f"[RESULT] Left wrist frames collected  : {len(left_ys)}")
    print(f"[RESULT] Right wrist frames collected : {len(right_ys)}")
    print(f"[RESULT] Repetitive motion score      : {score:.6f}")
    print()
    print("[INTERPRETATION]")
    if score < 0.3:
        print("  Low repetitive motion — wrist movement appears purposeful")
    elif score < 0.6:
        print("  Medium — some oscillatory wrist movement detected")
    else:
        print("  High — frequent wrist oscillation, potential repetitive motion")
