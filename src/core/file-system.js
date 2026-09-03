const binaryPreview = "\u0000\u0001\u0007\u001b\u00a4\u00ff\u0003\u0010\u00d4\u0019\u0088\u0000\u00fe\u0006";

const defaultAuthLog = `Sep 03 12:00:00 demicube-testbox systemd-logind[412]: New session c1 of user admin.
Sep 03 12:00:01 demicube-testbox login[820]: pam_unix(login:session): session opened for user admin(uid=1000) by (uid=0)
`;

const defaultSyslog = `Sep 03 12:00:00 demicube-testbox systemd[1]: Started DemicubeOS Core System Daemon.
Sep 03 12:00:01 demicube-testbox kernel: [ 0.000000] Linux version 6.6.0-demicube (root@build-server) (gcc 13.2.0)
Sep 03 12:00:01 demicube-testbox systemd[1]: Mounted Root File System.
Sep 03 12:00:02 demicube-testbox NetworkManager[524]: <info> [1756900802.12] device (eth0): state change: unmanaged -> unavailable
Sep 03 12:00:03 demicube-testbox NetworkManager[524]: <info> [1756900803.54] device (eth0): state change: unavailable -> disconnected
Sep 03 12:00:04 demicube-testbox NetworkManager[524]: <info> [1756900804.81] device (eth0): IPv4 address 10.0.0.5/24 set
Sep 03 12:00:05 demicube-testbox systemd[1]: Started OpenSSH Server Daemon.
Sep 03 12:00:06 demicube-testbox (10.0.0.5): System telemetry logger initialized.
`;

export class FileSystem {
  constructor(programs = [], systemDefinition = null) {
    this.root = systemDefinition?.filesystem ? this.fromDefinition(systemDefinition.filesystem) : {
      type: "directory",
      children: {
        home: {
          type: "directory",
          children: {
            admin: {
              type: "directory",
              children: {
                "welcome.txt": this.textFile("Welcome to DemicubeOS.\nYour home directory is ready."),
                ".bash_history": this.textFile("help\nls -la\ncat /documents/mission-brief.txt\n"),
                "session.bin": this.binaryFile()
              }
            }
          }
        },
        documents: {
          type: "directory",
          children: {
            "mission-brief.txt": this.textFile("Mission files will appear here.\nKeep your notes close."),
            "example.py": { type: "file", format: "py", content: "print('DemicubeOS ready')" },
            "evidence.bin": this.binaryFile()
          }
        },
        programs: {
          type: "directory",
          children: {}
        },
        music: {
          type: "directory",
          children: {
            "song1.mp3": this.audioFile("song1.mp3"),
            "song2.mp3": this.audioFile("song2.mp3")
          }
        },
        var: {
          type: "directory",
          children: {
            log: {
              type: "directory",
              children: {
                "auth.log": this.textFile(defaultAuthLog),
                "syslog": this.textFile(defaultSyslog),
                "boot.log": this.textFile("DemicubeOS boot completed.\nStorage mounted: root\n")
              }
            }
          }
        },
        dev: {
          type: "directory",
          children: {
            null: this.textFile("")
          }
        },
        log: {
          type: "directory",
          children: {
            "boot.log": this.textFile("DemicubeOS boot completed.\nStorage mounted: root\n"),
            "kernel.log": this.binaryFile()
          }
        },
        sys: {
          type: "directory",
          children: {
            "wallpaper.bin": this.binaryFile(),
            "theme.bin": this.binaryFile(),
            "kernel.sys": this.binaryFile()
          }
        }
      }
    };

    // Ensure realistic logging paths exist even when loaded from custom definition
    this.ensureDefaultPaths();

    for (const program of programs) {
      this.installProgram(program);
    }
    this.initialRoot = structuredClone(this.root);
  }

