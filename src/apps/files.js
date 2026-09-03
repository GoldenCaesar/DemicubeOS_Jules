export class FilesApp {
  constructor({ ui, fileSystem, codePadApp, musicPlayer, launchProgram, terminal = null }) {
    this.ui = ui;
    this.fileSystem = fileSystem;
    this.codePadApp = codePadApp;
    this.musicPlayer = musicPlayer;
    this.launchProgram = launchProgram;
    this.terminal = terminal;
    this.currentPath = "/";
    this.history = [];
    this.onDirectoryChanged = null;
  }

  setTerminal(terminal) {
    this.terminal = terminal;
  }

  start() {
    this.ui.renderFiles(this.currentPath, this.fileSystem.list(this.currentPath));
  }

  open(path) {
    const node = this.fileSystem.resolve(path);
    if (!node) return false;

    if (node.type === "directory") {
      if (this.terminal) {
        this.terminal.submitCommand("cd " + path);
        return true;
      }
      return this.setPath(path, true);
    }

    if (this.terminal) {
      if (node.executable) {
        const progCmd = node.executable === "codepad-plus" ? "codepad" : node.executable;
        this.terminal.submitCommand(progCmd);
        return true;
      }
      if (node.format === "py") {
        this.terminal.submitCommand("python3 " + path);
        return true;
      }
      this.terminal.submitCommand("open " + path);
      return true;
    }

    if (node.executable && this.launchProgram) {
      this.launchProgram(node.executable);
      return true;
    }

    if (node.format === "audio" && this.musicPlayer) this.musicPlayer.play(path);
    else if (this.codePadApp) this.codePadApp.open(path);
    return true;
  }

  navigate(target) {
    if (this.terminal) {
      if (target === "back") {
        const prev = this.history.pop() || "/";
        this.terminal.submitCommand("cd " + prev);
        return true;
      }
      if (target === "up") {
        this.terminal.submitCommand("cd ..");
        return true;
      }
      if (target === "refresh") {
        this.terminal.submitCommand("ls");
        this.start();
        return true;
      }
      this.terminal.submitCommand("cd " + target);
      return true;
    }

    if (target === "back") {
      return this.setPath(this.history.pop() || this.currentPath, false);
    } else if (target === "up") {
      return this.setPath(this.currentPath + "/..", true);
    } else if (target === "refresh") {
      this.start();
      return;
    } else {
      return this.setPath(target, true);
    }
  }

  setPath(path, recordHistory = false) {
    const normalized = this.fileSystem.normalize(path);
    if (!this.fileSystem.list(normalized)) return false;
    if (recordHistory && normalized !== this.currentPath) this.history.push(this.currentPath);
    this.currentPath = normalized;
    this.start();
    if (this.onDirectoryChanged) this.onDirectoryChanged(this.currentPath);
    return true;
  }
}
