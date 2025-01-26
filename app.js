const video = document.getElementById('video');
const cameraSelect = document.getElementById('camera-select');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendPrompt = document.getElementById('send-prompt');
const clearChat = document.getElementById('clear-chat');

// Start video feed
let currentStream;

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
        alert('Error starting video feed: ' + error.message);
    }
}

// Event: Change camera
cameraSelect.addEventListener('change', () => {
    startCamera(cameraSelect.value);
});

// Event: Send user prompt
sendPrompt.addEventListener('click', async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return alert('Please enter a prompt.');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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
        const data = await response.json();
        const aiResponse = data.choices[0].text;
        const userMessage = `<div><strong>You:</strong> ${prompt}</div>`;
        const aiMessage = `<div><strong>AI:</strong> ${aiResponse}</div>`;
        chatLog.innerHTML += userMessage + aiMessage;
        chatLog.scrollTop = chatLog.scrollHeight;
    } catch (error) {
        alert('Error analyzing the image: ' + error.message);
    }
});

// Event: Clear chat
clearChat.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the chat?')) {
        chatLog.innerHTML = '';
    }
});

// Initialize app
getCameras();
startCamera();
