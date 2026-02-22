# AI-Enabled Autism Screening MVP

## What is This?
A mobile application that helps parents screen their young children (6 months - 5 years) for potential autism risk using:
- Computer vision analysis of home video recordings
- M-CHAT-R validated questionnaire (20 questions)
- Combined AI risk scoring with explainable results

**⚠️ This is a SCREENING tool, not a diagnostic tool. Always consult a medical professional.**

## Tech Stack
- **Frontend:** React Native (Expo)
- **Backend:** Python FastAPI
- **AI/CV:** MediaPipe, OpenCV
- **Storage:** Firebase Firestore
- **Deployment:** Render.com

## Project Structure
```
autism-screening-mvp/
├── backend/          # Python FastAPI server
├── frontend/         # React Native Expo app
│   └── AutismScreen/
└── docs/             # Architecture diagrams
```

## How to Run Locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend/AutismScreen
npm install
npx expo start
```
Scan the QR code with Expo Go app on your phone.
