/**
 * VPNguard Application
 *
 * Implements the 3 VPN modes:
 *  - Mode 1: Consumer Mode (Anonymous Privacy Gateway)
 *  - Mode 2: Work/Remote Mode (Aegis Site-to-Site Gateway)
 *  - Mode 3: P2P Mode (Direct Peer-to-Peer Tunnel)
 *
 * Reads & writes profiles to /documents/vpnguard/savedata.ini
 * Manipulates the global playerNetworkState and notifies the system.
 * All GUI clicks route through terminal.submitCommand().
 */

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

    this.activeTab = "dashboard"; // "dashboard", "profiles", "routes", "logs"
    this.profiles = new Map();
    this.p2pInputTarget = "10.9.0.2";
    this.selectedConsumerServer = "Zurich (Switzerland) - node-07";

    this.consumerServers = [
      { id: "zurich", name: "Zurich (Switzerland) - node-07", host: "ams-node-14.vpnguard-relay.net", publicIP: "185.220.101.5", latency: "24ms" },
      { id: "amsterdam", name: "Amsterdam (Netherlands) - node-02", host: "nl-node-02.vpnguard-relay.net", publicIP: "185.220.101.42", latency: "18ms" },
      { id: "newyork", name: "New York (USA) - node-11", host: "us-node-11.vpnguard-relay.net", publicIP: "198.51.100.89", latency: "78ms" },
      { id: "tokyo", name: "Tokyo (Japan) - node-05", host: "jp-node-05.vpnguard-relay.net", publicIP: "203.0.113.19", latency: "142ms" }
    ];

    // Ensure directory and default files exist
    this.ensureSaveFiles();
    this.loadFromDisk();

    // Subscribe to network state changes
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
    const content = this.fileSystem.read(this.saveFilePath);
    if (!content) return;

    this.profiles.clear();
    const lines = content.split("\n");
    let currentSection = null;
    let currentData = {};

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(";") || line.startsWith("#")) continue;

      if (line.startsWith("[") && line.endsWith("]")) {
        if (currentSection && currentSection.startsWith("profile.")) {
          const profileId = currentSection.replace("profile.", "");
          this.profiles.set(profileId, { id: profileId, ...currentData });
        }
        currentSection = line.slice(1, -1).trim();
        currentData = {};
        continue;
      }

      const eqIdx = line.indexOf("=");
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        currentData[key] = value;
      }
    }

    if (currentSection && currentSection.startsWith("profile.")) {
      const profileId = currentSection.replace("profile.", "");
      this.profiles.set(profileId, { id: profileId, ...currentData });
    }
  }

  saveToDisk() {
    if (!this.fileSystem) return;
    const state = this.networkState.getState();

    let output = `; ============================================================
; VPNguard Core Configuration & Profile Database
; File: /documents/vpnguard/savedata.ini
; ============================================================

[state]
active_mode=${state.vpnMode}
active_profile=${state.connectedProfile || "none"}
tun_interface=${state.activeInterfaces.tun0 ? "tun0 (" + state.activeInterfaces.tun0.ip + ")" : "none"}
public_ip=${state.publicIP}
real_ip=${this.networkState.realHomePublicIP}
connected_server=${state.connectedServer || "none"}
killswitch=enabled
dns=1.1.1.1, 9.9.9.9

`;

    for (const [id, prof] of this.profiles.entries()) {
      output += `[profile.${id}]\n`;
      for (const [k, v] of Object.entries(prof)) {
        if (k === "id") continue;
        output += `${k}=${v}\n`;
      }
      output += "\n";
    }

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
      // Tab switcher
      const tabBtn = e.target.closest("[data-vpnguard-tab]");
      if (tabBtn) {
        const tab = tabBtn.getAttribute("data-vpnguard-tab");
        this.activeTab = tab;
        this.render();
        return;
      }

      // Action: Connect Consumer
      const connectConsumerBtn = e.target.closest("#vpnguard-btn-connect-consumer");
      if (connectConsumerBtn) {
        const serverSelect = this.window.querySelector("#vpnguard-consumer-server-select");
        const serverId = serverSelect ? serverSelect.value : "zurich";
        this.terminal.submitCommand(`vpnguard connect consumer ${serverId}`);
        return;
      }

      // Action: Connect Work
      const connectWorkBtn = e.target.closest("#vpnguard-btn-connect-work");
      if (connectWorkBtn) {
        this.terminal.submitCommand("vpnguard connect work aegis_work");
        return;
      }

      // Action: Connect P2P
      const connectP2PBtn = e.target.closest("#vpnguard-btn-connect-p2p");
      if (connectP2PBtn) {
        const p2pInput = this.window.querySelector("#vpnguard-p2p-ip-input");
        const targetIp = p2pInput?.value?.trim() || this.p2pInputTarget;
        this.terminal.submitCommand(`vpnguard connect p2p ${targetIp}`);
        return;
      }

      // Action: Disconnect
      const disconnectBtn = e.target.closest("#vpnguard-btn-disconnect");
      if (disconnectBtn) {
        this.terminal.submitCommand("vpnguard disconnect");
        return;
      }

      // Action: Reload profiles
      const reloadBtn = e.target.closest("#vpnguard-btn-reload");
      if (reloadBtn) {
        this.terminal.submitCommand("vpnguard reload");
        return;
      }

      // Action: Launch Zenmap
      const openZenmapBtn = e.target.closest("#vpnguard-btn-open-zenmap");
      if (openZenmapBtn) {
        this.terminal.submitCommand("zenmap");
        return;
      }
    });

    this.window.addEventListener("input", (e) => {
      if (e.target.id === "vpnguard-p2p-ip-input") {
        this.p2pInputTarget = e.target.value;
      }
    });
  }

  updateZenmapAndSyslog() {
    // If Zenmap is loaded, update its display & scannable targets
    if (this.terminal?.zenmapApp) {
      this.terminal.zenmapApp.updateHeaderAndStatus?.();
      this.terminal.zenmapApp.renderTopology?.();
      this.terminal.zenmapApp.renderHostsTable?.();
    }
  }

  start() {
    this.ensureSaveFiles();
    this.loadFromDisk();
    this.render();
  }

  stop() {
    // Keep state active in background, window can be closed
  }

  render() {
    if (!this.window) {
      this.window = document.getElementById("vpnguard-window");
      if (!this.window) return;
    }

    const state = this.networkState.getState();
    const isConnected = state.vpnMode !== "OFF";
    const tun0 = state.activeInterfaces.tun0;

    const contentArea = this.window.querySelector("#vpnguard-content-area");
    if (!contentArea) return;

    // Status Pill
    const statusPill = this.window.querySelector("#vpnguard-status-pill");
    if (statusPill) {
      if (isConnected) {
        statusPill.className = "vpnguard-status-pill connected";
        statusPill.innerHTML = `<span class="vpnguard-pulse"></span> CONNECTED (${state.vpnMode})`;
      } else {
        statusPill.className = "vpnguard-status-pill disconnected";
        statusPill.innerHTML = `<span class="vpnguard-pulse off"></span> DISCONNECTED (DIRECT LAN)`;
      }
    }

    // Header subtext
    const subtext = this.window.querySelector("#vpnguard-header-subtext");
    if (subtext) {
      subtext.textContent = isConnected
        ? `Encrypted Tunnel Active · Virtual Interface tun0 · Egress: ${state.publicIP}`
        : `Unencrypted Physical Link · Physical Interface eth0 · Egress: ${state.publicIP} (EXPOSED)`;
    }

    if (this.activeTab === "dashboard") {
      contentArea.innerHTML = this.renderDashboardHTML(state, isConnected, tun0);
    } else if (this.activeTab === "profiles") {
      contentArea.innerHTML = this.renderProfilesHTML();
    } else if (this.activeTab === "routes") {
      contentArea.innerHTML = this.renderRoutesHTML(state, isConnected, tun0);
    } else if (this.activeTab === "cli") {
      contentArea.innerHTML = this.renderCliHTML();
    }

    // Update active state on tab buttons
    const tabBtns = this.window.querySelectorAll("[data-vpnguard-tab]");
    tabBtns.forEach((btn) => {
      const tab = btn.getAttribute("data-vpnguard-tab");
      btn.classList.toggle("active", tab === this.activeTab);
    });
  }

  renderDashboardHTML(state, isConnected, tun0) {
    return `
      <!-- TOP METRICS ROW -->
      <div class="vpnguard-metrics-grid">
        <div class="vpnguard-metric-card ${isConnected ? "active-border" : ""}">
          <div class="vpnguard-metric-label">VIRTUAL ADAPTER (tun0)</div>
          <div class="vpnguard-metric-val ${isConnected ? "text-emerald" : "text-muted"}">
            ${isConnected ? tun0?.ip : "INACTIVE / DOWN"}
          </div>
          <div class="vpnguard-metric-sub">
            ${isConnected ? `Destination: ${tun0?.destination || tun0?.gateway} · 255.255.255.0` : "No virtual tunnel mounted"}
          </div>
        </div>

        <div class="vpnguard-metric-card ${isConnected ? "active-border" : "warning-border"}">
          <div class="vpnguard-metric-label">EGRESS PUBLIC IP (INTERNET)</div>
          <div class="vpnguard-metric-val ${state.vpnMode === "CONSUMER" ? "text-cyan" : "text-amber"}">
            ${state.publicIP}
          </div>
          <div class="vpnguard-metric-sub">
            ${
              state.vpnMode === "CONSUMER"
                ? "✓ ANONYMIZED · Real IP (74.125.19.102) hidden"
                : state.vpnMode === "WORK"
                ? "Enterprise Split Tunnel · Home IP active"
                : state.vpnMode === "P2P"
                ? "Peer Tunnel · Home IP active"
                : "⚠ EXPOSED · Remote auth.log will record 74.125.19.102"
            }
          </div>
        </div>

        <div class="vpnguard-metric-card">
          <div class="vpnguard-metric-label">PHYSICAL ADAPTER (eth0)</div>
          <div class="vpnguard-metric-val text-white">
            ${state.activeInterfaces.eth0.ip}
          </div>
          <div class="vpnguard-metric-sub">
            Gateway: ${state.activeInterfaces.eth0.gateway} · Local LAN
          </div>
        </div>

        <div class="vpnguard-metric-card">
          <div class="vpnguard-metric-label">ENCRYPTION & ROUTING</div>
          <div class="vpnguard-metric-val text-white">
            ${isConnected ? (tun0?.encryption || "AES-256-GCM") : "DIRECT (None)"}
          </div>
          <div class="vpnguard-metric-sub">
            Killswitch: ACTIVE · DNS Leak Protection: ON
          </div>
        </div>
      </div>

      <!-- ACTIVE STATUS BANNER OR DISCONNECT CONTROL -->
      ${
        isConnected
          ? `
        <div class="vpnguard-connected-banner">
          <div class="vpnguard-connected-info">
            <div class="vpnguard-connected-title">Active Tunnel: <strong>${state.vpnMode} MODE</strong></div>
            <div class="vpnguard-connected-desc">Connected to <code>${state.connectedServer || "VPNguard Gateway"}</code> since ${state.connectedSince ? state.connectedSince.toLocaleTimeString() : "now"}.</div>
          </div>
          <div class="vpnguard-connected-actions">
            <button id="vpnguard-btn-open-zenmap" class="vpnguard-secondary-btn" title="Open Zenmap to inspect unlocked subnets">Map Network in Zenmap</button>
            <button id="vpnguard-btn-disconnect" class="vpnguard-danger-btn" title="Tear down tunnel [CLI: vpnguard disconnect]">Disconnect VPN</button>
          </div>
        </div>
      `
          : `
        <div class="vpnguard-disconnected-banner">
          <span>VPNguard engine idle. Select one of the 3 operation modes below to initialize an encrypted tunnel.</span>
        </div>
      `
      }

      <!-- THE 3 VPN MODES -->
      <div class="vpnguard-modes-grid">
        <!-- MODE 1: CONSUMER -->
        <div class="vpnguard-mode-card ${state.vpnMode === "CONSUMER" ? "mode-selected" : ""}">
          <div class="vpnguard-mode-badge consumer">MODE 1 · CONSUMER</div>
          <h3 class="vpnguard-mode-title">Anonymous Privacy Gateway</h3>
          <p class="vpnguard-mode-desc">
            Simulates a privacy VPN (e.g. Mullvad / NordVPN). Encrypts egress traffic and randomizes your public IP address.
          </p>

          <div class="vpnguard-mode-meta">
            <div class="vpnguard-meta-item">
              <span>Virtual Adapter:</span> <code>tun0 (10.8.0.4)</code>
            </div>
            <div class="vpnguard-meta-item">
              <span>Spoofed IP:</span> <code>185.220.101.5</code>
            </div>
            <div class="vpnguard-meta-item teaching-point">
              <strong>Teaching Consequence:</strong> Target server <code>/var/log/auth.log</code> records the attack coming from <code>185.220.101.5</code> instead of your real home IP (<code>74.125.19.102</code>).
            </div>
          </div>

          <div class="vpnguard-mode-controls">
            <label for="vpnguard-consumer-server-select" class="vpnguard-input-label">Relay Node:</label>
            <select id="vpnguard-consumer-server-select" class="vpnguard-select">
              ${this.consumerServers
                .map((srv) => `<option value="${srv.id}" ${srv.id === "zurich" ? "selected" : ""}>${srv.name} (${srv.latency})</option>`)
                .join("")}
            </select>
            <button id="vpnguard-btn-connect-consumer" class="vpnguard-primary-btn" ${state.vpnMode === "CONSUMER" ? "disabled" : ""}>
              ${state.vpnMode === "CONSUMER" ? "Currently Connected" : "Connect to Anonymous Server"}
            </button>
          </div>
        </div>

        <!-- MODE 2: WORK / REMOTE -->
        <div class="vpnguard-mode-card ${state.vpnMode === "WORK" ? "mode-selected" : ""}">
          <div class="vpnguard-mode-badge work">MODE 2 · ENTERPRISE</div>
          <h3 class="vpnguard-mode-title">Aegis Corporate Site-to-Site</h3>
          <p class="vpnguard-mode-desc">
            Authenticates to Aegis corporate gateway using <code>office.ovpn</code>. Injects static routes unlocking internal corporate computers.
          </p>

          <div class="vpnguard-mode-meta">
            <div class="vpnguard-meta-item">
              <span>Virtual Adapter:</span> <code>tun0 (10.10.10.45)</code>
            </div>
            <div class="vpnguard-meta-item">
              <span>Corporate Subnet:</span> <code>10.10.10.0/24</code>
            </div>
            <div class="vpnguard-meta-item teaching-point">
              <strong>Teaching Consequence:</strong> Zenmap / Nmap detect Aegis DB Master (10.10.10.15), Steve's PC (10.10.10.88), and LDAP Server. Unreachable when VPN is OFF.
            </div>
          </div>

          <div class="vpnguard-mode-controls">
            <div class="vpnguard-profile-box">
              <span class="vpnguard-file-tag">OVPN</span>
              <span>Loaded Profile: <strong>/documents/vpnguard/office.ovpn</strong></span>
            </div>
            <button id="vpnguard-btn-connect-work" class="vpnguard-primary-btn work-btn" ${state.vpnMode === "WORK" ? "disabled" : ""}>
              ${state.vpnMode === "WORK" ? "Corporate Tunnel Active" : "Connect to Corporate Gateway"}
            </button>
          </div>
        </div>

        <!-- MODE 3: P2P TUNNEL -->
        <div class="vpnguard-mode-card ${state.vpnMode === "P2P" ? "mode-selected" : ""}">
          <div class="vpnguard-mode-badge p2p">MODE 3 · DIRECT P2P</div>
          <h3 class="vpnguard-mode-title">Direct Peer-to-Peer Tunnel</h3>
          <p class="vpnguard-mode-desc">
            Establishes a direct encrypted WireGuard point-to-point peer link to an already compromised node or specific remote machine.
          </p>

          <div class="vpnguard-mode-meta">
            <div class="vpnguard-meta-item">
              <span>Local Virtual IP:</span> <code>tun0 (10.9.0.1)</code>
            </div>
            <div class="vpnguard-meta-item">
              <span>Target Virtual IP:</span> <code>10.9.0.2</code>
            </div>
            <div class="vpnguard-meta-item teaching-point">
              <strong>Teaching Consequence:</strong> Unlocks direct tunnel to node <code>10.9.0.2</code> on subnet <code>10.9.0.0/24</code> for administrative tools and root SSH exfiltration.
            </div>
          </div>

          <div class="vpnguard-mode-controls">
            <label for="vpnguard-p2p-ip-input" class="vpnguard-input-label">Target Peer IP:</label>
            <input id="vpnguard-p2p-ip-input" type="text" class="vpnguard-input" value="${this.p2pInputTarget}" placeholder="10.9.0.2" spellcheck="false" />
            <button id="vpnguard-btn-connect-p2p" class="vpnguard-primary-btn p2p-btn" ${state.vpnMode === "P2P" ? "disabled" : ""}>
              ${state.vpnMode === "P2P" ? "P2P Tunnel Active" : "Establish P2P Tunnel"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderProfilesHTML() {
    return `
      <div class="vpnguard-tab-panel">
        <div class="vpnguard-panel-header">
          <div>
            <h3 class="vpnguard-panel-title">Saved VPN Profiles Database</h3>
            <p class="vpnguard-panel-sub">Profiles stored at <code>${this.saveFilePath}</code></p>
          </div>
          <button id="vpnguard-btn-reload" class="vpnguard-secondary-btn">↻ Reload from Disk</button>
        </div>

        <div class="vpnguard-profiles-list">
          ${Array.from(this.profiles.values())
            .map(
              (prof) => `
            <div class="vpnguard-profile-card">
              <div class="vpnguard-profile-top">
                <span class="vpnguard-profile-type ${prof.type?.toLowerCase()}">${prof.type || "PROFILE"}</span>
                <span class="vpnguard-profile-id">[${prof.id}]</span>
                <span class="vpnguard-profile-status">Status: ${prof.status || "ready"}</span>
              </div>
              <h4 class="vpnguard-profile-name">${prof.name || prof.id}</h4>
              <p class="vpnguard-profile-description">${prof.description || "Encrypted VPN connection profile."}</p>
              <div class="vpnguard-profile-fields">
                ${prof.server ? `<div><strong>Server:</strong> <code>${prof.server}</code></div>` : ""}
                ${prof.gateway_ip ? `<div><strong>Gateway:</strong> <code>${prof.gateway_ip}</code></div>` : ""}
                ${prof.target_subnet ? `<div><strong>Subnet:</strong> <code>${prof.target_subnet}</code></div>` : ""}
                ${prof.assigned_tun_ip ? `<div><strong>Assigned IP:</strong> <code>${prof.assigned_tun_ip}</code></div>` : ""}
                ${prof.virtual_public_ip ? `<div><strong>Egress IP:</strong> <code>${prof.virtual_public_ip}</code></div>` : ""}
                ${prof.encryption ? `<div><strong>Cipher:</strong> <code>${prof.encryption}</code></div>` : ""}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderRoutesHTML(state, isConnected, tun0) {
    return `
      <div class="vpnguard-tab-panel">
        <h3 class="vpnguard-panel-title">Active Network Interfaces & Routing Table</h3>
        <p class="vpnguard-panel-sub">Kernel routing table generated by DemicubeOS NetworkManager</p>

        <div class="vpnguard-code-block">
          <div class="vpnguard-code-header">Kernel IP routing table (route -n)</div>
          <pre>Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         ${isConnected ? (tun0?.gateway || "10.8.0.1") : state.activeInterfaces.eth0.gateway}     0.0.0.0         UG    ${isConnected ? "50" : "100"}    0        0 ${isConnected ? "tun0" : "eth0"}
${state.activeInterfaces.eth0.ip.replace(/\.\d+$/, ".0")}    0.0.0.0         255.255.255.0   U     100    0        0 eth0
${isConnected && tun0 ? `${tun0.targetSubnet || "10.8.0.0/24"}     0.0.0.0         255.255.255.0   U     50     0        0 tun0` : ""}
${isConnected && state.vpnMode === "WORK" ? "10.10.10.0      10.10.10.1      255.255.255.0   UG    50     0        0 tun0\n10.0.0.0        10.10.10.1      255.255.0.0     UG    50     0        0 tun0" : ""}
${isConnected && state.vpnMode === "P2P" ? "10.9.0.0        0.0.0.0         255.255.255.0   U     50     0        0 tun0" : ""}</pre>
        </div>

        <div class="vpnguard-code-block">
          <div class="vpnguard-code-header">Active Adapter Snapshot (ifconfig)</div>
          <pre>eth0: flags=4163&lt;UP,BROADCAST,RUNNING,MULTICAST&gt;  mtu 1500
        inet ${state.activeInterfaces.eth0.ip}  netmask 255.255.255.0  broadcast ${state.activeInterfaces.eth0.broadcast}
        ether ${state.activeInterfaces.eth0.mac}  txqueuelen 1000  (Ethernet)

${
  isConnected && tun0
    ? `tun0: flags=4305&lt;UP,POINTOPOINT,RUNNING,NOARP,MULTICAST&gt;  mtu 1420
        inet ${tun0.ip}  netmask 255.255.255.0  destination ${tun0.destination || tun0.gateway}
        unspec 00-00-00-00-00-00-00-00-00-00-00-00-00-00-00-00  txqueuelen 500  (UNSPEC)`
    : "tun0: [INTERFACE DOWN / UNCONFIGURED]"
}</pre>
        </div>
      </div>
    `;
  }

  renderCliHTML() {
    return `
      <div class="vpnguard-tab-panel">
        <h3 class="vpnguard-panel-title">VPNguard Terminal Command Reference</h3>
        <p class="vpnguard-panel-sub">All GUI actions map 1:1 to terminal commands, logged in <code>~/.bash_history</code> and <code>/var/log/syslog</code>.</p>

        <div class="vpnguard-cli-table-wrapper">
          <table class="vpnguard-cli-table">
            <thead>
              <tr><th>COMMAND</th><th>PARAMETERS</th><th>DESCRIPTION & BEHAVIOR</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>vpnguard status</code></td>
                <td>-</td>
                <td>Prints active network interfaces (eth0/tun0), public egress IP, VPN mode, and scannable subnets.</td>
              </tr>
              <tr>
                <td><code>vpnguard connect consumer [node]</code></td>
                <td>zurich, amsterdam, newyork, tokyo</td>
                <td>Connects to anonymous privacy server. Assigns tun0 (10.8.0.4) and changes public IP to 185.220.101.5.</td>
              </tr>
              <tr>
                <td><code>vpnguard connect work [profile]</code></td>
                <td>aegis_work (default)</td>
                <td>Connects to Aegis site-to-site corporate gateway. Injects route to 10.10.10.0/24, unlocking Aegis systems.</td>
              </tr>
              <tr>
                <td><code>vpnguard connect p2p [peer_ip]</code></td>
                <td>10.9.0.2 (default)</td>
                <td>Establishes direct WireGuard point-to-point tunnel to remote compromised node on subnet 10.9.0.0/24.</td>
              </tr>
              <tr>
                <td><code>vpnguard disconnect</code></td>
                <td>-</td>
                <td>Tears down tun0 virtual interface and restores direct unencrypted LAN routing (74.125.19.102).</td>
              </tr>
              <tr>
                <td><code>vpnguard profiles</code></td>
                <td>-</td>
                <td>Parses and displays saved profiles from <code>/documents/vpnguard/savedata.ini</code>.</td>
              </tr>
              <tr>
                <td><code>vpnguard reload</code></td>
                <td>-</td>
                <td>Hot-reloads modified profile definitions from disk into memory.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // CLI Command Handler: Called by TerminalApp when user runs `vpnguard ...`
  // ---------------------------------------------------------------------------
  executeCli(args, terminal) {
    this.ensureSaveFiles();
    this.loadFromDisk();

    const subCmd = (args[0] || "").toLowerCase().trim();

    if (!subCmd || subCmd === "gui" || subCmd === "open") {
      terminal.launchProgram("vpnguard");
      terminal.appendLine("Launched VPNguard graphical control center.");
      return;
    }

    if (subCmd === "status") {
      const state = this.networkState.getState();
      const tun0 = state.activeInterfaces.tun0;
      terminal.appendLine("============================================================");
      terminal.appendLine("VPNguard Secure Tunnel Engine v2.4.1 (DemicubeOS)");
      terminal.appendLine("============================================================");
      terminal.appendLine(`Mode:             ${state.vpnMode === "OFF" ? "OFF (Direct Home LAN)" : state.vpnMode + " MODE"}`);
      terminal.appendLine(`Physical Adapter: eth0 (inet ${state.activeInterfaces.eth0.ip}/24 via ${state.activeInterfaces.eth0.gateway})`);
      terminal.appendLine(`Virtual Adapter:  ${tun0 ? `tun0 (inet ${tun0.ip}/24 destination ${tun0.destination || tun0.gateway})` : "DOWN (None)"}`);
      terminal.appendLine(
        `Egress Public IP: ${state.publicIP} ${
          state.vpnMode === "CONSUMER" ? "[ANONYMIZED]" : state.vpnMode === "OFF" ? "[EXPOSED HOME IP]" : "[ENTERPRISE ROUTE]"
        }`
      );
      terminal.appendLine(`Server / Peer:    ${state.connectedServer || "None"}`);
      terminal.appendLine(`Killswitch:       ACTIVE`);
      terminal.appendLine(`Data Store:       /documents/vpnguard/savedata.ini`);
      terminal.appendLine("------------------------------------------------------------");
      if (state.vpnMode === "CONSUMER") {
        terminal.appendLine("Security Note: Remote /var/log/auth.log will record 185.220.101.5.");
      } else if (state.vpnMode === "WORK") {
        terminal.appendLine("Subnet Route:  10.10.10.0/24 (Aegis Corporate Network) is REACHABLE.");
      } else if (state.vpnMode === "P2P") {
        terminal.appendLine("Subnet Route:  10.9.0.0/24 (Direct Peer Link) is REACHABLE.");
      } else {
        terminal.appendLine("Warning:       Traffic is unencrypted. Remote hosts log home IP 74.125.19.102.");
      }
      terminal.appendLine("============================================================");
      return;
    }

    if (subCmd === "connect") {
      const mode = (args[1] || "").toLowerCase().trim();

      if (mode === "consumer" || mode === "anon" || mode === "anonymous") {
        const serverArg = (args[2] || "zurich").toLowerCase().trim();
        const serverObj = this.consumerServers.find((s) => s.id === serverArg) || this.consumerServers[0];

        terminal.appendLine(`[VPNguard] Initializing WireGuard tunnel to ${serverObj.name}...`);
        terminal.appendLine(`[VPNguard] Negotiating handshake with ${serverObj.host}...`);
        terminal.appendLine(`[VPNguard] tun0 mounted: inet 10.8.0.4/24 -> ${serverObj.host}`);
        terminal.appendLine(`[VPNguard] Egress route updated: Public IP spoofed to ${serverObj.publicIP}.`);
        terminal.appendLine(`[VPNguard] Mode 1: Consumer Anonymous Tunnel ESTABLISHED.`);

        this.networkState.setConsumerMode({
          profileId: "consumer_anonymous",
          server: serverObj.name,
          tunIp: "10.8.0.4",
          publicIP: serverObj.publicIP
        });

        this.saveToDisk();
        this.loggingSystem?.logNetworkEvent(
          `VPNguard tun0 activated (Mode: CONSUMER). Egress IP randomized to ${serverObj.publicIP}.`
        );
        this.render();
        return;
      }

      if (mode === "work" || mode === "corp" || mode === "corporate" || mode === "aegis") {
        terminal.appendLine("[VPNguard] Loading OpenVPN configuration /documents/vpnguard/office.ovpn...");
        terminal.appendLine("[VPNguard] Connecting to Aegis Corporate Site-to-Site Gateway (vpn.aegis-security.internal)...");
        terminal.appendLine("[VPNguard] Authentication verified: smiller@aegis-corp (TLS-Crypt OK).");
        terminal.appendLine("[VPNguard] tun0 mounted: corporate IP 10.10.10.45/24.");
        terminal.appendLine("[VPNguard] Injected static route: 10.10.10.0/24 via 10.10.10.1.");
        terminal.appendLine("[VPNguard] Mode 2: Work/Remote Enterprise Gateway ESTABLISHED.");
        terminal.appendLine("[VPNguard] Zenmap & Nmap can now scan Aegis internal database & workstation hosts.");

        this.networkState.setWorkMode({
          profileId: "aegis_work",
          server: "vpn.aegis-security.internal",
          tunIp: "10.10.10.45",
          gateway: "10.10.10.1",
          targetSubnet: "10.10.10.0/24"
        });

        this.saveToDisk();
        this.loggingSystem?.logNetworkEvent(
          "VPNguard tun0 activated (Mode: WORK). Injected route 10.10.10.0/24 via 10.10.10.1."
        );
        this.render();
        return;
      }

      if (mode === "p2p" || mode === "peer") {
        const peerIp = args[2] || "10.9.0.2";
        terminal.appendLine(`[VPNguard] Creating point-to-point WireGuard peer tunnel to ${peerIp}...`);
        terminal.appendLine("[VPNguard] Establishing authenticated handshake with remote endpoint 198.51.100.84:51820...");
        terminal.appendLine(`[VPNguard] tun0 mounted: virtual point-to-point IP 10.9.0.1/24.`);
        terminal.appendLine(`[VPNguard] Mode 3: P2P Tunnel ESTABLISHED. Peer ${peerIp} is now scannable on subnet 10.9.0.0/24.`);

        this.networkState.setP2PMode({
          profileId: "p2p_node",
          peerEndpoint: "198.51.100.84:51820",
          localIp: "10.9.0.1",
          peerIp,
          targetSubnet: "10.9.0.0/24"
        });

        this.saveToDisk();
        this.loggingSystem?.logNetworkEvent(
          `VPNguard tun0 activated (Mode: P2P). Point-to-point link to ${peerIp} active.`
        );
        this.render();
        return;
      }

      terminal.appendLine("Usage: vpnguard connect <consumer | work | p2p> [options]");
      terminal.appendLine("Examples:");
      terminal.appendLine("  vpnguard connect consumer zurich");
      terminal.appendLine("  vpnguard connect work aegis_work");
      terminal.appendLine("  vpnguard connect p2p 10.9.0.2");
      return;
    }

    if (subCmd === "disconnect" || subCmd === "down" || subCmd === "stop") {
      const prevState = this.networkState.getState();
      if (prevState.vpnMode === "OFF") {
        terminal.appendLine("[VPNguard] No active tunnel is running. Interface tun0 is already down.");
        return;
      }

      const prevMode = prevState.vpnMode;
      this.networkState.disconnect();
      this.saveToDisk();

      terminal.appendLine(`[VPNguard] Terminated ${prevMode} tunnel session.`);
      terminal.appendLine("[VPNguard] Virtual interface tun0 removed.");
      terminal.appendLine(`[VPNguard] Restored physical egress routing via eth0 (Public IP: ${this.networkState.realHomePublicIP}).`);

      this.loggingSystem?.logNetworkEvent(
        `VPNguard tun0 deactivated (${prevMode} closed). Default routing restored to eth0 (${this.networkState.realHomePublicIP}).`
      );
      this.render();
      return;
    }

    if (subCmd === "profiles") {
      terminal.appendLine(`[VPNguard Profiles - Stored in ${this.saveFilePath}]`);
      for (const [id, prof] of this.profiles.entries()) {
        terminal.appendLine(` • [${id}] ${prof.name || id} (${prof.type})`);
        terminal.appendLine(`   Server: ${prof.server || prof.peer_endpoint || "N/A"} | IP: ${prof.assigned_tun_ip || prof.local_virtual_ip}`);
      }
      return;
    }

    if (subCmd === "reload") {
      this.loadFromDisk();
      terminal.appendLine(`[VPNguard] Reloaded ${this.profiles.size} profiles from ${this.saveFilePath}.`);
      this.render();
      return;
    }

    if (subCmd === "help" || subCmd === "-h" || subCmd === "--help") {
      terminal.appendLine("VPNguard - Network Security & Virtual Tunnel Manager");
      terminal.appendLine("Usage: vpnguard <command> [arguments]");
      terminal.appendLine("");
      terminal.appendLine("Commands:");
      terminal.appendLine("  vpnguard status                View active network interfaces, public IP & mode");
      terminal.appendLine("  vpnguard connect consumer      Connect to Anonymous Privacy Server (185.220.101.5)");
      terminal.appendLine("  vpnguard connect work          Connect to Aegis Corporate Gateway (10.10.10.0/24)");
      terminal.appendLine("  vpnguard connect p2p [ip]      Direct tunnel to compromised target node (10.9.0.2)");
      terminal.appendLine("  vpnguard disconnect            Tear down tun0 and restore direct home routing");
      terminal.appendLine("  vpnguard profiles              List profiles in /documents/vpnguard/savedata.ini");
      terminal.appendLine("  vpnguard reload                Hot-reload profile definitions from disk");
      terminal.appendLine("  vpnguard gui                   Open graphical control window");
      return;
    }

    terminal.appendLine(`vpnguard: unknown command '${subCmd}'. Run 'vpnguard help' for usage.`);
  }
}
