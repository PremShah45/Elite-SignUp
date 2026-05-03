import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { Client, Message } from 'discord.js-selfbot-v13';
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- BOT LOGIC ---
  const activeSessions = new Map();

  function getSession(sessionId: string) {
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        botClient: null,
        isRunning: false,
        config: { token: '', targetId: '', keyword: '' },
        clickedMessages: new Set()
      });
    }
    return activeSessions.get(sessionId);
  }

  function sendLog(sessionId: string, message: string, type: 'info' | 'success' | 'error' = 'info') {
    io.to(sessionId).emit('log', { message, type });
  }

  io.on('connection', (socket) => {
    socket.on('initSession', (sessionId: string) => {
      socket.join(sessionId);
      const session = getSession(sessionId);
      socket.emit('sessionStatus', { 
        isRunning: session.isRunning, 
        config: session.config 
      });
    });

    socket.on('stopBot', (sessionId: string) => {
      const session = getSession(sessionId);
      if (session.botClient) {
        try { 
          session.botClient.destroy(); 
        } catch (e) {
          console.error("Error destroying client:", e);
        }
        session.botClient = null;
      }
      session.isRunning = false;
      session.clickedMessages.clear();
      sendLog(sessionId, 'Session terminated securely.', 'error');
    });

    socket.on('launchBot', async (data) => {
      const { sessionId, token, targetId, keyword } = data;
      const session = getSession(sessionId);

      if (session.botClient && session.isRunning) {
        try { 
          session.botClient.destroy(); 
        } catch (e) {
          console.error("Error destroying previous client:", e);
        }
      }

      session.config = { token, targetId, keyword };
      session.isRunning = false;
      session.clickedMessages.clear();

      session.botClient = new Client({ 
        checkUpdate: false,
        // Recommended settings for selfbots to avoid redundant events
        patchVoice: false 
      });

      session.botClient.on('ready', () => {
        session.isRunning = true;
        sendLog(sessionId, `Auth bypass successful: ${session.botClient?.user?.username}`, 'success');
        sendLog(sessionId, `Monitoring encrypted stream for ID: ${targetId}`, 'info');
      });

      session.botClient.on('error', (err: any) => {
        sendLog(sessionId, `Bot Error: ${err.message}`, 'error');
      });

      session.botClient.on('raw', async (packet) => {
        if (!session.isRunning || !session.botClient) return;
        if (packet.t !== 'MESSAGE_CREATE' && packet.t !== 'MESSAGE_UPDATE') return;

        const messageData = packet.d;
        if (messageData.author?.id !== session.config.targetId || !messageData.components) return;
        if (session.clickedMessages.has(messageData.id)) return;

        const processingStart = Date.now();

        for (const row of messageData.components) {
          if (!row.components) continue;
          for (const component of row.components) {
            // Check for buttons (type 2) and match label
            if (component.type === 2 && component.label && component.label.toLowerCase().includes(session.config.keyword.toLowerCase())) {
              
              session.clickedMessages.add(messageData.id);

              const msgObject = new Message(session.botClient, messageData);
              const detectionTime = Date.now() - processingStart;
              
              sendLog(sessionId, `[DETECTED] Target localized in ${detectionTime}ms.`, 'info');

              // Parallel tasking for speed
              const attempts = 4;
              for (let i = 1; i <= attempts; i++) {
                msgObject.clickButton(component.custom_id)
                  .then(() => {
                    const time = Date.now() - processingStart;
                    sendLog(sessionId, `[SUCCESS] Payload delivered in ${time}ms (Thread ${i})`, 'success');
                  })
                  .catch((err) => {
                    sendLog(sessionId, `[FAIL] Thread ${i} rejected: ${err.message || "Unknown Error"}`, 'error');
                  });
              }
              return;
            }
          }
        }
      });

      try {
        await session.botClient.login(token);
      } catch (error: any) {
        sendLog(sessionId, `CRITICAL: Auth Failed. Check Token.`, 'error');
        console.error("Login Error:", error);
      }
    });
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
