import warnings
warnings.filterwarnings("ignore")
import cv2
import mediapipe as mp
import numpy as np
import os



# --- MediaPipe setup ---
# We initialize these once at module level, not inside functions.
# Reason: MediaPipe models take time to load. Loading them once and
# reusing them across many frames is far more efficient.
mp_face_mesh = mp.solutions.face_mesh
mp_drawing   = mp.solutions.drawing_utils

# These are the 4 landmark indices for the left eye.
# They are fixed constants defined by MediaPipe's face topology.
LEFT_EYE_TOP_LID    = 159   # top eyelid center
LEFT_EYE_BOTTOM_LID = 145   # bottom eyelid center
LEFT_EYE_OUTER      = 33    # outer eye corner
LEFT_EYE_INNER      = 133   # inner eye corner (toward nose)


def get_landmark_pixels(landmark, img_width: int, img_height: int) -> tuple[int, int]:
    """
    Converts a single MediaPipe landmark from normalized coordinates
    to pixel coordinates.

    MediaPipe returns x,y as fractions of image dimensions (0.0 to 1.0).
    Multiplying by image dimensions gives actual pixel position.

    Args:
        landmark:   A single MediaPipe NormalizedLandmark object
        img_width:  Width of the image in pixels
        img_height: Height of the image in pixels

    Returns:
        (pixel_x, pixel_y) as integers
    """
    pixel_x = int(landmark.x * img_width)
    pixel_y = int(landmark.y * img_height)
    return pixel_x, pixel_y


def compute_gaze_deviation(landmarks, img_width: int, img_height: int) -> float:
    """
    Computes a normalized gaze deviation score for the left eye.

    The score represents how far the estimated gaze center is from
    the geometric center of the eye opening. Higher score = more deviation
    from forward gaze.

    Score of 0.0 = perfect forward gaze (iris centered in eye)
    Score of 1.0 = maximum deviation (iris at extreme edge of eye)

    Args:
        landmarks:  Full list of 468 MediaPipe face landmarks
        img_width:  Image width in pixels
        img_height: Image height in pixels

    Returns:
        Float between 0.0 and 1.0 representing gaze deviation
    """

    # Extract the 4 eye landmarks we care about
    top    = get_landmark_pixels(landmarks[LEFT_EYE_TOP_LID],    img_width, img_height)
    bottom = get_landmark_pixels(landmarks[LEFT_EYE_BOTTOM_LID], img_width, img_height)
    outer  = get_landmark_pixels(landmarks[LEFT_EYE_OUTER],      img_width, img_height)
    inner  = get_landmark_pixels(landmarks[LEFT_EYE_INNER],      img_width, img_height)

    # Calculate the geometric center of the eye bounding box
    # This is the point where the iris SHOULD be if looking straight ahead
    eye_center_x = (outer[0] + inner[0]) / 2
    eye_center_y = (top[1]   + bottom[1]) / 2

    # Calculate eye dimensions for normalization
    eye_width  = abs(inner[0] - outer[0])   # horizontal span of eye
    eye_height = abs(top[1]   - bottom[1])  # vertical span of eye

    # Guard against division by zero if eye is not detected properly
    if eye_width == 0 or eye_height == 0:
        return 0.0

    # The "gaze center" we estimate is the midpoint of top and bottom lid
    # horizontally, and the midpoint of inner and outer corners vertically.
    # This is our proxy for iris position.
    gaze_x = (top[0]   + bottom[0]) / 2
    gaze_y = (outer[1] + inner[1])  / 2

    # Compute how far the gaze center is from the eye center
    # Normalize by eye dimensions so the score is scale-invariant
    deviation_x = abs(gaze_x - eye_center_x) / eye_width
    deviation_y = abs(gaze_y - eye_center_y) / eye_height

    # Combine horizontal and vertical deviation into single score
    # We weight horizontal more heavily (0.7) because left-right gaze
    # is more diagnostically relevant than up-down gaze for social attention
    gaze_deviation = (0.7 * deviation_x) + (0.3 * deviation_y)

    # Clip to [0, 1] range in case of numerical edge cases
    return float(np.clip(gaze_deviation, 0.0, 1.0))


