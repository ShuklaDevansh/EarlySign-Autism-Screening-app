import numpy as np

# ---------------------------------------------------------------------------
# Landmark indices for expression measurement
# These are fixed anatomical points in MediaPipe's 468-point face topology
# ---------------------------------------------------------------------------

# Mouth corners — track smile width and lateral mouth movement
MOUTH_LEFT  = 61
MOUTH_RIGHT = 291

# Mouth opening — track vertical mouth movement (surprise, speech, yawn)
MOUTH_TOP    = 13
MOUTH_BOTTOM = 14

# Eyebrow landmarks — track brow raise and furrow
LEFT_BROW_INNER  = 70
LEFT_BROW_OUTER  = 63
RIGHT_BROW_INNER = 300
RIGHT_BROW_OUTER = 293


def euclidean_distance(point_a: tuple, point_b: tuple) -> float:
    return float(np.linalg.norm(
        np.array(point_a) - np.array(point_b)
    ))


def get_pixel(landmark, img_width: int, img_height: int) -> tuple:
    return (
        int(landmark.x * img_width),
        int(landmark.y * img_height)
    )


def extract_expression_distances(landmarks, img_width: int, img_height: int) -> dict:
    # Convert each relevant landmark to pixel coordinates
    mouth_left   = get_pixel(landmarks[MOUTH_LEFT],   img_width, img_height)
    mouth_right  = get_pixel(landmarks[MOUTH_RIGHT],  img_width, img_height)
    mouth_top    = get_pixel(landmarks[MOUTH_TOP],    img_width, img_height)
    mouth_bottom = get_pixel(landmarks[MOUTH_BOTTOM], img_width, img_height)

    left_brow_inner  = get_pixel(landmarks[LEFT_BROW_INNER],  img_width, img_height)
    left_brow_outer  = get_pixel(landmarks[LEFT_BROW_OUTER],  img_width, img_height)
    right_brow_inner = get_pixel(landmarks[RIGHT_BROW_INNER], img_width, img_height)
    right_brow_outer = get_pixel(landmarks[RIGHT_BROW_OUTER], img_width, img_height)

    return {
        "mouth_width"      : euclidean_distance(mouth_left, mouth_right),
        "mouth_openness"   : euclidean_distance(mouth_top, mouth_bottom),
        "left_brow_width"  : euclidean_distance(left_brow_inner, left_brow_outer),
        "right_brow_width" : euclidean_distance(right_brow_inner, right_brow_outer)
    }


def normalize_distances_by_face_width(distances: dict, landmarks,
                                       img_width: int, img_height: int) -> dict:
    # Measure face width using outermost cheek landmarks
    left_face_edge  = get_pixel(landmarks[234], img_width, img_height)
    right_face_edge = get_pixel(landmarks[454], img_width, img_height)
    face_width      = euclidean_distance(left_face_edge, right_face_edge)

    # Guard against division by zero if face measurement fails
    if face_width < 1.0:
        return distances

    # Normalize each distance by face width
    return {
        key: value / face_width
        for key, value in distances.items()
    }


def compute_expression_variance(frame_distances: list[dict]) -> float:
    if len(frame_distances) < 2:
        return 0.0

    # Extract each distance type as a time series
    mouth_widths      = [d["mouth_width"]      for d in frame_distances]
    mouth_openness    = [d["mouth_openness"]    for d in frame_distances]
    left_brow_widths  = [d["left_brow_width"]  for d in frame_distances]
    right_brow_widths = [d["right_brow_width"] for d in frame_distances]

    # Compute standard deviation for each time series
    # ddof=1 uses sample std deviation (correct for small samples)
    std_mouth_width     = float(np.std(mouth_widths,      ddof=1))
    std_mouth_openness  = float(np.std(mouth_openness,    ddof=1))
    std_left_brow       = float(np.std(left_brow_widths,  ddof=1))
    std_right_brow      = float(np.std(right_brow_widths, ddof=1))

    # Average the 4 std deviations into one expression variance score
    expression_variance = np.mean([
        std_mouth_width,
        std_mouth_openness,
        std_left_brow,
        std_right_brow
    ])

    return float(expression_variance)


if __name__ == "__main__":
    import cv2
    import mediapipe as mp
    import os
    import warnings
    warnings.filterwarnings("ignore")

    mp_face_mesh = mp.solutions.face_mesh

    base_dir   = os.path.dirname(os.path.abspath(__file__))
    video_path = os.path.join(base_dir, "videos", "test1.mp4")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open {video_path}")
        exit(1)

    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode        = False,
        max_num_faces            = 1,
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )

    frame_distances = []
    frame_index     = 0
    SAMPLE_EVERY    = 30

    print("[INFO] Extracting expression distances from test1.mp4...")
    print(f"{'Frame':>8} | {'Mouth W':>10} | {'Mouth O':>10} | "
          f"{'L Brow':>10} | {'R Brow':>10}")
    print("-" * 60)

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_index % SAMPLE_EVERY == 0:
            img_h, img_w = frame.shape[:2]
            frame_rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results      = face_mesh.process(frame_rgb)

            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark

                raw_distances = extract_expression_distances(
                    landmarks, img_w, img_h
                )
                norm_distances = normalize_distances_by_face_width(
                    raw_distances, landmarks, img_w, img_h
                )

                frame_distances.append(norm_distances)

                print(
                    f"{frame_index:>8} | "
                    f"{norm_distances['mouth_width']:>10.4f} | "
                    f"{norm_distances['mouth_openness']:>10.4f} | "
                    f"{norm_distances['left_brow_width']:>10.4f} | "
                    f"{norm_distances['right_brow_width']:>10.4f}"
                )

        frame_index += 1

    cap.release()
    face_mesh.close()

    variance = compute_expression_variance(frame_distances)

    print("-" * 60)
    print(f"[RESULT] Frames with expression data : {len(frame_distances)}")
    print(f"[RESULT] Expression variance score   : {variance:.6f}")
    print()
    print("[INTERPRETATION]")
    if variance < 0.02:
        print("  Low variance — relatively flat expression across video")
    elif variance < 0.05:
        print("  Medium variance — moderate expression change")
    else:
        print("  High variance — expressive, dynamic facial movement")