  ensureDefaultPaths() {
    this.mkdir("/var/log");
    this.mkdir("/home/admin");
    this.mkdir("/dev");

    if (!this.resolve("/var/log/auth.log")) {
      this.write("/var/log/auth.log", defaultAuthLog);
    }
    if (!this.resolve("/var/log/syslog")) {
      this.write("/var/log/syslog", defaultSyslog);
    }
    if (!this.resolve("/var/log/boot.log")) {
      this.write("/var/log/boot.log", "DemicubeOS boot completed.\nStorage mounted: root\n");
    }
    if (!this.resolve("/dev/null")) {
      this.write("/dev/null", "");
    }
    if (!this.resolve("/home/admin/.bash_history")) {
      this.write("/home/admin/.bash_history", "help\nls -la\ncat /documents/mission-brief.txt\n");
    }
  }

  reset() {
    this.root = structuredClone(this.initialRoot);
  }

  clone() {
    const cloned = new FileSystem([], null);
    cloned.root = structuredClone(this.root);
    cloned.initialRoot = structuredClone(this.initialRoot);
    return cloned;
  }

  fromDefinition(filesystem) {
    const convert = (value) => {
      if (value.type === "file") return value.format === "audio" ? this.audioFile(value.name, null) : { ...value, content: value.content ?? (value.format === "binary" ? binaryPreview : "") };
      return { type: "directory", children: Object.fromEntries(Object.entries(value).map(([name, child]) => [name, convert(child)])) };
    };
    return { type: "directory", children: Object.fromEntries(Object.entries(filesystem).map(([name, child]) => [name, convert(child)])) };
  }

