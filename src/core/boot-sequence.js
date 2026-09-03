import { OSSequence } from "./os-sequence.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BootSequence {
  constructor(profile, systemDefinition) {
    this.profile = profile;
    this.systemDefinition = systemDefinition;
    this.osSequence = new OSSequence(systemDefinition);
  }

  async run(ui) {
    const skip = window.location.hash === this.profile.boot.skipWithHash;
    if (skip || !this.profile.boot.enableAnimation) {
      ui.appendBootLine("Boot skipped (debug mode).", "system");
      await sleep(100);
      return;
    }

    // Run the dynamic OS-specific boot sequence
    await this.osSequence.runBoot(ui);
  }

  async shutdown(ui) {
    return this.osSequence.runShutdown(ui);
  }

  async crash(ui) {
    return this.osSequence.runCrash(ui);
  }
}
