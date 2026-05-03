import { Client, Message } from 'discord.js-selfbot-v13';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Self-ping keeping system alive on Render
setInterval(() => {
    fetch(`http://localhost:${PORT}/ping`).catch(() => {});
}, 30000); // Every 30 seconds

app.get('/ping', (req, res) => res.send('System Awake'));

// --- THE WEB APP UI (RESTORED & FIXED) ---
const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The First Signer | Elite v2</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Syncopate:wght@700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <script src="/socket.io/socket.io.js"></script>
    <style>
        :root {
            --bg-deep: #050505;
            --glass-bg: rgba(15, 15, 17, 0.7);
            --glass-border: rgba(255, 255, 255, 0.08);
            --accent-primary: #6366f1;
            --accent-glow: rgba(99, 102, 241, 0.4);
            --text-main: #ffffff;
            --text-muted: #a1a1aa;
            --success: #10b981;
            --danger: #ef4444;
            --info: #60a5fa;
            --font-ui: 'Inter', sans-serif;
            --font-code: 'JetBrains Mono', monospace;
            --font-brand: 'Syncopate', sans-serif;
        }

        * { box-sizing: border-box; outline: none; }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            font-family: var(--font-ui);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        .aurora {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 80vw;
            height: 80vw;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            filter: blur(80px);
            z-index: 0;
            pointer-events: none;
            animation: pulse 15s infinite alternate;
        }

        @keyframes pulse {
            from { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }

        .container {
            width: 100%;
            max-width: 500px;
            background: var(--glass-bg);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            padding: 40px;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 10;
        }

        .header { text-align: center; margin-bottom: 35px; }

        .v-badge {
            display: inline-flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 4px 12px;
            border-radius: 99px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 2px;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 20px;
        }

        h1 { font-size: 34px; font-weight: 800; margin: 0; letter-spacing: -1.5px; }
        h1 span { color: var(--accent-primary); }

        .step { display: none; flex-direction: column; gap: 20px; }
        .step.active { display: flex; animation: fadeIn 0.4s ease-out; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .input-group { display: flex; flex-direction: column; gap: 8px; }
        label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

        input {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid var(--glass-border);
            border-radius: 14px;
            padding: 18px;
            color: #fff;
            font-family: var(--font-code);
            font-size: 14px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        input:focus {
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 4px var(--accent-glow);
            background: rgba(0, 0, 0, 0.6);
        }

        button {
            background: #fff;
            color: #000;
            border: none;
            border-radius: 14px;
            padding: 18px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
        }

        button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.1); }
        button:active { transform: translateY(0); }

        .status-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
            font-size: 13px;
            font-weight: 700;
            color: var(--success);
            background: rgba(16, 185, 129, 0.1);
            padding: 12px;
            border-radius: 16px;
        }

        .pulse-dot {
            width: 8px; height: 8px; background: var(--success); border-radius: 50%;
            box-shadow: 0 0 12px var(--success);
            animation: dotPulse 2s infinite;
        }

        @keyframes dotPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

        .terminal {
            background: #000;
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            height: 280px;
            padding: 18px;
            overflow-y: auto;
            font-family: var(--font-code);
            font-size: 12px;
            line-height: 1.6;
            scroll-behavior: smooth;
        }

        .terminal::-webkit-scrollbar { width: 4px; }
        .terminal::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

        .log-line { margin-bottom: 6px; }
        .t-time { color: #555; margin-right: 12px; }
        .t-success { color: var(--success); }
        .t-error { color: var(--danger); font-weight: bold; }
        .t-info { color: var(--info); }

        .btn-stop { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }
        .btn-stop:hover { background: var(--danger); color: white; }

        .footer {
            margin-top: 40px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 30px;
        }

        .footer span { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 5px; margin-bottom: 10px; font-weight: 600; }
        .footer strong {
            font-family: var(--font-brand);
            font-size: 26px;
            background: linear-gradient(to right, #666, #fff, #666);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 4s linear infinite;
        }

        @keyframes shine { to { background-position: 200% center; } }
    </style>
</head>
<body>
    <div class="aurora"></div>
    <div class="container">
        <div class="header">
            <div class="v-badge">Elite Version v2.0</div>
            <h1>The First <span>Signer</span></h1>
        </div>

        <div id="s1" class="step active">
            <div class="input-group">
                <label>Access Protocol Token</label>
                <input type="password" id="t-input" placeholder="Paste your authentication token">
            </div>
            <button onclick="nav(1)">Authenticate</button>
        </div>

        <div id="s2" class="step">
            <div class="input-group">
                <label>Target Identification</label>
                <input type="text" id="target-input" placeholder="Target Bot/User ID">
            </div>
            <button onclick="nav(2)">Continue Configuration</button>
        </div>

        <div id="s3" class="step">
            <div class="input-group">
                <label>Activation Keyword</label>
                <input type="text" id="key-input" value="join" placeholder="e.g., join">
            </div>
            <button onclick="fire()">Initialize Sniper</button>
        </div>

        <div id="s4" class="step">
            <div class="status-header">
                <div class="pulse-dot"></div>
                ISOLATED THREAD ACTIVE
            </div>
            <div class="terminal" id="console"></div>
            <button class="btn-stop" onclick="kill()">Terminate Session</button>
        </div>

        <div class="footer">
            <span>Project Engineered By</span>
            <strong>PREM CULLEN</strong>
        </div>
    </div>

    <script>
        const socket = io();
        let sid = localStorage.getItem('sid') || Math.random().toString(36).substring(7);
        localStorage.setItem('sid', sid);

        let data = { token: "", target: "", key: "" };

        socket.on('connect', () => socket.emit('join', sid));

        socket.on('status', (res) => {
            if (res.active) {
                document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
                document.getElementById('s4').classList.add('active');
                log("Session Link Restored.", "success");
            }
        });

        function nav(curr) {
            if (curr === 1) {
                data.token = document.getElementById('t-input').value;
                if (!data.token) return;
                document.getElementById('s1').classList.remove('active');
                document.getElementById('s2').classList.add('active');
            } else if (curr === 2) {
                data.target = document.getElementById('target-input').value;
                if (!data.target) return;
                document.getElementById('s2').classList.remove('active');
                document.getElementById('s3').classList.add('active');
            }
        }

        function fire() {
            data.key = document.getElementById('key-input').value;
            document.getElementById('s3').classList.remove('active');
            document.getElementById('s4').classList.add('active');
            log("Initializing isolated Discord instance...", "info");
            socket.emit('start', { sid, ...data });
        }

        function kill() {
            socket.emit('stop', sid);
            setTimeout(() => location.reload(), 500);
        }

        function log(msg, type = "info") {
            const el = document.getElementById('console');
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });
            el.innerHTML += \`<div class="log-line"><span class="t-time">[\${time}]</span><span class="t-\${type}">\${msg}</span></div>\`;
            el.scrollTop = el.scrollHeight;
        }

        socket.on('log', (d) => log(d.m, d.t));
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(dashboardHTML));

// --- BOT ENGINE (FIXED & SUPPRESSED LOGS) ---
const sessions = new Map();

io.on('connection', (socket) => {
    socket.on('join', (sid) => {
        socket.join(sid);
        const s = sessions.get(sid);
        socket.emit('status', { active: !!(s && s.active) });
    });

    socket.on('stop', (sid) => {
        const s = sessions.get(sid);
        if (s && s.client) {
            try { s.client.destroy(); } catch(e) {}
        }
        sessions.delete(sid);
    });

    socket.on('start', async (params) => {
        const { sid, token, target, key } = params;
        
        let s = sessions.get(sid);
        if (s && s.client) s.client.destroy();

        s = { client: new Client({ checkUpdate: false }), active: true, clicked: new Set(), target, key };
        sessions.set(sid, s);

        s.client.on('ready', () => {
            io.to(sid).emit('log', { m: `Success: Authenticated as ${s.client.user.username}`, t: 'success' });
            io.to(sid).emit('log', { m: `Sniper Mode: Watching ID ${target}`, t: 'info' });
        });

        // HIGH PERFORMANCE RAW EVENT HANDLER (FIXED)
        s.client.on('raw', async (p) => {
            if (!s.active || (p.t !== 'MESSAGE_CREATE' && p.t !== 'MESSAGE_UPDATE')) return;

            const mData = p.d;
            if (mData.author?.id !== s.target || !mData.components) return;
            if (s.clicked.has(mData.id)) return;

            const start = Date.now();

            for (const row of mData.components) {
                if (!row.components) continue;
                for (const comp of row.components) {
                    if (comp.type === 2 && comp.label?.toLowerCase().includes(s.key.toLowerCase())) {
                        s.clicked.add(mData.id);
                        
                        const msg = new Message(s.client, mData);
                        io.to(sid).emit('log', { m: `[LOCALIZED] Targeted event in ${Date.now() - start}ms`, t: 'info' });

                        // BURST CLICKING: 5 parallel requests (Fixed thread logic)
                        for (let x = 1; x <= 5; x++) {
                            msg.clickButton(comp.custom_id)
                                .then(() => {
                                    io.to(sid).emit('log', { m: `[SUCCESS] Signature delivered (${Date.now() - start}ms)`, t: 'success' });
                                })
                                .catch(() => {});
                        }
                        return;
                    }
                }
            }
        });

        try {
            await s.client.login(token);
        } catch (e) {
            io.to(sid).emit('log', { m: "Critical: Authentication Failed (Token Revoked?)", t: "error" });
        }
    });
});

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[ELITE] Core logic active on port ${PORT}`);
});
