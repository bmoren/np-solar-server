# np-solar-server

A lightweight Node.js server for classroom use on a Raspberry Pi. Serves static files, auto-routes media, and supports real-time communication via Socket.io. Students interact via the simple `solar.js` client API.

## Features

- Static file serving from `public/`
- Auto-routed media files from `public/media/`
- Socket.io for real-time client-server and client-client communication
- systemd service for auto-boot and crash recovery

## Project Structure

```
np-solar-server/
├── public/
│   ├── index.html       # Default landing page
│   ├── solar.js         # Student-facing Socket.io API
│   └── media/           # Drop media files here
├── server.js            # Main server
├── package.json
├── pi-server.service    # systemd service file
├── dnsmasq.conf         # DNS config for solar.server domain
└── .gitignore
```

## Setup on Raspberry Pi

### Prerequisites

```bash
# Install Node.js and git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install dnsmasq (for custom domain support)
sudo apt-get install -y dnsmasq
```

### Install

```bash
cd /home/zerocool
git clone https://github.com/<your-username>/np-solar-server.git
cd np-solar-server
npm install
```

### Run manually

```bash
node server.js
# Server available at http://<PI_IP>:3000
```

### Auto-boot with systemd

The service runs on **port 80** as root so no port number is needed in the browser.

```bash
sudo cp pi-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-server
sudo systemctl start pi-server
```

Check status:
```bash
sudo systemctl status pi-server
sudo journalctl -u pi-server -f
```

### Custom domain (solar.server)

This lets students browse to `http://solar.server` with no IP address or port needed.

**Architecture:** Pi connects to the classroom router via ethernet. The router handles WiFi and DHCP for all devices. The Pi runs DNS so `solar.server` resolves to itself.

**1. Give the Pi a static IP** — in your router's admin panel, find the Pi's MAC address and assign it a fixed IP via DHCP reservation (e.g. `192.168.1.10`). This is easier than configuring a static IP on the Pi itself and works with any router.

**2. Edit `dnsmasq.conf`** — replace `192.168.1.XXX` with the Pi's actual static IP:
```bash
sudo nano /home/zerocool/np-solar-server/dnsmasq.conf
```

**3. Install the config and restart dnsmasq:**
```bash
sudo cp /home/zerocool/np-solar-server/dnsmasq.conf /etc/dnsmasq.conf
sudo systemctl enable dnsmasq
sudo systemctl restart dnsmasq
```

**4. Point the router's DNS to the Pi** — in your router's admin panel, set the primary DNS server to the Pi's static IP. The router will hand this out to all devices via DHCP automatically — no per-device configuration needed.

Once configured, students connect to normal classroom WiFi and browse to `http://solar.server`.

### Updating

```bash
cd /home/zerocool/np-solar-server
git pull
sudo systemctl restart pi-server
```

## API

### Static Files
Any file placed in `public/` is served at its relative path.
```
GET /           → public/index.html
GET /style.css  → public/style.css
```

### Media
```
GET /media            → JSON list of files in public/media/
GET /media/:filename  → Serve the file
```

### Socket.io Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `message` | client → server | `{ ...data }` | Broadcasts to all other clients |
| `join` | client → server | `"roomName"` | Join a named room |
| `room-message` | client → server | `{ room, ...data }` | Send to everyone in a room |
| `joined` | server → client | `{ id, room }` | Emitted when someone joins a room |
| `room-message` | server → client | `{ from, ...data }` | Incoming room message |

### Client-side Example (solar.js)

Include both scripts in your HTML, then use `solar.*` functions anywhere:

```html
<script src="/socket.io/socket.io.js"></script>
<script src="/solar.js"></script>

<!-- Inline buttons -->
<button onclick="solar.send('hello!')">Send</button>
<button onclick="solar.join('group1')">Join group1</button>
<button onclick="solar.sendTo('group1', 'hello group!')">Send to group1</button>

<script>
  // Receive broadcasts from everyone
  solar.on('message', function(data) {
    console.log(data.text);
  });

  // Receive messages from a room
  solar.on('room-message', function(data) {
    console.log(data.text);
  });
</script>
```

#### solar.js API

| Function | Description |
|---|---|
| `solar.send('hello')` | Broadcast to all connected clients |
| `solar.send({ x: 1, y: 2 })` | Broadcast an object |
| `solar.join('room')` | Join a named room |
| `solar.sendTo('room', 'hello')` | Send to everyone in a room |
| `solar.on('message', fn)` | Listen for broadcast messages |
| `solar.on('room-message', fn)` | Listen for room messages |
| `solar.on('connect', fn)` | Fires when connected to server |
| `solar.myId()` | Returns this client's socket ID |

Both `send()` and `sendTo()` accept a plain string or an object — whichever is easier for the task.

## Configuration

The port defaults to `3000` but the systemd service sets it to `80`. Override with an environment variable:
```bash
PORT=8080 node server.js
```

Or set it in the systemd service file under `Environment=PORT=80`.
