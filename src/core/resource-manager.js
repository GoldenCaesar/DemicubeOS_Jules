const DEFAULT_RAM = {
  system: { name: "system", baseRam: 5350, minRam: 3800, maxRam: 6900, windowId: null },
  terminal: { name: "terminal", baseRam: 750, windowId: "terminal-main" },
  files: { name: "files", baseRam: 800, windowId: "files" },
  codepad: { name: "codepad+", baseRam: 500, windowId: "codepad" },
  "clawder-python": { name: "clawder-python", baseRam: 3072, windowId: "clawder-python" },
  "music-player": { name: "music-player", baseRam: 1740, windowId: "music-player" },
  zenmap: { name: "zenmap", baseRam: 480, windowId: "zenmap" },
  vpnguard: { name: "vpnguard", baseRam: 320, windowId: "vpnguard" },
  settings: { name: "settings", baseRam: 120, windowId: "settings" },
  "task-manager": { name: "task-manager", baseRam: 250, windowId: "task-manager" }
};

export class ResourceManager {
  constructor({ totalRam = 16384, onChanged = () => {} } = {}) {
    this.totalRam = totalRam;
    this.onChanged = onChanged;
    this.processes = new Map();
    this.reset();
  }

  configureProgram(programId, ramMb) {
    if (DEFAULT_RAM[programId] && Number.isFinite(ramMb)) DEFAULT_RAM[programId].baseRam = ramMb;
  }

  setTotalRam(totalRam) {
    this.totalRam = totalRam;
    this.notify();
  }

  reset() {
    this.processes.clear();
    const systemBase = Math.round(this.totalRam * 0.32);
    this.processes.set(1, {
      pid: 1,
      ...DEFAULT_RAM.system,
      baseRam: Math.min(DEFAULT_RAM.system.baseRam, Math.max(1600, systemBase)),
      minRam: Math.min(DEFAULT_RAM.system.minRam, Math.max(1200, Math.round(this.totalRam * 0.22))),
      maxRam: Math.min(DEFAULT_RAM.system.maxRam, Math.round(this.totalRam * 0.42))
    });
    this.notify();
  }

  define(pid, programId) {
    const definition = DEFAULT_RAM[programId];
    if (!definition) return null;
    return { pid, ...definition };
  }

  get(pid) {
    return this.processes.get(pid) || null;
  }

  list() {
    return [...this.processes.values()];
  }

  windowTextRam(process) {
    if (!process.windowId || !process.visible || typeof process.getWindowText !== "function") return 0;
    const textLength = process.getWindowText().length;
    // Scale window text content to a realistic dynamic RAM footprint (MB).
    // Large graphical/diagnostic applications (like Zenmap with network diagrams,
    // host matrices, and Nmap logs) must not treat 1 character = 1 megabyte of RAM.
    return Math.min(60, Math.round(textLength / 64));
  }

  usageOf(process) {
    const windowRam = this.windowTextRam(process);
    return {
      pid: process.pid,
      name: process.name,
      baseRam: process.baseRam,
      windowRam,
      totalRam: process.baseRam + windowRam,
      visible: Boolean(process.visible),
      windowId: process.windowId
    };
  }

  snapshot() {
    const processes = this.list().map((process) => this.usageOf(process));
    const usedRam = processes.reduce((total, process) => total + process.totalRam, 0);
    return {
      totalRam: this.totalRam,
      usedRam,
      availableRam: this.totalRam - usedRam,
      percentage: Math.min(100, usedRam / this.totalRam * 100),
      processes
    };
  }

  canStart(pid, programId, getWindowText) {
    if (this.processes.has(pid)) return true;
    const definition = this.define(pid, programId);
    if (!definition) return false;
    definition.visible = true;
    definition.getWindowText = getWindowText;
    return this.snapshotWith(definition).usedRam <= this.totalRam;
  }

  snapshotWith(candidate) {
    const processes = [...this.processes.values(), candidate].map((process) => this.usageOf(process));
    const usedRam = processes.reduce((total, process) => total + process.totalRam, 0);
    return { totalRam: this.totalRam, usedRam, availableRam: this.totalRam - usedRam, percentage: usedRam / this.totalRam * 100, processes };
  }

  start(pid, programId, { visible = true, getWindowText = () => "" } = {}) {
    if (this.processes.has(pid)) {
      this.setVisible(pid, visible, getWindowText);
      return true;
    }
    const definition = this.define(pid, programId);
    if (!definition || !this.canStart(pid, programId, getWindowText)) return false;
    definition.visible = visible;
    definition.getWindowText = getWindowText;
    this.processes.set(pid, definition);
    this.notify();
    return true;
  }

  stop(pid) {
    if (pid === 1 || !this.processes.delete(pid)) return false;
    this.notify();
    return true;
  }

  setVisible(pid, visible, getWindowText = () => "") {
    const process = this.processes.get(pid);
    if (!process) return false;
    process.visible = visible;
    process.getWindowText = getWindowText;
    this.notify();
    return true;
  }

  fluctuateSystem() {
    const system = this.processes.get(1);
    if (!system) return;
    system.baseRam = Math.max(system.minRam, Math.min(system.maxRam, system.baseRam + Math.round((Math.random() - 0.5) * 180)));
    this.notify();
  }

  notify() {
    this.onChanged(this.snapshot());
  }
}
