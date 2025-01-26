const video = document.getElementById('video');
const cameraSelect = document.getElementById('camera-select');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendPrompt = document.getElementById('send-prompt');
const clearChat = document.getElementById('clear-chat');
const apiKeyInput = document.getElementById('api-key-input');
const errorLog = document.getElementById('error-log');

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
        displayError('Error accessing cameras: ' + error.message);
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
        displayError('Camera feed unavailable. Please grant permissions and try again.');
    }
}

async function initializeCamera() {
    await getCameras();
    await startCamera(cameraSelect.value);
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
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are an AI assistant analyzing images." },
                    { role: "user", content: prompt },
                ],
                attachments: [
                    {
                        type: "image/png",
                        data: imageBase64,
                    },
                ],
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check and try again.');
            } else if (response.status === 400) {
                throw new Error('Bad request. Verify the input data.');
            } else if (response.status === 500) {
                throw new Error('OpenAI server error. Please try again later.');
            } else {
                throw new Error(`Unexpected error: ${response.statusText}`);
            }
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        chatLog.inner
