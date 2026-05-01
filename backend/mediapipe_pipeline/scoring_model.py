# scoring_model.py — converts feature vector into risk score

# ── Normalization ceiling values derived from literature ──────────────────────
GAZE_DEV_MAX   = 0.50   # Tariq et al. 2018 — max expected gaze deviation
EXPR_VAR_MAX   = 0.05   # ASD behavioral literature — max expression variance
REP_MOT_MAX    = 0.50   # ASD motor literature — max repetitive motion score

# ── Risk thresholds — literature-informed flags ───────────────────────────────
SOCIAL_GAZE_RISK_THRESHOLD = 0.60   # Jones & Klin 2013 — below 60% = risk flag
EXPR_VAR_RISK_THRESHOLD    = 0.015  # below this = flat affect flag
REP_MOT_RISK_THRESHOLD     = 0.50   # above this = repetitive motion flag

# ── Final score classification bands ─────────────────────────────────────────
LOW_MAX    = 0.35
MEDIUM_MAX = 0.65

# ── Scoring weights ───────────────────────────────────────────────────────────
VIDEO_WEIGHT         = 0.60
QUESTIONNAIRE_WEIGHT = 0.40

# Individual feature weights within the video risk score
# Must sum to 1.0 when all features present
W_GAZE_DEV     = 0.20
W_SOCIAL_GAZE  = 0.20
W_EXPR_VAR     = 0.15
W_REP_MOTION   = 0.15
W_HEAD_POSE    = 0.20
W_BLINK        = 0.10  # reserved for Feature 3


def normalize_gaze_deviation(value: float) -> float:
    # Higher deviation = higher risk, clip at max
    return min(value / GAZE_DEV_MAX, 1.0)


def normalize_social_gaze(value: float) -> float:
    # value is 0.0-1.0 fraction (not percentage), lower = higher risk
    return 1.0 - float(value)


def normalize_expression_variance(value: float) -> float:
    # Lower variance = higher risk, so invert after normalizing
    return 1.0 - min(value / EXPR_VAR_MAX, 1.0)


def normalize_repetitive_motion(value: float) -> float:
    # Higher score = higher risk, clip at max
    return min(value / REP_MOT_MAX, 1.0)


def classify_risk(score: float) -> str:
    # Converts final 0.0-1.0 score into LOW/MEDIUM/HIGH label
    if score < LOW_MAX:
        return "LOW"
    elif score < MEDIUM_MAX:
        return "MEDIUM"
    else:
        return "HIGH"


def compute_risk_score(feature_vector: dict, questionnaire_raw: int) -> dict:
    # Main function — takes feature vector + questionnaire score, returns full result

    meta = feature_vector.get("_meta", {})

    # Check if wrists were visible in this video
    left_wrist_frames  = meta.get("left_wrist_frames",  0)
    right_wrist_frames = meta.get("right_wrist_frames", 0)
    wrist_missing      = (left_wrist_frames == 0 and right_wrist_frames == 0)

    # Check if too few frames were processed to be reliable
    frames_processed   = meta.get("frames_processed", 0)
    insufficient_frames = frames_processed < 10

    # ── Normalize each feature to 0.0-1.0 risk scale ─────────────────
    norm_gaze_dev    = normalize_gaze_deviation(feature_vector["avg_gaze_deviation"])
    norm_social_gaze = normalize_social_gaze(feature_vector["social_gaze_percentage"])
    norm_expr_var    = normalize_expression_variance(feature_vector["expression_variance"])

    # Only normalize repetitive motion if wrists were actually detected
    if not wrist_missing:
        norm_rep_motion = normalize_repetitive_motion(feature_vector["repetitive_motion_score"])
    else:
        norm_rep_motion = None

    # ── Collect valid features and compute video_risk_score ───────────
    feature_contributions = {
        "avg_gaze_deviation"     : round(norm_gaze_dev,    4),
        "social_gaze_percentage" : round(norm_social_gaze, 4),
        "expression_variance"    : round(norm_expr_var,    4),
        "repetitive_motion_score": round(norm_rep_motion,  4) if norm_rep_motion is not None else None,
        "head_pose"              : round(norm_head_pose,    4) if norm_head_pose is not None else None
        
    }

    # Head pose feature
    head_pose        = feature_vector.get("head_pose")
    norm_head_pose   = head_pose["head_risk_score"] if head_pose else None

    # Weighted video risk score — missing features have weight redistributed
    weighted_sum    = 0.0
    total_weight    = 0.0

    weighted_sum += norm_gaze_dev   * W_GAZE_DEV;   total_weight += W_GAZE_DEV
    weighted_sum += norm_social_gaze * W_SOCIAL_GAZE; total_weight += W_SOCIAL_GAZE
    weighted_sum += norm_expr_var   * W_EXPR_VAR;   total_weight += W_EXPR_VAR

    if norm_rep_motion is not None:
        weighted_sum += norm_rep_motion * W_REP_MOTION
        total_weight += W_REP_MOTION

    if norm_head_pose is not None:
        weighted_sum += norm_head_pose * W_HEAD_POSE
        total_weight += W_HEAD_POSE

    # Normalize by actual total weight so missing features don't drag score down
    video_risk_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    # ── Normalize questionnaire score 0-20 → 0.0-1.0 ─────────────────
    questionnaire_score_normalized = max(0.0, min(questionnaire_raw / 20.0, 1.0))

    # ──  Apply weighted formula ───────────────────────────────────────
    final_score = (VIDEO_WEIGHT * video_risk_score) + \
                  (QUESTIONNAIRE_WEIGHT * questionnaire_score_normalized)

    # ──Classify into LOW / MEDIUM / HIGH ────────────────────────────
    risk_level = classify_risk(final_score)

    # ── Find which feature contributed most to the score ─────────────
    valid_contributions = {
        k: v for k, v in feature_contributions.items() if v is not None
    }
    top_feature = max(valid_contributions, key=valid_contributions.get)

    flags = {
        "insufficient_frames"   : insufficient_frames,
        "wrist_not_visible"     : wrist_missing,
        "low_social_gaze"       : feature_vector["social_gaze_percentage"] < SOCIAL_GAZE_RISK_THRESHOLD,
        "flat_expression"       : feature_vector["expression_variance"] < EXPR_VAR_RISK_THRESHOLD,
        "high_repetitive_motion": (
            feature_vector["repetitive_motion_score"] > REP_MOT_RISK_THRESHOLD
            if not wrist_missing else False
        ),
        "head_avoidance"        : (
            head_pose["head_avoidance_flagged"]
            if head_pose else False
        )
    }

    # ── Build and return final result dict ────────────────────────────────────
    return {
        "video_risk_score"              : round(video_risk_score,                4),
        "questionnaire_score_normalized": round(questionnaire_score_normalized,  4),
        "final_score"                   : round(final_score,                     4),
        "risk_level"                    : risk_level,
        "feature_contributions"         : feature_contributions,
        "missing_features": (
            (["repetitive_motion_score"] if wrist_missing  else []) +
            (["head_pose"]               if norm_head_pose is None else [])
        ),
        "top_contributing_feature"      : top_feature,
        "flags"                         : flags
    }


