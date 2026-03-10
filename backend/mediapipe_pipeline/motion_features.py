import numpy as np
import cv2
import mediapipe as mp
import os
import warnings
warnings.filterwarnings("ignore")



# wrist landmark indices — fixed by MediaPipe pose topology
LEFT_WRIST  = 15
RIGHT_WRIST = 16


def get_wrist_y(pose_landmarks, wrist_index: int, img_height: int):
    # returns wrist Y pixel coordinate, or None if landmark not visible
    lm = pose_landmarks.landmark[wrist_index]
    if lm.visibility < 0.5:
        return None
    return lm.y * img_height


def compute_mean_crossing_rate(signal: list) -> float:
    # counts how many times signal crosses its mean, normalized by length
    # high rate = repetitive/oscillatory motion
    if len(signal) < 3:
        return 0.0
    arr       = np.array(signal)
    mean      = np.mean(arr)
    centered  = arr - mean
    crossings = np.sum(np.diff(np.sign(centered)) != 0)
    return float(crossings / len(signal))


def compute_repetitive_motion_score(left_wrist_ys: list, right_wrist_ys: list) -> float:
    # combines left and right wrist crossing rates into one score
    scores = []
    if len(left_wrist_ys) >= 3:
        scores.append(compute_mean_crossing_rate(left_wrist_ys))
    if len(right_wrist_ys) >= 3:
        scores.append(compute_mean_crossing_rate(right_wrist_ys))
    if not scores:
        return 0.0
    return float(np.mean(scores))