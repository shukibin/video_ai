const video = document.getElementById('video');
const cameraSelect = document.getElementById('camera-select');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendPrompt = document.getElementById('send-prompt');
const clearChat = document.getElementById('clear-chat');
const apiKeyInput = document.getElementById('api-key-input');
const errorLog = document.getElementById('error-log');

let currentStream;

// Log errors and display them to the user
function displayError(message) {
    console.error(message);
    errorLog.textContent = message;
    errorLog.style.display = 'block';
}

// Fetch available cameras
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) throw new Error('No cameras detected.');
        
        cameraSelect.innerHTML = '';
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        displayError('Error accessing cameras: ' + error.message);
    }
}

// Start video stream with the selected camera
async function startCamera(deviceId) {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: { deviceId: deviceId ? { exact: deviceId } : undefined }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        currentStream = stream;
        errorLog.style.display = 'none'; // Clear error if successful
    } catch (error) {
        displayError('Failed to start camera. ' + error.message);
    }
}

cameraSelect.addEventListener('change', () => {
    startCamera(cameraSelect.value);
});

sendPrompt.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        return displayError('Please enter your OpenAI API key.');
    }

    const prompt = userInput.value.trim();
    if (!prompt) {
        return displayError('Please enter a prompt.');
    }

    if (!video.srcObject) {
        return displayError('Failed to fetch snapshot: Video feed is not available.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0,
