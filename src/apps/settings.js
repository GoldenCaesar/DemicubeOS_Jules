export class SettingsApp {
  constructor({ ui }) {
    this.ui = ui;
  }

  start() {
    this.ui.showSettings();
  }
}