def process_frame(frame: np.ndarray, face_mesh, draw_landmarks: bool = True) -> dict:
    """
    Runs MediaPipe Face Mesh on a single frame.
    Extracts eye landmarks, draws them, and computes gaze deviation.

    Args:
        frame:          BGR image as NumPy array (from OpenCV)
        face_mesh:      Initialized MediaPipe FaceMesh object
        draw_landmarks: If True, draws landmark points on the frame

    Returns:
        Dictionary with keys:
            face_detected   : bool
            gaze_deviation  : float (0.0 if no face)
            landmark_pixels : dict of landmark index → (x, y) pixels
            annotated_frame : frame with drawings (or original if no face)
    """

    img_height, img_width = frame.shape[:2]

    # MediaPipe requires RGB input. OpenCV loads images as BGR.
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Run face mesh detection
    results = face_mesh.process(frame_rgb)

    # Prepare output dictionary with default values
    output = {
        "face_detected"   : False,
        "gaze_deviation"  : 0.0,
        "landmark_pixels" : {},
        "annotated_frame" : frame.copy()
    }

    # If no face detected, return defaults
    if not results.multi_face_landmarks:
        return output

    # Take the first detected face only
    # multi_face_landmarks is a list — one entry per detected face
    face_landmarks = results.multi_face_landmarks[0]
    landmarks      = face_landmarks.landmark  # list of 468 NormalizedLandmark objects

    output["face_detected"] = True

    # Extract and store pixel coordinates for our 4 key landmarks
    indices_of_interest = {
        "top_lid" : LEFT_EYE_TOP_LID,
        "bot_lid" : LEFT_EYE_BOTTOM_LID,
        "outer"   : LEFT_EYE_OUTER,
        "inner"   : LEFT_EYE_INNER
    }

    for name, idx in indices_of_interest.items():
        px, py = get_landmark_pixels(landmarks[idx], img_width, img_height)
        output["landmark_pixels"][name] = (px, py)

    # Compute gaze deviation score
    output["gaze_deviation"] = compute_gaze_deviation(landmarks, img_width, img_height)

    # Draw landmarks on the frame if requested
    if draw_landmarks:
        annotated = frame.copy()

        # Draw all 468 landmarks as small grey dots (subtle background)
        for lm in landmarks:
            px = int(lm.x * img_width)
            py = int(lm.y * img_height)
            cv2.circle(annotated, (px, py), 1, (180, 180, 180), -1)

        # Draw our 4 key eye landmarks as larger colored dots
        colors = {
            "top_lid" : (0, 255, 0),    # green
            "bot_lid" : (0, 255, 0),    # green
            "outer"   : (255, 0, 0),    # blue
            "inner"   : (0, 0, 255),    # red
        }
        for name, (px, py) in output["landmark_pixels"].items():
            cv2.circle(annotated, (px, py), 5, colors[name], -1)
            cv2.putText(annotated, name, (px + 6, py),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, colors[name], 1)

        # Draw gaze deviation score on frame
        score_text = f"Gaze Dev: {output['gaze_deviation']:.3f}"
        cv2.putText(annotated, score_text, (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2)

        output["annotated_frame"] = annotated

    return output


def analyze_video_frames(video_name: str, sample_every_n: int = 30) -> list[dict]:
    """
    Runs the full pipeline on one video:
    1. Extracts frames using OpenCV
    2. Runs MediaPipe on each frame
    3. Prints per-frame gaze scores
    4. Saves annotated frames to outputs folder

    Args:
        video_name:     Name of video file without extension e.g. "test1"
        sample_every_n: Sample every N frames

    Returns:
        List of per-frame result dictionaries
    """

    base_dir   = os.path.dirname(os.path.abspath(__file__))
    video_path = os.path.join(base_dir, "videos", f"{video_name}.mp4")
    output_dir = os.path.join(base_dir, "outputs", f"{video_name}_annotated")

    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)

    print(f"\n[INFO] Analyzing: {video_name}.mp4")
    print(f"[INFO] Total frames: {total_frames} | FPS: {fps:.1f}")
    print("-" * 60)
    print(f"{'Frame':>8} | {'Face':>6} | {'Gaze Dev':>10} | Landmarks")
    print("-" * 60)

    # Initialize FaceMesh ONCE outside the loop
    # min_detection_confidence: how confident MediaPipe must be to report a face
    # min_tracking_confidence:  how confident it must be to keep tracking
    # Setting both to 0.5 is a balanced default for varied real-world video
    face_mesh = mp_face_mesh.FaceMesh(
        static_image_mode        = False,
        max_num_faces            = 1,
        min_detection_confidence = 0.5,
        min_tracking_confidence  = 0.5
    )

    frame_results = []
    frame_index   = 0
    saved_count   = 0

    while True:
        success, frame = cap.read()
        if not success:
            break

        if frame_index % sample_every_n == 0:
            result = process_frame(frame, face_mesh, draw_landmarks=True)

            # Save annotated frame to disk
            out_path = os.path.join(output_dir, f"frame_{saved_count:05d}.jpg")
            cv2.imwrite(out_path, result["annotated_frame"])

            # Print structured per-frame output
            face_str = "YES" if result["face_detected"] else "NO "
            dev_str  = f"{result['gaze_deviation']:.4f}"

            if result["face_detected"]:
                lm = result["landmark_pixels"]
                lm_str = (f"top={lm['top_lid']} "
                          f"bot={lm['bot_lid']} "
                          f"out={lm['outer']} "
                          f"inn={lm['inner']}")
            else:
                lm_str = "no face detected"

            print(f"{frame_index:>8} | {face_str:>6} | {dev_str:>10} | {lm_str}")

            frame_results.append({
                "frame_index"   : frame_index,
                "face_detected" : result["face_detected"],
                "gaze_deviation": result["gaze_deviation"],
                "landmarks"     : result["landmark_pixels"]
            })

            saved_count += 1

        frame_index += 1

    cap.release()
    face_mesh.close()

    # Summary statistics
    detected     = [r for r in frame_results if r["face_detected"]]
    detection_rate = len(detected) / len(frame_results) * 100 if frame_results else 0
    avg_deviation  = np.mean([r["gaze_deviation"] for r in detected]) if detected else 0.0

    print("-" * 60)
    print(f"[SUMMARY] Frames analyzed : {len(frame_results)}")
    print(f"[SUMMARY] Face detected   : {len(detected)}/{len(frame_results)} ({detection_rate:.1f}%)")
    print(f"[SUMMARY] Avg gaze dev    : {avg_deviation:.4f}")
    print(f"[SUMMARY] Annotated frames saved to: {output_dir}")

    return frame_results


