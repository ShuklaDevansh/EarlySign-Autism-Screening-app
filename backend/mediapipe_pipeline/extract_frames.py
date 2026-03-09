import cv2
import os

def extract_frames(video_path: str, output_dir: str, sample_every_n: int = 30) -> list[str]:
    """
    Reads a video file and extracts one frame every sample_every_n frames.
    Saves each extracted frame as a JPEG image in output_dir.
    Returns a list of file paths to the saved frames.

    Args:
        video_path:      Full path to the input video file (.mp4 or similar)
        output_dir:      Folder where extracted frame images will be saved
        sample_every_n:  Extract one frame every N frames (default: 30)

    Returns:
        List of strings — file paths to each saved frame image
    """

    # --- Validate inputs before touching any files ---
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"[INFO] Created output directory: {output_dir}")

    # --- Open the video file ---
    # VideoCapture is OpenCV's video reader object.
    # Passing a file path opens that file for reading.
    # Passing an integer (e.g. 0) would open your webcam instead.
    cap = cv2.VideoCapture(video_path)

    # Always check if the file opened successfully.
    if not cap.isOpened():
        raise RuntimeError(f"OpenCV could not open video file: {video_path}")

    # --- Read video metadata ---
    # CAP_PROP constants are property codes OpenCV uses to query video info.
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps          = cap.get(cv2.CAP_PROP_FPS)
    width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height       = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"[INFO] Video loaded: {os.path.basename(video_path)}")
    print(f"[INFO] Resolution : {width} x {height} pixels")
    print(f"[INFO] FPS        : {fps:.2f}")
    print(f"[INFO] Total frames: {total_frames}")
    print(f"[INFO] Duration   : {total_frames / fps:.1f} seconds")
    print(f"[INFO] Sampling   : every {sample_every_n} frames (~1 frame per {sample_every_n/fps:.1f}s)")
    print(f"[INFO] Expected extracted frames: ~{total_frames // sample_every_n}")
    print("-" * 50)

    # --- Frame extraction loop ---
    saved_frame_paths = []
    frame_index       = 0   # counts every frame we read from the video
    saved_count       = 0   # counts only the frames we actually save

    while True:
        # cap.read() does two things at once:
        # 1. Reads the next frame from the video into memory
        # 2. Returns (success_flag, frame_as_numpy_array)
        # When the video ends, success becomes False and we break.
        success, frame = cap.read()

        if not success:
            # End of video reached
            break

        # Only process this frame if it falls on our sampling interval
        if frame_index % sample_every_n == 0:

            # Build the output file path for this frame
            # Zero-padding (05d) ensures files sort correctly: frame_00001 before frame_00010
            frame_filename = f"frame_{saved_count:05d}.jpg"
            frame_path     = os.path.join(output_dir, frame_filename)

            # Save the frame as a JPEG image to disk
            # imwrite returns True if save succeeded, False if it failed
            save_success = cv2.imwrite(frame_path, frame)

            if save_success:
                saved_frame_paths.append(frame_path)
                print(f"[FRAME] index={frame_index:05d} | saved as {frame_filename} | shape={frame.shape}")
                saved_count += 1
            else:
                print(f"[WARN] Failed to save frame at index {frame_index}")

        frame_index += 1

    # --- Always release the video capture object ---
    # This closes the file handle. Skipping this causes memory leaks.
    cap.release()

    print("-" * 50)
    print(f"[DONE] Extracted {saved_count} frames from {total_frames} total frames")
    print(f"[DONE] Frames saved to: {output_dir}")

    return saved_frame_paths


# --- Entry point for direct testing ---
# This block only runs when you execute this file directly.
# It will NOT run when another file imports this function.
if __name__ == "__main__":

    base_dir   = os.path.dirname(os.path.abspath(__file__))
    videos_dir = os.path.join(base_dir, "videos")

    # Automatically find all .mp4 files in the videos folder
    video_files = [
        f for f in os.listdir(videos_dir)
        if f.endswith(".mp4")
    ]

    if not video_files:
        print("[ERROR] No .mp4 files found in videos/ folder")
        exit(1)

    print(f"[INFO] Found {len(video_files)} video(s) to process")
    print("=" * 50)

    all_results = {}

    for video_filename in sorted(video_files):
        video_path = os.path.join(videos_dir, video_filename)
        video_name = os.path.splitext(video_filename)[0]  # "test1" from "test1.mp4"
        output_dir = os.path.join(base_dir, "outputs", f"{video_name}_frames")

        print(f"\n[PROCESSING] {video_filename}")
        print("=" * 50)

        try:
            frames = extract_frames(
                video_path     = video_path,
                output_dir     = output_dir,
                sample_every_n = 30
            )
            all_results[video_filename] = len(frames)

        except Exception as e:
            print(f"[ERROR] Failed to process {video_filename}: {e}")
            all_results[video_filename] = 0

    # Final summary across all videos
    print("\n" + "=" * 50)
    print("[SUMMARY] Frame extraction results:")
    print("=" * 50)
    for video_name, frame_count in all_results.items():
        status = "OK" if frame_count > 0 else "FAILED"
        print(f"  [{status}] {video_name:20s} → {frame_count} frames extracted")
    print("=" * 50)