# main.py
# This is the main file for our Python backend server.
# FastAPI is the framework that lets us create web endpoints (URLs) 
# that our mobile app can send requests to.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI application instance
# Think of this as creating the server object
app = FastAPI(
    title="Autism Screening API",
    description="Backend API for AI-Enabled Autism Screening MVP",
    version="1.0.0"
)

# CORS (Cross-Origin Resource Sharing) setup
# This is CRITICAL. Without this, your React Native app cannot talk to this server.
# It's a security feature of web browsers/apps. We allow all origins for development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Allow requests from any address
    allow_credentials=True,
    allow_methods=["*"],      # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],      # Allow all headers
)

# This is your first "endpoint" - a URL that does something when visited
# The "@app.get("/")" means: when someone visits the root URL, run this function
@app.get("/")
def home():
    """
    Root endpoint. Just confirms the server is running.
    When you visit http://your-server-url/ in a browser, you'll see this response.
    """
    return {
        "message": "Autism Screening API is running!",
        "status": "healthy",
        "version": "1.0.0"
    }

# Health check endpoint - tells us the server is alive
@app.get("/health")
def health_check():
    """
    Health check endpoint.
    We'll use this to verify the server is alive before the demo.
    """
    return {
        "status": "healthy",
        "message": "Server is running correctly"
    }

# Test endpoint to verify we can receive data from the app
@app.get("/test")
def test_endpoint():
    """
    Test endpoint to verify API is working.
    """
    return {
        "status": "success",
        "message": "Backend is connected and working!",
        "next_step": "Week 2 - MediaPipe integration coming soon"
    }



'''
### Step 15: Run the Server Locally

In your terminal (with venv activated, inside the backend folder):
```
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Breaking this down:
- `uvicorn` → the program that runs our FastAPI server
- `main:app` → look in `main.py` file, find the variable called `app`
- `--reload` → automatically restart when you change code (useful during development)
- `--host 0.0.0.0` → accept connections from any device on the network (not just your computer)
- `--port 8000` → run on port 8000

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
'''
