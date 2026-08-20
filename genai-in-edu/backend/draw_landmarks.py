import cv2
import dlib

# 1. Load the image (replace with your photo)
image_path = "./face.png"
img = cv2.imread(image_path)

# 2. Load Dlib's pre-trained face detector and 68-point predictor
# Make sure this points to the .dat file you use in your backend!
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

# 3. Convert image to grayscale for the detector
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
faces = detector(gray)

for face in faces:
    # Get the 68 landmarks
    landmarks = predictor(gray, face)
    
    # Loop through all 68 points and draw a bright green dot
    for n in range(0, 68):
        x = landmarks.part(n).x
        y = landmarks.part(n).y
        cv2.circle(img, (x, y), 2, (0, 255, 0), -1) # Green dots
        
    # Optional: Draw a red bounding box specifically around the eyes 
    # (Right eye is points 36-41, Left eye is points 42-47)
    # This shows reviewers how you isolate the eye crop!
    # Left Eye Box
    cv2.rectangle(img, (landmarks.part(36).x - 10, landmarks.part(37).y - 10), 
                       (landmarks.part(39).x + 10, landmarks.part(41).y + 10), (0, 0, 255), 2)
    # Right Eye Box
    cv2.rectangle(img, (landmarks.part(42).x - 10, landmarks.part(43).y - 10), 
                       (landmarks.part(45).x + 10, landmarks.part(47).y + 10), (0, 0, 255), 2)

# 4. Save the final diagram
output_path = "../figures/gaze_pipeline_step1.jpg"
cv2.imwrite(output_path, img)
print(f"Diagram saved to {output_path}! You can now use this in main.tex")