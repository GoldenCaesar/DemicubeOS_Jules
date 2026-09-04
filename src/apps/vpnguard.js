import { playerNetworkState } from "../core/network-state.js";
import { DEFAULT_VPNGUARD_INI, DEFAULT_OFFICE_OVPN, DEFAULT_VPNGUARD_README } from "./vpnguard-data.js";

export class VPNGuardApp {
  constructor({ ui, terminal, fileSystem, loggingSystem }) {
    this.ui = ui;
    this.terminal = terminal;
    this.fileSystem = fileSystem;
    this.loggingSystem = loggingSystem;
    this.networkState = playerNetworkState;

    this.saveFilePath = "/documents/vpnguard/savedata.ini";
    this.ovpnFilePath = "/documents/vpnguard/office.ovpn";
    this.readmeFilePath = "/documents/vpnguard/README.txt";

    this.p2pInputTarget = "10.9.0.2";
    this.consumerServers = [
      { id: "zurich", name: "Zurich (Switzerland)", publicIP: "185.220.101.5", latency: "24ms" },
      { id: "amsterdam", name: "Amsterdam (Netherlands)", publicIP: "185.220.101.42", latency: "18ms" },
      { id: "newyork", name: "New York (USA)", publicIP: "198.51.100.89", latency: "78ms" },
      { id: "tokyo", name: "Tokyo (Japan)", publicIP: "203.0.113.19", latency: "142ms" }
    ];

    this.ensureSaveFiles();
    this.loadFromDisk();

    this.unsubscribe = this.networkState.subscribe(() => {
      this.render();
      this.updateZenmapAndSyslog();
    });

    this.initDOMElements();
    this.bindEvents();
  }

  ensureSaveFiles() {
    if (!this.fileSystem) return;
    this.fileSystem.mkdir("/documents");
    this.fileSystem.mkdir("/documents/vpnguard");
    if (!this.fileSystem.resolve(this.saveFilePath)) {
      this.fileSystem.write(this.saveFilePath, DEFAULT_VPNGUARD_INI);
    }
    if (!this.fileSystem.resolve(this.ovpnFilePath)) {
      this.fileSystem.write(this.ovpnFilePath, DEFAULT_OFFICE_OVPN);
    }
    if (!this.fileSystem.resolve(this.readmeFilePath)) {
      this.fileSystem.write(this.readmeFilePath, DEFAULT_VPNGUARD_README);
    }
  }

  loadFromDisk() {
    this.ensureSaveFiles();
  }

  saveToDisk() {
    if (!this.fileSystem) return;
    const state = this.networkState.getState();
    const output = `[state]\nactive_mode=${state.vpnMode}\npublic_ip=${state.publicIP}\n`;
    this.fileSystem.write(this.saveFilePath, output);
  }

  initDOMElements() {
    this.window = document.getElementById("vpnguard-window");
    if (!this.window) return;
    this.render();
  }

  bindEvents() {
    if (!this.window) return;

    this.window.addEventListener("click", (e) => {
      const connectConsumer = e.target.closest("#vpnguard-btn-connect-consumer");
      if (connectConsumer) {
        const sel = this.window.querySelector("#vpnguard-consumer-server");
        const srv = sel ? sel.value : "zurich";
        this.terminal.submitCommand(`vpnguard connect consumer ${srv}`);
        return;
      }

      const connectWork = e.target.closest("#vpnguard-btn-connect-work");
      if (connectWork) {
        this.terminal.submitCommand("vpnguard connect work aegis_work");
        return;
      }

      const connectP2P = e.target.closest("#vpnguard-btn-connect-p2p");
      if (connectP2P) {
        const inp = this.window.querySelector("#vpnguard-p2p-ip");
        const ip = inp?.value?.trim() || "10.9.0.2";
        this.terminal.submitCommand(`vpnguard connect p2p ${ip}`);
        return;
      }

      const disconnectBtn = e.target.closest("#vpnguard-btn-disconnect");
      if (disconnectBtn) {
        this.terminal.submitCommand("vpnguard disconnect");
        return;
      }

      const openZenmap = e.target.closest("#vpnguard-btn-zenmap");
      if (openZenmap) {
        this.terminal.submitCommand("zenmap");
        return;
      }
    });

    this.window.addEventListener("input", (e) => {
      if (e.target.id === "vpnguard-p2p-ip") {
        this.p2pInputTarget = e.target.value;
      }
    });
  }

