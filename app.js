const video = document.getElementById("video");
const cameraSelect = document.getElementById("cameraSelect");
const errorMessage = document.getElementById("error-message");
const chatContainer = document.getElementById("chat");
const apiKeyInput = document.getElementById("apiKey");
const promptInput = document.getElementById("prompt");
const sendPromptBtn = document.getElementById("sendPrompt");
const clearChatBtn = document.getElementById("clearChat");

let currentStream = null;

// Utility to stop all media tracks
const stopStream = () => {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
};

// Initialize the camera list
const getCameras = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error("Camera API not supported in this browser.");
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === "videoinput");

    if (videoDevices.length === 0) {
      throw new Error("No cameras found. Please check your device or permissions.");
    }

    cameraSelect.innerHTML = videoDevices
      .map((device, index) => `<option value="${device.deviceId}">${device.label || `Camera ${index + 1}`}</option>`)
      .join("");

    startCamera(videoDevices[0].deviceId);
  } catch (err) {
    errorMessage.textContent = `Error: ${err.message}`;
  }
};

// Start the camera feed
const startCamera = async (deviceId) => {
  stopStream();
  try {
    const constraints = {
      video: { deviceId: deviceId ? { exact: deviceId } : undefined }
    };

    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
    errorMessage.textContent = "";
  } catch (err) {
    errorMessage.textContent = `Failed to start camera: ${err.message}`;
  }
};

// Handle camera change
cameraSelect.addEventListener("change", () => {
  const selectedDeviceId = cameraSelect.value;
  startCamera(selectedDeviceId);
});

// Handle sending prompt
sendPromptBtn.addEventListener("click", async () => {
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
    // Capture a snapshot from the video feed
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshot = canvas.toDataURL("image/jpeg").split(",")[1]; // Base64 format

    // Send request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/images/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: prompt,
        image: snapshot
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.output || "No response received.";

    // Update chat
    chatContainer.innerHTML += `<p><strong>You:</strong> ${prompt}</p>`;
    chatContainer.innerHTML += `<p><strong>AI:</strong> ${aiResponse}</p>`;
  } catch (err) {
    errorMessage.textContent = `Error: ${err.message}`;
  }
});

// Clear chat
clearChatBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear the chat?")) {
    chatContainer.innerHTML = "";
    errorMessage.textContent = "";
  }
});

// Initialize
getCameras();
