import { DEFAULT_ZENMAP_INI } from "./zenmap-data.js";
import { playerNetworkState } from "../core/network-state.js";

/**
 * ZenMapApp - Network Topology & Target Mapper Application
 * Full GUI + Terminal CLI integration with modular INI data persistence at:
 * /documents/zenmap/savedata.ini (or /documents/zenmap/hosts.ini)
 */
export class ZenMapApp {
  constructor({ ui, networkRegistry, terminal, fileSystem }) {
    this.ui = ui;
    this.networkRegistry = networkRegistry;
    this.terminal = terminal;
    this.fileSystem = fileSystem;

    this.saveFilePath = "/documents/zenmap/savedata.ini";
    this.fallbackFilePath = "/documents/zenmap/hosts.ini";

    // Application State
    this.activeTab = "topology";
    this.selectedHostId = "steves-testbox";
    this.layoutMode = "radial";
    this.filterSubnet = "all";
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isScanning = false;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Loaded Data
    this.currentHosts = new Map();
    this.currentSettings = {
      target: "192.168.56.0/24, 10.0.0.0/16, 172.16.5.0/24",
      profile: "intense",
      layout: "radial",
      filter: "all",
      selected: "steves-testbox",
      last_scan: ""
    };
    this.hasLoadedSaveFile = false;

    // Initial load from virtual filesystem
    this.loadFromDisk();

    // Subscribe to network state changes to update active interface and targets
    this.unsubscribeNetwork = playerNetworkState.subscribe(() => {
      this.updateHeaderAndStatus();
      if (this.window && !this.window.classList.contains("hidden")) {
        this.renderAll();
      }
    });

    // Bind DOM
    this.initDOMElements();
    this.bindEvents();
  }

  // ---------------------------------------------------------------------------
  // Filesystem & INI Persistence
  // ---------------------------------------------------------------------------

  getFS() {
    return this.fileSystem || this.terminal?.fileSystem || null;
  }

  getActiveSavePath() {
    const fs = this.getFS();
    if (!fs) return this.saveFilePath;
    if (fs.resolve(this.saveFilePath)) return this.saveFilePath;
    if (fs.resolve(this.fallbackFilePath)) return this.fallbackFilePath;
    return this.saveFilePath;
  }

  hasSaveData() {
    const fs = this.getFS();
    if (!fs) return false;
    return Boolean(fs.resolve(this.saveFilePath) || fs.resolve(this.fallbackFilePath));
  }

  getLocalHost() {
    return {
      id: "demicube-testbox",
      hostname: "demicube-testbox",
      ip: "192.168.56.101",
      subnet: "192.168.56.0/24",
      type: "localhost",
      role: "Local Test Computer (Our Terminal)",
      os: "DemicubeOS 0.1.0-alpha (Linux 6.6.0-demicube)",
      status: "online",
      latency: "0.0ms",
      hops: 0,
      mac: "08:00:27:12:34:56",
      ports: [
        { port: 22, protocol: "tcp", state: "open", service: "ssh", version: "OpenSSH 9.2p1" },
        { port: 80, protocol: "tcp", state: "open", service: "http", version: "Nginx 1.22" }
      ]
    };
  }

  /**
   * Robust INI parser supporting [settings] and [host.<id>] sections
   */
  parseIni(iniText) {
    const settings = { ...this.currentSettings };
    const hosts = new Map();
    let currentSection = null;
    let currentHost = null;

    const lines = (iniText || "").split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(";") || line.startsWith("#")) continue;

      if (line.startsWith("[") && line.endsWith("]")) {
        const secName = line.slice(1, -1).trim();
        currentSection = secName;

        if (secName === "settings") {
          currentHost = null;
        } else {
          // host section: either [host.<id>] or [<id>]
          const hostId = secName.startsWith("host.") ? secName.slice(5).trim() : secName;
          currentHost = {
            id: hostId,
            hostname: hostId,
            ip: "",
            subnet: "192.168.56.0/24",
            type: "workstation",
            role: "Network Node",
            os: "Linux",
            status: "online",
            latency: "1.0ms",
            hops: 1,
            mac: "08:00:27:xx:xx:xx",
            ports: []
          };
          hosts.set(hostId, currentHost);
        }
        continue;
      }

      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim().toLowerCase();
      const value = line.slice(eqIdx + 1).trim();

