# MediaPipe Gaze Estimation — Known Limitations

## 1. Head Rotation Conflation
Our gaze deviation score measures eye landmark geometry relative to 
eye bounding box. When the head is rotated or tilted, landmark 
positions shift due to perspective distortion — not actual gaze change.
This produces false high deviation scores on frames where the child 
is leaning forward or looking down at a toy.

Observed in: test3.mp4 — frames with child leaning forward show 
deviation scores of 0.15 to 0.25 despite no meaningful gaze data.

Mitigation planned: Head pose angle filtering in Week 3 feature 
aggregation. Frames beyond 30 degree rotation threshold will be 
downweighted.

## 2. Non-Detected Frames Return Sentinel Value
Frames where MediaPipe fails to detect a face return gaze_deviation = 0.0
This is a placeholder, not a real measurement. These frames are 
excluded from average calculations. They do NOT mean "perfect gaze."

## 3. Single Eye Analysis
We currently analyze only the left eye (MediaPipe subject perspective).
Right eye provides redundant signal in most cases but extreme lateral 
gaze would be more visible in the eye facing the camera.

## 4. Not True Iris Tracking
We approximate gaze using eyelid and eye corner landmarks as proxies 
for iris position. MediaPipe Face Mesh does not directly track the iris 
center. Iris tracking requires MediaPipe Iris model (separate pipeline).

## 5. Consumer Video Quality Dependency
Detection rate drops significantly when:
- Face is far from camera (small face in frame)
- Lighting is uneven or backlit
- Child moves quickly (motion blur)
- Face angle exceeds approximately 45 degrees from frontal

RepMotion missing data issue — wrists off-frame returns 0.0, indistinguishable from true zero
Minimum frame count — videos under 10 detected frames should be flagged as insufficient

Observed: test3.mp4 detection rate 29.5% vs test5/test6 at 100%