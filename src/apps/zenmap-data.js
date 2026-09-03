/**
 * Zenmap Default Network Save Data & Schema
 * Stored at /documents/zenmap/savedata.ini
 */

export const DEFAULT_ZENMAP_INI = `; ============================================================
; Zenmap 7.94 Network Topology Save Data
; Stored Hosts & Discovered Targets Database
; ============================================================

[settings]
target=192.168.56.0/24, 10.0.0.0/16, 172.16.5.0/24
profile=intense
layout=radial
filter=all
selected=steves-testbox
last_scan=2026-09-03 12:00:00 UTC

[host.gateway-router]
id=gateway-router
hostname=gateway-router
ip=192.168.56.1
subnet=192.168.56.0/24
type=router
role=Subnet Gateway & NAT
os=VyOS 1.4-rolling (Linux 6.1)
status=online
latency=0.3ms
hops=1
mac=52:54:00:12:34:01
ports=22/tcp/open/ssh:OpenSSH 8.9p1, 53/tcp/open/domain:dnsmasq 2.86, 80/tcp/open/http:lighttpd 1.4.63

[host.steves-testbox]
id=steves-testbox
hostname=steves-testbox
ip=192.168.56.108
subnet=192.168.56.0/24
type=workstation
role=Steve's Test Sandbox & Dev Box
os=DemicubeOS 0.1.0 (Debian Bookworm base)
status=online
latency=0.5ms
hops=1
mac=08:00:27:da:fe:62
ports=22/tcp/open/ssh:OpenSSH 9.2p1, 8080/tcp/open/http-proxy:Python SimpleHTTP, 5000/tcp/open/upnp:Werkzeug 3.0

[host.fileserver-01]
id=fileserver-01
hostname=fileserver-01
ip=192.168.56.20
subnet=192.168.56.0/24
type=server
role=Department NFS & SMB Share
os=Debian GNU/Linux 12 (bookworm)
status=online
latency=0.8ms
hops=1
mac=08:00:27:fa:b1:20
ports=22/tcp/open/ssh:OpenSSH 9.2p1, 80/tcp/open/http:Apache 2.4.59, 445/tcp/open/microsoft-ds:Samba 4.17.12

[host.web-gateway-01]
id=web-gateway-01
hostname=web-gateway-01
ip=192.168.56.80
subnet=192.168.56.0/24
type=server
role=Internal Nginx Reverse Proxy
os=Alpine Linux 3.19 (Linux 6.6)
status=online
latency=1.1ms
hops=1
mac=08:00:27:33:44:80
ports=22/tcp/open/ssh:Dropbear sshd 2022.82, 80/tcp/open/http:nginx 1.25.4, 443/tcp/open/https:nginx 1.25.4, 8080/tcp/open/http-proxy:Envoy 1.28

[host.db-cluster-node1]
id=db-cluster-node1
hostname=db-cluster-node1
ip=10.0.2.15
subnet=10.0.0.0/16
type=server
role=PostgreSQL Primary Replica
os=Ubuntu 22.04.4 LTS
status=online
latency=2.4ms
hops=2
mac=52:54:00:aa:bb:15
ports=22/tcp/open/ssh:OpenSSH 8.9p1, 5432/tcp/open/postgresql:PostgreSQL 16.2

[host.lab-workstation-03]
id=lab-workstation-03
hostname=lab-workstation-03
ip=10.0.3.42
subnet=10.0.0.0/16
type=workstation
role=Automated Testing Rig
os=Arch Linux (rolling, Linux 6.8)
status=online
latency=3.1ms
hops=2
mac=08:00:27:cc:dd:42
ports=22/tcp/open/ssh:OpenSSH 9.7p1, 9100/tcp/open/node-exporter:Prometheus Node Exporter 1.7.0

[host.steves-computer]
id=steves-computer
hostname=steves-computer
ip=11.6.0.7
subnet=remote
type=workstation
role=Remote External Workstation
os=Debian 12 Bookworm (Linux 6.1)
status=online
latency=14.2ms
hops=3
mac=08:00:27:e1:0f:7a
ports=22/tcp/open/ssh:OpenSSH 9.2p1

[host.satellite-uplink-relay]
id=satellite-uplink-relay
hostname=satellite-uplink-relay
ip=172.16.5.42
subnet=remote
type=relay
role=High-Bandwidth Ground Satellite Relay
os=FreeBSD 14.0-RELEASE (GENERIC)
status=online
latency=28.7ms
hops=3
mac=52:54:00:ee:ff:42
ports=22/tcp/open/ssh:OpenSSH 9.5p1 FreeBSD, 443/tcp/open/https:nginx 1.24.0, 8443/tcp/open/https-alt:custom telemetry
`;
