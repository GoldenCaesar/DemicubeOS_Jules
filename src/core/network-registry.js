import { FileSystem } from "./file-system.js";
import { formatSyslogDate } from "./logging-system.js";

/**
 * NetworkRegistry manages all known virtual systems across the local and remote networks.
 * Used by Zenmap for topology visualization and by LoggingSystem for SSH routing and file access.
 */
export class NetworkRegistry {
  constructor(localFileSystem = null, localSystemDefinition = null) {
    this.localFileSystem = localFileSystem;
    this.localSystemDefinition = localSystemDefinition;
    this.systems = new Map();
    this.initSystems();
  }

  createBaseFs(now, hostname, ip, extraFiles = {}, adminPassword = "3tHr90") {
    const fs = new FileSystem([], null);
    fs.mkdir("/home/admin", "admin", "admin", "750");
    fs.mkdir("/home/admin/.ssh", "admin", "admin", "700");
    fs.mkdir("/home/admin/.ssh/pbk", "admin", "admin", "700");
    fs.mkdir("/home/admin/.ssh/known_hosts", "admin", "admin", "700");
    fs.write(`/home/admin/.ssh/pbk/admin.key`, [
      "[ssh_key]",
      "username=admin",
      `ip=${ip}`,
      `password=${adminPassword}`
    ].join("\n"), "admin", "admin", "600");

    if (hostname === "demicube-testbox" || ip === "192.168.56.101") {
      fs.mkdir("/home/test_user", "test_user", "users", "750");
      fs.mkdir("/home/test_user/.ssh", "test_user", "users", "700");
      fs.mkdir("/home/test_user/.ssh/pbk", "test_user", "users", "700");
      fs.mkdir("/home/test_user/.ssh/known_hosts", "test_user", "users", "700");
      fs.write(`/home/test_user/.ssh/pbk/test_user.key`, [
        "[ssh_key]",
        "username=test_user",
        `ip=${ip}`,
        "password=password123"
      ].join("\n"), "test_user", "users", "600");
    }

    fs.mkdir("/var");
    fs.mkdir("/var/log");
    fs.mkdir("/documents");
    fs.mkdir("/programs");
    fs.mkdir("/dev");
    fs.mkdir("/etc");

    fs.write("/dev/null", "");
    fs.write(
      "/var/log/auth.log",
      `${now} ${hostname} systemd-logind[410]: New session c1 of user admin.\n${now} ${hostname} sshd[842]: Server listening on 0.0.0.0 port 22.\n`
    );
    fs.write(
      "/var/log/syslog",
      `${now} ${hostname} systemd[1]: Started System Logging Service.\n${now} ${hostname} NetworkManager[512]: device (eth0): IPv4 address ${ip} set\n${now} ${hostname} systemd[1]: OpenSSH daemon active and listening.\n`
    );
    fs.write("/var/log/boot.log", `System boot complete.\nHost: ${hostname} (${ip})\nKernel: Linux 6.6.0-demicube\n`);
    fs.write("/home/admin/.bash_history", "whoami\nls -la\n");

    for (const [path, content] of Object.entries(extraFiles)) {
      const parent = path.substring(0, path.lastIndexOf("/"));
      if (parent) fs.mkdir(parent);
      fs.write(path, content);
    }

    return fs;
  }

  initSystems() {
    const now = formatSyslogDate();
    const localIp = this.localSystemDefinition?.ip || "192.168.56.101";
    const localHostname = this.localSystemDefinition?.hostname || "demicube-testbox";

    if (this.localFileSystem) {
      if (!this.localFileSystem.resolve("/home/admin/.ssh/pbk")) {
        this.localFileSystem.mkdir("/home/admin/.ssh/pbk");
        this.localFileSystem.mkdir("/home/admin/.ssh/known_hosts");
        this.localFileSystem.write("/home/admin/.ssh/pbk/admin.key", "[ssh_key]\nusername=admin\nip=192.168.56.101\npassword=3tHr90\n");
      }
      if (!this.localFileSystem.resolve("/home/test_user/.ssh/pbk")) {
        this.localFileSystem.mkdir("/home/test_user/.ssh/pbk");
        this.localFileSystem.mkdir("/home/test_user/.ssh/known_hosts");
        this.localFileSystem.write("/home/test_user/.ssh/pbk/test_user.key", "[ssh_key]\nusername=test_user\nip=192.168.56.101\npassword=password123\n");
      }
    }

    // 1. LOCALHOST (demicube-testbox)
    this.register({
      id: "demicube-testbox",
      hostname: localHostname,
      ip: localIp,
      mac: "08:00:27:8B:4E:91",
      subnet: "192.168.56.0/24",
      role: "Local Security Workstation",
      type: "localhost",
      category: "local",
      os: "DemicubeOS 0.1.0 (Linux 6.6.0-demicube)",
      status: "online",
      latency: "0.0ms",
      hops: 0,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.6p1 Debian", state: "open" },
        { port: 80, protocol: "tcp", service: "http", version: "nginx 1.24.0", state: "open" },
        { port: 443, protocol: "tcp", service: "https", version: "nginx TLS 1.3", state: "closed" }
      ],
      user: "admin",
      passwords: { admin: "3tHr90", test_user: "password123" },
      getFileSystem: () => this.localFileSystem
    });

