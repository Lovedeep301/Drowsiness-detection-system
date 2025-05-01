from app import db
from datetime import datetime

class DrowsinessSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_time = db.Column(db.Float, default=0.0)  # in seconds
    drowsy_time = db.Column(db.Float, default=0.0)  # in seconds
    alert_count = db.Column(db.Integer, default=0)
    avg_blink_rate = db.Column(db.Float, default=0.0)  # blinks per minute

class Settings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ear_threshold = db.Column(db.Float, default=0.25)
    ear_frames = db.Column(db.Integer, default=20)
    alert_sound = db.Column(db.Boolean, default=True)
    alert_visual = db.Column(db.Boolean, default=True)
    sensitivity = db.Column(db.String(20), default='medium')
