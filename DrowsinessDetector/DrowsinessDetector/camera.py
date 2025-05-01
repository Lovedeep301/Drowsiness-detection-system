import cv2
import threading
import time
import logging

logger = logging.getLogger(__name__)

class Camera:
    def __init__(self, camera_id=0, width=640, height=480):
        self.camera_id = camera_id
        self.width = width
        self.height = height
        self.frame = None
        self.thread = None
        self.running = False
        self.fps = 0
        self.last_frame_time = 0
    
    def start(self):
        """Start the camera thread"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._thread_function)
        self.thread.daemon = True
        self.thread.start()
        logger.debug("Camera started")
    
    def stop(self):
        """Stop the camera thread"""
        self.running = False
        if self.thread:
            self.thread.join()
            self.thread = None
        logger.debug("Camera stopped")
    
    def is_running(self):
        """Return whether the camera is running"""
        return self.running
    
    def _thread_function(self):
        """Camera thread function"""
        # Initialize video capture
        cap = cv2.VideoCapture(self.camera_id)
        
        if not cap.isOpened():
            logger.error(f"Could not open camera {self.camera_id}")
            self.running = False
            return
        
        # Set resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        
        # Variables for FPS calculation
        frame_count = 0
        start_time = time.time()
        
        while self.running:
            # Read frame
            ret, frame = cap.read()
            
            if not ret:
                logger.error("Could not read frame from camera")
                break
            
            # Calculate FPS
            frame_count += 1
            elapsed_time = time.time() - start_time
            if elapsed_time >= 1.0:
                self.fps = frame_count / elapsed_time
                frame_count = 0
                start_time = time.time()
            
            # Store frame and timestamp
            self.frame = frame
            self.last_frame_time = time.time()
        
        # Release resources
        cap.release()
        logger.debug("Camera resources released")
