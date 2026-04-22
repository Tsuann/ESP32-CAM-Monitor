import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/ping", (req, res) => {
    res.json({ pong: true });
  });

  // Stream Proxy Endpoint
  app.get("/api/stream-proxy", (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("Target URL is required");
    }

    console.log(`Proxying stream for: ${targetUrl}`);

    const protocol = targetUrl.startsWith("https") ? https : http;
    
    const proxyReq = protocol.get(targetUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'ESP32-CAM-Dashboard-Proxy'
      },
      timeout: 10000 // 10 second timeout for initial connection
    }, (proxyRes) => {
      // Forward status code
      res.status(proxyRes.statusCode || 200);

      // Forward all relevant MJPEG/JPEG headers
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        if (value && ['content-type', 'x-timestamp', 'access-control-allow-origin'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      // Ensure MJPEG keeps flowing
      proxyRes.pipe(res);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).send("ESP32 Connection Timeout");
    });

    proxyReq.on('error', (e) => {
      console.error(`Proxy stream error for ${targetUrl}: ${e.message}`);
      if (!res.headersSent) {
        res.status(502).send(`Bad Gateway: ${e.message}`);
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      proxyReq.destroy();
    });
  });

  // Control Proxy Endpoint (to avoid Mixed Content for local control)
  app.get("/api/control-proxy", (req, res) => {
    const { url, var: variable, val } = req.query;
    if (!url) return res.status(400).send("URL required");

    const targetUrl = `${url}/control?var=${variable}&val=${val}`;
    const protocol = (targetUrl as string).startsWith("https") ? https : http;

    console.log(`Forwarding control to: ${targetUrl}`);

    const controlReq = protocol.get(targetUrl, {
      agent: false, // Disable connection pooling
      headers: { 
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'ESP32-CAM-Dashboard-Proxy',
        'Connection': 'close' // Force closure
      },
      timeout: 5000
    }, (proxyRes) => {
      // Consume response to free up memory
      proxyRes.resume();
      res.status(proxyRes.statusCode || 200).send("OK");
    });

    controlReq.on('error', (e) => {
      console.error(`Control proxy error: ${e.message}`);
      if (!res.headersSent) res.status(500).send(e.message);
    });

    controlReq.on('timeout', () => {
      controlReq.destroy();
      if (!res.headersSent) res.status(504).send("Control Timeout");
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
