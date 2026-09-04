/**
 * Global Network State Machine: PlayerNetworkState
 *
 * Implements the technical spec for the 3 VPN modes:
 *  - "OFF": Physical eth0 adapter active, real home public IP exposed (74.125.19.102).
 *  - "CONSUMER": Virtual tun0 active (10.8.0.4), randomized public IP (185.220.101.5),
 *                target auth.log records spoofed IP.
 *  - "WORK": Corporate tun0 active (10.10.10.45), unlocks Aegis corporate subnet (10.10.10.0/24).
 *  - "P2P": Direct tunnel active (10.9.0.1 -> 10.9.0.2), unlocks virtual P2P node (10.9.0.0/24).
 */

export class PlayerNetworkManager {
  constructor() {
    this.realHomePublicIP = "74.125.19.102";
    this.homeLanIP = "192.168.1.15";
    this.homeGateway = "192.168.1.1";

    this.state = {
      activeInterfaces: {
        eth0: {
          name: "eth0",
          ip: this.homeLanIP,
          gateway: this.homeGateway,
          netmask: "255.255.255.0",
          broadcast: "192.168.1.255",
          mac: "08:00:27:8B:4E:91",
          status: "UP"
        },
        tun0: null // Populated only when VPN is connected
      },
      publicIP: this.realHomePublicIP,
      vpnMode: "OFF", // "OFF", "CONSUMER", "WORK", "P2P"
      connectedProfile: null,
      connectedServer: null,
      connectedSince: null,
      bytesReceived: 124900,
      bytesSent: 84320,
      killswitch: true
    };

    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error("Error in network state listener:", err);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mode 1: Consumer Mode (Connecting to "VPNguard" Anonymous Servers)
  // ---------------------------------------------------------------------------
  setConsumerMode({
    profileId = "consumer_anonymous",
    server = "node-07.vpnguard-privacy.net (Zurich, Switzerland)",
    tunIp = "10.8.0.4",
    publicIP = "185.220.101.5",
    encryption = "ChaCha20-Poly1305"
  } = {}) {
    this.state.vpnMode = "CONSUMER";
    this.state.publicIP = publicIP;
    this.state.connectedProfile = profileId;
    this.state.connectedServer = server;
    this.state.connectedSince = new Date();
    this.state.bytesReceived += Math.floor(Math.random() * 4000 + 8000);
    this.state.bytesSent += Math.floor(Math.random() * 2000 + 4000);

    this.state.activeInterfaces.tun0 = {
      name: "tun0",
      ip: tunIp,
      gateway: "10.8.0.1",
      destination: "10.8.0.1",
      netmask: "255.255.255.0",
      type: "POINTOPOINT",
      encryption,
      server,
      status: "UP"
    };

    this.notify();
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Mode 2: Work/Remote Mode (Aegis Site-to-Site Gateway)
  // ---------------------------------------------------------------------------
  setWorkMode({
    profileId = "aegis_work",
    server = "vpn.aegis-security.internal",
    tunIp = "10.10.10.45",
    gateway = "10.10.10.1",
    targetSubnet = "10.10.10.0/24",
    encryption = "AES-256-GCM"
  } = {}) {
    this.state.vpnMode = "WORK";
    // Public IP remains home IP, but static route added for corporate subnet
    this.state.publicIP = this.realHomePublicIP;
    this.state.connectedProfile = profileId;
    this.state.connectedServer = server;
    this.state.connectedSince = new Date();
    this.state.bytesReceived += Math.floor(Math.random() * 6000 + 12000);
    this.state.bytesSent += Math.floor(Math.random() * 3000 + 6000);

    this.state.activeInterfaces.tun0 = {
      name: "tun0",
      ip: tunIp,
      gateway,
      destination: gateway,
      netmask: "255.255.255.0",
      targetSubnet,
      type: "POINTOPOINT",
      encryption,
      server,
      status: "UP"
    };

    this.notify();
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Mode 3: P2P Mode (Direct Peer-to-Peer Tunnel)
  // ---------------------------------------------------------------------------
  setP2PMode({
    profileId = "p2p_node",
    peerEndpoint = "198.51.100.84:51820",
    localIp = "10.9.0.1",
    peerIp = "10.9.0.2",
    targetSubnet = "10.9.0.0/24",
    encryption = "ChaCha20-Poly1305"
  } = {}) {
    this.state.vpnMode = "P2P";
    this.state.publicIP = this.realHomePublicIP;
    this.state.connectedProfile = profileId;
    this.state.connectedServer = `Peer ${peerIp} via ${peerEndpoint}`;
    this.state.connectedSince = new Date();
    this.state.bytesReceived += Math.floor(Math.random() * 3000 + 5000);
    this.state.bytesSent += Math.floor(Math.random() * 2000 + 3000);

    this.state.activeInterfaces.tun0 = {
      name: "tun0",
      ip: localIp,
      gateway: peerIp,
      destination: peerIp,
      peerIp,
      netmask: "255.255.255.0",
      targetSubnet,
      type: "POINTOPOINT",
      encryption,
      server: `P2P WireGuard (${peerIp})`,
      status: "UP"
    };

    this.notify();
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Disconnect / Reset to OFF
  // ---------------------------------------------------------------------------
  disconnect() {
    this.state.vpnMode = "OFF";
    this.state.publicIP = this.realHomePublicIP;
    this.state.activeInterfaces.tun0 = null;
    this.state.connectedProfile = null;
    this.state.connectedServer = null;
    this.state.connectedSince = null;

    this.notify();
    return this.state;
  }

  // ---------------------------------------------------------------------------
  // Scanner Target Lookup Helper (Developer Spec Implementation)
  // ---------------------------------------------------------------------------
  /**
   * Evaluates scannable hosts according to the active VPN state:
   *  - Always allows local home LAN (192.168.1.0/24 & 192.168.56.0/24).
   *  - Unlocks corporate office subnet (10.10.10.0/24 & 10.0.0.0/16) ONLY when vpnMode === "WORK".
   *  - Unlocks direct peer-to-peer node (10.9.0.0/24) ONLY when vpnMode === "P2P".
   *  - External targets are scannable, but if vpnMode === "CONSUMER", egress uses anonymous public IP.
   */
  getScanTargets(networkRegistry) {
    if (!networkRegistry) return [];
    const allUnique = networkRegistry.getAllUniqueSystems();

    const getHostsInSubnet = (subnetFilter) => {
      return allUnique.filter((sys) => {
        if (!sys.subnet) return false;
        return sys.subnet === subnetFilter || (sys.ip && sys.ip.startsWith(subnetFilter.replace(".0/24", ".").replace(".0/16", ".")));
      });
    };

    const scannableHosts = [];

    // Always allow scanning of local network testbed (demicube-testbox and test-laptop)
    scannableHosts.push(...getHostsInSubnet("192.168.56.0/24"));

    // Check VPN State
    if (this.state.vpnMode === "CONSUMER") {
      // Unlock the consumer VPN traffic routing node
      scannableHosts.push(...getHostsInSubnet("172.16.5.0/24"));
    } else if (this.state.vpnMode === "WORK") {
      // Unlock the secure corporate network (3 systems)
      scannableHosts.push(...getHostsInSubnet("10.10.10.0/24"));
    } else if (this.state.vpnMode === "P2P") {
      // Unlock the direct peer-to-peer node (10.9.0.2)
      scannableHosts.push(...getHostsInSubnet("10.9.0.0/24"));
    }

    // Deduplicate by host id
    const seen = new Set();
    const result = [];
    for (const host of scannableHosts) {
      if (!seen.has(host.id)) {
        seen.add(host.id);
        result.push(host);
      }
    }
    return result;
  }

  /**
   * Determines if a given IP or subnet is currently reachable based on VPN state.
   */
  isHostReachable(targetIp) {
    if (!targetIp) return false;
    const ip = targetIp.trim();

    // Local home subnet is always reachable
    if (ip.startsWith("192.168.1.") || ip.startsWith("192.168.56.") || ip === "127.0.0.1" || ip === "localhost") {
      return { reachable: true, reason: "Local Home LAN" };
    }

    // Corporate Aegis network requires WORK mode
    if (ip.startsWith("10.10.10.") || ip.startsWith("10.0.")) {
      if (this.state.vpnMode === "WORK") {
        return { reachable: true, reason: "Aegis Corporate VPN Tunnel (tun0: 10.10.10.45)" };
      }
      return {
        reachable: false,
        reason: "Network unreachable: Subnet 10.10.10.0/24 requires active Aegis Corporate VPN (VPNguard WORK mode)."
      };
    }

    // P2P direct virtual tunnel requires P2P mode
    if (ip.startsWith("10.9.0.")) {
      if (this.state.vpnMode === "P2P") {
        return { reachable: true, reason: "Direct P2P WireGuard Tunnel (tun0: 10.9.0.1)" };
      }
      return {
        reachable: false,
        reason: "Network unreachable: Subnet 10.9.0.0/24 requires active direct P2P tunnel (VPNguard P2P mode)."
      };
    }

    // External internet targets
    return { reachable: true, reason: "Public Internet WAN" };
  }

  /**
   * Crucial Teaching Requirement:
   * Determines the origin IP that will be recorded in the remote system's /var/log/auth.log
   */
  getSourceIpForTarget(targetIp) {
    if (!targetIp) return this.state.publicIP;
    const ip = targetIp.trim();

    // Local Home LAN
    if (ip.startsWith("192.168.1.") || ip.startsWith("192.168.56.") || ip === "127.0.0.1") {
      return this.state.activeInterfaces.eth0.ip;
    }

    // Aegis Corporate Network
    if (ip.startsWith("10.10.10.") || ip.startsWith("10.0.")) {
      return this.state.activeInterfaces.tun0?.ip || "10.10.10.45";
    }

    // P2P Direct Tunnel
    if (ip.startsWith("10.9.0.")) {
      return this.state.activeInterfaces.tun0?.ip || "10.9.0.1";
    }

    // External internet target:
    // If Consumer VPN is ON, use the spoofed/randomized public IP!
    // If OFF or WORK/P2P, use the real home public IP (74.125.19.102)!
    if (this.state.vpnMode === "CONSUMER") {
      return this.state.publicIP; // e.g. "185.220.101.5"
    }

    return this.realHomePublicIP; // "74.125.19.102"
  }
}

export const playerNetworkState = new PlayerNetworkManager();
