import os
import logging
from flask import Flask, render_template, Response, redirect, url_for, request, jsonify, session
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize database
class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "drowsiness_detection_secret")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///drowsiness.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database with app
db.init_app(app)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

from camera import Camera
from drowsiness_detection import DrowsinessDetector

# Initialize global objects
camera = None
detector = None

# Import models after db initialization
with app.app_context():
    import models
    db.create_all()

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/api/settings', methods=['GET'])
def get_settings():
    # Default settings values
    default_settings = {
        'ear_threshold': 0.25,
        'ear_frames': 20,
        'alert_sound': True,
        'alert_visual': True,
        'sensitivity': 'medium'
    }
    
    # Get settings from session or use defaults
    settings = session.get('settings', default_settings)
    return jsonify(settings)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    settings = request.json
    session['settings'] = settings
    
    # Update detector settings if detector exists
    global detector
    if detector:
        detector.update_settings(
            ear_threshold=float(settings.get('ear_threshold', 0.25)),
            ear_frames=int(settings.get('ear_frames', 20))
        )
    
    return jsonify({'status': 'success'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    # Get session stats
    if 'stats' not in session:
        session['stats'] = {
            'total_time': 0,
            'drowsy_time': 0,
            'alert_count': 0,
            'blink_rate': 0,
            'session_start': None
        }
    
    return jsonify(session['stats'])

# SocketIO events
@socketio.on('connect')
def handle_connect():
    logger.debug('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    logger.debug('Client disconnected')
    
    # Clean up resources
    global camera, detector
    if camera:
        camera.stop()
        camera = None
    detector = None

@socketio.on('start_detection')
def handle_start_detection():
    global camera, detector
    
    # Initialize camera and detector if not already initialized
    if not camera:
        camera = Camera()
        camera.start()
    
    if not detector:
        settings = session.get('settings', {})
        detector = DrowsinessDetector(
            ear_threshold=float(settings.get('ear_threshold', 0.25)),
            ear_frames=int(settings.get('ear_frames', 20))
        )
    
    def detection_loop():
        while camera and camera.is_running():
            if camera.frame is not None:
                # Process frame with detector
                frame, result = detector.process_frame(camera.frame.copy())
                
                # Emit result via Socket.IO
                emit('detection_result', {
                    'is_drowsy': result['is_drowsy'],
                    'ear': result['ear'],
                    'blinks': result['blinks'],
                    'face_detected': result['face_detected']
                })
                
                # Update session stats
                if 'stats' not in session:
                    session['stats'] = {
                        'total_time': 0,
                        'drowsy_time': 0,
                        'alert_count': 0,
                        'blink_rate': 0,
                        'session_start': None
                    }
                
                stats = session['stats']
                if result['is_drowsy']:
                    stats['drowsy_time'] += 1/15  # Assuming 15 FPS
                    stats['alert_count'] += 1 if result.get('new_alert', False) else 0
                
                stats['total_time'] += 1/15
                stats['blink_rate'] = result['blink_rate']
                session['stats'] = stats
                
                # Convert frame to JPEG
                ret, jpeg = detector.frame_to_jpeg(frame)
                if ret:
                    # Emit frame via Socket.IO (base64 encoded)
                    emit('video_frame', {'frame': jpeg})
    
    # Start detection in a background thread
    socketio.start_background_task(detection_loop)
    return {'status': 'started'}

@socketio.on('stop_detection')
def handle_stop_detection():
    global camera
    if camera:
        camera.stop()
        camera = None
    
    return {'status': 'stopped'}

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