if __name__ == "__main__":
    import sys
    import os
    # Suppress MediaPipe/TensorFlow internal warning logs
    os.environ["GLOG_minloglevel"]        = "3"
    os.environ["TF_CPP_MIN_LOG_LEVEL"]    = "3"
    os.environ["MEDIAPIPE_DISABLE_GPU"]   = "1"
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from mediapipe_pipeline.feature_extractor import extract_features

    videos_dir  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
    video_files = sorted([f for f in os.listdir(videos_dir) if f.endswith(".mp4")])

    # Test with questionnaire score of 8 (medium-high on M-CHAT-R scale)
    TEST_QUESTIONNAIRE_SCORE = 8

    all_results = {}

    for filename in video_files:
        video_path = os.path.join(videos_dir, filename)
        fv         = extract_features(video_path)
        result     = compute_risk_score(fv, TEST_QUESTIONNAIRE_SCORE)
        all_results[filename] = result

        print(f"\n{'='*55}")
        print(f"VIDEO : {filename}")
        print(f"{'='*55}")
        print(f"  video_risk_score   : {result['video_risk_score']:.4f}")
        print(f"  questionnaire norm : {result['questionnaire_score_normalized']:.4f}")
        print(f"  FINAL SCORE        : {result['final_score']:.4f}")
        print(f"  RISK LEVEL         : {result['risk_level']}")
        print(f"  top feature        : {result['top_contributing_feature']}")
        print(f"  missing features   : {result['missing_features']}")
        print(f"  flags              : {result['flags']}")
        print(f"  contributions:")
        for feat, val in result["feature_contributions"].items():
            marker  = " <- TOP" if feat == result["top_contributing_feature"] else ""
            val_str = f"{val:.4f}" if val is not None else "MISSING"
            print(f"    {feat:<30}: {val_str}{marker}")

    # Summary table across all videos
    print(f"\n{'='*80}")
    print("SCORING SUMMARY — ALL VIDEOS (questionnaire score = 8/20)")
    print(f"{'='*80}")
    print(f"{'Video':<12} | {'VidRisk':>8} | {'QScore':>7} | {'Final':>7} | {'Level':>8} | {'Top Feature'}")
    print(f"{'-'*80}")
    for filename, result in all_results.items():
        missing_marker = " *" if result["missing_features"] else ""
        insuff_marker  = " !!" if result["flags"]["insufficient_frames"] else ""
        print(
            f"{filename:<12} | "
            f"{result['video_risk_score']:>8.4f} | "
            f"{result['questionnaire_score_normalized']:>7.4f} | "
            f"{result['final_score']:>7.4f} | "
            f"{result['risk_level']:>8} | "
            f"{result['top_contributing_feature']}{missing_marker}{insuff_marker}"
        )
    print(f"{'='*80}")
    print("  * = repetitive_motion_score missing (wrists not visible in video)")
    print("  !! = insufficient frames (< 10 frames processed, treat result with caution)")