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
    { id: "music-player", name: "Music Player", fileName: "music-player", ramMb: 1740 }
  ],
  ports: [
    { port: 22, protocol: "tcp", service: "ssh", state: "open" },
    { port: 80, protocol: "tcp", service: "http", state: "open" }
  ],
  filesystem: {
    home: { admin: { "welcome.txt": { type: "file", format: "text", content: "Welcome, admin. This is the DemicubeOS test computer." } } },
    documents: { "mission-brief.txt": { type: "file", format: "text", content: "Test computer mission files." }, "example.py": { type: "file", format: "py", content: "print('DemicubeOS ready')" } },
    programs: {}, music: { "song1.mp3": { type: "file", format: "audio", name: "song1.mp3", source: "./music/song1.mp3" }, "song2.mp3": { type: "file", format: "audio", name: "song2.mp3", source: "./music/song2.mp3" } },
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
