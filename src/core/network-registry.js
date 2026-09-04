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

  createBaseFs(now, hostname, ip, extraFiles = {}) {
    const fs = new FileSystem([], null);
    fs.mkdir("/home/admin");
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
      getFileSystem: () => this.localFileSystem
    });

    // 2. STEVE'S TESTBOX (steves-testbox) - Requested by user
    const stevesTestboxFs = this.createBaseFs(now, "steves-testbox", "192.168.56.108", {
      "/home/admin/notes.txt": [
        "============================================================",
        "STEVE'S TESTBOX - LAB SANDBOX & SECURITY TESTBED",
        "Host: steves-testbox (192.168.56.108)",
        "============================================================",
        "",
        "Sandbox initialized for network topology testing and log validation.",
        "",
        "Connected Nodes in Cluster:",
        "  - demicube-testbox (192.168.56.101) [Local Security Workstation]",
        "  - gateway-router   (192.168.56.1)   [Core Subnet Gateway]",
        "  - fileserver-01    (192.168.56.20)  [NFS / Storage Share]",
        "  - web-gateway-01   (192.168.56.80)  [Nginx Web Proxy]",
        "  - db-cluster-node1 (10.0.2.15)      [Internal Database Node]",
        "  - lab-workstation-03 (10.0.3.42)    [Compilation Rig]",
        "  - steves-computer  (11.6.0.7)       [External Workstation]",
        "  - satellite-uplink-relay (172.16.5.42) [Ground Station Collector]",
        "",
        "All systems mapped in Zenmap topology engine."
      ].join("\n"),
      "/home/admin/scan_network.py": [
        "#!/usr/bin/env python3",
        "# Steve's Quick Subnet Scanner",
        "import socket",
        "import sys",
        "",
        "subnets = ['192.168.56.0/24', '10.0.0.0/16', '172.16.5.0/24']",
        "print('=' * 50)",
        "print('STEVE-NET PROBE: Initiating Multi-Subnet ARP/Ping Sweep')",
        "print('=' * 50)",
        "for net in subnets:",
        "    print(f'[*] Scanning subnet: {net}...')",
        "    print(f'    [+] Discovered active hosts on {net}')",
        "print('[*] Multi-subnet scan completed. 9 active nodes registered.')",
        "print('[*] View visual node topology in Zenmap GUI.')"
      ].join("\n"),
      "/home/admin/deploy.sh": [
        "#!/bin/bash",
        "# Deploy Sandbox Testing Environment",
        "echo '[+] Deploying sandbox testing services on steves-testbox...'",
        "echo '[+] Testing uplink ping to demicube-testbox (192.168.56.101)... OK (0.8ms)'",
        "echo '[+] Testing gateway ping to 192.168.56.1... OK (0.3ms)'",
        "echo '[+] Steve-testbox services nominal.'",
        "exit 0"
      ].join("\n"),
      "/home/admin/benchmark.py": [
        "import time, math",
        "print('Testing I/O and cryptographic throughput on steves-testbox...')",
        "t0 = time.time()",
        "for i in range(50000):",
        "    _ = math.sqrt(i) * math.sin(i)",
        "elapsed = time.time() - t0",
        "print(f'Synthetic test finished in {elapsed:.4f}s. Performance Index: 9840.')"
      ].join("\n"),
      "/home/admin/TODO.md": [
        "# Steve's Priority Tasks",
        "- [x] Provision steves-testbox on subnet 192.168.56.0/24",
        "- [x] Deploy Zenmap network node topology viewer on demicube-testbox",
        "- [ ] Test SSH hopping across all 9 mapped systems",
        "- [ ] Verify anti-forensic log sanitization workflows",
        "- [ ] Benchmark network throughput with lab-workstation-03"
      ].join("\n"),
      "/documents/lab-topology.txt": [
        "DEMICUBE NETWORK LAB TOPOLOGY SPECIFICATION",
        "Subnet 192.168.56.0/24 (Local Development Testbed):",
        "  192.168.56.1   - gateway-router",
        "  192.168.56.20  - fileserver-01",
        "  192.168.56.80  - web-gateway-01",
        "  192.168.56.101 - demicube-testbox",
        "  192.168.56.108 - steves-testbox",
        "",
        "Subnet 10.0.0.0/16 (Corporate Internal Cluster):",
        "  10.0.2.15      - db-cluster-node1",
        "  10.0.3.42      - lab-workstation-03",
        "",
        "External WAN & Satellite Links:",
        "  11.6.0.7       - steves-computer",
        "  172.16.5.42    - satellite-uplink-relay"
      ].join("\n"),
      "/documents/security-runbook.md": [
        "# Security Audit Runbook",
        "1. Inspect active SSH connections: `sessions` or `session`",
        "2. Check authentication logs: `cat /var/log/auth.log`",
        "3. Review executed command history: `cat ~/.bash_history`",
        "4. Verify all subnet hosts in Zenmap topology display"
      ].join("\n"),
      "/programs/net-probe.bin": "[BIN: Network Probe Daemon v1.4]",
      "/programs/steve-tool.bin": "[BIN: Steve Automation Utility]"
    });

    stevesTestboxFs.write(
      "/home/admin/.bash_history",
      "whoami\nls -la\ncat notes.txt\npython3 scan_network.py\nnano deploy.sh\nssh admin@demicube-testbox\n"
    );

    this.register({
      id: "steves-testbox",
      hostname: "steves-testbox",
      ip: "192.168.56.108",
      mac: "08:00:27:3A:C7:29",
      subnet: "192.168.56.0/24",
      role: "Steve's Sandbox & Lab Testbed",
      type: "workstation",
      category: "local",
      os: "Ubuntu 24.04 LTS (Kernel 6.8.0-generic)",
      status: "online",
      latency: "0.8ms",
      hops: 1,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.3p1 Ubuntu", state: "open" },
        { port: 5000, protocol: "tcp", service: "upnp / test", version: "Python SimpleHTTP/0.6", state: "open" },
        { port: 8080, protocol: "tcp", service: "http-alt", version: "Gunicorn 21.2.0 (Flask app)", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => stevesTestboxFs
    });

    // 3. GATEWAY ROUTER (gateway-router)
    const routerFs = this.createBaseFs(now, "gateway-router", "192.168.56.1", {
      "/etc/iptables.rules": [
        "# Firewall NAT & Forwarding Rules - gateway-router",
        "*filter",
        ":INPUT ACCEPT [0:0]",
        ":FORWARD ACCEPT [0:0]",
        ":OUTPUT ACCEPT [0:0]",
        "-A FORWARD -s 192.168.56.0/24 -d 10.0.0.0/16 -j ACCEPT",
        "-A FORWARD -s 192.168.56.0/24 -d 172.16.5.0/24 -j ACCEPT",
        "COMMIT"
      ].join("\n"),
      "/etc/hosts": [
        "127.0.0.1 localhost",
        "192.168.56.1 gateway-router",
        "192.168.56.101 demicube-testbox",
        "192.168.56.108 steves-testbox",
        "192.168.56.20 fileserver-01",
        "192.168.56.80 web-gateway-01",
        "10.0.2.15 db-cluster-node1",
        "10.0.3.42 lab-workstation-03",
        "11.6.0.7 steves-computer",
        "172.16.5.42 satellite-uplink-relay"
      ].join("\n"),
      "/home/admin/route_status.sh": "#!/bin/sh\nip route show\narp -a\n"
    });

    this.register({
      id: "gateway-router",
      hostname: "gateway-router",
      ip: "192.168.56.1",
      mac: "00:50:56:FE:10:01",
      subnet: "192.168.56.0/24",
      role: "Core Subnet Router & Firewall Gateway",
      type: "router",
      category: "gateway",
      os: "VyOS 1.4 / Linux 6.1-router",
      status: "online",
      latency: "0.3ms",
      hops: 1,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 8.9p1 VyOS", state: "open" },
        { port: 53, protocol: "udp", service: "domain", version: "dnsmasq 2.89", state: "open" },
        { port: 80, protocol: "tcp", service: "http", version: "Lighttpd 1.4.69 (Router WebUI)", state: "open" },
        { port: 443, protocol: "tcp", service: "https", version: "Lighttpd TLS 1.3", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => routerFs
    });

    // 4. FILE SERVER (fileserver-01)
    const fileServerFs = this.createBaseFs(now, "fileserver-01", "192.168.56.20", {
      "/shares/backups/demicube-backup-info.txt": "Automated snapshot: 2026-09-03 04:00 UTC. Integrity check: PASSED.\n",
      "/shares/public/readme.txt": "Public network storage repository for Demicube OS cluster.\nMounted via NFSv4 and Samba.\n",
      "/etc/exports": "/shares/public 192.168.56.0/24(rw,sync,no_subtree_check)\n/shares/backups 192.168.56.0/24(ro,sync)\n"
    });

    this.register({
      id: "fileserver-01",
      hostname: "fileserver-01",
      ip: "192.168.56.20",
      mac: "08:00:27:61:9F:88",
      subnet: "192.168.56.0/24",
      role: "Enterprise NFS & File Storage Node",
      type: "server",
      category: "local",
      os: "TrueNAS SCALE (Debian 12 Bookworm)",
      status: "online",
      latency: "1.1ms",
      hops: 1,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.0p1 Debian", state: "open" },
        { port: 111, protocol: "tcp", service: "rpcbind", version: "2.0 (RPC #100000)", state: "open" },
        { port: 2049, protocol: "tcp", service: "nfs", version: "NFSv4.2 Network File System", state: "open" },
        { port: 445, protocol: "tcp", service: "microsoft-ds", version: "Samba 4.19.4 SMB3", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => fileServerFs
    });

    // 5. WEB GATEWAY (web-gateway-01)
    const webGatewayFs = this.createBaseFs(now, "web-gateway-01", "192.168.56.80", {
      "/var/www/html/index.html": "<!DOCTYPE html><html><head><title>Demicube Cluster Portal</title></head><body><h1>Demicube Cluster Internal Portal</h1><p>Status: All nodes operational.</p></body></html>\n",
      "/etc/nginx/nginx.conf": "events { worker_connections 1024; } http { server { listen 80; root /var/www/html; } }\n",
      "/var/log/nginx/access.log": `${now} 192.168.56.101 "GET / HTTP/1.1" 200 342 "-" "DemicubeBrowser/1.0"\n`
    });

    this.register({
      id: "web-gateway-01",
      hostname: "web-gateway-01",
      ip: "192.168.56.80",
      mac: "08:00:27:54:21:BB",
      subnet: "192.168.56.0/24",
      role: "Corporate Reverse Proxy & Web Server",
      type: "server",
      category: "local",
      os: "Alpine Linux 3.19 (Kernel 6.6-lts)",
      status: "online",
      latency: "0.9ms",
      hops: 1,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.5p1 Alpine", state: "open" },
        { port: 80, protocol: "tcp", service: "http", version: "nginx 1.25.3", state: "open" },
        { port: 443, protocol: "tcp", service: "https", version: "nginx TLS 1.3", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => webGatewayFs
    });

    // 6. STEVE'S WORKSTATION (steves-computer) - Referenced in existing missions
    const stevesComputerFs = this.createBaseFs(now, "steves-computer", "11.6.0.7", {
      "/home/admin/book_draft.txt": [
        "============================================================",
        "THE ANATOMY OF MODERN CYBER THREAT OPERATIONS",
        "Draft Manuscript - Stephen A. Miller",
        "CONFIDENTIAL - FOR INTERNAL REVIEW ONLY",
        "============================================================",
        "",
        "Chapter 1: The Invisible Battlefield",
        "",
        "Modern cyber operations are rarely won through blunt-force exploitation.",
        "Instead, success hinges on operational stealth, persistence chains, and",
        "anti-forensic discipline. When an adversary penetrates a perimeter,",
        "the telemetry recorded in authentication logs (/var/log/auth.log) and",
        "command history files (~/.bash_history) becomes the primary thread",
        "by which incident responders reconstruct the intrusion timeline.",
        "",
        "Research Note (Network Telemetry):",
        "Observed automated background beaconing targeting network relay node",
        "at IP 172.16.5.42 on port 9040. Telemetry payloads are synchronized",
        "via encrypted cron triggers."
      ].join("\n"),
      "/documents/research_notes.txt": "Network payload analysis in progress. Target uplink: 172.16.5.42.\n"
    });
    stevesComputerFs.write("/home/admin/.bash_history", "whoami\nls -la\ncat book_draft.txt\n");

    this.register({
      id: "steves-computer",
      hostname: "steves-computer",
      ip: "11.6.0.7",
      mac: "52:54:00:12:34:56",
      subnet: "11.6.0.0/24",
      role: "Steve's Personal Engineering Workstation",
      type: "workstation",
      category: "remote",
      os: "Debian 12 Bookworm (Linux 6.6.0-demicube)",
      status: "online",
      latency: "14.2ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.2p1 Debian", state: "open" },
        { port: 8443, protocol: "tcp", service: "https-alt", version: "Node.js HTTPS Admin Console", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => stevesComputerFs
    });

    // 7. DATABASE CLUSTER NODE (db-cluster-node1)
    const dbFs = this.createBaseFs(now, "db-cluster-node1", "10.0.2.15", {
      "/home/admin/schema_backup.sql": [
        "-- Database Schema Snapshot - Cluster Node 1",
        "CREATE TABLE users (id SERIAL PRIMARY KEY, username VARCHAR(64), role VARCHAR(32));",
        "CREATE TABLE system_events (id SERIAL PRIMARY KEY, event_type VARCHAR(64), created_at TIMESTAMP);",
        "INSERT INTO users (username, role) VALUES ('admin', 'sysadmin'), ('steve', 'developer');"
      ].join("\n"),
      "/etc/postgresql/16/main/postgresql.conf": "listen_addresses = '*'\nport = 5432\nmax_connections = 150\n"
    });

    this.register({
      id: "db-cluster-node1",
      hostname: "db-cluster-node1",
      ip: "10.0.2.15",
      mac: "52:54:00:AC:12:0F",
      subnet: "10.0.0.0/16",
      role: "Internal Relational Database Node",
      type: "server",
      category: "internal",
      os: "Ubuntu 22.04 LTS (PostgreSQL 16.2)",
      status: "online",
      latency: "3.4ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 8.9p1 Ubuntu", state: "open" },
        { port: 5432, protocol: "tcp", service: "postgresql", version: "PostgreSQL Database 16.2", state: "open" },
        { port: 9100, protocol: "tcp", service: "prometheus-node-exporter", version: "Node Exporter 1.7.0", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => dbFs
    });

    // 8. LAB WORKSTATION (lab-workstation-03)
    const labFs = this.createBaseFs(now, "lab-workstation-03", "10.0.3.42", {
      "/home/admin/build_firmware.sh": "#!/bin/bash\necho 'Compiling embedded test harness...'\necho 'Build successful.'\n",
      "/home/admin/test_results.log": "Test run 402: 128 tests executed, 0 failures. All modules pass.\n"
    });

    this.register({
      id: "lab-workstation-03",
      hostname: "lab-workstation-03",
      ip: "10.0.3.42",
      mac: "52:54:00:BD:33:2A",
      subnet: "10.0.0.0/16",
      role: "Hardware Testing & Compilation Lab Rig",
      type: "workstation",
      category: "internal",
      os: "Arch Linux (Kernel 6.7.4-arch1-1)",
      status: "online",
      latency: "4.1ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.6p1 Arch", state: "open" },
        { port: 8000, protocol: "tcp", service: "http-alt", version: "SimpleHTTP Python 3.12", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => labFs
    });

    // 9. SATELLITE UPLINK RELAY (satellite-uplink-relay)
    const satelliteFs = this.createBaseFs(now, "satellite-uplink-relay", "172.16.5.42", {
      "/opt/uplink/telemetry.conf": [
        "# Ground Station G-SAT-05 Collector Configuration",
        "UPLINK_CHANNEL=4",
        "COLLECTOR_PORT=9040",
        "SYNC_INTERVAL_SEC=30",
        "SECURITY_PROFILE=GSAT-05-SECURE"
      ].join("\n"),
      "/var/log/uplink-sync.log": `${now} satellite-uplink-relay collector[9040]: Synchronized telemetry frame #8491. Signal: -62 dBm.\n`
    });

    this.register({
      id: "satellite-uplink-relay",
      hostname: "satellite-uplink-relay",
      ip: "172.16.5.42",
      mac: "02:42:AC:10:05:2A",
      subnet: "172.16.5.0/24",
      role: "Remote Ground Station & Satellite Uplink Relay",
      type: "relay",
      category: "remote",
      os: "Embedded Linux (Real-Time Preempt 6.1)",
      status: "online",
      latency: "48.7ms",
      hops: 3,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "Dropbear SSH 2022.83", state: "open" },
        { port: 9040, protocol: "tcp", service: "telemetry", version: "Ground Station Telemetry Collector 2.4", state: "open" },
        { port: 123, protocol: "udp", service: "ntp", version: "Precision Time Protocol NTPv4", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => satelliteFs
    });

    // 10. AEGIS CORPORATE GATEWAY (aegis-hq-gateway) - 10.10.10.1
    const aegisGwFs = this.createBaseFs(now, "aegis-hq-gateway", "10.10.10.1", {
      "/etc/openvpn/server.conf": [
        "port 1194",
        "proto udp",
        "dev tun0",
        "server 10.10.10.0 255.255.255.0",
        "push \"route 10.10.10.0 255.255.255.0\"",
        "cipher AES-256-GCM",
        "auth SHA512",
        "keepalive 10 120"
      ].join("\n"),
      "/var/log/openvpn.log": `${now} aegis-hq-gateway openvpn[1194]: Multi-client site-to-site gateway active. Subnet 10.10.10.0/24 routed.\n`
    });

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
        { port: 1194, protocol: "udp", service: "openvpn", version: "OpenVPN 2.6.9", state: "open" },
        { port: 443, protocol: "tcp", service: "https", version: "Aegis Security Gateway Web Admin", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => aegisGwFs
    });

    // 11. AEGIS DATABASE MASTER (aegis-db-master) - 10.10.10.15
    const aegisDbFs = this.createBaseFs(now, "aegis-db-master", "10.10.10.15", {
      "/shares/contracts/client_roster.sql": [
        "-- Aegis Corp Enterprise Client Ledger",
        "CREATE TABLE clients (id SERIAL, name VARCHAR(100), clearance VARCHAR(20), active BOOLEAN);",
        "INSERT INTO clients VALUES (1, 'Apex Orbital Logistics', 'TOP-SECRET', true);",
        "INSERT INTO clients VALUES (2, 'OmniCyber Defense', 'CONFIDENTIAL', true);",
        "INSERT INTO clients VALUES (3, 'Demicube Laboratories', 'INTERNAL', true);"
      ].join("\n"),
      "/home/admin/audit_report.txt": "Aegis security compliance check passed. All internal nodes isolated behind VPN gateway.\n"
    });

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
        { port: 5432, protocol: "tcp", service: "postgresql", version: "PostgreSQL 16.2 Enterprise", state: "open" },
        { port: 8080, protocol: "tcp", service: "http-alt", version: "Adminer Database UI 4.8.1", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => aegisDbFs
    });

    // 12. STEVE'S CORPORATE OFFICE PC (steves-office-pc) - 10.10.10.88
    const steveOfficeFs = this.createBaseFs(now, "steves-office-pc", "10.10.10.88", {
      "/home/admin/aegis_mission_notes.txt": [
        "Steve Miller - Aegis Internal Workstation",
        "-------------------------------------------",
        "Note: Corporate subnet 10.10.10.0/24 is only accessible via the VPNguard work profile.",
        "Remember to submit weekly audit hashes to aegis-db-master (10.10.10.15).",
        "All employee workstations require 2FA keys."
      ].join("\n"),
      "/documents/project_aegis.md": "# Project Aegis\nInternal security framework documentation.\n"
    });

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
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 9.6p1 Fedora", state: "open" },
        { port: 8443, protocol: "tcp", service: "https-alt", version: "Internal Aegis Telemetry Dashboard", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => steveOfficeFs
    });

    // 13. AEGIS AUTH LDAP (aegis-auth-ldap) - 10.10.10.20
    const aegisLdapFs = this.createBaseFs(now, "aegis-auth-ldap", "10.10.10.20", {
      "/etc/ldap/slapd.conf": "# OpenLDAP 2.6 Server Configuration\nrootdn \"cn=Manager,dc=aegis,dc=internal\"\n"
    });

    this.register({
      id: "aegis-auth-ldap",
      hostname: "aegis-auth-ldap",
      ip: "10.10.10.20",
      mac: "52:54:00:AE:10:20",
      subnet: "10.10.10.0/24",
      role: "Aegis Corporate Kerberos & LDAP Directory Service",
      type: "server",
      category: "corporate",
      os: "Red Hat Enterprise Linux 9.4 (Kernel 5.14)",
      status: "online",
      latency: "1.9ms",
      hops: 2,
      ports: [
        { port: 22, protocol: "tcp", service: "ssh", version: "OpenSSH 8.7p1 RHEL", state: "open" },
        { port: 389, protocol: "tcp", service: "ldap", version: "OpenLDAP 2.6.6", state: "open" },
        { port: 636, protocol: "tcp", service: "ldaps", version: "OpenLDAP SSL", state: "open" }
      ],
      user: "admin",
      getFileSystem: () => aegisLdapFs
    });

    // 14. P2P REMOTE COMPROMISED NODE (p2p-remote-node) - 10.9.0.2
    const p2pFs = this.createBaseFs(now, "p2p-remote-node", "10.9.0.2", {
      "/home/admin/p2p_payload_log.txt": [
        "============================================================",
        "P2P WireGuard Virtual Link Active",
        "Endpoint: 198.51.100.84:51820 <-> tun0 (10.9.0.1)",
        "Target Node: 10.9.0.2 [p2p-remote-node]",
        "============================================================",
        "Status: Direct Point-to-Point tunnel established.",
        "Remote root access confirmed via encrypted handshake.",
        "Target data archive unlocked at /shares/dump/exfil_data.bin"
      ].join("\n"),
      "/shares/dump/exfil_data.bin": "BINARY_PAYLOAD_EVIDENCE_DUMP_0x4F_ENCRYPTED_OK",
      "/etc/wireguard/wg0.conf": [
        "[Interface]",
        "Address = 10.9.0.2/24",
        "PrivateKey = [RESTRICTED_KEY]",
        "ListenPort = 51820",
        "",
        "[Peer]",
        "PublicKey = VGhpcy1pcy1hLWZha2Utd2lyZWd1YXJkLXBrZXk=",
        "AllowedIPs = 10.9.0.1/32"
      ].join("\n")
    });

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
    const router = systems.find((s) => s.id === "gateway-router") || systems[1];

    const nodes = systems.map((sys) => ({
      ...sys,
      isLocalhost: sys.id === localhost.id,
      isRouter: sys.id === router.id
    }));

    // Links define how each system is connected to us in the network:
    // 1. Local switch links: localhost <-> router, localhost <-> steves-testbox, localhost <-> fileserver-01, localhost <-> web-gateway-01
    // 2. Gateway links: router <-> db-cluster-node1, router <-> lab-workstation-03, router <-> steves-computer, router <-> satellite-uplink-relay
    const links = [
      { source: "demicube-testbox", target: "gateway-router", type: "trunk", latency: "0.3ms" },
      { source: "demicube-testbox", target: "steves-testbox", type: "lan", latency: "0.8ms" },
      { source: "demicube-testbox", target: "fileserver-01", type: "lan", latency: "1.1ms" },
      { source: "demicube-testbox", target: "web-gateway-01", type: "lan", latency: "0.9ms" },
      { source: "gateway-router", target: "db-cluster-node1", type: "routed", latency: "3.4ms" },
      { source: "gateway-router", target: "lab-workstation-03", type: "routed", latency: "4.1ms" },
      { source: "gateway-router", target: "steves-computer", type: "wan", latency: "14.2ms" },
      { source: "gateway-router", target: "satellite-uplink-relay", type: "uplink", latency: "48.7ms" },
      { source: "demicube-testbox", target: "aegis-hq-gateway", type: "vpn", latency: "1.2ms" },
      { source: "aegis-hq-gateway", target: "aegis-db-master", type: "corporate", latency: "2.1ms" },
      { source: "aegis-hq-gateway", target: "steves-office-pc", type: "corporate", latency: "1.8ms" },
      { source: "aegis-hq-gateway", target: "aegis-auth-ldap", type: "corporate", latency: "1.9ms" },
      { source: "demicube-testbox", target: "p2p-remote-node", type: "p2p", latency: "0.4ms" }
    ];

    return { nodes, links, localhost, router };
  }
}