  determineFormat(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".py")) return "py";
    if (lower.endsWith(".bin") || lower.endsWith(".sys")) return "binary";
    if (lower.endsWith(".mp3")) return "audio";
    return "text";
  }

  textFile(content) {
    return { type: "file", format: "text", content: String(content) };
  }

  binaryFile() {
    return { type: "file", format: "binary", content: binaryPreview };
  }

  audioFile(name, blob = null) {
    return { type: "file", format: "audio", mime: "audio/mpeg", content: binaryPreview, name, blob, source: "./music/" + name };
  }

  normalize(path = "/") {
    const parts = path.split("/").filter(Boolean);
    const normalized = [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") normalized.pop();
      else normalized.push(part);
    }
    return "/" + normalized.join("/");
  }

  resolve(path) {
    const normalized = this.normalize(path);
    if (normalized === "/") return this.root;
    let node = this.root;
    for (const part of normalized.slice(1).split("/")) {
      if (node.type !== "directory" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  mkdir(path) {
    const normalized = this.normalize(path);
    const parts = normalized.slice(1).split("/").filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children[part]) {
        current.children[part] = { type: "directory", children: {} };
      } else if (current.children[part].type !== "directory") {
        return false;
      }
      current = current.children[part];
    }
    return true;
  }

  touch(path) {
    const normalized = this.normalize(path);
    const node = this.resolve(normalized);
    if (node && node.type === "file") return true;
    return this.write(normalized, "");
  }

  chmod(path, mode) {
    const node = this.resolve(path);
    if (!node) return false;
    node.permissions = mode;
    return true;
  }

  list(path = "/") {
    const node = this.resolve(path);
    if (!node || node.type !== "directory") return null;
    return Object.entries(node.children).map(([name, child]) => ({
      name,
      type: child.type,
      format: child.format,
      executable: child.executable,
      programName: child.programName,
      mime: child.mime,
      permissions: child.permissions,
      path: this.normalize(path + "/" + name)
    }));
  }

  read(path) {
    const normalized = this.normalize(path);
    if (normalized === "/dev/null") return "";
    const node = this.resolve(normalized);
    if (!node || node.type !== "file") return null;
    return ["text", "py"].includes(node.format) ? node.content : binaryPreview;
  }

  write(path, content) {
    const normalized = this.normalize(path);
    if (normalized === "/dev/null") return true;
    const parts = normalized.slice(1).split("/");
    const name = parts.pop();
    const parentPath = "/" + parts.join("/");
    let parent = this.resolve(parentPath);
    if (!parent) {
      this.mkdir(parentPath);
      parent = this.resolve(parentPath);
    }
    if (!name || !parent || parent.type !== "directory") return false;
    const format = this.determineFormat(name);
    if (format === "binary") return false;
    parent.children[name] = { type: "file", format, content: String(content) };
    return true;
  }

  append(path, content) {
    const normalized = this.normalize(path);
    if (normalized === "/dev/null") return true;
    let node = this.resolve(normalized);
    if (!node) {
      return this.write(normalized, String(content));
    }
    if (node.type !== "file") return false;
    if (!["text", "py"].includes(node.format)) node.format = "text";
    node.content = (node.content || "") + String(content);
    return true;
  }

  remove(path) {
    const normalized = this.normalize(path);
    if (normalized === "/") return false;
    const parts = normalized.slice(1).split("/");
    const name = parts.pop();
    const parent = this.resolve("/" + parts.join("/"));
    if (!parent || parent.type !== "directory" || !parent.children[name]) return false;
    delete parent.children[name];
    return true;
  }

  addAudioFile(name, blob) {
    if (!name.toLowerCase().endsWith(".mp3")) return false;
    this.root.children.music.children[name] = this.audioFile(name, blob);
    return true;
  }

  cloneNode(node) {
    if (!node) return null;
    if (node.type === "directory") {
      const cloned = { type: "directory", children: {} };
      if (node.permissions) cloned.permissions = node.permissions;
      for (const [key, child] of Object.entries(node.children || {})) {
        cloned.children[key] = this.cloneNode(child);
      }
      return cloned;
    }
    return { ...node };
  }

  copy(sourcePath, destinationPath) {
    const source = this.normalize(sourcePath);
    let destination = this.normalize(destinationPath);
    const sourceNode = this.resolve(source);
    if (!sourceNode) return false;

    const destNode = this.resolve(destination);
    if (destNode && destNode.type === "directory") {
      const sourceName = source.split("/").pop();
      destination = this.normalize(destination + "/" + sourceName);
    }

    const destParts = destination.slice(1).split("/").filter(Boolean);
    const destName = destParts.pop();
    const destParentPath = "/" + destParts.join("/");
    let parent = this.resolve(destParentPath);
    if (!parent) {
      this.mkdir(destParentPath);
      parent = this.resolve(destParentPath);
    }
    if (!parent || parent.type !== "directory" || !destName) return false;

    parent.children[destName] = this.cloneNode(sourceNode);
    return true;
  }

  move(sourcePath, destinationPath) {
    const source = this.normalize(sourcePath);
    const destination = this.normalize(destinationPath);
    const sourceParts = source.slice(1).split("/");
    const destinationParts = destination.slice(1).split("/");
    const sourceName = sourceParts.pop();
    const sourceParent = this.resolve("/" + sourceParts.join("/"));
    const destinationParent = this.resolve("/" + destinationParts.slice(0, -1).join("/"));
    const destinationName = destinationParts[destinationParts.length - 1];

    if (!sourceParent || sourceParent.type !== "directory" || !sourceParent.children[sourceName]) return false;
    if (!destinationParent || destinationParent.type !== "directory") return false;
    destinationParent.children[destinationName] = sourceParent.children[sourceName];
    if (destinationParent.children[destinationName].format === "audio" && !destinationParent.children[destinationName].blob) {
      destinationParent.children[destinationName].name = destinationName;
      destinationParent.children[destinationName].source = "./music/" + destinationName;
    }
    delete sourceParent.children[sourceName];
    return true;
  }

  findProgram(command) {
    const entries = this.list("/programs") || [];
    const requested = command.toLowerCase();
    return entries.find((entry) => {
      if (entry.type !== "file") return false;
      const name = entry.name.toLowerCase();
      return name === requested || name.replace(/\.[^.]+$/, "") === requested;
    });
  }

  installProgram(program) {
    const filename = (program.fileName || program.id || "program") + ".bin";
    this.root.children.programs.children[filename] = {
      ...this.binaryFile(),
      executable: program.id,
      programName: program.name || program.id
    };
  }
}
