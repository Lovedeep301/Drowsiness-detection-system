/**
 * Dashboard functionality for the DrowsAlert system
 */

// Chart objects
let drowsinessChart = null;
let alertnessDonut = null;
let blinkRateChart = null;

// Sample data for demo purposes
const sampleTimeLabels = [];
const sampleDrowsinessData = [];
const sampleBlinkRateData = [];

// Generate sample data for the last 60 minutes
for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setMinutes(date.getMinutes() - (59 - i));
    sampleTimeLabels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    // Generate some variation in the sample data
    const drowsiness = i < 30 ? Math.random() * 0.2 : 0.2 + Math.random() * 0.3;
    sampleDrowsinessData.push(drowsiness);
    
    const blinkRate = 10 + Math.sin(i / 5) * 5 + Math.random() * 3;
    sampleBlinkRateData.push(blinkRate);
}

// Initialize the dashboard
function initDashboard() {
    // Initialize charts
    initDrowsinessChart();
    initAlertnessDonut();
    initBlinkRateChart();
    
    // Update dashboard with latest stats
    updateDashboardStats();
    
    // Set up data refresh interval (every 30 seconds)
    setInterval(updateDashboardStats, 30000);
}

// Initialize the drowsiness timeline chart
function initDrowsinessChart() {
    const ctx = document.getElementById('drowsinessChart').getContext('2d');
    
    drowsinessChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sampleTimeLabels,
            datasets: [{
                label: 'Drowsiness Level',
                data: sampleDrowsinessData,
                backgroundColor: 'rgba(255, 118, 117, 0.2)',
                borderColor: 'rgba(255, 118, 117, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Drowsiness Levels Over Time',
                    color: '#ecf0f1',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    labels: {
                        color: '#ecf0f1'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b2bec3',
                        callback: function(value) {
                            if (value <= 0.2) return 'Alert';
                            if (value <= 0.5) return 'Drowsy';
                            return 'Very Drowsy';
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b2bec3',
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

// Initialize the alertness donut chart
function initAlertnessDonut() {
    const ctx = document.getElementById('alertnessDonut').getContext('2d');
    
    // Calculate alertness percentage from drowsiness data
    const drowsyTime = sampleDrowsinessData.filter(val => val > 0.2).length;
    const alertTime = sampleDrowsinessData.length - drowsyTime;
    const alertPercentage = (alertTime / sampleDrowsinessData.length) * 100;
    
    alertnessDonut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Alert', 'Drowsy'],
            datasets: [{
                data: [alertPercentage, 100 - alertPercentage],
                backgroundColor: [
                    'rgba(85, 239, 196, 0.8)',
                    'rgba(255, 118, 117, 0.8)'
                ],
                borderColor: [
                    'rgba(85, 239, 196, 1)',
                    'rgba(255, 118, 117, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Alertness Ratio',
                    color: '#ecf0f1',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ecf0f1',
                        padding: 10
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Initialize the blink rate chart
function initBlinkRateChart() {
    const ctx = document.getElementById('blinkRateChart').getContext('2d');
    
    blinkRateChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Normal', 'Current'],
            datasets: [{
                label: 'Blinks per Minute',
                data: [15, sampleBlinkRateData[sampleBlinkRateData.length - 1]],
                backgroundColor: [
                    'rgba(0, 206, 201, 0.6)',
                    'rgba(108, 92, 231, 0.6)'
                ],
                borderColor: [
                    'rgba(0, 206, 201, 1)',
                    'rgba(108, 92, 231, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Blink Rate Comparison',
                    color: '#ecf0f1',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b2bec3'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#b2bec3'
                    }
                }
            }
        }
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    // Fetch the latest session stats
    fetch('/api/stats')
        .then(response => response.json())
        .then(stats => {
            // Update total time
            const totalSessionTime = document.getElementById('totalSessionTime');
            if (totalSessionTime) {
                totalSessionTime.textContent = formatTimeHours(stats.total_time);
            }
            
            // Update drowsy time
            const totalDrowsyTime = document.getElementById('totalDrowsyTime');
            if (totalDrowsyTime) {
                totalDrowsyTime.textContent = formatTimeHours(stats.drowsy_time);
            }
            
            // Update alert count
            const totalAlerts = document.getElementById('totalAlerts');
            if (totalAlerts) {
                totalAlerts.textContent = stats.alert_count;
            }
            
            // Update alertness percentage
            const alertnessPercentage = document.getElementById('alertnessPercentage');
            if (alertnessPercentage) {
                const percentage = stats.total_time > 0 ? 
                    Math.round(((stats.total_time - stats.drowsy_time) / stats.total_time) * 100) : 100;
                alertnessPercentage.textContent = `${percentage}%`;
            }
            
            // Update alertness donut chart
            if (alertnessDonut) {
                const percentage = stats.total_time > 0 ? 
                    Math.round(((stats.total_time - stats.drowsy_time) / stats.total_time) * 100) : 100;
                
                alertnessDonut.data.datasets[0].data = [percentage, 100 - percentage];
                alertnessDonut.update();
            }
            
            // Update blink rate chart
            if (blinkRateChart) {
                blinkRateChart.data.datasets[0].data[1] = stats.blink_rate;
                blinkRateChart.update();
            }
            
            // Update recent sessions table (placeholder)
            updateRecentSessionsTable();
        })
        .catch(error => console.error('Error fetching stats:', error));
}

// Update recent sessions table with placeholder data
function updateRecentSessionsTable() {
    const tableBody = document.getElementById('recentSessionsTable');
    
    if (tableBody) {
        // Generate sample session data for demonstration
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const sessions = [
            {
                date: today.toLocaleDateString(),
                time: '08:30 AM',
                duration: '45:12',
                drowsyPercent: '15%',
                alerts: 3
            },
            {
                date: today.toLocaleDateString(),
                time: '02:15 PM',
                duration: '1:12:30',
                drowsyPercent: '28%',
                alerts: 7
            },
            {
                date: yesterday.toLocaleDateString(),
                time: '09:45 AM',
                duration: '38:20',
                drowsyPercent: '5%',
                alerts: 1
            },
            {
                date: yesterday.toLocaleDateString(),
                time: '04:30 PM',
                duration: '52:15',
                drowsyPercent: '22%',
                alerts: 5
            }
        ];
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add session rows
        sessions.forEach(session => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${session.date} ${session.time}</td>
                <td>${session.duration}</td>
                <td>${session.drowsyPercent}</td>
                <td>${session.alerts}</td>
            `;
            
            tableBody.appendChild(row);
        });
    }
}