      if (currentSection === "settings") {
        settings[key] = value;
      } else if (currentHost) {
        if (key === "ports") {
          // Format: 22/tcp/open/ssh:OpenSSH 9.2p1, 80/tcp/open/http:Apache 2.4
          currentHost.ports = value
            .split(",")
            .map((pStr) => pStr.trim())
            .filter(Boolean)
            .map((pStr) => {
              const [spec, ver] = pStr.split(":");
              const [port, proto, state, serv] = (spec || "").split("/");
              return {
                port: parseInt(port, 10) || 80,
                protocol: proto || "tcp",
                state: state || "open",
                service: serv || "unknown",
                version: ver || ""
              };
            });
        } else if (key === "hops") {
          currentHost.hops = parseInt(value, 10) || 1;
        } else {
          currentHost[key] = value;
        }
      }
    }

    return { settings, hosts };
  }

  /**
   * Serialize settings and host records into clean INI format
   */
  serializeIni(settings, hostsMap) {
    const lines = [
      "; ============================================================",
      "; Zenmap 7.94 Network Topology Save Data",
      "; Stored Hosts & Discovered Targets Database",
      "; ============================================================",
      "",
      "[settings]",
      `target=${settings.target || "192.168.56.0/24, 10.0.0.0/16, 172.16.5.0/24"}`,
      `profile=${settings.profile || "intense"}`,
      `layout=${settings.layout || "radial"}`,
      `filter=${settings.filter || "all"}`,
      `selected=${settings.selected || "steves-testbox"}`,
      `last_scan=${settings.last_scan || new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC"}`,
      ""
    ];

    for (const host of hostsMap.values()) {
      if (host.type === "localhost" || host.id === "demicube-testbox") continue; // localhost is dynamic
      lines.push(`[host.${host.id}]`);
      lines.push(`id=${host.id}`);
      lines.push(`hostname=${host.hostname || host.id}`);
      lines.push(`ip=${host.ip || ""}`);
      lines.push(`subnet=${host.subnet || "192.168.56.0/24"}`);
      lines.push(`type=${host.type || "workstation"}`);
      lines.push(`role=${host.role || "Host"}`);
      lines.push(`os=${host.os || "Linux"}`);
      lines.push(`status=${host.status || "online"}`);
      lines.push(`latency=${host.latency || "1.0ms"}`);
      lines.push(`hops=${host.hops || 1}`);
      lines.push(`mac=${host.mac || "08:00:27:xx:xx:xx"}`);

      const portsStr = (host.ports || [])
        .map((p) => `${p.port}/${p.protocol || "tcp"}/${p.state || "open"}/${p.service || "svc"}${p.version ? ":" + p.version : ""}`)
        .join(", ");
      lines.push(`ports=${portsStr}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  loadFromDisk() {
    const fs = this.getFS();
    const activePath = this.getActiveSavePath();

    this.currentHosts.clear();
    // Always include localhost
    const localhost = this.getLocalHost();
    this.currentHosts.set(localhost.id, localhost);

    if (!fs || !this.hasSaveData()) {
      this.hasLoadedSaveFile = false;
      this.selectedHostId = localhost.id;
      return { exists: false, hosts: this.currentHosts };
    }

    try {
      const content = fs.read(activePath);
      if (typeof content === "string" && content.trim()) {
        const { settings, hosts } = this.parseIni(content);
        this.currentSettings = { ...this.currentSettings, ...settings };
        this.layoutMode = settings.layout || this.layoutMode;
        this.filterSubnet = settings.filter || this.filterSubnet;

        for (const [id, host] of hosts) {
          if (id !== "demicube-testbox") {
            this.currentHosts.set(id, host);
          }
        }

        if (settings.selected && this.currentHosts.has(settings.selected)) {
          this.selectedHostId = settings.selected;
        } else {
          this.selectedHostId = this.currentHosts.has("steves-testbox") ? "steves-testbox" : localhost.id;
        }

        this.hasLoadedSaveFile = true;
        return { exists: true, hosts: this.currentHosts };
      }
    } catch (err) {
      console.warn("Zenmap: error reading save file", err);
    }

    this.hasLoadedSaveFile = false;
    return { exists: false, hosts: this.currentHosts };
  }

  saveToDisk(overrideSettings = {}) {
    const fs = this.getFS();
    if (!fs) return false;

    const activePath = this.getActiveSavePath();
    const parentDir = activePath.slice(0, activePath.lastIndexOf("/"));
    if (!fs.resolve(parentDir)) {
      fs.mkdir(parentDir);
    }

    const mergedSettings = {
      ...this.currentSettings,
      layout: this.layoutMode,
      filter: this.filterSubnet,
      selected: this.selectedHostId,
      last_scan: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
      ...overrideSettings
    };
    this.currentSettings = mergedSettings;

    const iniContent = this.serializeIni(mergedSettings, this.currentHosts);
    fs.write(activePath, iniContent);
    this.hasLoadedSaveFile = true;

    this.renderAll();
    this.updateHeaderAndStatus();
    return true;
  }

  reloadFromDisk() {
    this.loadFromDisk();
    this.renderAll();
    this.updateHeaderAndStatus();
  }

  // ---------------------------------------------------------------------------
  // Host CRUD
  // ---------------------------------------------------------------------------

  addHost(hostData) {
    if (!hostData || !hostData.ip) return false;
    const id = hostData.id || hostData.hostname || ("host-" + hostData.ip.replace(/\./g, "-"));
    const host = {
      id,
      hostname: hostData.hostname || id,
      ip: hostData.ip,
      subnet: hostData.subnet || (hostData.ip.startsWith("192.168.56.") ? "192.168.56.0/24" : hostData.ip.startsWith("10.0.") ? "10.0.0.0/16" : "remote"),
      type: hostData.type || "workstation",
      role: hostData.role || "Discovered Host",
      os: hostData.os || "Linux",
      status: "online",
      latency: hostData.latency || "1.2ms",
      hops: hostData.hops || (hostData.subnet === "192.168.56.0/24" ? 1 : 2),
      mac: hostData.mac || "08:00:27:00:00:" + Math.floor(Math.random() * 89 + 10),
      ports: hostData.ports || [
        { port: 22, protocol: "tcp", state: "open", service: "ssh", version: "OpenSSH 9.0" }
      ]
    };

    this.currentHosts.set(id, host);
    this.selectedHostId = id;
    this.saveToDisk();
    return host;
  }

  removeHost(hostIdOrIp) {
    const target = this.findHost(hostIdOrIp);
    if (!target || target.id === "demicube-testbox") return false; // cannot delete localhost

    this.currentHosts.delete(target.id);
    if (this.selectedHostId === target.id) {
      this.selectedHostId = "demicube-testbox";
    }
    this.saveToDisk();
    return true;
  }

  findHost(idOrIp) {
    if (!idOrIp) return null;
    const query = idOrIp.toLowerCase().trim();
    if (this.currentHosts.has(query)) return this.currentHosts.get(query);
    for (const host of this.currentHosts.values()) {
      if (host.hostname.toLowerCase() === query || host.ip.toLowerCase() === query || host.id.toLowerCase() === query) {
        return host;
      }
    }
    return null;
  }

  clearHosts() {
    const localhost = this.getLocalHost();
    this.currentHosts.clear();
    this.currentHosts.set(localhost.id, localhost);
    this.selectedHostId = localhost.id;
    this.saveToDisk();
  }

  // ---------------------------------------------------------------------------
  // Data Filtering & Topology Graph
  // ---------------------------------------------------------------------------

  getScanTargets() {
    return playerNetworkState.getScanTargets(this.networkRegistry);
  }

  getFilteredSystems() {
    const all = Array.from(this.currentHosts.values());
    if (this.filterSubnet === "all") return all;
    if (this.filterSubnet === "192.168.56.0/24" || this.filterSubnet === "192.168.1.0/24" || this.filterSubnet === "local") {
      return all.filter((s) => s.subnet === "192.168.56.0/24" || s.subnet === "192.168.1.0/24");
    }
    if (this.filterSubnet === "10.0.0.0/16" || this.filterSubnet === "internal") {
      return all.filter((s) => s.subnet === "10.0.0.0/16");
    }
    if (this.filterSubnet === "10.10.10.0/24" || this.filterSubnet === "corporate" || this.filterSubnet === "work") {
      return all.filter((s) => s.subnet === "10.10.10.0/24" || s.category === "corporate");
    }
    if (this.filterSubnet === "10.9.0.0/24" || this.filterSubnet === "p2p") {
      return all.filter((s) => s.subnet === "10.9.0.0/24" || s.category === "p2p");
    }
    if (this.filterSubnet === "remote" || this.filterSubnet === "wan") {
      return all.filter(
        (s) =>
          s.subnet !== "192.168.56.0/24" &&
          s.subnet !== "192.168.1.0/24" &&
          s.subnet !== "10.0.0.0/16" &&
          s.subnet !== "10.10.10.0/24" &&
          s.subnet !== "10.9.0.0/24"
      );
    }
    return all;
  }

  getTopologyGraph() {
    const nodes = Array.from(this.currentHosts.values());
    const links = [];
    const hasGateway = this.currentHosts.has("gateway-router");
    const hasAegisGateway = this.currentHosts.has("aegis-hq-gateway");

    for (const host of nodes) {
      if (host.id === "demicube-testbox") continue;

      if (host.subnet === "192.168.56.0/24" || host.subnet === "192.168.1.0/24") {
        links.push({
          source: "demicube-testbox",
          target: host.id,
          latency: host.latency,
          type: host.id === "gateway-router" ? "direct" : "lan"
        });
      } else if (host.subnet === "10.10.10.0/24" || host.category === "corporate") {
        // Corporate network via Aegis Gateway if present, else via local tun0
        if (host.id === "aegis-hq-gateway") {
          links.push({
            source: "demicube-testbox",
            target: host.id,
            latency: host.latency,
            type: "vpn"
          });
        } else {
          const gw = hasAegisGateway ? "aegis-hq-gateway" : "demicube-testbox";
          links.push({
            source: gw,
            target: host.id,
            latency: host.latency,
            type: "corporate"
          });
        }
      } else if (host.subnet === "10.9.0.0/24" || host.category === "p2p") {
        // Direct peer tunnel
        links.push({
          source: "demicube-testbox",
          target: host.id,
          latency: host.latency,
          type: "p2p"
        });
      } else {
        // Routed via gateway router if present, otherwise direct
        const gatewayId = hasGateway ? "gateway-router" : "demicube-testbox";
        links.push({
          source: gatewayId,
          target: host.id,
          latency: host.latency,
          type: host.subnet === "remote" ? "satellite" : "routed"
        });
      }
    }

    return { nodes, links };
  }

  // ---------------------------------------------------------------------------
  // DOM Setup & UI Event Bindings
  // ---------------------------------------------------------------------------

  initDOMElements() {
    this.window = document.getElementById("zenmap-window");
    if (!this.window) return;

    this.scanBtn = this.window.querySelector("#zenmap-scan-btn");
    this.targetInput = this.window.querySelector("#zenmap-target");
    this.profileSelect = this.window.querySelector("#zenmap-profile");
    this.statusBanner = this.window.querySelector("#zenmap-status-banner");
    this.titleLabel = this.window.querySelector("#zenmap-title-label");

    this.tabButtons = this.window.querySelectorAll(".zenmap-tab-btn");
    this.views = {
      topology: this.window.querySelector("#zenmap-view-topology"),
      hosts: this.window.querySelector("#zenmap-view-hosts"),
      services: this.window.querySelector("#zenmap-view-services"),
      "nmap-output": this.window.querySelector("#zenmap-view-output")
    };

    this.topologySvg = this.window.querySelector("#zenmap-topology-svg");
    this.hostInspector = this.window.querySelector("#zenmap-host-inspector");
    this.filterButtons = this.window.querySelectorAll("[data-zenmap-filter]");
    this.layoutButtons = this.window.querySelectorAll("[data-zenmap-layout]");

    this.zoomInBtn = this.window.querySelector("#zenmap-zoom-in");
    this.zoomOutBtn = this.window.querySelector("#zenmap-zoom-out");
    this.zoomResetBtn = this.window.querySelector("#zenmap-zoom-reset");
    this.addHostBtn = this.window.querySelector("#zenmap-btn-add-host");

    if (this.targetInput && this.currentSettings.target) {
      this.targetInput.value = this.currentSettings.target;
    }
    if (this.profileSelect && this.currentSettings.profile) {
      this.profileSelect.value = this.currentSettings.profile;
    }

    this.updateHeaderAndStatus();
  }

  bindEvents() {
    if (!this.window) return;

    this.scanBtn?.addEventListener("click", () => {
      if (this.terminal) {
        this.terminal.submitCommand("zenmap scan");
      } else {
        this.triggerScan();
      }
    });

    this.tabButtons?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.zenmapTab;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap tab " + tab);
        } else {
          this.switchTab(tab);
        }
      });
    });

    this.filterButtons?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.zenmapFilter;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap filter " + filter);
        } else {
          this.setFilter(filter);
        }
      });
    });

    this.layoutButtons?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const layout = btn.dataset.zenmapLayout;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap layout " + layout);
        } else {
          this.setLayout(layout);
        }
      });
    });

    this.zoomInBtn?.addEventListener("click", () => {
      if (this.terminal) this.terminal.submitCommand("zenmap zoom in");
      else this.zoom(0.15);
    });
    this.zoomOutBtn?.addEventListener("click", () => {
      if (this.terminal) this.terminal.submitCommand("zenmap zoom out");
      else this.zoom(-0.15);
    });
    this.zoomResetBtn?.addEventListener("click", () => {
      if (this.terminal) this.terminal.submitCommand("zenmap zoom fit");
      else this.resetZoom();
    });

    this.addHostBtn?.addEventListener("click", () => {
      this.promptAddHost();
    });

    this.targetInput?.addEventListener("change", (e) => {
      this.currentSettings.target = e.target.value;
      this.saveToDisk();
    });

    this.profileSelect?.addEventListener("change", (e) => {
      this.currentSettings.profile = e.target.value;
      this.saveToDisk();
    });

    // SVG Pan & Zoom Drag listeners
    if (this.topologySvg) {
      this.topologySvg.addEventListener("mousedown", (e) => {
        if (e.target.closest(".zenmap-node")) return;
        this.isPanning = true;
        this.panStartX = e.clientX - this.panX;
        this.panStartY = e.clientY - this.panY;
        this.topologySvg.style.cursor = "grabbing";
      });

      window.addEventListener("mousemove", (e) => {
        if (!this.isPanning) return;
        this.panX = e.clientX - this.panStartX;
        this.panY = e.clientY - this.panStartY;
        this.updateSvgTransform();
      });

      window.addEventListener("mouseup", () => {
        if (this.isPanning) {
          this.isPanning = false;
          if (this.topologySvg) this.topologySvg.style.cursor = "default";
        }
      });

      this.topologySvg.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          this.zoom(delta);
        },
        { passive: false }
      );
    }
  }

  // ---------------------------------------------------------------------------
  // View Controls
  // ---------------------------------------------------------------------------

  start() {
    this.loadFromDisk();
    this.ui.setWindowVisible("zenmap", true);
    this.renderAll();
    this.updateHeaderAndStatus();
  }

  stop() {
    this.isScanning = false;
  }

  switchTab(tab) {
    if (!tab) return;
    this.activeTab = tab;
    this.tabButtons?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.zenmapTab === tab);
    });

    for (const [key, view] of Object.entries(this.views)) {
      if (view) {
        view.classList.toggle("hidden", key !== tab);
      }
    }

    if (tab === "topology") {
      this.renderTopology();
      this.renderInspector();
    } else if (tab === "hosts") {
      this.renderHostsTable();
    } else if (tab === "services") {
      this.renderServices();
    } else if (tab === "nmap-output") {
      this.renderNmapOutput();
    }
  }

  setLayout(mode) {
    if (mode !== "radial" && mode !== "tree") mode = "radial";
    this.layoutMode = mode;
    this.layoutButtons?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.zenmapLayout === mode);
    });
    this.renderTopology();
    this.saveToDisk();
  }

  setFilter(filter) {
    this.filterSubnet = filter || "all";
    this.filterButtons?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.zenmapFilter === this.filterSubnet);
    });
    this.renderTopology();
    this.renderHostsTable();
    this.saveToDisk();
  }

  zoom(delta) {
    this.zoomLevel = Math.max(0.4, Math.min(2.5, this.zoomLevel + delta));
    this.updateSvgTransform();
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateSvgTransform();
  }

  updateSvgTransform() {
    const group = this.window?.querySelector("#zenmap-viewport-group");
    if (group) {
      group.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoomLevel})`);
    }
  }

  selectHost(hostId) {
    if (!hostId) return;
    this.selectedHostId = hostId;
    this.renderTopology();
    this.renderInspector();
  }

  connectViaSSH(ip, user = "admin") {
    this.ui.setWindowVisible("terminal-main", true);
    this.ui.setFocus("terminal-main");
    if (this.terminal) {
      this.terminal.submitCommand(`ssh ${user}@${ip}`);
    }
  }

  promptAddHost() {
    const ip = window.prompt("Enter Target Host IP Address (e.g. 192.168.56.120):", "192.168.56.120");
    if (!ip) return;
    const hostname = window.prompt("Enter Hostname (e.g. backup-node-01):", "backup-node-01") || "host-" + ip.replace(/\./g, "-");
    const role = window.prompt("Enter Role / Description:", "Discovered Workstation") || "Discovered Workstation";
    const added = this.addHost({ ip, hostname, role });
    if (added && this.terminal) {
      this.terminal.appendLine(`[zenmap] Added host ${hostname} (${ip}) to ${this.getActiveSavePath()}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Scanning & Synchronization
  // ---------------------------------------------------------------------------

  triggerScan(cliTerminal = null) {
    if (cliTerminal && !cliTerminal.appendLine && cliTerminal.ui?.appendTerminalLine) {
      cliTerminal.appendLine = (line) => cliTerminal.ui.appendTerminalLine(line);
    }
    if (this.isScanning) return;
    this.isScanning = true;

    if (this.scanBtn) {
      this.scanBtn.textContent = "Scanning...";
      this.scanBtn.classList.add("scanning");
    }

    if (this.statusBanner) {
      this.statusBanner.innerHTML = `<span class="pulse-dot"></span> Sweeping target subnets: ARP ping & port inspection...`;
    }

    const radarSweep = this.window?.querySelector(".zenmap-radar-sweep");
    if (radarSweep) radarSweep.classList.add("active");

    if (cliTerminal) {
      cliTerminal.appendLine("Starting Nmap 7.94 ( https://nmap.org )");
      cliTerminal.appendLine(`Initiating ARP & ICMP Subnet Sweep against ${this.currentSettings.target || "subnets"}...`);
    }

    setTimeout(() => {
      this.isScanning = false;
      if (this.scanBtn) {
        this.scanBtn.textContent = "Scan";
        this.scanBtn.classList.remove("scanning");
      }
      if (radarSweep) radarSweep.classList.remove("active");

      // Discover systems from network registry filtered by active VPN state (getScanTargets)
      const scannable = this.getScanTargets();

      // Retain localhost always
      const localhost = this.networkRegistry?.getLocalSystem() || {
        id: "demicube-testbox",
        hostname: "demicube-testbox",
        ip: "192.168.56.101",
        type: "localhost",
        status: "up",
        latency: "0.1ms",
        subnet: "192.168.56.0/24"
      };

      this.currentHosts.clear();
      this.currentHosts.set(localhost.id, localhost);

      for (const sys of scannable) {
        this.currentHosts.set(sys.id, sys);
      }

      // Persist to savedata.ini
      this.saveToDisk();

      const state = playerNetworkState.getState();
      const targetStr = (this.currentSettings.target || "").toLowerCase();

      if (cliTerminal) {
        cliTerminal.appendLine(`Scan complete: Discovered ${this.currentHosts.size} hosts active.`);
        if (state.vpnMode === "WORK") {
          cliTerminal.appendLine("[VPN] Aegis corporate subnet 10.10.10.0/24 detected via tun0 (10.10.10.45).");
        } else if (state.vpnMode === "P2P") {
          cliTerminal.appendLine("[VPN] Virtual P2P peer subnet 10.9.0.0/24 detected via tun0 (10.9.0.1).");
        } else if (targetStr.includes("10.10.10") || targetStr.includes("10.9.0")) {
          cliTerminal.appendLine("Notice: Corporate / P2P subnets returned 0 hosts (requires active VPNguard tunnel).");
        }
        cliTerminal.appendLine(`Network topology database updated: ${this.getActiveSavePath()}`);
        cliTerminal.appendLine("Zenmap GUI synchronized.");
      }

      this.updateHeaderAndStatus();
      this.renderAll();
    }, 900);
  }

  updateHeaderAndStatus() {
    const totalHosts = this.currentHosts.size;
    const hasData = this.hasSaveData();
    const activePath = this.getActiveSavePath();
    const state = playerNetworkState.getState();
    const isVpnOn = state.vpnMode !== "OFF";
    const adapterInfo = isVpnOn
      ? `tun0 (${state.activeInterfaces.tun0?.ip} [${state.vpnMode}])`
      : `eth0 (${state.activeInterfaces.eth0.ip} [LAN])`;
    const publicIpInfo = isVpnOn && state.vpnMode === "CONSUMER"
      ? `Egress: ${state.publicIP} (ANON)`
      : `Egress: ${state.publicIP}`;

    if (this.titleLabel) {
      this.titleLabel.textContent = hasData
        ? `Data: ${activePath} · [${adapterInfo}]`
        : `[No Save File - Localhost Only] · [${adapterInfo}]`;
    }

    // Update tab hosts count
    const hostTabBtn = this.window?.querySelector('[data-zenmap-tab="hosts"]');
    if (hostTabBtn) {
      hostTabBtn.textContent = `Hosts (${totalHosts})`;
    }

    // Update filter pills count
    const allPill = this.window?.querySelector('[data-zenmap-filter="all"]');
    if (allPill) {
      allPill.textContent = `All Subnets (${totalHosts})`;
    }

    // Update path label in table header
    const dataPathLabel = this.window?.querySelector("#zenmap-table-data-path");
    if (dataPathLabel) {
      dataPathLabel.textContent = hasData ? activePath : `${activePath} (file deleted)`;
    }

    if (this.statusBanner) {
      if (!hasData) {
        this.statusBanner.innerHTML = `<span style="color:#f59e0b">⚠️</span> <strong>No ${activePath.split("/").pop()} found:</strong> 1 host (localhost only) · Run <code>zenmap scan</code> or click <strong>Scan</strong> to map targets · Adapter: <code>${adapterInfo}</code>`;
      } else {
        this.statusBanner.innerHTML = `<strong>Status:</strong> ${totalHosts}/${totalHosts} hosts online · Adapter: <code>${adapterInfo}</code> · ${publicIpInfo} · Data: <code>${activePath}</code>`;
      }
    }
  }

  renderAll() {
    this.renderTopology();
    this.renderInspector();
    this.renderHostsTable();
    this.renderServices();
    this.renderNmapOutput();
    this.updateHeaderAndStatus();
  }

  // ---------------------------------------------------------------------------
  // Rendering Views
  // ---------------------------------------------------------------------------

  renderTopology() {
    if (!this.topologySvg) return;

    const graph = this.getTopologyGraph();
    const filteredSystems = this.getFilteredSystems();
    const visibleIds = new Set(filteredSystems.map((s) => s.id));

    // Dynamic coordinates layout
    const width = 860;
    const height = 520;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodeCoords = new Map();

    if (this.layoutMode === "radial") {
      // Localhost at center
      nodeCoords.set("demicube-testbox", { x: centerX, y: centerY });

      const ring1Hosts = filteredSystems.filter((s) => s.id !== "demicube-testbox" && s.subnet === "192.168.56.0/24");
      const ring2Hosts = filteredSystems.filter((s) => s.id !== "demicube-testbox" && s.subnet !== "192.168.56.0/24");

      const ring1Radius = 145;
      ring1Hosts.forEach((sys, idx) => {
        const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / Math.max(1, ring1Hosts.length);
        nodeCoords.set(sys.id, {
          x: centerX + ring1Radius * Math.cos(angle),
          y: centerY + ring1Radius * Math.sin(angle)
        });
      });

      const ring2Radius = 240;
      ring2Hosts.forEach((sys, idx) => {
        const angle = -Math.PI * 0.95 + (idx * Math.PI) / Math.max(1, ring2Hosts.length - 1 || 1);
        nodeCoords.set(sys.id, {
          x: centerX + ring2Radius * Math.cos(angle),
          y: centerY + ring2Radius * Math.sin(angle)
        });
      });
    } else {
      // Tree / Flow Layout
      nodeCoords.set("demicube-testbox", { x: 100, y: centerY });

      const col2Hosts = filteredSystems.filter((s) => s.id !== "demicube-testbox" && s.subnet === "192.168.56.0/24");
      const col3Hosts = filteredSystems.filter((s) => s.id !== "demicube-testbox" && s.subnet !== "192.168.56.0/24");

      const stepY2 = Math.min(80, 420 / Math.max(1, col2Hosts.length));
      const startY2 = centerY - ((col2Hosts.length - 1) * stepY2) / 2;
      col2Hosts.forEach((sys, idx) => {
        nodeCoords.set(sys.id, { x: 350, y: startY2 + idx * stepY2 });
      });

      const stepY3 = Math.min(80, 420 / Math.max(1, col3Hosts.length));
      const startY3 = centerY - ((col3Hosts.length - 1) * stepY3) / 2;
      col3Hosts.forEach((sys, idx) => {
        nodeCoords.set(sys.id, { x: 620, y: startY3 + idx * stepY3 });
      });
    }

    let svgContent = `
      <defs>
        <radialGradient id="node-glow-local" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="node-glow-selected" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
        </radialGradient>
        <filter id="zenmap-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g id="zenmap-viewport-group" transform="translate(${this.panX}, ${this.panY}) scale(${this.zoomLevel})">
    `;

    if (this.layoutMode === "radial") {
      svgContent += `
        <circle cx="${centerX}" cy="${centerY}" r="145" class="zenmap-guideline" />
        <circle cx="${centerX}" cy="${centerY}" r="240" class="zenmap-guideline" />
        <text x="${centerX + 150}" y="${centerY - 8}" class="zenmap-guide-label">Local Subnet Ring (192.168.56.0/24)</text>
        <text x="${centerX + 245}" y="${centerY - 8}" class="zenmap-guide-label">Routed &amp; WAN Ring (10.0.0.0/16, 172.16.5.0/24)</text>
      `;
    }

    // Links
    svgContent += `<g class="zenmap-links">`;
    for (const link of graph.links) {
      if (!visibleIds.has(link.source) || !visibleIds.has(link.target)) continue;
      const p1 = nodeCoords.get(link.source);
      const p2 = nodeCoords.get(link.target);
      if (!p1 || !p2) continue;

      const isHighlight =
        this.selectedHostId && (link.source === this.selectedHostId || link.target === this.selectedHostId);
      const linkClass = `zenmap-link ${link.type} ${isHighlight ? "highlight" : ""}`;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      svgContent += `
        <line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="${linkClass}" />
        <g class="zenmap-link-badge" transform="translate(${midX}, ${midY})">
          <rect x="-24" y="-9" width="48" height="18" rx="4" class="zenmap-latency-bg" />
          <text x="0" y="3" text-anchor="middle" class="zenmap-latency-text">${link.latency}</text>
        </g>
      `;
    }
    svgContent += `</g>`;

    // Nodes
    svgContent += `<g class="zenmap-nodes">`;
    for (const sys of graph.nodes) {
      if (!visibleIds.has(sys.id)) continue;
      const pt = nodeCoords.get(sys.id);
      if (!pt) continue;

      const isSelected = this.selectedHostId === sys.id;
      const isLocalhost = sys.id === "demicube-testbox";
      const isStevesTestbox = sys.id === "steves-testbox";
      const isRouter = sys.id === "gateway-router";

      let nodeColorClass = "node-workstation";
      let iconSymbol = "💻";
      let badgeLabel = "";

      if (isLocalhost) {
        nodeColorClass = "node-localhost";
        iconSymbol = "★";
        badgeLabel = "YOU (Localhost)";
      } else if (isRouter) {
        nodeColorClass = "node-router";
        iconSymbol = "⛫";
        badgeLabel = "GATEWAY";
      } else if (isStevesTestbox) {
        nodeColorClass = "node-steve";
        iconSymbol = "🧪";
        badgeLabel = "STEVE'S SANDBOX";
      } else if (sys.category === "corporate" || sys.subnet === "10.10.10.0/24") {
        nodeColorClass = "node-corporate";
        iconSymbol = "🏛️";
        badgeLabel = "AEGIS CORP";
      } else if (sys.category === "p2p" || sys.subnet === "10.9.0.0/24") {
        nodeColorClass = "node-p2p";
        iconSymbol = "⚡";
        badgeLabel = "P2P PEER";
      } else if (sys.type === "server") {
        nodeColorClass = "node-server";
        iconSymbol = "🖳";
        badgeLabel = "SERVER";
      } else if (sys.type === "relay") {
        nodeColorClass = "node-relay";
        iconSymbol = "📡";
        badgeLabel = "UPLINK";
      }

      const nodeRadius = isLocalhost ? 30 : isStevesTestbox ? 26 : 22;

      svgContent += `
        <g class="zenmap-node ${nodeColorClass} ${isSelected ? "selected" : ""}" data-host-id="${sys.id}" transform="translate(${pt.x}, ${pt.y})">
          ${isSelected ? `<circle r="${nodeRadius + 10}" class="selection-ring" />` : ""}
          ${isLocalhost ? `<circle r="${nodeRadius + 14}" class="pulse-ring" />` : ""}
          <circle r="${nodeRadius}" class="node-circle" />
          <text y="${isLocalhost ? 6 : 5}" text-anchor="middle" class="node-glyph">${iconSymbol}</text>
          
          <g class="node-labels" transform="translate(0, ${nodeRadius + 16})">
            <text class="node-label-title" text-anchor="middle">${sys.hostname}</text>
            <text class="node-label-ip" y="14" text-anchor="middle">${sys.ip}</text>
            ${badgeLabel ? `<rect x="-42" y="20" width="84" height="15" rx="3" class="node-badge-bg" /><text y="31" text-anchor="middle" class="node-badge-text">${badgeLabel}</text>` : ""}
          </g>
        </g>
      `;
    }
    svgContent += `</g></g>`;

    this.topologySvg.innerHTML = svgContent;

    // Attach click listeners
    this.topologySvg.querySelectorAll(".zenmap-node").forEach((nodeEl) => {
      nodeEl.addEventListener("click", (e) => {
        e.stopPropagation();
        const hostId = nodeEl.dataset.hostId;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap inspect " + hostId);
        } else {
          this.selectHost(hostId);
        }
      });
    });
  }

  renderInspector() {
    if (!this.hostInspector) return;

    const sys = this.currentHosts.get(this.selectedHostId) || this.currentHosts.values().next().value;
    if (!sys) {
      this.hostInspector.innerHTML = `<div class="inspector-empty">No target host available. Scan to map hosts.</div>`;
      return;
    }

    const isLocal = sys.type === "localhost" || sys.id === "demicube-testbox";
    const isSteve = sys.id === "steves-testbox";

    let roleBadge = "Workstation";
    let badgeClass = "badge-workstation";
    if (isLocal) {
      roleBadge = "Local Host (Us)";
      badgeClass = "badge-local";
    } else if (sys.type === "router") {
      roleBadge = "Gateway / Router";
      badgeClass = "badge-router";
    } else if (isSteve) {
      roleBadge = "Steve's Sandbox";
      badgeClass = "badge-steve";
    } else if (sys.type === "server") {
      roleBadge = "Cluster Server";
      badgeClass = "badge-server";
    } else if (sys.type === "relay") {
      roleBadge = "Satellite Relay";
      badgeClass = "badge-relay";
    }

    const portsHtml = (sys.ports || [])
      .map(
        (p) => `
      <tr class="port-row ${p.state}">
        <td><strong>${p.port}/${p.protocol}</strong></td>
        <td><span class="port-state ${p.state}">${p.state}</span></td>
        <td>${p.service}</td>
        <td class="port-version">${p.version || "n/a"}</td>
      </tr>
    `
      )
      .join("");

    this.hostInspector.innerHTML = `
      <div class="inspector-card">
        <header class="inspector-header">
          <div class="inspector-title-row">
            <h3 class="inspector-host-title">${sys.hostname}</h3>
            <span class="inspector-role-badge ${badgeClass}">${roleBadge}</span>
          </div>
          <div class="inspector-ip-row">
            <span class="inspector-ip">${sys.ip}</span>
            <span class="inspector-mac">${sys.mac || "08:00:27:xx:xx:xx"}</span>
            <span class="inspector-status-badge online">● ONLINE</span>
          </div>
        </header>

        <div class="inspector-actions">
          ${
            !isLocal
              ? `<button id="inspector-btn-ssh" class="inspector-action-btn primary" title="Open SSH session [CLI: zenmap ssh ${sys.ip}]">
                  <span>⚡</span> SSH Connect (${sys.ip})
                </button>`
              : `<span class="inspector-local-note">★ Current Local Workstation</span>`
          }
          <button id="inspector-btn-scan" class="inspector-action-btn" title="Rescan this target [CLI: zenmap rescan ${sys.hostname}]">
            <span>🔍</span> Rescan Target
          </button>
        </div>

        <div class="inspector-section">
          <h4>Host Specification</h4>
          <dl class="inspector-dl">
            <div><dt>Subnet:</dt><dd>${sys.subnet}</dd></div>
            <div><dt>Routing Hops:</dt><dd>${sys.hops === 0 ? "0 (Direct localhost)" : sys.hops + " hop(s)"}</dd></div>
            <div><dt>Ping Latency:</dt><dd>${sys.latency}</dd></div>
            <div><dt>OS &amp; Kernel:</dt><dd>${sys.os}</dd></div>
            <div><dt>Role / Function:</dt><dd>${sys.role}</dd></div>
          </dl>
        </div>

        <div class="inspector-section">
          <h4>Open Ports &amp; Services (${sys.ports?.length || 0})</h4>
          <table class="zenmap-ports-table">
            <thead>
              <tr>
                <th>PORT</th>
                <th>STATE</th>
                <th>SERVICE</th>
                <th>VERSION</th>
              </tr>
            </thead>
            <tbody>
              ${portsHtml || `<tr><td colspan="4">No open ports detected</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="inspector-section">
          <h4>Network Topology Path</h4>
          <div class="traceroute-bar">
            <span class="trace-node active">demicube-testbox</span>
            ${sys.hops > 1 ? `<span class="trace-arrow">➔</span><span class="trace-node">gateway-router</span>` : ""}
            ${sys.hops > 0 ? `<span class="trace-arrow">➔</span><span class="trace-node target">${sys.hostname}</span>` : ""}
          </div>
        </div>
      </div>
    `;

    this.hostInspector.querySelector("#inspector-btn-ssh")?.addEventListener("click", () => {
      const user = sys.user || "admin";
      if (this.terminal) {
        this.terminal.submitCommand(`ssh ${user}@${sys.ip}`);
      } else {
        this.connectViaSSH(sys.ip, user);
      }
    });

    this.hostInspector.querySelector("#inspector-btn-scan")?.addEventListener("click", () => {
      if (this.terminal) {
        this.terminal.submitCommand(`zenmap scan ${sys.ip}`);
      } else {
        this.triggerScan();
      }
    });
  }

  renderHostsTable() {
    const tableBody = this.window?.querySelector("#zenmap-hosts-tbody");
    if (!tableBody) return;

    const systems = this.getFilteredSystems();
    tableBody.innerHTML = systems
      .map((sys) => {
        const isSelected = sys.id === this.selectedHostId;
        const isLocal = sys.type === "localhost" || sys.id === "demicube-testbox";
        const portsSummary = (sys.ports || []).map((p) => `${p.port}/${p.service}`).join(", ");

        return `
        <tr class="zenmap-table-row ${isSelected ? "selected" : ""}" data-table-host="${sys.id}">
          <td><strong>${sys.hostname}</strong></td>
          <td><code>${sys.ip}</code></td>
          <td><span class="status-pill online">Up</span></td>
          <td>${sys.latency}</td>
          <td><small>${portsSummary || "None"}</small></td>
          <td>${sys.os}</td>
          <td>${sys.role}</td>
          <td>
            <button class="zenmap-mini-btn inspect-btn" data-action-inspect="${sys.id}" title="Inspect in topology [CLI: zenmap inspect ${sys.hostname}]">Inspect</button>
            ${!isLocal ? `<button class="zenmap-mini-btn ssh-btn" data-action-ssh="${sys.ip}" title="SSH connect [CLI: zenmap ssh ${sys.ip}]">SSH</button>` : ""}
            ${!isLocal ? `<button class="zenmap-mini-btn remove-btn" data-action-rm="${sys.id}" title="Remove host [CLI: zenmap rm ${sys.hostname}]">Rm</button>` : ""}
          </td>
        </tr>
      `;
      })
      .join("");

    tableBody.querySelectorAll("[data-action-inspect]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const hostId = btn.dataset.actionInspect;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap inspect " + hostId);
        } else {
          this.selectHost(hostId);
          this.switchTab("topology");
        }
      });
    });

    tableBody.querySelectorAll("[data-action-ssh]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const ip = btn.dataset.actionSsh;
        if (this.terminal) {
          this.terminal.submitCommand("ssh admin@" + ip);
        } else {
          this.connectViaSSH(ip);
        }
      });
    });

    tableBody.querySelectorAll("[data-action-rm]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const hostId = btn.dataset.actionRm;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap rm " + hostId);
        } else {
          this.removeHost(hostId);
        }
      });
    });

    tableBody.querySelectorAll("[data-table-host]").forEach((row) => {
      row.addEventListener("click", () => {
        const hostId = row.dataset.tableHost;
        if (this.terminal) {
          this.terminal.submitCommand("zenmap inspect " + hostId);
        } else {
          this.selectHost(hostId);
        }
      });
    });
  }

  renderServices() {
    const servicesContainer = this.window?.querySelector("#zenmap-services-list");
    if (!servicesContainer) return;

    const all = Array.from(this.currentHosts.values());
    const serviceMap = new Map();

    for (const sys of all) {
      for (const p of sys.ports || []) {
        const key = `${p.port}/${p.service}`;
        if (!serviceMap.has(key)) {
          serviceMap.set(key, {
            port: p.port,
            protocol: p.protocol,
            service: p.service,
            version: p.version,
            hosts: []
          });
        }
        serviceMap.get(key).hosts.push(sys);
      }
    }

    if (serviceMap.size === 0) {
      servicesContainer.innerHTML = `<div class="inspector-empty">No services mapped. Run 'zenmap scan' to discover services.</div>`;
      return;
    }

    servicesContainer.innerHTML = [...serviceMap.values()]
      .map(
        (s) => `
      <div class="service-card">
        <div class="service-card-header">
          <div>
            <strong class="service-port">${s.port}/${s.protocol}</strong>
            <span class="service-name">${s.service.toUpperCase()}</span>
          </div>
          <span class="service-count">${s.hosts.length} Host(s)</span>
        </div>
        <p class="service-version">${s.version || "Standard service"}</p>
        <div class="service-hosts">
          ${s.hosts
            .map(
              (h) => `
            <button class="service-host-chip" data-chip-host="${h.id}" title="Inspect host [CLI: zenmap inspect ${h.hostname}]">
              ${h.hostname} (${h.ip})
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `
      )
      .join("");

    servicesContainer.querySelectorAll("[data-chip-host]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectHost(btn.dataset.chipHost);
        this.switchTab("topology");
      });
    });
  }

  renderNmapOutput() {
    const outputEl = this.window?.querySelector("#zenmap-raw-output");
    if (!outputEl) return;

    const systems = Array.from(this.currentHosts.values());
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    let report = [
      `Starting Nmap 7.94 ( https://nmap.org ) at ${now} UTC`,
      `NSE: Loaded 153 scripts for scanning.`,
      `Initiating ARP & ICMP Sweep at ${now.substring(11)}`,
      `Scanning ${systems.length} hosts [4 ports/host]`,
      `Completed ARP Ping Scan at ${now.substring(11)}, 0.12s elapsed (${systems.length} total hosts)`
    ];

    for (const sys of systems) {
      report.push("");
      report.push(`Nmap scan report for ${sys.hostname} (${sys.ip})`);
      report.push(`Host is up (${sys.latency} latency).`);
      report.push(`MAC Address: ${sys.mac || "08:00:27:XX:XX:XX"}`);
      report.push(`PORT     STATE SERVICE    VERSION`);
      for (const p of sys.ports || []) {
        const pStr = `${p.port}/${p.protocol}`.padEnd(8);
        const sStr = p.state.padEnd(6);
        const servStr = p.service.padEnd(10);
        report.push(`${pStr} ${sStr} ${servStr} ${p.version || ""}`);
      }
      report.push(`OS details: ${sys.os}`);
      report.push(`Network Distance: ${sys.hops} hop(s)`);
    }

    report.push("");
    report.push(`Nmap done: ${systems.length} IP addresses (${systems.length} hosts up) scanned in 1.48 seconds`);

    outputEl.textContent = report.join("\n");
  }

  // ---------------------------------------------------------------------------
  // Terminal CLI Integration
  // Every GUI button/action is executable via: `zenmap <subcommand>`
  // ---------------------------------------------------------------------------

  executeCli(args, terminal) {
    if (!terminal) return;
    if (!terminal.appendLine && terminal.ui?.appendTerminalLine) {
      terminal.appendLine = (line) => terminal.ui.appendTerminalLine(line);
    }
    if (!args || args.length === 0) {
      // Default: Launch / Focus GUI and display quick status
      if (terminal.launchProgram) terminal.launchProgram("zenmap");
      this.start();
      const hostCount = this.currentHosts.size;
      const savePath = this.getActiveSavePath();
      terminal.appendLine(`Opened Zenmap 7.94 (Network Topology Mapper)`);
      if (this.hasSaveData()) {
        terminal.appendLine(`Database: ${savePath} (${hostCount} host${hostCount === 1 ? "" : "s"} loaded)`);
      } else {
        terminal.appendLine(`[zenmap] Note: ${savePath} not found. Operating with local host only.`);
        terminal.appendLine(`[zenmap] Type 'zenmap scan' to discover targets and save database.`);
      }
      terminal.appendLine(`Every GUI button is runnable in terminal! Type 'zenmap help' for CLI reference.`);
      return;
    }

    const sub = args[0].toLowerCase();

    switch (sub) {
      case "help":
      case "--help":
      case "-h":
        terminal.appendLine("========================================================================");
        terminal.appendLine("ZENMAP CLI COMMAND REFERENCE (Controls GUI & Database)");
        terminal.appendLine("========================================================================");
        terminal.appendLine("  zenmap                   Open and focus the Zenmap window");
        terminal.appendLine("  zenmap open / gui        Bring Zenmap GUI to front");
        terminal.appendLine("  zenmap close / exit      Minimize or hide Zenmap window");
        terminal.appendLine("  zenmap scan [target]     Execute network scan & save to /documents/zenmap/savedata.ini");
        terminal.appendLine("  zenmap rescan [host]     Rescan target or selected host");
        terminal.appendLine("  zenmap tab <name>        Switch view: topology | hosts | services | output");
        terminal.appendLine("  zenmap layout <mode>     Switch topology layout: radial | tree | toggle");
        terminal.appendLine("  zenmap filter <subnet>   Filter hosts: all | local | internal | remote");
        terminal.appendLine("  zenmap zoom <in|out|fit> Zoom canvas in, out, or fit to screen");
        terminal.appendLine("  zenmap inspect <host>    Select host in GUI and print full specs in terminal");
        terminal.appendLine("  zenmap ssh <host|ip>     Initiate SSH connection to target host");
        terminal.appendLine("  zenmap target <cidr>     Update target subnet specification");
        terminal.appendLine("  zenmap profile <name>    Set scan profile: intense | quick | ping | regular");
        terminal.appendLine("  zenmap list / ls         Print formatted ASCII table of all mapped hosts");
        terminal.appendLine("  zenmap add <ip> <host>   Add a discovered host and persist to savedata.ini");
        terminal.appendLine("  zenmap rm <host|ip>      Remove host from database and savedata.ini");
        terminal.appendLine("  zenmap clear             Clear remote hosts (leaves only localhost)");
        terminal.appendLine("  zenmap status            Display GUI state, active tab, and savefile status");
        terminal.appendLine("========================================================================");
        return;

      case "open":
      case "gui":
      case "show":
        if (terminal.launchProgram) terminal.launchProgram("zenmap");
        this.start();
        terminal.appendLine(`Zenmap window opened and focused.`);
        return;

      case "close":
      case "exit":
      case "hide":
      case "min":
      case "minimize":
        this.ui.setWindowVisible("zenmap", false);
        terminal.appendLine(`Zenmap window minimized.`);
        return;

      case "scan":
        if (args[1]) {
          this.currentSettings.target = args.slice(1).join(" ");
          if (this.targetInput) this.targetInput.value = this.currentSettings.target;
        }
        terminal.appendLine(`[zenmap] Triggering network sweep...`);
        this.triggerScan(terminal);
        return;

      case "rescan":
        terminal.appendLine(`[zenmap] Rescanning target '${args[1] || this.selectedHostId}'...`);
        this.triggerScan(terminal);
        return;

      case "tab": {
        const targetTab = (args[1] || "").toLowerCase();
        const tabMap = {
          top: "topology",
          topology: "topology",
          host: "hosts",
          hosts: "hosts",
          serv: "services",
          services: "services",
          out: "nmap-output",
          output: "nmap-output",
          raw: "nmap-output"
        };
        const resolvedTab = tabMap[targetTab];
        if (!resolvedTab) {
          terminal.appendLine(`Usage: zenmap tab <topology | hosts | services | output>`);
          return;
        }
        this.switchTab(resolvedTab);
        terminal.appendLine(`[zenmap] Switched to '${resolvedTab}' view.`);
        return;
      }

      case "topology":
      case "hosts":
      case "services":
      case "output":
        this.switchTab(sub === "output" ? "nmap-output" : sub);
        terminal.appendLine(`[zenmap] Switched to '${sub}' view.`);
        return;

      case "layout": {
        const mode = (args[1] || "").toLowerCase();
        if (mode === "radial" || mode === "tree") {
          this.setLayout(mode);
          terminal.appendLine(`[zenmap] Layout set to '${mode}'.`);
        } else if (mode === "toggle") {
          const next = this.layoutMode === "radial" ? "tree" : "radial";
          this.setLayout(next);
          terminal.appendLine(`[zenmap] Layout toggled to '${next}'.`);
        } else {
          terminal.appendLine(`Usage: zenmap layout <radial | tree | toggle> (currently: ${this.layoutMode})`);
        }
        return;
      }

      case "filter": {
        const f = (args[1] || "").toLowerCase();
        const filterMap = {
          all: "all",
          local: "192.168.56.0/24",
          lan: "192.168.56.0/24",
          "192.168.56.0/24": "192.168.56.0/24",
          internal: "10.0.0.0/16",
          "10.0.0.0/16": "10.0.0.0/16",
          corporate: "10.10.10.0/24",
          work: "10.10.10.0/24",
          "10.10.10.0/24": "10.10.10.0/24",
          p2p: "10.9.0.0/24",
          peer: "10.9.0.0/24",
          "10.9.0.0/24": "10.9.0.0/24",
          remote: "remote",
          wan: "remote"
        };
        const resolvedFilter = filterMap[f];
        if (!resolvedFilter) {
          terminal.appendLine(`Usage: zenmap filter <all | local | internal | corporate | p2p | remote>`);
          return;
        }
        this.setFilter(resolvedFilter);
        terminal.appendLine(`[zenmap] Filter set to '${resolvedFilter}'. Showing ${this.getFilteredSystems().length} hosts.`);
        return;
      }

      case "zoom": {
        const action = (args[1] || "").toLowerCase();
        if (action === "in" || action === "+") {
          this.zoom(0.2);
          terminal.appendLine(`[zenmap] Zoom in (${Math.round(this.zoomLevel * 100)}%).`);
        } else if (action === "out" || action === "-") {
          this.zoom(-0.2);
          terminal.appendLine(`[zenmap] Zoom out (${Math.round(this.zoomLevel * 100)}%).`);
        } else if (action === "reset" || action === "fit" || action === "0") {
          this.resetZoom();
          terminal.appendLine(`[zenmap] Zoom reset to 100%.`);
        } else {
          terminal.appendLine(`Usage: zenmap zoom <in | out | fit> (current: ${Math.round(this.zoomLevel * 100)}%)`);
        }
        return;
      }

      case "inspect":
      case "select": {
        const query = args[1];
        if (!query) {
          terminal.appendLine(`Usage: zenmap inspect <hostname | ip>`);
          return;
        }
        const host = this.findHost(query);
        if (!host) {
          terminal.appendLine(`Host '${query}' not found in Zenmap database.`);
          return;
        }
        this.selectHost(host.id);
        this.switchTab("topology");
        terminal.appendLine("========================================================================");
        terminal.appendLine(`ZENMAP HOST INSPECTOR: ${host.hostname} (${host.ip}) [${host.status.toUpperCase()}]`);
        terminal.appendLine("========================================================================");
        terminal.appendLine(`Role: ${host.role} | Type: ${host.type}`);
        terminal.appendLine(`Subnet: ${host.subnet} | Hops: ${host.hops} | Latency: ${host.latency} | MAC: ${host.mac}`);
        terminal.appendLine(`OS & Kernel: ${host.os}`);
        terminal.appendLine("Open Ports & Services:");
        for (const p of host.ports || []) {
          terminal.appendLine(`  • ${p.port}/${p.protocol}`.padEnd(14) + `${p.state.toUpperCase()}`.padEnd(8) + `${p.service}`.padEnd(12) + (p.version || ""));
        }
        terminal.appendLine(`Topology Route: demicube-testbox ➔ ${host.hops > 1 ? "gateway-router ➔ " : ""}${host.hostname}`);
        terminal.appendLine("========================================================================");
        return;
      }

      case "ssh":
      case "connect": {
        const query = args[1];
        if (!query) {
          terminal.appendLine(`Usage: zenmap ssh <hostname | ip>`);
          return;
        }
        const host = this.findHost(query);
        const ip = host ? host.ip : query;
        terminal.appendLine(`[zenmap] Connecting to ${ip} via SSH...`);
        terminal.submitCommand(`ssh admin@${ip}`);
        return;
      }

      case "target":
        if (args.length > 1) {
          this.currentSettings.target = args.slice(1).join(" ");
          if (this.targetInput) this.targetInput.value = this.currentSettings.target;
          this.saveToDisk();
          terminal.appendLine(`[zenmap] Target updated to: ${this.currentSettings.target}`);
        } else {
          terminal.appendLine(`Current target: ${this.currentSettings.target}`);
        }
        return;

      case "profile":
        if (args[1]) {
          this.currentSettings.profile = args[1];
          if (this.profileSelect) this.profileSelect.value = args[1];
          this.saveToDisk();
          terminal.appendLine(`[zenmap] Profile set to: ${args[1]}`);
        } else {
          terminal.appendLine(`Current profile: ${this.currentSettings.profile}`);
        }
        return;

      case "add": {
        if (args.length < 3) {
          terminal.appendLine(`Usage: zenmap add <ip> <hostname> [role] [os]`);
          terminal.appendLine(`Example: zenmap add 10.0.9.1 backup-server "NFS Backup" "Debian 12"`);
          return;
        }
        const ip = args[1];
        const hostname = args[2];
        const role = args[3] || "Discovered Workstation";
        const os = args[4] || "Linux";
        const host = this.addHost({ ip, hostname, role, os });
        terminal.appendLine(`[zenmap] Added host '${hostname}' (${ip}) to ${this.getActiveSavePath()}`);
        return;
      }

      case "remove":
      case "rm": {
        const query = args[1];
        if (!query) {
          terminal.appendLine(`Usage: zenmap rm <hostname | ip>`);
          return;
        }
        const target = this.findHost(query);
        if (!target) {
          terminal.appendLine(`Host '${query}' not found.`);
          return;
        }
        if (target.id === "demicube-testbox") {
          terminal.appendLine(`Cannot remove localhost (demicube-testbox).`);
          return;
        }
        this.removeHost(target.id);
        terminal.appendLine(`[zenmap] Removed host '${target.hostname}' (${target.ip}) from database.`);
        return;
      }

      case "clear":
        this.clearHosts();
        terminal.appendLine(`[zenmap] Cleared all remote hosts. Localhost remains.`);
        return;

      case "list":
      case "ls": {
        const hosts = Array.from(this.currentHosts.values());
        terminal.appendLine(`ZENMAP NETWORK TARGET INDEX (${hosts.length} hosts)`);
        terminal.appendLine("--------------------------------------------------------------------------------");
        terminal.appendLine("HOSTNAME".padEnd(24) + "IP ADDRESS".padEnd(18) + "STATUS".padEnd(10) + "LATENCY".padEnd(10) + "SUBNET");
        terminal.appendLine("--------------------------------------------------------------------------------");
        for (const h of hosts) {
          const isMe = h.id === "demicube-testbox" ? " (You)" : "";
          terminal.appendLine(
            (h.hostname + isMe).padEnd(24) +
            h.ip.padEnd(18) +
            h.status.toUpperCase().padEnd(10) +
            h.latency.padEnd(10) +
            h.subnet
          );
        }
        terminal.appendLine("--------------------------------------------------------------------------------");
        terminal.appendLine(`Data file: ${this.getActiveSavePath()} (${this.hasSaveData() ? "EXISTS" : "MISSING - Localhost fallback"})`);
        return;
      }

      case "status": {
        const netState = playerNetworkState.getState();
        const tun0 = netState.activeInterfaces.tun0;
        terminal.appendLine("Zenmap 7.94 Engine Status:");
        terminal.appendLine(`  Active Tab:      ${this.activeTab}`);
        terminal.appendLine(`  Layout Mode:     ${this.layoutMode}`);
        terminal.appendLine(`  Subnet Filter:   ${this.filterSubnet}`);
        terminal.appendLine(`  Selected Host:   ${this.selectedHostId}`);
        terminal.appendLine(`  Loaded Hosts:    ${this.currentHosts.size}`);
        terminal.appendLine(`  Database File:   ${this.getActiveSavePath()} [${this.hasSaveData() ? "OK" : "NOT FOUND"}]`);
        terminal.appendLine(`  Target Subnets:  ${this.currentSettings.target}`);
        terminal.appendLine(`  Scan Profile:    ${this.currentSettings.profile}`);
        terminal.appendLine(
          `  Network Adapter: ${tun0 ? `tun0 (${tun0.ip}) [${netState.vpnMode} MODE]` : `eth0 (${netState.activeInterfaces.eth0.ip}) [PHYSICAL]`}`
        );
        terminal.appendLine(`  Public IP:       ${netState.publicIP} ${netState.vpnMode === "CONSUMER" ? "[ANON]" : ""}`);
        return;
      }

      default:
        terminal.appendLine(`Unknown zenmap command '${sub}'. Type 'zenmap help' for valid options.`);
    }
  }
}
