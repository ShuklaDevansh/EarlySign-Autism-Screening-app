# scoring_model.py — converts feature vector into risk score

GAZE_DEV_MAX   = 0.50
EXPR_VAR_MAX   = 0.05
REP_MOT_MAX    = 0.50

SOCIAL_GAZE_RISK_THRESHOLD = 0.60
EXPR_VAR_RISK_THRESHOLD    = 0.015
REP_MOT_RISK_THRESHOLD     = 0.50

LOW_MAX    = 0.35
MEDIUM_MAX = 0.65

VIDEO_WEIGHT         = 0.60
QUESTIONNAIRE_WEIGHT = 0.40

W_GAZE_DEV    = 0.20
W_SOCIAL_GAZE = 0.20
W_EXPR_VAR    = 0.15
W_REP_MOTION  = 0.15
W_HEAD_POSE   = 0.30


def normalize_gaze_deviation(value: float) -> float:
    return min(value / GAZE_DEV_MAX, 1.0)


def normalize_social_gaze(value: float) -> float:
    return 1.0 - float(value)


def normalize_expression_variance(value: float) -> float:
    return 1.0 - min(value / EXPR_VAR_MAX, 1.0)


def normalize_repetitive_motion(value: float) -> float:
    return min(value / REP_MOT_MAX, 1.0)


def classify_risk(score: float) -> str:
    if score < LOW_MAX:
        return "LOW"
    elif score < MEDIUM_MAX:
        return "MEDIUM"
    else:
        return "HIGH"


FLAG_SUGGESTIONS = {
    'low_social_gaze': [
        'Practice face-to-face play: hold a toy near your face while talking',
        'Play peek-a-boo to encourage eye contact naturally',
        'Read books face-to-face, pointing at pictures together',
    ],
    'flat_expression': [
        'Mirror play: sit with your child in front of a mirror and make faces together',
        'Emotion flashcards: show happy, sad, surprised faces and name them',
        'Tickle games to encourage spontaneous smiling and reactions',
    ],
    'high_repetitive_motion': [
        'Provide sensory alternatives: textured toys, putty, or stress balls',
        'Try rhythmic activities like drumming or clapping games together',
        'Consult an occupational therapist for sensory regulation strategies',
    ],
    'head_avoidance': [
        'Engage child at their eye level — get on the floor with them',
        "Follow the child's lead during play and position yourself in their line of sight",
        'Use bubbles or toys at face height to naturally draw attention forward',
    ],
}

GENERAL_SUGGESTIONS = {
    'LOW': [
        'Continue regular playtime with age-appropriate toys',
        'Read books together daily and point at pictures while naming them',
        'Encourage turn-taking games like rolling a ball back and forth',
    ],
    'MEDIUM': [
        'Try structured play sessions of 15-20 minutes daily',
        'Narrate your actions out loud during daily routines',
        'Consider a developmental check-up with your pediatrician',
    ],
    'HIGH': [
        'Use simple one-word instructions consistently throughout the day',
        'Join a parent support group for early intervention guidance',
        'Contact your local early intervention program for professional support',
    ],
}


def get_dynamic_suggestions(flags: dict, risk_level: str) -> list:
    suggestions = []
    for flag_name, flag_value in flags.items():
        if flag_value and flag_name in FLAG_SUGGESTIONS:
            suggestions.extend(FLAG_SUGGESTIONS[flag_name])
    seen   = set()
    unique = [s for s in suggestions if not (s in seen or seen.add(s))]
    if not unique:
        unique = GENERAL_SUGGESTIONS.get(risk_level, [])
    if risk_level in ['MEDIUM', 'HIGH']:
        unique.append('Consult your paediatrician to discuss these screening observations.')
    return unique


def compute_risk_score(feature_vector: dict, questionnaire_raw: int) -> dict:

    meta = feature_vector.get("_meta", {})

    left_wrist_frames  = meta.get("left_wrist_frames",  0)
    right_wrist_frames = meta.get("right_wrist_frames", 0)
    wrist_missing      = (left_wrist_frames == 0 and right_wrist_frames == 0)

    frames_processed    = meta.get("frames_processed", 0)
    insufficient_frames = frames_processed < 10

    # ── Normalize all features first ─────────────────────────────────
    norm_gaze_dev    = normalize_gaze_deviation(feature_vector["avg_gaze_deviation"])
    norm_social_gaze = normalize_social_gaze(feature_vector["social_gaze_percentage"])
    norm_expr_var    = normalize_expression_variance(feature_vector["expression_variance"])

    norm_rep_motion = (
        normalize_repetitive_motion(feature_vector["repetitive_motion_score"])
        if not wrist_missing else None
    )

    head_pose      = feature_vector.get("head_pose")
    norm_head_pose = head_pose["head_risk_score"] if head_pose is not None else None

    # ── Weighted video risk score ─────────────────────────────────────
    weighted_sum = 0.0
    total_weight = 0.0

    weighted_sum += norm_gaze_dev    * W_GAZE_DEV;    total_weight += W_GAZE_DEV
    weighted_sum += norm_social_gaze * W_SOCIAL_GAZE; total_weight += W_SOCIAL_GAZE
    weighted_sum += norm_expr_var    * W_EXPR_VAR;    total_weight += W_EXPR_VAR

    if norm_rep_motion is not None:
        weighted_sum += norm_rep_motion * W_REP_MOTION
        total_weight += W_REP_MOTION

    if norm_head_pose is not None:
        weighted_sum += norm_head_pose * W_HEAD_POSE
        total_weight += W_HEAD_POSE

    video_risk_score = weighted_sum / total_weight if total_weight > 0 else 0.0

    # ── Questionnaire + final score ───────────────────────────────────
    questionnaire_score_normalized = max(0.0, min(questionnaire_raw / 20.0, 1.0))
    final_score = (VIDEO_WEIGHT * video_risk_score) + \
                  (QUESTIONNAIRE_WEIGHT * questionnaire_score_normalized)

    risk_level = classify_risk(final_score)

    # ── Feature contributions — defined AFTER all norm_ variables ─────
    feature_contributions = {
        "avg_gaze_deviation"     : round(norm_gaze_dev,    4),
        "social_gaze_percentage" : round(norm_social_gaze, 4),
        "expression_variance"    : round(norm_expr_var,    4),
        "repetitive_motion_score": round(norm_rep_motion,  4) if norm_rep_motion  is not None else None,
        "head_pose"              : round(norm_head_pose,   4) if norm_head_pose   is not None else None,
    }

    valid_contributions = {k: v for k, v in feature_contributions.items() if v is not None}
    top_feature         = max(valid_contributions, key=lambda k: valid_contributions[k])

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
            head_pose["head_avoidance_flagged"] if head_pose is not None else False
        ),
    }

    return {
        "video_risk_score"              : round(video_risk_score,               4),
        "questionnaire_score_normalized": round(questionnaire_score_normalized, 4),
        "final_score"                   : round(final_score,                    4),
        "risk_level"                    : risk_level,
        "feature_contributions"         : feature_contributions,
        "missing_features"              : (
            (["repetitive_motion_score"] if wrist_missing      else []) +
            (["head_pose"]               if norm_head_pose is None else [])
        ),
        "top_contributing_feature"      : top_feature,
        "flags"                         : flags,
        "suggestions"                   : get_dynamic_suggestions(flags, risk_level),
    }