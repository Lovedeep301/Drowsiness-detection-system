/**
 * Socket.IO communication for the DrowsAlert system
 */

// Initialize the Socket.IO connection
const socket = io({
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

// Socket connection event
socket.on('connect', () => {
    console.log('Connected to server');
});

// Socket disconnection event
socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
    
    // If detection was running, update UI accordingly
    if (isDetectionRunning) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (startBtn && stopBtn) {
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
        
        // Show disconnect message
        const cameraPlaceholder = document.getElementById('cameraPlaceholder');
        if (cameraPlaceholder) {
            cameraPlaceholder.classList.remove('d-none');
            cameraPlaceholder.innerHTML = `
                <i class="fas fa-exclamation-triangle text-warning mb-3"></i>
                <p>Connection lost. Please refresh the page and try again.</p>
            `;
        }
        
        // Hide video feed
        const videoFeed = document.getElementById('videoFeed');
        if (videoFeed) {
            videoFeed.classList.add('d-none');
        }
        
        isDetectionRunning = false;
    }
});

// Handle reconnection event
socket.on('reconnect', (attemptNumber) => {
    console.log('Reconnected to server after', attemptNumber, 'attempts');
});

// Handle reconnect error
socket.on('reconnect_error', (error) => {
    console.error('Error reconnecting to server:', error);
});

// Handle video frame from server
socket.on('video_frame', (data) => {
    const videoFeed = document.getElementById('videoFeed');
    
    if (videoFeed && data.frame) {
        // Display the received frame
        videoFeed.src = `data:image/jpeg;base64,${data.frame}`;
    }
});

// Handle detection results from server
socket.on('detection_result', (result) => {
    // Update UI with detection results
    if (typeof updateDetectionUI === 'function') {
        updateDetectionUI(result);
    }
});
