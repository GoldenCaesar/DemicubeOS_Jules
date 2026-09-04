import { FileSystem } from "./file-system.js";
import { NetworkRegistry } from "./network-registry.js";
import { playerNetworkState } from "./network-state.js";

export function formatSyslogDate(date = new Date()) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${month} ${day} ${hours}:${minutes}:${seconds}`;
}

export function formatSyslogTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export class LoggingSystem {
  constructor({ localFileSystem, localSystemDefinition, isSystemRunning }) {
    this.localFileSystem = localFileSystem;
    this.localSystem = localSystemDefinition || {
      hostname: "demicube-testbox",
      ip: "192.168.56.101",
      id: "192.168.56.101"
    };
    this.isSystemRunning = isSystemRunning || (() => true);

    // Initial session hop representing the local machine
    this.sessionChain = [
      {
        hostname: this.localSystem.hostname || "demicube-testbox",
        ip: this.localSystem.ip || "192.168.56.101",
        user: "admin",
        fileSystem: this.localFileSystem
      }
    ];

    // Network registry containing all mapped systems
    this.networkRegistry = new NetworkRegistry(this.localFileSystem, this.localSystem);

    // Simulated remote hosts
    this.remoteSystems = new Map();
    this.initRemoteSystems();

    // Background timer for the running system daemon (PID 1)
    this.backgroundInterval = null;
    this.daemonTick = 0;
  }

  initRemoteSystems() {
    const allSystems = this.networkRegistry.getAllUniqueSystems();
    for (const sys of allSystems) {
      if (sys.type === "localhost") continue;
      const fs = typeof sys.getFileSystem === "function" ? sys.getFileSystem() : null;
      if (!fs) continue;

      const remoteObj = {
        hostname: sys.hostname,
        ip: sys.ip,
        user: sys.user || "admin",
        passwords: sys.passwords || { admin: "3tHr90" },
        fileSystem: fs
      };

      this.remoteSystems.set(sys.id, remoteObj);
      this.remoteSystems.set(sys.hostname, remoteObj);
      this.remoteSystems.set(sys.ip, remoteObj);
    }
  }

  // Get current active session hop
  getCurrentSession() {
    return this.sessionChain[this.sessionChain.length - 1];
  }

  // Get previous session hop in the chain (for tracking SSH origin)
  getPreviousSession() {
    if (this.sessionChain.length < 2) return null;
    return this.sessionChain[this.sessionChain.length - 2];
  }

  // Returns array of all session hops
  getSessionChain() {
    return [...this.sessionChain];
  }

  isInSSHSession() {
    return this.sessionChain.length > 1;
  }

  // Get active fileSystem according to current session
  getActiveFileSystem() {
    return this.getCurrentSession().fileSystem || this.localFileSystem;
  }

  // SSH connection simulation
  connectSSH(target, user = "admin") {
    let targetHost = target.trim();
    let targetUser = user;

    if (targetHost.includes("@")) {
      const parts = targetHost.split("@");
      targetUser = parts[0] || "admin";
      targetHost = parts[1];
    }

    let remoteSystem = this.remoteSystems.get(targetHost);
    if (!remoteSystem) {
      const regSys = this.networkRegistry?.getSystem(targetHost);
      if (regSys && typeof regSys.getFileSystem === "function") {
        remoteSystem = {
          hostname: regSys.hostname,
          ip: regSys.ip,
          user: targetUser || regSys.user || "admin",
          fileSystem: regSys.getFileSystem()
        };
        this.remoteSystems.set(targetHost, remoteSystem);
        this.remoteSystems.set(regSys.hostname, remoteSystem);
        this.remoteSystems.set(regSys.ip, remoteSystem);
      }
    }

    if (!remoteSystem) {
      // Provision ad-hoc remote host
      const hostFs = this.localFileSystem?.clone ? this.localFileSystem.clone() : new FileSystem();
      const hostIp = targetHost.match(/^\d+\.\d+\.\d+\.\d+$/) ? targetHost : "172.16." + Math.floor(Math.random() * 20 + 1) + "." + Math.floor(Math.random() * 200 + 10);
      const hostName = targetHost.match(/^\d+\.\d+\.\d+\.\d+$/) ? "host-" + targetHost.replace(/\./g, "-") : targetHost;

      hostFs.mkdir("/home/" + targetUser);
      hostFs.mkdir("/var/log");
      hostFs.mkdir("/dev");
      hostFs.write("/dev/null", "");

      const now = formatSyslogDate();
      hostFs.write("/var/log/auth.log", `${now} ${hostName} systemd-logind[401]: New session c1 of user ${targetUser}.\n`);
      hostFs.write("/var/log/syslog", `${now} ${hostName} (${hostIp}): System operational. SSH daemon listening on port 22.\n`);
      hostFs.write("/home/" + targetUser + "/.bash_history", "ls -la\n");

      remoteSystem = {
        hostname: hostName,
        ip: hostIp,
        user: targetUser,
        fileSystem: hostFs
      };
      this.remoteSystems.set(targetHost, remoteSystem);
    }

    const sourceSession = this.getCurrentSession();
    const sshPid = Math.floor(Math.random() * 800 + 2400);
    const sourcePort = Math.floor(Math.random() * 15000 + 45000);
    const now = formatSyslogDate();

    // Determine the source IP to record on the target's auth.log:
    // If connecting from localhost, respect the player's network state (VPN mode):
    //  - CONSUMER VPN: randomized public IP (185.220.101.5)
    //  - VPN OFF: real home public IP (74.125.19.102)
    //  - WORK: corporate tunnel IP (10.10.10.45)
    //  - P2P: virtual peer tunnel IP (10.9.0.1)
    // If pivoting through an existing remote SSH session, use that remote machine's IP.
    const effectiveSourceIp = (this.sessionChain.length === 1)
      ? playerNetworkState.getSourceIpForTarget(remoteSystem.ip)
      : (sourceSession.sourceIp || sourceSession.ip);

    // Write accepted password log on target computer's /var/log/auth.log
    const authLogEntry = `${now} ${remoteSystem.hostname} sshd[${sshPid}]: Accepted password for ${targetUser} from ${effectiveSourceIp} port ${sourcePort} ssh2\n`;
    remoteSystem.fileSystem.append("/var/log/auth.log", authLogEntry);

    // Push new hop to session chain
    const newHop = {
      hostname: remoteSystem.hostname,
      ip: remoteSystem.ip,
      user: targetUser,
      fileSystem: remoteSystem.fileSystem,
      sshPid,
      sourcePort,
      sourceIp: effectiveSourceIp
    };
    this.sessionChain.push(newHop);

    return newHop;
  }

  logNetworkEvent(message) {
    const now = formatSyslogDate();
    const hostname = this.localSystem.hostname || "demicube-testbox";
    const syslogEntry = `${now} ${hostname} NetworkManager[524]: ${message}\n`;
    this.localFileSystem?.append("/var/log/syslog", syslogEntry);
  }

  disconnectSSH() {
    if (this.sessionChain.length <= 1) return null;

    const currentHop = this.sessionChain[this.sessionChain.length - 1];
    const previousHop = this.sessionChain[this.sessionChain.length - 2];
    const now = formatSyslogDate();

    // Log SSH disconnect on target machine
    const targetFs = currentHop.fileSystem;
    if (targetFs) {
      const pid = currentHop.sshPid || Math.floor(Math.random() * 800 + 2400);
      const port = currentHop.sourcePort || 49281;
      const disconnectLog = [
        `${now} ${currentHop.hostname} sshd[${pid}]: Received disconnect from ${previousHop.ip} port ${port}:11: disconnected by user`,
        `${now} ${currentHop.hostname} sshd[${pid}]: Disconnected from user ${currentHop.user} ${previousHop.ip} port ${port}`,
        `${now} ${currentHop.hostname} sshd[${pid}]: pam_unix(sshd:session): session closed for user ${currentHop.user}\n`
      ].join("\n");
      targetFs.append("/var/log/auth.log", disconnectLog);
    }

    return this.sessionChain.pop();
  }

  resetSessionChain() {
    this.sessionChain = [
      {
        hostname: this.localSystem.hostname || "demicube-testbox",
        ip: "10.0.0.5",
        user: "admin",
        fileSystem: this.localFileSystem
      }
    ];
  }

  // 1. Command History (/home/<user>/.bash_history)
  logCommand(rawCommand) {
    if (!rawCommand || typeof rawCommand !== "string") return;
    const trimmed = rawCommand.trim();
    if (!trimmed) return;

    const currentSession = this.getCurrentSession();
    const fs = currentSession.fileSystem || this.localFileSystem;
    const user = currentSession.user || "admin";
    const historyPath = `/home/${user}/.bash_history`;

    // Append raw command string
    fs.append(historyPath, trimmed + "\n");
  }

  // 2. Authentication Log (/var/log/auth.log)
  logAuth(event, details = {}) {
    const currentSession = this.getCurrentSession();
    const fs = details.fileSystem || currentSession.fileSystem || this.localFileSystem;
    const hostname = details.hostname || currentSession.hostname;
    const user = details.user || currentSession.user || "admin";
    const now = formatSyslogDate();

    let entry = "";
    if (event === "sudo") {
      const pwd = details.pwd || `/home/${user}`;
      let command = details.command || "";
      if (!command.startsWith("/") && !command.startsWith("./")) {
        command = "/bin/" + command;
      }
      entry = `${now} ${hostname} sudo: ${user} : TTY=pts/0 ; PWD=${pwd} ; USER=root ; COMMAND=${command}\n`;
    } else if (event === "login") {
      const pid = Math.floor(Math.random() * 500 + 400);
      entry = `${now} ${hostname} systemd-logind[${pid}]: New session c1 of user ${user}.\n` +
              `${now} ${hostname} login[${pid + 200}]: pam_unix(login:session): session opened for user ${user}(uid=1000) by (uid=0)\n`;
    } else if (event === "logout") {
      const pid = Math.floor(Math.random() * 500 + 400);
      entry = `${now} ${hostname} systemd-logind[${pid}]: Session c1 logged out. Waiting for processes to exit.\n`;
    } else if (event === "custom") {
      entry = `${now} ${hostname} ${details.service || "auth"}: ${details.message}\n`;
    }

    if (entry) {
      fs.append("/var/log/auth.log", entry);
    }
  }

  logSudo(command, pwd) {
    this.logAuth("sudo", { command, pwd });
  }

  // 3. System Log (/var/log/syslog)
  logSyslog(message, details = {}) {
    const currentSession = this.getCurrentSession();
    const fs = details.fileSystem || currentSession.fileSystem || this.localFileSystem;
    const hostname = details.hostname || currentSession.hostname;
    const ip = details.ip || currentSession.ip;
    const now = formatSyslogDate();

    const entry = details.raw
      ? `${now} ${hostname} ${message}\n`
      : `${now} ${hostname} (${ip}): ${message}\n`;

    fs.append("/var/log/syslog", entry);
  }

  // Track any file being opened, closed, or modified
  // Example: "Sep 01 19:04:21 demicube-testbox (10.0.0.05): ./music/song1.mp3 opened with ./programs/music-player.bin"
  logFileAccess(filePath, action = "opened", program = "/bin/cat") {
    const currentSession = this.getCurrentSession();
    const formattedPath = filePath.startsWith("/") ? "." + filePath : filePath;
    const formattedProgram = program.startsWith("/") || program.startsWith("./") ? program : "./programs/" + program + ".bin";
    this.logSyslog(`${formattedPath} ${action} with ${formattedProgram}`);
  }

  // Background daemon auto-logging while 'system' application (PID 1) is running
  startBackgroundDaemon() {
    if (this.backgroundInterval) return;

    const backgroundClues = [
      (h, ip) => `${h} (${ip}): Synchronizing system telemetry payload with satellite uplink G-SAT-05 (172.16.5.42)`,
      (h) => `${h} telemetry-agent[3091]: [System Telemetry] Telemetry heartbeat ACK received from remote collector 172.16.5.42:9040`,
      (h) => `${h} CRON[2145]: (root) CMD (system-integrity-check --quiet)`,
      (h) => `${h} systemd-timesyncd[380]: Synchronized with time server 10.0.0.1:123 (ntp.demicube.local).`,
      (h) => `${h} kernel: [ 3912.481900] audit: type=1400 audit(1756900800.120:45): apparmor="STATUS" operation="profile_replace"`,
      (h) => `${h} NetworkManager[524]: <info> [1756901200.41] manager: NetworkManager state is now CONNECTED_SITE`,
      (h) => `${h} systemd[1]: Starting Daily apt download activities...`,
      (h) => `${h} systemd[1]: apt-daily.service: Deactivated successfully.`
    ];

    this.backgroundInterval = setInterval(() => {
      if (!this.isSystemRunning()) return;

      const currentSession = this.getCurrentSession();
      const fs = currentSession.fileSystem || this.localFileSystem;
      const hostname = currentSession.hostname;
      const ip = currentSession.ip;
      const now = formatSyslogDate();

      const clueFn = backgroundClues[this.daemonTick % backgroundClues.length];
      const message = clueFn(hostname, ip);
      this.daemonTick++;

      fs.append("/var/log/syslog", `${now} ${message}\n`);
    }, 22000);
  }

  stopBackgroundDaemon() {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
  }
}
