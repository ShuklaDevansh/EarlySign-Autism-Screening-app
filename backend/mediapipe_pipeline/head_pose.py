import cv2
import numpy as np

# 3D face model points (standard research values in mm)
FACE_3D_MODEL = np.array([
    [0.0,    0.0,    0.0],      # Nose tip        — landmark 1
    [0.0,   -330.0, -65.0],     # Chin            — landmark 152
    [-225.0, 170.0, -135.0],    # Left eye outer  — landmark 33
    [225.0,  170.0, -135.0],    # Right eye outer — landmark 263
    [-150.0, -150.0, -125.0],   # Left mouth      — landmark 61
    [150.0,  -150.0, -125.0],   # Right mouth     — landmark 291
], dtype=np.float64)

LANDMARK_IDS = [1, 152, 33, 263, 61, 291]

# Head is considered forward-facing if yaw and pitch are within this range
FORWARD_THRESHOLD_DEGREES = 20.0


def get_head_pose(landmarks, frame_width, frame_height):
    # Returns (yaw, pitch, roll) in degrees for one frame, or None if failed
    face_2d = []
    for idx in LANDMARK_IDS:
        lm = landmarks[idx]
        face_2d.append([int(lm.x * frame_width), int(lm.y * frame_height)])

    face_2d = np.array(face_2d, dtype=np.float64)

    focal_length = frame_width
    cam_matrix   = np.array([
        [focal_length, 0,            frame_width  / 2],
        [0,            focal_length, frame_height / 2],
        [0,            0,            1            ]
    ])
    dist_coeffs = np.zeros((4, 1))

    success, rot_vec, _ = cv2.solvePnP(
        FACE_3D_MODEL, face_2d, cam_matrix, dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not success:
        return None

    rot_matrix, _ = cv2.Rodrigues(rot_vec)
    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rot_matrix)

    return angles[1], angles[0], angles[2]  # yaw, pitch, roll


def compute_head_pose_feature(per_frame_landmarks, frame_width, frame_height):
    # Takes list of per-frame landmark objects, returns head pose feature dict
    yaws    = []
    pitches = []

    for landmarks in per_frame_landmarks:
        if landmarks is None:
            continue
        result = get_head_pose(landmarks, frame_width, frame_height)
        if result is None:
            continue
        yaw, pitch, _ = result
        yaws.append(abs(yaw))
        pitches.append(abs(pitch))

    if len(yaws) < 5:
        return None

    avg_yaw   = float(np.mean(yaws))
    avg_pitch = float(np.mean(pitches))

    forward_frames   = sum(1 for y, p in zip(yaws, pitches)
                           if y < FORWARD_THRESHOLD_DEGREES
                           and p < FORWARD_THRESHOLD_DEGREES)
    head_forward_pct = forward_frames / len(yaws)

    # Low forward % = high risk
    head_risk_score = max(0.0, min(1.0, 1.0 - (head_forward_pct / 0.5)))

    return {
        "head_forward_percentage"    : round(head_forward_pct, 3),
        "avg_yaw_deviation_degrees"  : round(avg_yaw,          2),
        "avg_pitch_deviation_degrees": round(avg_pitch,         2),
        "head_risk_score"            : round(head_risk_score,   3),
        "head_avoidance_flagged"     : head_forward_pct < 0.50
    }