    // 2. LOCAL TEST SYSTEM (test-laptop)
    const testLaptopFs = this.createBaseFs(now, "test-laptop", "192.168.56.108", {
      "/home/admin/notes.txt": [
        "============================================================",
        "TEST-LAPTOP - LOCAL NETWORK TEST SYSTEM",
        "Host: test-laptop (192.168.56.108)",
        "============================================================",
        "",
        "Local network test node for validation and troubleshooting.",
        "Connected to local subnet 192.168.56.0/24."
      ].join("\n"),
      "/home/admin/scan.py": [
        "#!/usr/bin/env python3",
        "print('Local test-laptop scan probe active.')"
      ].join("\n")
    }, "k8L3m9");
    testLaptopFs.write("/home/admin/.bash_history", "whoami\nls -la\ncat notes.txt\n");

    this.register({
      id: "test-laptop",
      hostname: "test-laptop",
      ip: "192.168.56.108",
      mac: "08:00:27:3A:C7:29",
      subnet: "192.168.56.0/24",
      role: "Local Network Test Laptop",
      type: "workstation",
      category: "local",
      os: "Ubuntu 24.04 LTS (Kernel 6.8.0-generic)",
      status: "online",
      latency: "0.8ms",
      hops: 1,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.3p1 Ubuntu", state: "open" },
        { port: 80, protocol: "tcp", service: "http", version: "nginx 1.24.0", state: "open" }
      ],
      user: "admin",
      passwords: { admin: "k8L3m9" },
      getFileSystem: () => testLaptopFs
    });

    // 3. CONSUMER VPN ROUTING SYSTEM (consumer-vpn-node)
    const consumerVpnFs = this.createBaseFs(now, "consumer-vpn-node", "172.16.5.42", {
      "/opt/vpn/route.conf": [
        "# Consumer VPN Privacy Relay Node",
        "ROUTING_MODE=ANONYMOUS_TUNNEL",
        "EXIT_NODE=Zurich-CH"
      ].join("\n")
    }, "p4Q2w8");

    this.register({
      id: "consumer-vpn-node",
      hostname: "consumer-vpn-node",
      ip: "172.16.5.42",
      mac: "02:42:AC:10:05:2A",
      subnet: "172.16.5.0/24",
      role: "Consumer VPN Traffic Routing Relay",
      type: "relay",
      category: "remote",
      os: "Embedded Linux Relay 6.1",
      status: "online",
      latency: "24.5ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.2p1", state: "open" },
        { port: 443, protocol: "tcp", service: "https", version: "VPN Proxy Daemon 2.4", state: "open" }
      ],
      user: "admin",
      passwords: { admin: "p4Q2w8" },
      getFileSystem: () => consumerVpnFs
    });

    // 4. CORPORATE GATEWAY (aegis-hq-gateway) - 10.10.10.1
    const aegisGwFs = this.createBaseFs(now, "aegis-hq-gateway", "10.10.10.1", {
      "/etc/openvpn/server.conf": [
        "port 1194",
        "proto udp",
        "dev tun0",
        "server 10.10.10.0 255.255.255.0"
      ].join("\n")
    }, "7nB5x1");

    this.register({
      id: "aegis-hq-gateway",
      hostname: "aegis-hq-gateway",
      ip: "10.10.10.1",
      mac: "52:54:00:AE:10:01",
      subnet: "10.10.10.0/24",
      role: "Aegis Enterprise VPN Gateway & Core Firewall",
      type: "router",
      category: "corporate",
      os: "VyOS 1.4-rolling (Aegis ShieldOS 4.2)",
      status: "online",
      latency: "1.2ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.3p1", state: "open" },
        { port: 1194, protocol: "udp", service: "openvpn", version: "OpenVPN 2.6.9", state: "open" }
      ],
      user: "admin",
      passwords: { admin: "7nB5x1" },
      getFileSystem: () => aegisGwFs
    });

    // 5. CORPORATE DATABASE MASTER (aegis-db-master) - 10.10.10.15
    const aegisDbFs = this.createBaseFs(now, "aegis-db-master", "10.10.10.15", {
      "/shares/contracts/client_roster.sql": [
        "-- Aegis Corp Enterprise Client Ledger",
        "CREATE TABLE clients (id SERIAL, name VARCHAR(100), clearance VARCHAR(20), active BOOLEAN);",
        "INSERT INTO clients VALUES (1, 'Apex Orbital Logistics', 'TOP-SECRET', true);"
      ].join("\n")
    }, "d2K8s4");

    this.register({
      id: "aegis-db-master",
      hostname: "aegis-db-master",
      ip: "10.10.10.15",
      mac: "52:54:00:AE:10:15",
      subnet: "10.10.10.0/24",
      role: "Aegis Corporate Central Database Master",
      type: "server",
      category: "corporate",
      os: "Oracle Linux 9.3 (PostgreSQL 16 Enterprise)",
      status: "online",
      latency: "2.1ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 8.9p1", state: "open" },
        { port: 5432, protocol: "tcp", service: "postgresql", version: "PostgreSQL 16.2 Enterprise", state: "open" }
      ],
      user: "admin",
      passwords: { admin: "d2K8s4" },
      getFileSystem: () => aegisDbFs
    });

    // 6. STEVE'S CORPORATE OFFICE PC (steves-office-pc) - 10.10.10.88
    const steveOfficeFs = this.createBaseFs(now, "steves-office-pc", "10.10.10.88", {
      "/home/admin/aegis_mission_notes.txt": [
        "Steve Miller - Aegis Internal Workstation",
        "Note: Corporate subnet 10.10.10.0/24 accessible via VPNguard work profile."
      ].join("\n")
    }, "9vL3r6");

    this.register({
      id: "steves-office-pc",
      hostname: "steves-office-pc",
      ip: "10.10.10.88",
      mac: "08:00:27:AE:10:88",
      subnet: "10.10.10.0/24",
      role: "Steve's Aegis Corporate Workstation",
      type: "workstation",
      category: "corporate",
      os: "Fedora 40 Workstation (Linux 6.8)",
      status: "online",
      latency: "1.8ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.6p1 Fedora", state: "open" }
      ],
      user: "admin",
      passwords: { admin: "9vL3r6" },
      getFileSystem: () => steveOfficeFs
    });

    // 7. P2P REMOTE COMPROMISED NODE (p2p-remote-node) - 10.9.0.2
    const p2pFs = this.createBaseFs(now, "p2p-remote-node", "10.9.0.2", {
      "/home/admin/p2p_payload_log.txt": [
        "============================================================",
        "P2P WireGuard Virtual Link Active",
        "Endpoint: 198.51.100.84:51820 <-> tun0 (10.9.0.1)",
        "Target Node: 10.9.0.2 [p2p-remote-node]",
        "============================================================"
      ].join("\n")
    }, "4mX7z2");

    this.register({
      id: "p2p-remote-node",
      hostname: "p2p-remote-node",
      ip: "10.9.0.2",
      mac: "08:00:27:P2:09:02",
      subnet: "10.9.0.0/24",
      role: "Direct P2P Remote Target Node",
      type: "server",
      category: "p2p",
      os: "Kali Linux 2024.1 (Linux 6.6)",
      status: "online",
      latency: "0.4ms",
      hops: 1,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.6p1 Debian", state: "open" },
        { port: 9999, protocol: "tcp", service: "debug-terminal", version: "Demicube Remote Debug Shell 1.0", state: "open" }
      ],
      user: "admin",
      passwords: { admin: "4mX7z2" },
      getFileSystem: () => p2pFs
    });
  }

  register(system) {
    this.systems.set(system.id, system);
    this.systems.set(system.hostname, system);
    this.systems.set(system.ip, system);
  }

  getSystem(identifier) {
    if (!identifier) return null;
    return this.systems.get(identifier.trim()) || null;
  }

  getLocalSystem() {
    const systems = this.getAllUniqueSystems();
    return systems.find((s) => s.type === "localhost") || this.getSystem("demicube-testbox") || null;
  }

  getAllUniqueSystems() {
    // Unique systems by id
    const seen = new Set();
    const list = [];
    for (const sys of this.systems.values()) {
      if (!seen.has(sys.id)) {
        seen.add(sys.id);
        list.push(sys);
      }
    }
    return list;
  }

  getDiscoveredSystems() {
    return this.getAllUniqueSystems();
  }

  // Network connections graph for topology visualization
  getTopologyGraph() {
    const systems = this.getAllUniqueSystems();
    const localhost = systems.find((s) => s.type === "localhost") || systems[0];
    const router = systems.find((s) => s.id === "aegis-hq-gateway") || localhost;

    const nodes = systems.map((sys) => ({
      ...sys,
      isLocalhost: sys.id === localhost.id,
      isRouter: sys.id === router.id
    }));

    const links = [
      { source: "demicube-testbox", target: "test-laptop", type: "lan", latency: "0.8ms" },
      { source: "demicube-testbox", target: "consumer-vpn-node", type: "wan", latency: "24.5ms" },
      { source: "demicube-testbox", target: "aegis-hq-gateway", type: "vpn", latency: "1.2ms" },
      { source: "aegis-hq-gateway", target: "aegis-db-master", type: "corporate", latency: "2.1ms" },
      { source: "aegis-hq-gateway", target: "steves-office-pc", type: "corporate", latency: "1.8ms" },
      { source: "demicube-testbox", target: "p2p-remote-node", type: "p2p", latency: "0.4ms" }
    ];

    return { nodes, links, localhost, router };
  }
}
