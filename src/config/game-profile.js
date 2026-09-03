export const GAME_PROFILE = {
  distroId: "kali",
  distroName: "Kali Linux",
  promptUser: "student",
  promptHost: "kali",
  systemId: "192.168.56.101",
  downloadedPrograms: [
    { id: "codepad-plus", name: "CodePad+", fileName: "CodePad+" },
    { id: "clawder-python", name: "Clawder Python", fileName: "clawder-python" },
    { id: "music-player", name: "Music Player", fileName: "music-player" },
    { id: "zenmap", name: "Zenmap", fileName: "zenmap" },
    { id: "vpnguard", name: "VPNguard", fileName: "vpnguard" }
  ],
  boot: {
    enableAnimation: true,
    skipWithHash: "#skipboot"
  },
  defaultWindows: [
    {
      id: "terminal-main",
      title: "Terminal",
      subtitle: "Always available",
      body: "Main terminal panel placeholder."
    },
    {
      id: "files",
      title: "Files",
      subtitle: "Filesystem viewer",
      body: "Root filesystem and file previews."
    },
    {
      id: "codepad",
      title: "CodePad+",
      subtitle: "Text and Python viewer",
      body: "View text and Python files."
    },
    {
      id: "clawder-python",
      title: "Clawder Python",
      subtitle: "AI assistant",
      body: "No prompts available."
    },
    {
      id: "zenmap",
      title: "Zenmap",
      subtitle: "Network topology mapper",
      body: "Network node map display."
    },
    {
      id: "vpnguard",
      title: "VPNguard",
      subtitle: "Virtual network tunnel controller",
      body: "Encrypted network tunnel manager."
    }
  ]
};
