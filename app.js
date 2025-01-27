const video = document.getElementById("video");
const cameraSelect = document.getElementById("cameraSelect");
const errorMessage = document.getElementById("error-message");
const chatContainer = document.getElementById("chat");
const apiKeyInput = document.getElementById("apiKey");
const promptInput = document.getElementById("prompt");
const sendPromptBtn = document.getElementById("sendPrompt");
const clearChatBtn = document.getElementById("clearChat");

let currentStream = null;

// Stop the current video stream
function stopCurrentStream() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
}

// Initialize camera devices
async function initializeCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === "videoinput");

    if (videoDevices.length === 0) {
      throw new Error("No cameras found on this device.");
    }

    // Populate the camera select dropdown
    cameraSelect.innerHTML = videoDevices
      .map((device, index) => `<option value="${device.deviceId}">${device.label || `Camera ${index + 1}`}</option>`)
      .join("");

    // Start the default camera
    startCamera(videoDevices[0].deviceId);
  } catch (err) {
    handleCameraError(err, "Error initializing cameras.");
  }
}

// Start the selected camera
async function startCamera(deviceId) {
  stopCurrentStream();

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    });

    video.srcObject = currentStream;
    errorMessage.textContent = "";
  } catch (err) {
    handleCameraError(err, "Failed to start camera.");
  }
}

// Handle camera-related errors
function handleCameraError(error, context) {
  console.error(context, error);

  switch (error.name) {
    case "NotAllowedError":
      errorMessage.textContent = `${context}: Camera access was denied. Please allow camera permissions in your browser settings.`;
      break;
    case "NotFoundError":
      errorMessage.textContent = `${context}: No camera devices found. Please connect a camera.`;
      break;
    case "NotReadableError":
      errorMessage.textContent = `${context}: Camera is already in use by another application.`;
      break;
    default:
      errorMessage.textContent = `${context}: ${error.message}`;
  }
}

// Send a prompt and snapshot to the OpenAI API
async function sendPrompt() {
  const apiKey = apiKeyInput.value.trim();
  const prompt = promptInput.value.trim();

  if (!apiKey) {
    alert("Please enter your OpenAI API key.");
    return;
  }

  if (!prompt) {
    alert("Please enter a prompt.");
    return;
  }

  try {
    // Take a snapshot from the video feed
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshot = canvas.toDataURL("image/jpeg").split(",")[1];

    // Send data to OpenAI API
    const response = await fetch("https://api.openai.com/v1/images/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: prompt,
        image: snapshot,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.output || "No response received.";

    // Update chat
    chatContainer.innerHTML += `<p><strong>You:</strong> ${prompt}</p>`;
    chatContainer.innerHTML += `<p><strong>AI:</strong> ${aiResponse}</p>`;
  } catch (err) {
    errorMessage.textContent = `Error: ${err.message}`;
  }
}

// Clear chat
clearChatBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the chat?")) {
    chatContainer.innerHTML = "";
  }
});

// Event listeners
cameraSelect.addEventListener("change", () => {
  startCamera(cameraSelect.value);
});
sendPromptBtn.addEventListener("click", sendPrompt);

// Initialize the application
initializeCameras();
