/**
 * Main JavaScript functionality for the DrowsAlert system
 */

// Global variables
let isDetectionRunning = false;
let alertSound = null;

// Initialize the detection page
function initDetectionPage() {
    // Set up button click handlers
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (startBtn && stopBtn) {
        startBtn.addEventListener('click', startDetection);
        stopBtn.addEventListener('click', stopDetection);
    }
    
    // Initialize audio for alerts
    initAudioAlert();
    
    // Update session time display periodically
    setInterval(updateSessionTime, 1000);
    
    // Fetch initial session stats
    fetchSessionStats();
}

// Start drowsiness detection
function startDetection() {
    if (isDetectionRunning) return;
    
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const videoFeed = document.getElementById('videoFeed');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Update UI
    startBtn.disabled = true;
    stopBtn.disabled = false;
    cameraPlaceholder.classList.add('d-none');
    videoFeed.classList.remove('d-none');
    loadingOverlay.classList.remove('d-none');
    
    // Connect to socket.io server
    if (!socket.connected) {
        socket.connect();
    }
    
    // Start detection on server
    socket.emit('start_detection', {}, (response) => {
        console.log('Detection started:', response);
        isDetectionRunning = true;
        
        // Hide loading overlay after a short delay
        setTimeout(() => {
            loadingOverlay.classList.add('d-none');
        }, 1500);
    });
}

// Stop drowsiness detection
function stopDetection() {
    if (!isDetectionRunning) return;
    
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const videoFeed = document.getElementById('videoFeed');
    const drowsyOverlay = document.getElementById('drowsyOverlay');
    const noFaceOverlay = document.getElementById('noFaceOverlay');
    
    // Update UI
    startBtn.disabled = false;
    stopBtn.disabled = true;
    cameraPlaceholder.classList.remove('d-none');
    videoFeed.classList.add('d-none');
    drowsyOverlay.classList.add('d-none');
    noFaceOverlay.classList.add('d-none');
    
    // Stop detection on server
    socket.emit('stop_detection', {}, (response) => {
        console.log('Detection stopped:', response);
        isDetectionRunning = false;
    });
    
    // Stop any active alert sounds
    if (alertSound) {
        alertSound.stop();
    }
}

// Initialize the audio alert system
function initAudioAlert() {
    // Create a simple synth using Tone.js
    alertSound = new Tone.Synth({
        oscillator: {
            type: 'triangle'
        },
        envelope: {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.5,
            release: 0.8
        }
    }).toDestination();
    
    // Set the volume
    alertSound.volume.value = -10; // in dB
}

// Play the drowsiness alert sound
function playAlertSound() {
    // Check settings to see if sound alerts are enabled
    fetch('/api/settings')
        .then(response => response.json())
        .then(settings => {
            if (settings.alert_sound) {
                // Play a repeating warning tone
                const now = Tone.now();
                alertSound.triggerAttackRelease('G4', '0.1', now);
                alertSound.triggerAttackRelease('E4', '0.1', now + 0.2);
                alertSound.triggerAttackRelease('G4', '0.1', now + 0.4);
                alertSound.triggerAttackRelease('E4', '0.1', now + 0.6);
            }
        })
        .catch(error => console.error('Error fetching settings:', error));
}

// Update UI with detection results
function updateDetectionUI(result) {
    // Update EAR value and progress bar
    const earValue = document.getElementById('earValue');
    const earProgressBar = document.getElementById('earProgressBar');
    
    if (earValue && earProgressBar) {
        earValue.textContent = result.ear.toFixed(2);
        
        // Convert EAR to a percentage for the progress bar (typical EAR values range from 0.15 to 0.35)
        const earPercentage = Math.min(result.ear * 300, 100); // Scale to percentage with a max of 100%
        earProgressBar.style.width = `${earPercentage}%`;
        
        // Change color based on value
        if (result.ear < 0.2) {
            earProgressBar.className = 'progress-bar bg-danger';
        } else if (result.ear < 0.25) {
            earProgressBar.className = 'progress-bar bg-warning';
        } else {
            earProgressBar.className = 'progress-bar bg-success';
        }
    }
    
    // Update blink rate
    const blinkRateValue = document.getElementById('blinkRateValue');
    if (blinkRateValue) {
        blinkRateValue.textContent = result.blink_rate;
    }
    
    // Update drowsiness status
    const drowsinessStatus = document.getElementById('drowsinessStatus');
    const drowsyOverlay = document.getElementById('drowsyOverlay');
    
    if (drowsinessStatus) {
        if (result.is_drowsy) {
            drowsinessStatus.classList.add('alert');
            drowsinessStatus.innerHTML = `
                <span class="status-text">Detected</span>
                <span class="status-icon"><i class="fas fa-exclamation-triangle"></i></span>
            `;
            
            // Show visual overlay if settings allow
            fetch('/api/settings')
                .then(response => response.json())
                .then(settings => {
                    if (settings.alert_visual && drowsyOverlay) {
                        drowsyOverlay.classList.remove('d-none');
                        
                        // Play alert sound (will only play if audio alerts are enabled in settings)
                        playAlertSound();
                    }
                })
                .catch(error => console.error('Error fetching settings:', error));
        } else {
            drowsinessStatus.classList.remove('alert');
            drowsinessStatus.innerHTML = `
                <span class="status-text">Not Detected</span>
                <span class="status-icon"><i class="fas fa-check-circle"></i></span>
            `;
            
            // Hide drowsy overlay
            if (drowsyOverlay) {
                drowsyOverlay.classList.add('d-none');
            }
        }
    }
    
    // Update face detection status
    const faceDetectionStatus = document.getElementById('faceDetectionStatus');
    const noFaceOverlay = document.getElementById('noFaceOverlay');
    
    if (faceDetectionStatus) {
        if (result.face_detected) {
            faceDetectionStatus.innerHTML = `
                <span class="badge bg-success">Face Detected</span>
            `;
            
            // Hide no face overlay
            if (noFaceOverlay) {
                noFaceOverlay.classList.add('d-none');
            }
        } else {
            faceDetectionStatus.innerHTML = `
                <span class="badge bg-danger">No Face Detected</span>
            `;
            
            // Show no face overlay
            if (noFaceOverlay) {
                noFaceOverlay.classList.remove('d-none');
            }
        }
    }
    
    // Update blink count
    const blinkCount = document.getElementById('blinkCount');
    if (blinkCount) {
        blinkCount.textContent = result.blinks;
    }
}

// Fetch session statistics
function fetchSessionStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(stats => {
            updateSessionStats(stats);
        })
        .catch(error => console.error('Error fetching session stats:', error));
}

// Update session statistics in UI
function updateSessionStats(stats) {
    // Update session time
    const sessionTime = document.getElementById('sessionTime');
    if (sessionTime) {
        sessionTime.textContent = formatTime(stats.total_time);
    }
    
    // Update drowsy time
    const drowsyTime = document.getElementById('drowsyTime');
    if (drowsyTime) {
        drowsyTime.textContent = formatTime(stats.drowsy_time);
    }
    
    // Update alert count
    const alertCount = document.getElementById('alertCount');
    if (alertCount) {
        alertCount.textContent = stats.alert_count;
    }
}

// Update session time display
function updateSessionTime() {
    if (!isDetectionRunning) return;
    
    fetchSessionStats();
}

// Format time in seconds to MM:SS format
function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format time in seconds to HH:MM:SS format
function formatTimeHours(seconds) {
    seconds = Math.floor(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
