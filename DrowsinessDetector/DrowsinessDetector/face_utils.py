import cv2
import numpy as np

class FaceUtils:
    def __init__(self):
        # Load OpenCV's pre-trained face detector (Haar Cascade)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Define simulated eye landmarks indices (we'll use eye regions from Haar detection)
        self.left_eye_indices = []
        self.right_eye_indices = []
    
    def detect_face_landmarks(self, frame):
        """Detect face and eyes using OpenCV's Haar Cascades"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        # If no faces are detected, return None
        if len(faces) == 0:
            return None, None
        
        # Get the first face
        x, y, w, h = faces[0]
        face_rect = (x, y, x+w, y+h)
        
        # Create a region of interest for the face
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]
        
        # Detect eyes within the face region
        eyes = self.eye_cascade.detectMultiScale(roi_gray)
        
        # If less than 2 eyes are detected, return just the face
        if len(eyes) < 2:
            # Generate dummy landmarks for compatibility
            landmarks = self._generate_dummy_landmarks(x, y, w, h)
            return face_rect, landmarks
        
        # Sort eyes by x-coordinate (left to right)
        eyes = sorted(eyes, key=lambda e: e[0])
        
        # Generate landmarks based on eye positions
        landmarks = self._generate_landmarks_from_eyes(x, y, eyes)
        
        return face_rect, landmarks
    
    def _generate_dummy_landmarks(self, x, y, w, h):
        """Generate dummy landmarks when eyes aren't detected"""
        # Create 68 landmarks approximately positioned on a face
        landmarks = np.zeros((68, 2), dtype=np.int32)
        
        # Approximate eye positions
        left_eye_center = (x + w//3, y + h//3)
        right_eye_center = (x + 2*w//3, y + h//3)
        
        # Set left eye landmarks (indices 36-41)
        eye_width = w // 6
        eye_height = h // 12
        for i in range(6):
            angle = 2 * np.pi * i / 6
            landmarks[36 + i] = [
                left_eye_center[0] + int(eye_width * np.cos(angle)),
                left_eye_center[1] + int(eye_height * np.sin(angle))
            ]
            
        # Set right eye landmarks (indices 42-47)
        for i in range(6):
            angle = 2 * np.pi * i / 6
            landmarks[42 + i] = [
                right_eye_center[0] + int(eye_width * np.cos(angle)),
                right_eye_center[1] + int(eye_height * np.sin(angle))
            ]
            
        # Fill in other landmarks with placeholders
        for i in range(68):
            if i not in range(36, 48):  # if not eye landmarks
                landmarks[i] = [x + w//2, y + h//2]  # just place at center of face
                
        # Update eye indices
        self.left_eye_indices = list(range(36, 42))
        self.right_eye_indices = list(range(42, 48))
                
        return landmarks
    
    def _generate_landmarks_from_eyes(self, face_x, face_y, eyes):
        """Generate landmarks based on detected eye positions"""
        # Create 68 landmarks, focused on the eyes
        landmarks = np.zeros((68, 2), dtype=np.int32)
        
        # Process first (left) eye
        x, y, w, h = eyes[0]
        left_eye_center = (face_x + x + w//2, face_y + y + h//2)
        
        # Set left eye landmarks (indices 36-41)
        eye_width = w // 2
        eye_height = h // 2
        for i in range(6):
            angle = 2 * np.pi * i / 6
            landmarks[36 + i] = [
                left_eye_center[0] + int(eye_width * np.cos(angle)),
                left_eye_center[1] + int(eye_height * np.sin(angle))
            ]
            
        # Process second (right) eye
        if len(eyes) > 1:
            x, y, w, h = eyes[1]
            right_eye_center = (face_x + x + w//2, face_y + y + h//2)
            
            # Set right eye landmarks (indices 42-47)
            for i in range(6):
                angle = 2 * np.pi * i / 6
                landmarks[42 + i] = [
                    right_eye_center[0] + int(eye_width * np.cos(angle)),
                    right_eye_center[1] + int(eye_height * np.sin(angle))
                ]
        else:
            # If only one eye detected, estimate right eye position
            right_eye_center = (left_eye_center[0] + 2*eye_width*3, left_eye_center[1])
            for i in range(6):
                angle = 2 * np.pi * i / 6
                landmarks[42 + i] = [
                    right_eye_center[0] + int(eye_width * np.cos(angle)),
                    right_eye_center[1] + int(eye_height * np.sin(angle))
                ]
        
        # Fill in other landmarks with placeholders
        for i in range(68):
            if i not in range(36, 48):  # if not eye landmarks
                landmarks[i] = [face_x + (landmarks[36][0] + landmarks[42][0])//2, 
                               face_y + (landmarks[36][1] + landmarks[42][1])//2]
                
        # Update eye indices
        self.left_eye_indices = list(range(36, 42))
        self.right_eye_indices = list(range(42, 48))
                
        return landmarks
    
    def calculate_ear(self, landmarks):
        """Calculate the Eye Aspect Ratio (EAR) for both eyes"""
        # Extract eye coordinates
        left_eye = landmarks[self.left_eye_indices]
        right_eye = landmarks[self.right_eye_indices]
        
        # Calculate EAR for left eye
        left_ear = self._calculate_single_ear(left_eye)
        
        # Calculate EAR for right eye
        right_ear = self._calculate_single_ear(right_eye)
        
        return left_ear, right_ear
    
    def _calculate_single_ear(self, eye):
        """Calculate Eye Aspect Ratio for a single eye"""
        try:
            # Compute the euclidean distances between the vertical eye landmarks
            A = np.linalg.norm(eye[1] - eye[5])
            B = np.linalg.norm(eye[2] - eye[4])
            
            # Compute the euclidean distance between the horizontal eye landmarks
            C = np.linalg.norm(eye[0] - eye[3])
            
            # Compute the EAR (avoid division by zero)
            if C > 0:
                ear = (A + B) / (2.0 * C)
            else:
                ear = 0.3  # default value
                
            return ear
        except:
            # Return a default value in case of errors
            return 0.3
    
    def draw_landmarks(self, frame, landmarks):
        """Draw facial landmarks on frame"""
        try:
            # Draw all landmarks
            for (x, y) in landmarks:
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)
            
            # Draw eyes
            left_eye = landmarks[self.left_eye_indices]
            right_eye = landmarks[self.right_eye_indices]
            
            # Draw left eye contour
            if len(left_eye) > 0:
                left_eye_hull = cv2.convexHull(left_eye)
                cv2.drawContours(frame, [left_eye_hull], -1, (0, 255, 0), 1)
            
            # Draw right eye contour
            if len(right_eye) > 0:
                right_eye_hull = cv2.convexHull(right_eye)
                cv2.drawContours(frame, [right_eye_hull], -1, (0, 255, 0), 1)
        except Exception as e:
            # In case of error, just pass
            print(f"Error drawing landmarks: {e}")
            pass
            
        return frame
