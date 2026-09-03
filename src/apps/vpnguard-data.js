/**
 * VPNguard Configuration & Profile Data
 * Default savedata.ini and OpenVPN configuration templates.
 * Stored at /documents/vpnguard/savedata.ini
 */

export const DEFAULT_VPNGUARD_INI = `; ============================================================
; VPNguard Core Configuration & Profile Database
; File: /documents/vpnguard/savedata.ini
; ============================================================

[state]
active_mode=OFF
active_profile=none
tun_interface=none
public_ip=74.125.19.102
real_ip=74.125.19.102
connected_server=none
killswitch=enabled
dns=1.1.1.1, 9.9.9.9

[profile.consumer_anonymous]
id=consumer_anonymous
name=VPNguard Anonymous Consumer Service
type=CONSUMER
server=ams-node-14.vpnguard-relay.net
location=Zurich, Switzerland
assigned_tun_ip=10.8.0.4
virtual_public_ip=185.220.101.5
encryption=ChaCha20-Poly1305
protocol=WireGuard
status=available
description=Encrypts all external egress traffic. Target /var/log/auth.log records 185.220.101.5 instead of your home IP.

[profile.aegis_work]
id=aegis_work
name=Aegis Corporate Site-to-Site Gateway
type=WORK
server=vpn.aegis-security.internal
gateway_ip=10.10.10.1
assigned_tun_ip=10.10.10.45
target_subnet=10.10.10.0/24
credentials_user=smiller@aegis-corp
encryption=AES-256-GCM
protocol=OpenVPN
config_file=/documents/vpnguard/office.ovpn
status=available
description=Site-to-site enterprise tunnel unlocking Aegis internal corporate subnet (10.10.10.0/24).

[profile.p2p_node]
id=p2p_node
name=Direct P2P WireGuard Tunnel
type=P2P
peer_endpoint=198.51.100.84:51820
local_virtual_ip=10.9.0.1
peer_virtual_ip=10.9.0.2
target_subnet=10.9.0.0/24
public_key=VGhpcy1pcy1hLWZha2Utd2lyZWd1YXJkLXBrZXk=
protocol=WireGuard
status=available
description=Direct point-to-point tunnel mapping remote compromised node 10.9.0.2 on subnet 10.9.0.0/24.
`;

export const DEFAULT_OFFICE_OVPN = `# ============================================================
# Aegis Security Corporate Site-to-Site VPN Profile
# File: /documents/vpnguard/office.ovpn
# ============================================================
client
dev tun
proto udp
remote vpn.aegis-security.internal 1194
resolv-retry infinite
nobind
persist-key
persist-tun
remote-cert-tls server
cipher AES-256-GCM
auth SHA512
key-direction 1
verb 3

# Subnet Routes injected upon handshake:
route 10.10.10.0 255.255.255.0
route 10.0.0.0 255.255.0.0

# User Credentials Hook:
auth-user-pass /documents/vpnguard/.aegis_creds
`;

export const DEFAULT_VPNGUARD_README = `============================================================
VPNGUARD ENTERPRISE & CONSUMER TUNNEL SUITE
============================================================

VPNguard manages network adapter state (tun0), public IP masking,
and conditional subnet routing for DemicubeOS.

Available Modes:
1. CONSUMER MODE (Anonymous Privacy Relay):
   - Masks real home IP (74.125.19.102) -> 185.220.101.5.
   - Encrypts egress traffic and obscures identity in remote /var/log/auth.log.

2. WORK MODE (Aegis Site-to-Site Gateway):
   - Mounts virtual interface tun0 with corporate IP 10.10.10.45.
   - Unlocks internal Aegis Corporate Subnet (10.10.10.0/24) in Zenmap and Nmap.

3. P2P MODE (Direct Peer Tunnel):
   - Direct point-to-point tunnel to remote compromised node (10.9.0.2).
   - Unlocks subnet 10.9.0.0/24 for targeted SSH and administrative access.

Terminal CLI Quick Reference:
  vpnguard status                Inspect network interfaces & public IP
  vpnguard connect consumer      Connect to Anonymous Privacy Server
  vpnguard connect work          Connect to Aegis Corporate Gateway
  vpnguard connect p2p [ip]      Establish direct P2P tunnel to target
  vpnguard disconnect            Tear down tun0 and restore direct home routing
  vpnguard profiles              List profiles from /documents/vpnguard/savedata.ini
  vpnguard reload                Reload profiles from disk

Data Save File:
  /documents/vpnguard/savedata.ini
`;
