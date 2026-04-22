# 🚀 ESP32-CAM Full-Stack Dashboard (LTS)

A high-performance, full-stack web console for ESP32-CAM monitoring and control. This project solves common browser security issues like Mixed Content (HTTPS -> HTTP) and Ngrok's browser warning page.

![ESP32-CAM Dashboard](https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=1200&h=400)

## ✨ Key Features

-   **🔄 Hybrid Connectivity**: Seamless switching between **Local LAN (P2P)** and **Remote Bridge (Full-Stack Proxy)**.
-   **🛡️ Secure Proxy**: Built-in Express.js backend proxies streams and controls to bypass Ngrok/Cloudflare Tunnel security headers.
-   **📹 Pro Recording**: Real-time video recording to `.webm` format via MediaRecorder API (saves to Downloads folder).
-   **📸 Fast Snapshots**: Instant capture of the video frame as High-Quality JPEG.
-   **🎛️ Full Control**: Adjust brightness, contrast, saturation, framesize, and hardware effects remotely.
-   **📊 Live Telemetry**: Real-time FPS monitoring and true network latency (RTT) measurement.

## 🛠️ Performance Architecture

-   **Frontend**: React 18, Vite, Tailwind CSS 4.0, Framer Motion.
-   **Backend**: Node.js, Express.js proxy handler.
-   **Hardware Compatibility**: Optimized for AI-Thinker ESP32-CAM and similar OV2640 based modules.

## 🚀 Getting Started

### 1. Build the App
```bash
npm install
npm run build
```

### 2. Start the Full-Stack Server
```bash
npm run dev
```

### 3. ESP32 Configuration
- Map your ESP32-CAM to your local IP.
- For remote access, use Ngrok: `ngrok http 81` (and use the generated URL in the App).

## 💾 Saving Media
-   **Snapshots**: Saved to your default Downloads folder as `.jpg`.
-   **Recordings**: Saved to your default Downloads folder as `.webm`.

## 🔒 Security Optimization
This app automatically injects `ngrok-skip-browser-warning: true` headers to ensure your camera feed starts instantly without manual confirmation pages.

---
*Created with Google AI Studio Build.*
