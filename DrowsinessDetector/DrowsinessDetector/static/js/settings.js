/**
 * Settings page functionality for the DrowsAlert system
 */

// Default settings values
const defaultSettings = {
    sensitivity: 'medium',
    ear_threshold: 0.25,
    ear_frames: 20,
    alert_sound: true,
    alert_visual: true,
    alert_volume: 80,
    camera_id: 0,
    show_landmarks: true
};

// Initialize settings page
function initSettings() {
    // Load current settings from server
    loadSettings();
    
    // Set up slider value displays
    const earThreshold = document.getElementById('earThreshold');
    const earThresholdValue = document.getElementById('earThresholdValue');
    
    if (earThreshold && earThresholdValue) {
        earThreshold.addEventListener('input', function() {
            earThresholdValue.textContent = this.value;
        });
    }
    
    const earFrames = document.getElementById('earFrames');
    const earFramesValue = document.getElementById('earFramesValue');
    
    if (earFrames && earFramesValue) {
        earFrames.addEventListener('input', function() {
            earFramesValue.textContent = this.value;
        });
    }
    
    // Set up sensitivity preset changes
    const sensitivitySelect = document.getElementById('sensitivitySelect');
    
    if (sensitivitySelect) {
        sensitivitySelect.addEventListener('change', function() {
            updateSensitivityPreset(this.value);
        });
    }
    
    // Set up form submission
    const settingsForm = document.getElementById('settingsForm');
    
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettings();
        });
    }
    
    // Set up reset to defaults button
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
                applySettings(defaultSettings);
            }
        });
    }
    
    // Set up camera enumeration
    enumerateCameras();
}

// Load current settings from server
function loadSettings() {
    fetch('/api/settings')
        .then(response => response.json())
        .then(settings => {
            applySettings(settings);
        })
        .catch(error => {
            console.error('Error loading settings:', error);
            // Apply defaults if loading fails
            applySettings(defaultSettings);
        });
}

// Apply settings to form elements
function applySettings(settings) {
    // Apply sensitivity preset
    const sensitivitySelect = document.getElementById('sensitivitySelect');
    if (sensitivitySelect) {
        sensitivitySelect.value = settings.sensitivity || 'medium';
    }
    
    // Apply EAR threshold
    const earThreshold = document.getElementById('earThreshold');
    const earThresholdValue = document.getElementById('earThresholdValue');
    if (earThreshold && earThresholdValue) {
        earThreshold.value = settings.ear_threshold || 0.25;
        earThresholdValue.textContent = earThreshold.value;
    }
    
    // Apply consecutive frames threshold
    const earFrames = document.getElementById('earFrames');
    const earFramesValue = document.getElementById('earFramesValue');
    if (earFrames && earFramesValue) {
        earFrames.value = settings.ear_frames || 20;
        earFramesValue.textContent = earFrames.value;
    }
    
    // Apply alert sound setting
    const alertSound = document.getElementById('alertSound');
    if (alertSound) {
        alertSound.checked = settings.alert_sound !== undefined ? settings.alert_sound : true;
    }
    
    // Apply alert volume
    const alertVolume = document.getElementById('alertVolume');
    if (alertVolume) {
        alertVolume.value = settings.alert_volume || 80;
    }
    
    // Apply visual alert setting
    const alertVisual = document.getElementById('alertVisual');
    if (alertVisual) {
        alertVisual.checked = settings.alert_visual !== undefined ? settings.alert_visual : true;
    }
    
    // Apply camera ID
    const cameraSelect = document.getElementById('cameraSelect');
    if (cameraSelect) {
        cameraSelect.value = settings.camera_id || 0;
    }
    
    // Apply show landmarks setting
    const showLandmarks = document.getElementById('showLandmarks');
    if (showLandmarks) {
        showLandmarks.checked = settings.show_landmarks !== undefined ? settings.show_landmarks : true;
    }
}

// Update form values based on sensitivity preset
function updateSensitivityPreset(sensitivity) {
    const earThreshold = document.getElementById('earThreshold');
    const earThresholdValue = document.getElementById('earThresholdValue');
    const earFrames = document.getElementById('earFrames');
    const earFramesValue = document.getElementById('earFramesValue');
    
    switch (sensitivity) {
        case 'low':
            // Low sensitivity (more tolerant)
            if (earThreshold && earThresholdValue) {
                earThreshold.value = 0.2;
                earThresholdValue.textContent = earThreshold.value;
            }
            if (earFrames && earFramesValue) {
                earFrames.value = 30;
                earFramesValue.textContent = earFrames.value;
            }
            break;
        
        case 'medium':
            // Medium sensitivity (balanced)
            if (earThreshold && earThresholdValue) {
                earThreshold.value = 0.25;
                earThresholdValue.textContent = earThreshold.value;
            }
            if (earFrames && earFramesValue) {
                earFrames.value = 20;
                earFramesValue.textContent = earFrames.value;
            }
            break;
            
        case 'high':
            // High sensitivity (more alerts)
            if (earThreshold && earThresholdValue) {
                earThreshold.value = 0.28;
                earThresholdValue.textContent = earThreshold.value;
            }
            if (earFrames && earFramesValue) {
                earFrames.value = 15;
                earFramesValue.textContent = earFrames.value;
            }
            break;
    }
}

// Save settings to server
function saveSettings() {
    const form = document.getElementById('settingsForm');
    
    if (!form) return;
    
    // Get form data
    const formData = new FormData(form);
    const settings = {};
    
    // Convert form data to settings object
    for (const [key, value] of formData.entries()) {
        if (key === 'ear_threshold') {
            settings[key] = parseFloat(value);
        } else if (key === 'ear_frames' || key === 'alert_volume' || key === 'camera_id') {
            settings[key] = parseInt(value, 10);
        } else if (key === 'alert_sound' || key === 'alert_visual' || key === 'show_landmarks') {
            settings[key] = true; // Checkboxes are only included in FormData when checked
        } else {
            settings[key] = value;
        }
    }
    
    // Add boolean fields that are unchecked (not in FormData)
    if (!formData.has('alert_sound')) settings.alert_sound = false;
    if (!formData.has('alert_visual')) settings.alert_visual = false;
    if (!formData.has('show_landmarks')) settings.show_landmarks = false;
    
    // Send settings to server
    fetch('/api/settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Show success message
            showNotification('Settings saved successfully', 'success');
        } else {
            showNotification('Error saving settings', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    });
}

// Enumerate available cameras
function enumerateCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error("Browser doesn't support camera enumeration");
        return;
    }
    
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const cameraSelect = document.getElementById('cameraSelect');
            
            if (cameraSelect) {
                // Clear existing options but keep default
                cameraSelect.innerHTML = '<option value="0">Default Camera</option>';
                
                // Add available cameras
                videoDevices.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = device.label || `Camera ${index + 1}`;
                    cameraSelect.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Error enumerating cameras:', error));
}

// Show notification message
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        // Add CSS for notification
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 9999;
                opacity: 0;
                transform: translateY(-20px);
                transition: opacity 0.3s, transform 0.3s;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .notification.show {
                opacity: 1;
                transform: translateY(0);
            }
            .notification.success {
                background-color: #55efc4;
            }
            .notification.error {
                background-color: #ff7675;
            }
            .notification.info {
                background-color: #74b9ff;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set notification type and message
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
