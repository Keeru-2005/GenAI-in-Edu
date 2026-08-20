import cv2
import dlib
import numpy as np
import os

_detector = None
_predictor = None

def get_detector():
    global _detector
    if _detector is None:
        _detector = dlib.get_frontal_face_detector()
    return _detector

def get_predictor():
    global _predictor
    if _predictor is None:
        model_path = "shape_predictor_68_face_landmarks.dat"
        if not os.path.exists(model_path):
            # check backend folder if running from root
            alt_path = os.path.join(os.path.dirname(__file__), "shape_predictor_68_face_landmarks.dat")
            if os.path.exists(alt_path):
                model_path = alt_path
        _predictor = dlib.shape_predictor(model_path)
    return _predictor

def get_gaze_ratio(eye_points, landmarks, gray):
    region = np.array([(landmarks.part(p).x, landmarks.part(p).y) for p in eye_points], np.int32)

    mask = np.zeros(gray.shape, np.uint8)
    cv2.fillPoly(mask, [region], 255)

    eye = cv2.bitwise_and(gray, gray, mask=mask)

    min_x, max_x = np.min(region[:,0]), np.max(region[:,0])
    min_y, max_y = np.min(region[:,1]), np.max(region[:,1])
    
    # Handle edge case where eye region is flat
    if min_x == max_x or min_y == max_y:
        return 1

    gray_eye = eye[min_y:max_y, min_x:max_x]

    if gray_eye.size == 0:
        return 1

    _, thresh = cv2.threshold(gray_eye, 70, 255, cv2.THRESH_BINARY)

    if thresh is None:
        return 1

    h, w = thresh.shape
    left = thresh[:, :w//2]
    right = thresh[:, w//2:]

    left_white = cv2.countNonZero(left)
    right_white = cv2.countNonZero(right)

    if right_white == 0:
        return 1

    return left_white / right_white

def evaluate_frame(frame):
    """
    Evaluates a single OpenCV BGR frame for attention based on gaze ratio.
    Returns: True if attended, False if distracted, None if no face detected.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detector = get_detector()
    predictor = get_predictor()
    faces = detector(gray)

    for face in faces:
        landmarks = predictor(gray, face)

        g1 = get_gaze_ratio([36,37,38,39,40,41], landmarks, gray)
        g2 = get_gaze_ratio([42,43,44,45,46,47], landmarks, gray)

        gaze = (g1 + g2) / 2

        if 0.5 <= gaze <= 2.0:
            return True
        else:
            return False
            
    return None  # No face detected