# ESP32-CAM 智能监控控制台 (Full-Stack Console)

## 📋 英文介绍 (English Introduction)
**ESP32-CAM Full-Stack Console** is a professional-grade web interface designed for real-time monitoring and remote hardware control. It features a hybrid connectivity architecture that seamlessly switches between direct Local LAN access and a secure server-side Proxy for remote tunneling (e.g., Ngrok). Key capabilities include MJPEG streaming, 30FPS background recording (.webm), instant snapshots, and live RTT latency telemetry. It specifically overcomes common HTTPS/HTTP mixed-content security blocks and bypasses tunnel warning pages.

---

## 🚀 主要功能 (Main Features)

### 1. 智能双模式连接
*   **局域网模式 (Local LAN)**：在 WiFi 内部实现点对点直连，低延迟，不消耗外网流量。
*   **远程桥接 (Remote Bridge)**：通过内置的 Express 后端代理，实现远程隧道的 100% 连通。

### 2. 高级多媒体处理
*   **实时录制**：采用 MediaRecorder API，支持在浏览器端直接录制 30FPS 的高清视频（webm格式），无需 ESP32 本地存储。
*   **高速抓拍**：一键捕获当前高清帧，自动保存为 JPEG。
*   **旋转与缩放**：支持 90°/180°/270° 画面无损旋转及适配屏幕的动态缩放。

### 3. 全性能仪表盘
*   **实时 FPS**：动态监控当前视频流的传输频率。
*   **延迟监控 (LAT)**：通过 Ping 心跳机制，测量浏览器到服务器的真实往返时间 (RTT)。
*   **硬件参数调节**：远程调节亮度、对比度、饱和度、白平衡、画质、分辨率等。

---

## 🎮 操作指南 (Operation Guide)

1.  **输入地址**：
    *   **局域网**：输入 ESP32 的内网 IP（如 `192.168.1.100`）。
    *   **远程**：切换到 `Remote Bridge` 模式，输入你的 Ngrok 或穿透隧道 URL。
2.  **建立同步**：点击 **Sync** 按钮。如果提示“Link Blocked”，点击 **Authorize URL** 授权一次即可。
3.  **调节画面**：点击右侧的图像调节滑块或开关。
4.  **录制与保存**：
    *   点击 **Record** 开始录制，再次点击结束。
    *   录制完成后，视频会自动静默下载到你系统的 **“下载 (Downloads)”** 文件夹。

---

## 🛠️ 部署指南 (Deployment Guide)

### 1. 环境准备
*   安装 [Node.js](https://nodejs.org/) (推荐 v18+)。
*   准备好你的 ESP32-CAM 硬件，并烧录标准 CameraWebServer 示例固件。

### 2. 本地安装与启动
```bash
# 进入项目目录
npm install

# 启动开发服务器 (包含前端 Vite 和后端 Proxy)
npm run dev
```

### 3. 生产环境部署 (如云服务器/VM)
1.  **构建前端静态文件**：
    ```bash
    npm run build
    ```
2.  **配置环境变量** (可选)：
    *   在 `.env` 中设置服务端口等信息。
3.  **启动服务**：
    ```bash
    # 后端会托管 dist 目录下的前端静态资源
    NODE_ENV=production node server.ts
```

### 4. 远程渗透建议
如果你想在公网访问：
1.  在本地 PC 或 ESP32 所属网段运行：`ngrok http 81` (针对视频流) 或 `ngrok http 80` (针对控制)。
2.  **推荐做法**：使用我们的控制台直接输入隧道 URL，后端会自动处理跨域和安全头。

---
*Powered by Google AI Studio Build.*
