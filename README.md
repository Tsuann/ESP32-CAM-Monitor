# 🚀 ESP32-CAM Full-Stack Dashboard (LTS)

A high-performance, full-stack web console for ESP32-CAM monitoring and control. This project solves common browser security issues like Mixed Content (HTTPS -> HTTP) and Ngrok's browser warning page.


<img width="1357" height="761" alt="image" src="https://github.com/user-attachments/assets/a882773b-165c-4b50-ad8b-bed1d3e75cf5" />


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

--------------分割线-------------
这是一个用gemini做的一个小玩具。主要是做了一个网页应用，可以读取ESP32+ov3660摄像头通过webserver传递的视频流。
ESP32端的代码只在示例的基础上做了一些OV3660图像格式的修改。其他修改不多。
该应用支持local WLAN以及remote bridge访问。local访问时只需要输入对应的主机地址即可。remote访问需要输入完整的URL。
此外还有截图和录制功能。基本功能是比较完善的。
存在一个小bug是在remote访问下，不能调整视频的参数。因为我在本地调试时用ngrok做的渗透，免费版只支持绑定一个地址。但是esp32cam webserver的控制和视频传输是两个端口80/81，没办法只能舍弃掉一个功能。

最后感慨一下，ai发展真的快。在四年前这种小项目估计要花一两周才能做完，现在有了ai帮助，即使没有太多前端基础，我用一个下午就能实现了这些功能。