  updateZenmapAndSyslog() {
    if (this.terminal?.zenmapApp) {
      this.terminal.zenmapApp.updateHeaderAndStatus?.();
      this.terminal.zenmapApp.renderTopology?.();
      this.terminal.zenmapApp.renderHostsTable?.();
    }
  }

  start() {
    this.ensureSaveFiles();
    this.render();
  }

  stop() {}

  render() {
    if (!this.window) {
      this.window = document.getElementById("vpnguard-window");
      if (!this.window) return;
    }

    const state = this.networkState.getState();
    const isConnected = state.vpnMode !== "OFF";
    const tun0 = state.activeInterfaces.tun0;

    const statusPill = this.window.querySelector("#vpnguard-status-pill");
    if (statusPill) {
      statusPill.className = `vpnguard-status-pill ${isConnected ? "connected" : "disconnected"}`;
      statusPill.innerHTML = `<span class="vpnguard-pulse ${isConnected ? "" : "off"}"></span> ${isConnected ? state.vpnMode + " TUNNEL ACTIVE" : "DISCONNECTED (DIRECT LAN)"}`;
    }

    const subtext = this.window.querySelector("#vpnguard-header-subtext");
    if (subtext) {
      subtext.textContent = isConnected
        ? `tun0 (${tun0?.ip || "active"}) · Egress: ${state.publicIP}`
        : `eth0 (${state.activeInterfaces.eth0.ip}) · Egress: ${state.publicIP} (EXPOSED)`;
    }

    const contentArea = this.window.querySelector("#vpnguard-content-area");
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="vpnguard-dashboard">
        <!-- TOP STATUS METRICS -->
        <div class="vpnguard-metrics-row">
          <div class="vpnguard-mini-card ${isConnected ? "active-glow" : ""}">
            <div class="lbl">VIRTUAL ADAPTER</div>
            <div class="val ${isConnected ? "text-emerald" : "text-muted"}">${isConnected ? "tun0 (" + tun0?.ip + ")" : "DOWN"}</div>
          </div>
          <div class="vpnguard-mini-card">
            <div class="lbl">PUBLIC EGRESS IP</div>
            <div class="val ${state.vpnMode === "CONSUMER" ? "text-cyan" : "text-amber"}">${state.publicIP}</div>
          </div>
          <div class="vpnguard-mini-card">
            <div class="lbl">ENCRYPTION</div>
            <div class="val text-white">${isConnected ? (tun0?.encryption || "AES-256-GCM") : "NONE"}</div>
          </div>
        </div>

        ${isConnected ? `
          <div class="vpnguard-active-banner">
            <div class="banner-info">
              <span class="pulse-dot"></span>
              <span>Secure <strong>${state.vpnMode}</strong> tunnel active via <code>${state.connectedServer || "Gateway"}</code></span>
            </div>
            <div class="banner-actions">
              <button id="vpnguard-btn-zenmap" class="vpnguard-sec-btn">Open Zenmap</button>
              <button id="vpnguard-btn-disconnect" class="vpnguard-danger-btn">Disconnect</button>
            </div>
          </div>
        ` : `
          <div class="vpnguard-idle-banner">
            Engine idle. Select a mode below to establish secure encrypted tunnel.
          </div>
        `}

        <!-- 3 SLEEK MODE CARDS -->
        <div class="vpnguard-cards-grid">
          <!-- CONSUMER -->
          <div class="vpnguard-card ${state.vpnMode === "CONSUMER" ? "selected" : ""}">
            <div class="card-badge consumer">MODE 1</div>
            <h4>Anonymous Privacy</h4>
            <p>Masks your real IP and encrypts egress traffic.</p>
            <div class="card-form">
              <select id="vpnguard-consumer-server" class="vpnguard-select">
                ${this.consumerServers.map(s => `<option value="${s.id}">${s.name} (${s.latency})</option>`).join("")}
              </select>
              <button id="vpnguard-btn-connect-consumer" class="vpnguard-btn consumer-btn" ${state.vpnMode === "CONSUMER" ? "disabled" : ""}>
                ${state.vpnMode === "CONSUMER" ? "Connected" : "Connect Consumer"}
              </button>
            </div>
          </div>

          <!-- WORK -->
          <div class="vpnguard-card ${state.vpnMode === "WORK" ? "selected" : ""}">
            <div class="card-badge work">MODE 2</div>
            <h4>Aegis Corporate Gateway</h4>
            <p>Site-to-site corporate tunnel for internal subnets.</p>
            <div class="card-form">
              <div class="file-tag">office.ovpn</div>
              <button id="vpnguard-btn-connect-work" class="vpnguard-btn work-btn" ${state.vpnMode === "WORK" ? "disabled" : ""}>
                ${state.vpnMode === "WORK" ? "Connected" : "Connect Corporate"}
              </button>
            </div>
          </div>

          <!-- P2P -->
          <div class="vpnguard-card ${state.vpnMode === "P2P" ? "selected" : ""}">
            <div class="card-badge p2p">MODE 3</div>
            <h4>Direct P2P Tunnel</h4>
            <p>Encrypted point-to-point link to remote node.</p>
            <div class="card-form">
              <input id="vpnguard-p2p-ip" type="text" class="vpnguard-input" value="${this.p2pInputTarget}" placeholder="10.9.0.2" />
              <button id="vpnguard-btn-connect-p2p" class="vpnguard-btn p2p-btn" ${state.vpnMode === "P2P" ? "disabled" : ""}>
                ${state.vpnMode === "P2P" ? "Connected" : "Establish P2P"}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  executeCli(args, terminal) {
    if (!terminal) return;
    if (!terminal.appendLine && terminal.ui?.appendTerminalLine) {
      terminal.appendLine = (line) => terminal.ui.appendTerminalLine(line);
    }
    const subCmd = (args[0] || "").toLowerCase().trim();

    if (!subCmd || subCmd === "gui" || subCmd === "open") {
      terminal.launchProgram("vpnguard");
      terminal.appendLine("Launched VPNguard UI.");
      return;
    }

    if (subCmd === "status") {
      const state = this.networkState.getState();
      terminal.appendLine(`VPNguard Status: Mode=${state.vpnMode}, Egress IP=${state.publicIP}, tun0=${state.activeInterfaces.tun0?.ip || "DOWN"}`);
      return;
    }

    if (subCmd === "connect") {
      const mode = (args[1] || "").toLowerCase().trim();
      if (mode === "consumer" || mode === "anon") {
        const srvId = args[2] || "zurich";
        const srv = this.consumerServers.find(s => s.id === srvId) || this.consumerServers[0];
        this.networkState.setConsumerMode({ server: srv.name, publicIP: srv.publicIP });
        terminal.appendLine(`[VPNguard] Consumer tunnel connected via ${srv.name} (${srv.publicIP}).`);
        this.render();
        return;
      }
      if (mode === "work" || mode === "corp") {
        this.networkState.setWorkMode();
        terminal.appendLine("[VPNguard] Aegis Corporate site-to-site tunnel established (10.10.10.45).");
        this.render();
        return;
      }
      if (mode === "p2p") {
        const peer = args[2] || "10.9.0.2";
        this.networkState.setP2PMode({ peerIp: peer });
        terminal.appendLine(`[VPNguard] Direct P2P tunnel established to ${peer}.`);
        this.render();
        return;
      }
      terminal.appendLine("Usage: vpnguard connect <consumer|work|p2p> [options]");
      return;
    }

    if (subCmd === "disconnect" || subCmd === "stop") {
      this.networkState.disconnect();
      terminal.appendLine("[VPNguard] Tunnel disconnected. Routing restored to eth0.");
      this.render();
      return;
    }

    if (subCmd === "help" || subCmd === "-h") {
      terminal.appendLine("VPNguard - Network Security & Tunnel Manager");
      terminal.appendLine("Usage: vpnguard <status|connect|disconnect|gui>");
      return;
    }

    terminal.appendLine(`vpnguard: unknown command '${subCmd}'. Run 'vpnguard help'.`);
  }
}
