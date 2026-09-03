import { DEFAULT_ZENMAP_INI } from "../apps/zenmap-data.js";

export const FALLBACK_SYSTEM = {
  id: "192.168.56.101",
  ip: "192.168.56.101",
  hostname: "demicube-testbox",
  os: { name: "DemicubeOS", version: "0.1.0", kernel: "6.6.0-demicube" },
  ramMb: 16384,
  theme: "kali",
  programs: [
    { id: "codepad-plus", name: "CodePad+", fileName: "CodePad+", ramMb: 500 },
    { id: "clawder-python", name: "Clawder Python", fileName: "clawder-python", ramMb: 3072 },
    { id: "music-player", name: "Music Player", fileName: "music-player", ramMb: 1740 },
    { id: "zenmap", name: "Zenmap", fileName: "zenmap", ramMb: 480 }
  ],
  ports: [
    { port: 22, protocol: "tcp", service: "ssh", state: "open" },
    { port: 80, protocol: "tcp", service: "http", state: "open" }
  ],
  filesystem: {
    home: { admin: { "welcome.txt": { type: "file", format: "text", content: "Welcome, admin. This is the DemicubeOS test computer." }, ".bash_history": { type: "file", format: "text", content: "help\nls -la\ncat /documents/mission-brief.txt\n" } } },
    documents: {
      "mission-brief.txt": { type: "file", format: "text", content: "Test computer mission files." },
      "example.py": { type: "file", format: "py", content: "print('DemicubeOS ready')" },
      zenmap: {
        "savedata.ini": { type: "file", format: "text", content: DEFAULT_ZENMAP_INI }
      }
    },
    programs: {}, music: { "song1.mp3": { type: "file", format: "audio", name: "song1.mp3", source: "./music/song1.mp3" }, "song2.mp3": { type: "file", format: "audio", name: "song2.mp3", source: "./music/song2.mp3" } },
    var: {
      log: {
        "auth.log": { type: "file", format: "text", content: "Sep 03 12:00:00 demicube-testbox systemd-logind[412]: New session c1 of user admin.\nSep 03 12:00:01 demicube-testbox login[820]: pam_unix(login:session): session opened for user admin(uid=1000) by (uid=0)\n" },
        "syslog": { type: "file", format: "text", content: "Sep 03 12:00:00 demicube-testbox systemd[1]: Started DemicubeOS Core System Daemon.\nSep 03 12:00:01 demicube-testbox kernel: [ 0.000000] Linux version 6.6.0-demicube (root@build-server) (gcc 13.2.0)\nSep 03 12:00:01 demicube-testbox systemd[1]: Mounted Root File System.\nSep 03 12:00:02 demicube-testbox NetworkManager[524]: <info> [1756900802.12] device (eth0): state change: unmanaged -> unavailable\nSep 03 12:00:03 demicube-testbox NetworkManager[524]: <info> [1756900803.54] device (eth0): state change: unavailable -> disconnected\nSep 03 12:00:04 demicube-testbox NetworkManager[524]: <info> [1756900804.81] device (eth0): IPv4 address 10.0.0.5/24 set\nSep 03 12:00:05 demicube-testbox systemd[1]: Started OpenSSH Server Daemon.\nSep 03 12:00:06 demicube-testbox (10.0.0.5): System telemetry logger initialized.\n" },
        "boot.log": { type: "file", format: "text", content: "DemicubeOS boot completed.\nStorage mounted: root\n" }
      }
    },
    dev: { "null": { type: "file", format: "text", content: "" } },
    log: { "boot.log": { type: "file", format: "text", content: "DemicubeOS boot completed." } },
    sys: { "wallpaper.bin": { type: "file", format: "binary" }, "theme.bin": { type: "file", format: "binary" }, "kernel.sys": { type: "file", format: "binary" } }
  },
  users: [{ id: "admin", username: "admin", password: "admin", role: "admin", permissions: ["full"], homeDir: "/home/admin" }]
};

export async function loadSystemDefinition() {
  try {
    const systemResponse = await fetch("./content/Systems/192.168.56.101/system.json");
    const system = await systemResponse.json();
    const users = await (await fetch("./content/Systems/192.168.56.101/users.json")).json();
    const filesystem = await (await fetch("./content/Systems/192.168.56.101/filesystem.json")).json();
    return { ...system, users: users.users, filesystem };
  } catch {
    return FALLBACK_SYSTEM;
  }
}
