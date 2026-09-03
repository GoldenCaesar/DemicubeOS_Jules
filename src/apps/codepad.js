export class CodePadApp {
  constructor({ ui, fileSystem, windowManager }) {
    this.ui = ui;
    this.fileSystem = fileSystem;
    this.windowManager = windowManager;
    this.tabs = new Map();
    this.activePath = null;
  }

  start() {
    this.ui.showCodePad();
    this.ui.appendTerminalLine("CodePad+ opened. Use open <path> for a .txt or .py file.");
  }

  open(path) {
    const node = this.fileSystem.resolve(path);
    if (!node || node.type !== "file" || !["text", "py"].includes(node.format)) return false;
    this.tabs.set(path, { content: this.fileSystem.read(path), format: node.format });
    this.activePath = path;
    this.ui.showCodePadFile(path, this.tabs.get(path).content);
    this.ui.renderCodePadTabs([...this.tabs.keys()], path);
    return true;
  }

  close(path) {
    if (!this.tabs.has(path)) return false;
    this.tabs.delete(path);
    if (this.tabs.size === 0) {
      this.activePath = null;
      this.ui.renderCodePadTabs([], null);
      this.ui.showCodePadFile("No file open", "Open a .txt or .py file to view it.");
      return true;
    }
    if (this.activePath === path) this.activePath = [...this.tabs.keys()][0];
    this.ui.showCodePadFile(this.activePath, this.tabs.get(this.activePath).content);
    this.ui.renderCodePadTabs([...this.tabs.keys()], this.activePath);
    return true;
  }
}
