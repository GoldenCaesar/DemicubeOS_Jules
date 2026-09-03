export class FilesApp {
  constructor({ ui, fileSystem, codePadApp, musicPlayer, launchProgram }) {
    this.ui = ui;
    this.fileSystem = fileSystem;
    this.codePadApp = codePadApp;
    this.musicPlayer = musicPlayer;
    this.launchProgram = launchProgram;
    this.currentPath = "/";
    this.history = [];
    this.onDirectoryChanged = null;
  }

  start() {
    this.ui.renderFiles(this.currentPath, this.fileSystem.list(this.currentPath));
  }

  open(path) {
    const node = this.fileSystem.resolve(path);
    if (!node) return false;

    if (node.type === "directory") {
      return this.setPath(path, true);
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
