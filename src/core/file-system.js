const binaryPreview = "\u0000\u0001\u0007\u001b\u00a4\u00ff\u0003\u0010\u00d4\u0019\u0088\u0000\u00fe\u0006";

export class FileSystem {
  constructor(programs = [], systemDefinition = null) {
    this.root = systemDefinition?.filesystem ? this.fromDefinition(systemDefinition.filesystem) : {
      type: "directory",
      children: {
        home: {
          type: "directory",
          children: {
            "welcome.txt": this.textFile("Welcome to DemicubeOS.\nYour home directory is ready."),
            "session.bin": this.binaryFile()
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
        log: {
          type: "directory",
          children: {
            "boot.log": this.textFile("DemicubeOS boot completed.\nStorage mounted: root"),
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

    for (const program of programs) {
      this.installProgram(program);
    }
    this.initialRoot = structuredClone(this.root);
  }

  reset() {
    this.root = structuredClone(this.initialRoot);
  }

  fromDefinition(filesystem) {
    const convert = (value) => {
      if (value.type === "file") return value.format === "audio" ? this.audioFile(value.name, null) : { ...value, content: value.content || binaryPreview };
      return { type: "directory", children: Object.fromEntries(Object.entries(value).map(([name, child]) => [name, convert(child)])) };
    };
    return { type: "directory", children: Object.fromEntries(Object.entries(filesystem).map(([name, child]) => [name, convert(child)])) };
  }

  textFile(content) {
    return { type: "file", format: "text", content };
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
      path: this.normalize(path + "/" + name)
    }));
  }

  read(path) {
    const node = this.resolve(path);
    if (!node || node.type !== "file") return null;
    return ["text", "py"].includes(node.format) ? node.content : binaryPreview;
  }

  write(path, content) {
    const normalized = this.normalize(path);
    const parts = normalized.slice(1).split("/");
    const name = parts.pop();
    const parent = this.resolve("/" + parts.join("/"));
    if (!name || !parent || parent.type !== "directory") return false;
    const lowerName = name.toLowerCase();
    const format = /\.py(?:\(\d+\))?$/.test(lowerName) ? "py" : /\.txt(?:\(\d+\))?$/.test(lowerName) ? "text" : "binary";
    if (format === "binary") return false;
    parent.children[name] = { type: "file", format, content: String(content) };
    return true;
  }

  append(path, content) {
    const node = this.resolve(path);
    if (!node || node.type !== "file" || !["text", "py"].includes(node.format)) return false;
    node.content += String(content);
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
