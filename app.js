const videoElement = document.getElementById('video');
const cameraSelect = document.getElementById('camera-select');
const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearChatBtn = document.getElementById('clear-chat');

// Handle camera access
async function initializeCamera() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    if (videoDevices.length === 0) throw new Error('No camera available');

    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${index + 1}`;
      cameraSelect.appendChild(option);
    });

    cameraSelect.addEventListener('change', () => {
      startCamera(cameraSelect.value);
    });

    startCamera(videoDevices[0].deviceId);
  } catch (error) {
    alert('Camera feed unavailable. Please grant permissions and refresh the page.');
  }
}

async function startCamera(deviceId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: deviceId } }
  });
  videoElement.srcObject = stream;
}

// Chat functionality
sendBtn.addEventListener('click', async () => {
  const prompt = userInput.value;
  if (!prompt) return;

  // Capture snapshot
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const snapshot = canvas.toDataURL('image/png');

  // Send to API (placeholder, replace with actual API call)
  appendMessage('user', prompt);
  appendMessage('ai', 'Processing...');

  try {
    const response = await analyzeWithOpenAI(prompt, snapshot);
    appendMessage('ai', response);
  } catch (error) {
    appendMessage('ai', 'Error analyzing the image. Please try again.');
  }
});

async function analyzeWithOpenAI(prompt, image) {
  const apiKey = 'YOUR_API_KEY_HERE';
  const response = await fetch('https://api.openai.com/v1/vision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, image }),
  });
  const data = await response.json();
  return data.choices[0].text;
}

function appendMessage(sender, text) {
  const message = document.createElement('div');
  message.classList.add('message', sender);
  message.innerText = text;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// Clear chat
clearChatBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear the chat?')) {
    chatLog.innerHTML = '';
  }
});

// Initialize app
initializeCamera();
