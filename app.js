const video = document.getElementById('video');
const cameraSelect = document.getElementById('camera-select');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendPrompt = document.getElementById('send-prompt');
const clearChat = document.getElementById('clear-chat');

let currentStream;

// Fetch available cameras
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        cameraSelect.innerHTML = '';
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        alert('Error accessing cameras: ' + error.message);
    }
}

// Start camera stream
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
    } catch (error) {
        alert('Camera feed unavailable. Please grant permissions and try again.');
    }
}

// Initialize camera and handle permissions
async function initializeCamera() {
    await getCameras();
    await startCamera(cameraSelect.value);
}

cameraSelect.addEventListener('change', () => {
    startCamera(cameraSelect.value);
});

// Handle sending prompts
sendPrompt.addEventListener('click', async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return alert('Please enter a prompt.');

    if (!video.srcObject) {
        return alert('Failed to fetch snapshot: Video feed is not available.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (canvas.width === 0 || canvas.height === 0) {
        return alert('Failed to fetch snapshot: Video dimensions are invalid.');
    }

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

    try {
        const response = await fetch('https://api.openai.com/v1/images/analyze', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_API_KEY_HERE`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageBase64,
                prompt: prompt,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].text;
        chatLog.innerHTML += `<div><strong>You:</strong> ${prompt}</div><div><strong>AI:</strong> ${aiResponse}</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;
    } catch (error) {
        alert('Error analyzing the image: ' + error.message);
    }
});

// Clear chat functionality
clearChat.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the chat?')) {
        chatLog.innerHTML = '';
    }
});

// Initialize app
initializeCamera();
