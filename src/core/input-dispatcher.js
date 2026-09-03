export class InputDispatcher {
  constructor({ windowManager, terminalApp, ui }) {
    this.windowManager = windowManager;
    this.terminalApp = terminalApp;
    this.ui = ui;
    this.sessionActive = true;
  }

  setSessionActive(active) {
    this.sessionActive = active;
  }

  attach() {
    window.addEventListener("keydown", (event) => {
      if (!this.sessionActive) return;
      const normalizedKey = event.key.toLowerCase();

      if (event.altKey && normalizedKey === "d") {
        event.preventDefault();
        this.windowManager.cycleNext();
        return;
      }

      if (event.altKey && normalizedKey === "a") {
        event.preventDefault();
        this.windowManager.cyclePrevious();
        return;
      }

      if (event.altKey && normalizedKey === "s") {
        event.preventDefault();
        this.ui.toggleStartMenu();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        if (event.shiftKey) {
          this.windowManager.cyclePrevious();
        } else {
          this.terminalApp.complete();
        }
        return;
      }

      if (event.key === "Escape") {
        this.ui.closeStartMenu();
      }

      this.terminalApp.handleKey(event);
    });
  }
}