if __name__ == "__main__":

    base_dir   = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(base_dir, "videos")

    # Find all mp4 files automatically
    video_files = sorted([
        f for f in os.listdir(videos_dir)
        if f.endswith(".mp4")
    ])

    if not video_files:
        print("[ERROR] No .mp4 files found in videos/ folder")
        exit(1)

    print(f"[INFO] Found {len(video_files)} videos to analyze")

    # Store summary results for all videos
    batch_summary = []

    for video_filename in video_files:
        video_name = os.path.splitext(video_filename)[0]

        try:
            results = analyze_video_frames(video_name, sample_every_n=30)

            detected   = [r for r in results if r["face_detected"]]
            total      = len(results)
            det_count  = len(detected)
            det_rate   = det_count / total * 100 if total > 0 else 0
            avg_dev    = np.mean([r["gaze_deviation"] for r in detected]) if detected else 0.0

            batch_summary.append({
                "video"          : video_filename,
                "total_frames"   : total,
                "faces_detected" : det_count,
                "detection_rate" : det_rate,
                "avg_gaze_dev"   : avg_dev
            })

        except Exception as e:
            print(f"[ERROR] Failed on {video_filename}: {e}")
            batch_summary.append({
                "video"          : video_filename,
                "total_frames"   : 0,
                "faces_detected" : 0,
                "detection_rate" : 0.0,
                "avg_gaze_dev"   : 0.0
            })

    # Print final comparison table
    print("\n" + "=" * 70)
    print("BATCH SUMMARY — ALL VIDEOS")
    print("=" * 70)
    print(f"{'Video':<15} | {'Frames':>7} | {'Detected':>9} | {'Det Rate':>9} | {'Avg Gaze Dev':>13}")
    print("-" * 70)

    for s in batch_summary:
        print(
            f"{s['video']:<15} | "
            f"{s['total_frames']:>7} | "
            f"{s['faces_detected']:>9} | "
            f"{s['detection_rate']:>8.1f}% | "
            f"{s['avg_gaze_dev']:>13.4f}"
        )

    print("=" * 70)

    # Engineering insight — flag low detection rate videos
    print("\n[QUALITY FLAGS]")
    for s in batch_summary:
        if s["detection_rate"] < 60.0:
            print(f"  [WARN] {s['video']} — low detection rate ({s['detection_rate']:.1f}%). "
                  f"Check lighting or face visibility in this video.")
        elif s["detection_rate"] >= 80.0:
            print(f"  [GOOD] {s['video']} — strong detection rate ({s['detection_rate']:.1f}%)")
        else:
            print(f"  [OK]   {s['video']} — acceptable detection rate ({s['detection_rate']:.1f}%)")
