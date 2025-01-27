// Replace with your OpenAI API key
const OPENAI_API_KEY = 'your-api-key-here';

// Global variables
let currentStream = null;
let conversationHistory = [];

// DOM Elements
const videoElement = document.getElementById('videoElement');
const cameraSelect = document.getElementById('cameraSelect');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const clearChatButton = document.getElementById('clearChat');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorDialog = document.getElementById('errorDialog');
const errorMessage = document.getElementById('errorMessage');
const errorDetails = document.getElementById('errorDetails');
const errorTrace = document.getElementById('errorTrace');
const errorClose = document.getElementById('errorClose');
const errorRetry = document.getElementById('errorRetry');
const confirmDialog = document.getElementById('confirmDialog');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');

// Error handling function
function showError(message, details = '', showRetry = false) {
    errorMessage.textContent = message;
    if (details) {
        errorDetails.classList.remove('hidden');
        errorTrace.textContent = details;
    } else {
        errorDetails.classList.add('hidden');
    }
    errorRetry.classList.toggle('hidden', !showRetry);
    errorDialog.classList.remove('hidden');
}

// Initialize camera
async function initializeCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        // Populate camera select
        cameraSelect.innerHTML = videoDevices.map(device =>
            `<option value="${device.deviceId}">${device.label || `Camera ${videoDevices.indexOf(device) + 1}`}</option>`
        ).join('');

        // Start with the first available camera
        if (videoDevices.length > 0) {
            await startCamera(videoDevices[0].deviceId);
        }
    } catch (error) {
        showError(
            'Failed to initialize camera. Please ensure camera permissions are granted.',
            `Error: ${error.message}\nLine: ${error.lineNumber || 'Unknown'}`,
            true
        );
    }
}

// Start camera stream
async function startCamera(deviceId) {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                facingMode: deviceId ? undefined : 'environment'
            }
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = currentStream;
    } catch (error) {
        showError(
            'Failed to start camera stream.',
            `Error: ${error.message}\nLine: ${error.lineNumber || 'Unknown'}`,
            true
        );
    }
}

// Take snapshot from video feed
function takeSnapshot() {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
}

// Add message to chat
function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    conversationHistory.push({ role: isUser ? 'user' : 'assistant', content: message });
}

// Send message to OpenAI API
async function sendToOpenAI(prompt, imageData) {
    try {
        loadingSpinner.classList.remove('hidden');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4-vision-preview',
                messages: [
                    ...conversationHistory,
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageData } }
                        ]
                    }
                ],
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        throw new Error(`OpenAI API Error: ${error.message}`);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// Event Listeners
cameraSelect.addEventListener('change', (e) => {
    startCamera(e.target.value);
});

sendButton.addEventListener('click', async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    try {
        const imageData = takeSnapshot();
        addMessage(prompt, true);
        userInput.value = '';

        const response = await sendToOpenAI(prompt, imageData);
        addMessage(response);
    } catch (error) {
        showError(
            'Failed to process request.',
            `Error: ${error.message}\nLine: ${error.lineNumber || 'Unknown'}`
        );
    }
});

clearChatButton.addEventListener('click', () => {
    confirmDialog.classList.remove('hidden');
});

confirmYes.addEventListener('click', () => {
    chatMessages.innerHTML = '';
    conversationHistory = [];
    confirmDialog.classList.add('hidden');
});

confirmNo.addEventListener('click', () => {
    confirmDialog.classList.add('hidden');
});

errorClose.addEventListener('click', () => {
    errorDialog.classList.add('hidden');
});

errorRetry.addEventListener('click', () => {
    errorDialog.classList.add('hidden');
    initializeCamera();
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(error => {
            console.error('ServiceWorker registration failed:', error);
        });
    });
}

// Initialize the application
initializeCamera();
