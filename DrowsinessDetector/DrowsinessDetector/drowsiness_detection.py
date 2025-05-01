import cv2
import numpy as np
import time
import base64
import logging
from face_utils import FaceUtils

# Set up logging
logger = logging.getLogger(__name__)

class DrowsinessDetector:
    def __init__(self, ear_threshold=0.25, ear_frames=20):
        self.face_utils = FaceUtils()
        self.ear_threshold = ear_threshold
        self.ear_frames = ear_frames
        self.ear_consec_frames = 0
        self.is_drowsy = False
        self.last_blink_time = time.time()
        self.blink_count = 0
        self.blink_rate = 0  # blinks per minute
        self.blink_times = []
        self.last_alert_time = 0
        logger.debug("DrowsinessDetector initialized")
    
    def update_settings(self, ear_threshold=None, ear_frames=None):
        """Update detector settings"""
        if ear_threshold is not None:
            self.ear_threshold = ear_threshold
        if ear_frames is not None:
            self.ear_frames = ear_frames
        logger.debug(f"Settings updated: ear_threshold={self.ear_threshold}, ear_frames={self.ear_frames}")
    
    def process_frame(self, frame):
        """Process a frame to detect drowsiness"""
        # Create a copy of the frame to avoid modifying the original
        processed_frame = frame.copy()
        
        # Result dictionary
        result = {
            'is_drowsy': False,
            'ear': 0,
            'blinks': self.blink_count,
            'blink_rate': self.blink_rate,
            'face_detected': False,
            'new_alert': False
        }
        
        try:
            # Detect face and get landmarks
            face_rect, landmarks = self.face_utils.detect_face_landmarks(processed_frame)
            
            # If face is detected
            if face_rect is not None and landmarks is not None:
                result['face_detected'] = True
                
                # Calculate Eye Aspect Ratio (EAR)
                left_ear, right_ear = self.face_utils.calculate_ear(landmarks)
                ear = (left_ear + right_ear) / 2.0
                result['ear'] = ear
                
                # Draw landmarks and EAR value
                processed_frame = self.face_utils.draw_landmarks(processed_frame, landmarks)
                cv2.putText(processed_frame, f"EAR: {ear:.2f}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                # Check for blink
                if ear < self.ear_threshold:
                    self.ear_consec_frames += 1
                    
                    # If eyes are closed for a sufficient number of frames, consider it drowsiness
                    if self.ear_consec_frames >= self.ear_frames:
                        self.is_drowsy = True
                        
                        # Create a new alert if more than 5 seconds since last alert
                        current_time = time.time()
                        if current_time - self.last_alert_time > 5:
                            result['new_alert'] = True
                            self.last_alert_time = current_time
                        
                        # Add visual indicator for drowsiness
                        cv2.putText(processed_frame, "DROWSINESS ALERT!", (10, 60),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                        # Add red border
                        processed_frame = cv2.copyMakeBorder(processed_frame, 20, 20, 20, 20, 
                                                  cv2.BORDER_CONSTANT, value=[0, 0, 255])
                else:
                    # Reset counter if eyes are sufficiently open
                    if self.ear_consec_frames >= 3:  # Consider it a blink if eyes were closed for at least 3 frames
                        self.blink_count += 1
                        self.blink_times.append(time.time())
                        
                        # Only keep blinks from the last minute for blink rate calculation
                        current_time = time.time()
                        self.blink_times = [t for t in self.blink_times if current_time - t <= 60]
                        
                        # Calculate blink rate (blinks per minute)
                        self.blink_rate = len(self.blink_times)
                    
                    self.ear_consec_frames = 0
                    self.is_drowsy = False
                
                # Display blink count and rate
                cv2.putText(processed_frame, f"Blinks: {self.blink_count}", (10, 90),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
                cv2.putText(processed_frame, f"Blink Rate: {self.blink_rate} bpm", (10, 120),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            else:
                # No face detected
                cv2.putText(processed_frame, "No face detected", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        except Exception as e:
            logger.error(f"Error in process_frame: {str(e)}")
            # In case of error, draw error message on frame
            cv2.putText(processed_frame, "Processing error", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        result['is_drowsy'] = self.is_drowsy
        return processed_frame, result
    
    def frame_to_jpeg(self, frame):
        """Convert OpenCV frame to JPEG format for web streaming"""
        try:
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                jpeg_bytes = jpeg.tobytes()
                jpeg_b64 = base64.b64encode(jpeg_bytes).decode('utf-8')
                return True, jpeg_b64
            return False, None
        except Exception as e:
            logger.error(f"Error in frame_to_jpeg: {str(e)}")
            return False, None
