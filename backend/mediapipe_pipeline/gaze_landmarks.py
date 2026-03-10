import cv2
import mediapipe as mp
import numpy as np
import os
import warnings
warnings.filterwarnings("ignore")

# left eye landmark indices — fixed by MediaPipe face topology
LEFT_EYE_TOP_LID    = 159
LEFT_EYE_BOTTOM_LID = 145
LEFT_EYE_OUTER      = 33
LEFT_EYE_INNER      = 133


def get_landmark_pixels(landmark, img_width: int, img_height: int) -> tuple:
    # converts normalized mediapipe coords to pixel coords
    return (int(landmark.x * img_width), int(landmark.y * img_height))


def compute_gaze_deviation(landmarks, img_width: int, img_height: int) -> float:
    # computes normalized gaze deviation score for left eye
    # 0.0 = looking straight ahead, 1.0 = maximum deviation
    top    = get_landmark_pixels(landmarks[LEFT_EYE_TOP_LID],    img_width, img_height)
    bottom = get_landmark_pixels(landmarks[LEFT_EYE_BOTTOM_LID], img_width, img_height)
    outer  = get_landmark_pixels(landmarks[LEFT_EYE_OUTER],      img_width, img_height)
    inner  = get_landmark_pixels(landmarks[LEFT_EYE_INNER],      img_width, img_height)

    # geometric center of eye bounding box
    eye_center_x = (outer[0] + inner[0]) / 2
    eye_center_y = (top[1]   + bottom[1]) / 2

    # eye dimensions for normalization
    eye_width  = abs(inner[0] - outer[0])
    eye_height = abs(top[1]   - bottom[1])

    # guard against division by zero
    if eye_width == 0 or eye_height == 0:
        return 0.0

    # proxy for iris position
    gaze_x = (top[0]   + bottom[0]) / 2
    gaze_y = (outer[1] + inner[1])  / 2

    # normalized deviation — horizontal weighted more (diagnostic relevance)
    deviation_x    = abs(gaze_x - eye_center_x) / eye_width
    deviation_y    = abs(gaze_y - eye_center_y) / eye_height
    gaze_deviation = (0.7 * deviation_x) + (0.3 * deviation_y)

    return float(np.clip(gaze_deviation, 0.0, 1.0))