// Global variables
let OPENAI_API_KEY = '';
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
const setupDialog = document.getElementById('setupDialog');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyButton = document.getElementById('saveApiKey');

// Debug logging
const DEBUG = true;
function debugLog(...args) {
    if (DEBUG) {
        console.log('[Debug]', ...args);
    }
}

// API Key Management
function isValidApiKey(key) {
    return key.startsWith('sk-') && key.length > 20;
}

function handleApiKeySetup() {
    debugLog('Initializing API key setup');
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
        OPENAI_API_KEY = savedApiKey;
        setupDialog.classList.add('hidden');
        initializeCamera();
        debugLog('API key found in localStorage');
    } else {
        setupDialog.classList.remove('hidden');
        debugLog('No API key found, showing setup dialog');
    }
}

function clearApiKey() {
    localStorage.removeItem('openai_api_key');
    OPENAI_API_KEY = '';
    window.location.reload();
}

// Enhanced error handling
function showError(message, details = '', showRetry = false) {
    debugLog('Error occurred:', message, details);
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
    debugLog('Initializing camera');
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        debugLog('Found video devices:', videoDevices.length);

        cameraSelect.innerHTML = videoDevices.map(device =>
            `<option value="${device.deviceId}">${device.label || `Camera ${videoDevices.indexOf(device) + 1}`}</option>`
        ).join('');

        if (videoDevices.length > 0) {
            await startCamera(videoDevices[0].deviceId);
        } else {
            throw new Error('No video devices found');
        }
    } catch (error) {
        showError(
            'Failed to initialize camera. Please ensure camera permissions are granted.',
            `Error: ${error.message}\nStack: ${error.stack || 'No stack trace available'}`,
            true
        );
    }
}

// Start camera stream
async function startCamera(deviceId) {
    debugLog('Starting camera with deviceId:', deviceId);
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
        debugLog('Camera stream started successfully');
    } catch (error) {
        showError(
            'Failed to start camera stream.',
            `Error: ${error.message}\nStack: ${error.stack || 'No stack trace available'}`,
            true
        );
    }
}

// Take snapshot from video feed
function takeSnapshot() {
    debugLog('Taking snapshot');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
}

// Add message to chat
function addMessage(message, isUser = false) {
    debugLog('Adding message:', isUser ? 'User' : 'AI');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    conversationHistory.push({ role: isUser ? 'user' : 'assistant', content: message });
}

// Send message to OpenAI API with enhanced error handling
async function sendToOpenAI(prompt, imageData) {
    debugLog('Sending request to OpenAI');
    try {
        loadingSpinner.classList.remove('hidden');
        
        const payload = {
            model: 'gpt-4o-mini',  // Updated to use the vision model
            messages: [
                ...conversationHistory,
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: imageData,
                                detail: 'low'  // Add detail level
                            } 
                        }
                    ]
                }
            ],
            max_tokens: 500
        };

        debugLog('Request payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        debugLog('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            debugLog('Error response:', errorData);
            
            throw new Error(
                `API request failed: ${response.status} ${response.statusText}\n` +
                `Error: ${errorData.error?.message || 'Unknown error'}`
            );
        }

        const data = await response.json();
        debugLog('Successful response:', data);
        
        return data.choices[0].message.content;
    } catch (error) {
        debugLog('API Error:', error);
        throw new Error(`OpenAI API Error: ${error.message}\nStack: ${error.stack || 'No stack trace available'}`);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

// API key submission handler
function handleApiKeySubmission() {
    debugLog('Handling API key submission');
    const apiKey = apiKeyInput.value.trim();
    if (!isValidApiKey(apiKey)) {
        showError('Invalid API key format. It should start with "sk-" and be at least 20 characters long.');
        return;
    }
    
    try {
        localStorage.setItem('openai_api_key', apiKey);
        OPENAI_API_KEY = apiKey;
        setupDialog.classList.add('hidden');
        initializeCamera();
        debugLog('API key saved successfully');
    } catch (error) {
        showError('Failed to save API key', error.message);
    }
}

// Event Listeners
apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleApiKeySubmission();
    }
});

saveApiKeyButton.addEventListener('click', handleApiKeySubmission);

cameraSelect.addEventListener('change', (e) => {
    startCamera(e.target.value);
});

sendButton.addEventListener('click', async () => {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    debugLog('Send button clicked with prompt:', prompt);
    try {
        const imageData = takeSnapshot();
        addMessage(prompt, true);
        userInput.value = '';

        const response = await sendToOpenAI(prompt, imageData);
        addMessage(response);
    } catch (error) {
        showError(
            'Failed to process request.',
            `Error: ${error.message}\nStack: ${error.stack || 'No stack trace available'}`
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
    debugLog('Chat cleared');
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
        navigator.serviceWorker.register('/video_ai/sw.js')
            .then(registration => {
                debugLog('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed:', error);
            });
    });
}

// Initialize the application
handleApiKeySetup();