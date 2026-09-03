export class SystemApp {
  constructor({ ui }) {
    this.ui = ui;
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