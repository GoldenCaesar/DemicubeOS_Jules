export class SystemApp {
  constructor({ ui, loggingSystem = null }) {
    this.ui = ui;
    this.loggingSystem = loggingSystem;
  }

  setLoggingSystem(loggingSystem) {
    this.loggingSystem = loggingSystem;
  }

  startDaemon() {
    this.loggingSystem?.startBackgroundDaemon();
  }

  stopDaemon() {
    this.loggingSystem?.stopBackgroundDaemon();
  }

  start(processes, resources) {
    this.ui.showSystem();
    if (resources) this.ui.renderSystemResources(resources);
    else this.ui.renderSystemProcesses(processes);
  }

  refresh(processes) {
    this.ui.renderSystemProcesses(processes);
  }
}
