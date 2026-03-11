# EarlySign — AI-Enabled Early Autism Screening Platform

![Python](https://img.shields.io/badge/Python-3.11.9-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.129.2-009688)
![React Native](https://img.shields.io/badge/React%20Native-Expo-black)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10.9-orange)
![Deployed](https://img.shields.io/badge/Deployed-Render.com-46E3B7)

> A multimodal AI-assisted autism risk screening platform that integrates computer vision-based behavioral feature extraction with validated psychometric assessment (M-CHAT-R) to generate explainable risk stratification for early clinical referral decision support.

---

> ⚠️ **IMPORTANT DISCLAIMER**
>
> EarlySign is a **screening tool only**. It does **not** diagnose autism spectrum disorder or any other medical condition. All results are indicative only and must be reviewed by a qualified pediatric healthcare professional. This is an academic prototype that has not undergone clinical trials and is not cleared for medical use by any regulatory body.

---

## Project Overview

EarlySign is a mobile-first screening platform designed to help parents identify potential autism risk indicators in children aged 6 months to 5 years. The app combines two inputs — a short video of the child during free play and a 20-question M-CHAT-R questionnaire — and uses AI-based computer vision to extract behavioral signals from the video.

These signals are combined with the questionnaire score using a weighted formula to produce a risk level of LOW, MEDIUM, or HIGH, along with a plain-English explanation of what drove the result and age-appropriate activity suggestions for the parent.

The platform is designed to augment, not replace, clinical judgment. It gives parents an accessible, objective first step before seeking specialist evaluation — addressing the global gap where 80% of autism cases have no access to diagnostic specialists.

---

## System Architecture

![System Architecture](docs/architecture.png)

The platform follows a six-component pipeline:

- **Parent's Phone** — React Native app captures video and collects questionnaire responses
- **FastAPI Server** — receives video and score, orchestrates the full processing pipeline
- **MediaPipe Pipeline** — extracts 4 behavioral features from sampled video frames
- **Scoring Model** — combines video features and questionnaire score into a final risk score
- **Firebase Firestore** — stores session history for the parent's longitudinal reference
- **Results Screen** — displays risk level, plain-English explanation, feature contributions, and activity suggestions

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11.9 | Core backend language |
| FastAPI | 0.129.2 | REST API framework |
| Uvicorn | 0.41.0 | ASGI server |
| MediaPipe | 0.10.9 | Face mesh, pose, and holistic landmark extraction |
| OpenCV | 4.13.0 | Video frame extraction |
| NumPy | 2.4.2 | Feature computation and normalization |
| scikit-learn | 1.8.0 | Scoring model utilities |
| python-multipart | 0.0.22 | Multipart video file upload handling |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React Native | Expo SDK | Cross-platform mobile app (Android + iOS) |
| Expo Document Picker | 14.0.8 | Video selection from device gallery |
| Axios | 1.13.6 | HTTP requests to FastAPI backend |
| React Navigation | Stack | Screen-to-screen navigation |
| Firebase | Latest | Firestore session history storage |

---

## How It Works

**Step 1 — Record**
The parent selects a short video of their child during free play using the app. The app validates file size (max 200MB) and format before upload.

**Step 2 — Questionnaire**
The parent answers all 20 M-CHAT-R questions via yes/no toggles. The app tracks progress live and automatically calculates a risk score from the answers on submission.

**Step 3 — Analysis**
The video is uploaded to the FastAPI backend. OpenCV extracts one frame every 30th frame. MediaPipe runs on each frame to extract gaze, expression, and motion features. The scoring model combines these with the questionnaire score using a weighted formula.

**Step 4 — Results**
The app displays the risk level (color-coded), score breakdown, the strongest contributing signal, any detected flags, a plain-English explanation of the result, and age-appropriate activity suggestions. The session is saved to Firebase Firestore for history tracking.

---

## How to Run Locally

### Backend

**Requirements:** Python 3.11.9, Git

```bash
# clone the repo
git clone https://github.com/ShuklaDevansh/EarlySign-Autism-Screening-app.git
cd EarlySign-Autism-Screening-app/backend

# create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# install dependencies
pip install -r requirements.txt

# start the server
uvicorn main:app --reload
```

Server runs at `http://127.0.0.1:8000`

> **Note:** MediaPipe must stay at version 0.10.9. Versions above 0.10.14 removed the `mp.solutions` API on Linux. Do not upgrade under any circumstances.

### Frontend

**Requirements:** Node.js, Expo Go app installed on your phone

```bash
cd EarlySign-Autism-Screening-app/frontend/AutismScreen

# install dependencies
npm install

# start Expo development server
npx expo start --lan
```

Scan the QR code with Expo Go on your phone. Your phone and laptop must be on the same WiFi network.

> **Note:** Update `config.js` with your backend URL before running:
> ```javascript
> export const API_BASE_URL = "http://YOUR_LOCAL_IP:8000";
> ```

---

## API Documentation

Interactive API documentation is auto-generated by FastAPI and available at `http://127.0.0.1:8000/docs` when running locally.

Three endpoints are available:
- `GET /` — health check, confirms server is running
- `POST /analyze-video` — accepts a video file and questionnaire score, returns the full risk assessment result including feature contributions, flags, and processing time
- `GET /explain` — accepts result values as query parameters, returns a plain-English paragraph summary of what the result means

---

## Feature Extraction Details

The MediaPipe pipeline extracts 4 behavioral features from video frames. All features are normalized to a 0.0–1.0 risk scale before scoring.

| Feature | What It Measures | Risk Threshold |
|---|---|---|
| **Average Gaze Deviation** | How far the iris center deviates from the eye center across frames. High deviation indicates reduced forward gaze. | Normalized ceiling: 0.50 (Tariq et al. 2018) |
| **Social Gaze Percentage** | Percentage of frames where the child is looking forward at the camera. Low percentage indicates reduced social attention. | Risk flag below 60% (Jones & Klin 2013) |
| **Expression Variance** | Standard deviation of facial landmark distances across frames. Low variance indicates reduced affect. | Risk flag below 0.015 (ASD behavioral literature) |
| **Repetitive Motion Score** | Mean crossing rate of wrist Y-position over time. High rate indicates stereotyped repetitive movements. | Risk flag above 0.50 (ASD motor literature) |

If wrist landmarks are not visible in the video, repetitive motion is excluded from the feature average and a `wrist_not_visible` flag is set in the response.

---

## Scoring Formula

Video features are normalized and averaged into a single video risk score, then combined with the questionnaire score using a weighted formula:

```
Final Score = (0.60 × Video Risk Score) + (0.40 × Questionnaire Score Normalized)

Questionnaire Score Normalized = Raw M-CHAT-R Score / 20.0
```

**Risk Level Classification:**

| Score Range | Risk Level |
|---|---|
| 0.00 – 0.35 | 🟢 LOW |
| 0.35 – 0.65 | 🟡 MEDIUM |
| 0.65 – 1.00 | 🔴 HIGH |

The 60/40 weighting is derived from research literature that weights objective behavioral signals more heavily than caregiver self-report measures.

---

## Ethical Considerations

- **Not a diagnostic tool.** EarlySign is explicitly a screening aid. It does not and cannot diagnose autism spectrum disorder. All MEDIUM and HIGH outputs recommend professional clinical evaluation.
- **Informed consent.** Any real-world deployment would require explicit parental consent for video collection and AI processing of a minor's behavioral data.
- **Data privacy.** Videos of children are sensitive personal data subject to COPPA (US) and GDPR (EU). A production system would require end-to-end encryption, strict access controls, and data deletion policies.
- **Algorithmic fairness.** Model thresholds are derived from Western research literature. Future work must validate performance across diverse ethnic and cultural populations.
- **Prototype status.** This academic prototype has not undergone clinical trials and is not cleared for medical use by any regulatory body (FDA, CE Mark, or equivalent).

---

## Future Work

- **Dynamic Therapy Suggestions** — Replace hardcoded activity arrays with a rule engine that generates suggestions based on which specific flags are triggered, not just the overall risk level. This allows therapy recommendations to be directly tied to the child's individual behavioral signals.
- **Frame Quality Filtering** — Add a blur detection step using OpenCV's Laplacian variance before feeding frames to MediaPipe. Blurry or low-light frames would be excluded from feature calculation, improving the accuracy of extracted behavioral signals.
- **Confidence Interval Reporting** — Instead of a single risk score, report a score range (e.g. 44% ± 8%) based on frame count and feature consistency across the video. This gives a more honest and statistically grounded picture of result reliability.
- **Parent Authentication** — Integrate Firebase Authentication so each parent has a secure account. Screening history would be tied to their login instead of being stored in an open collection, improving both privacy and data integrity.
- **Child Profile Management** — Allow parents to create and manage multiple child profiles within a single account, with each profile maintaining its own independent screening history for longitudinal tracking over time.