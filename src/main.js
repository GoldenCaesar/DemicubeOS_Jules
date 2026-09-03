import { GAME_PROFILE } from "./config/game-profile.js";
import { BootSequence } from "./core/boot-sequence.js";
import { OSSequence } from "./core/os-sequence.js";
import { WindowManager } from "./core/window-manager.js";
import { InputDispatcher } from "./core/input-dispatcher.js";
import { TerminalApp } from "./apps/terminal.js";
import { FilesApp } from "./apps/files.js";
import { FileSystem } from "./core/file-system.js";
import { CodePadApp } from "./apps/codepad.js";
import { ClawderPythonApp } from "./apps/clawder-python.js";
import { FakePython } from "./core/fake-python.js";
import { SettingsApp } from "./apps/settings.js";
import { SystemApp } from "./apps/system.js";
import { MusicPlayerApp } from "./apps/music-player.js";
import { ResourceManager } from "./core/resource-manager.js";
import { loadSystemDefinition } from "./core/system-loader.js";
import { LoginManager } from "./core/login-manager.js";
import { createDesktopShell } from "./ui/desktop-shell.js";

async function main() {
  const root = document.getElementById("app");
  const systemDefinition = await loadSystemDefinition();
  const loginManager = new LoginManager(systemDefinition);
  const runtimeProfile = {
    ...GAME_PROFILE,
    distroName: systemDefinition.os.name,
    promptUser: "admin",
    promptHost: systemDefinition.hostname,
    systemId: systemDefinition.id,
    downloadedPrograms: systemDefinition.programs
  };
  const fileSystem = new FileSystem(systemDefinition.programs, systemDefinition);
  const fakePython = new FakePython(fileSystem);
  const resourceManager = new ResourceManager({ totalRam: systemDefinition.ramMb });
  for (const program of systemDefinition.programs) {
    const resourceId = program.id === "codepad-plus" ? "codepad" : program.id;
    resourceManager.configureProgram(resourceId, program.ramMb);
  }
  const ui = createDesktopShell(root, runtimeProfile);
  const boot = new BootSequence(runtimeProfile, systemDefinition);

  await boot.run(ui);
  ui.showDesktop();

  const windowIds = runtimeProfile.defaultWindows.map((win) => win.id);

  const windowManager = new WindowManager(windowIds, (windowId) => {
    ui.setFocus(windowId);
  });

  const terminal = new TerminalApp({
    ui,
    profile: runtimeProfile,
    windowManager,
    fileSystem,
    filesApp: null,
    codePadApp: null,
    launchProgram: null,
    rebootSystem: null
    ,fakePython
    ,resourceManager
  });
  windowManager.setAvailabilityChecker((windowId) => {
    const processEntry = [...terminal.processWindows.entries()].find(([, id]) => id === windowId);
    return Boolean(processEntry && terminal.processes.has(processEntry[0]) && ui.isWindowVisible(windowId));
  });

  const codePad = new CodePadApp({ ui, fileSystem, windowManager });
  const clawderPython = new ClawderPythonApp({ ui });
  const settings = new SettingsApp({ ui });
  const system = new SystemApp({ ui });
  const musicPlayer = new MusicPlayerApp({ ui, fileSystem });
  const files = new FilesApp({ ui, fileSystem, codePadApp: codePad, musicPlayer, launchProgram: (programId) => terminal.launchProgram(programId) });
  terminal.filesApp = files;
  terminal.codePadApp = codePad;
  terminal.stopProgram = (pid) => {
    if (pid === 8) musicPlayer.stop();
  };
  resourceManager.onChanged = (snapshot) => {
    ui.renderSystemResources(snapshot);
    ui.renderTaskbarApps(terminal.processes, terminal.processWindows);
  };
  files.onDirectoryChanged = (path) => terminal.setCurrentDirectory(path);
  const programCatalog = [
    { id: "task-manager", name: "TaskManager" },
    { id: "terminal", name: "Terminal" },
    { id: "files", name: "Files" },
    { id: "codepad-plus", name: "CodePad+" },
    { id: "clawder-python", name: "Clawder Python" },
    { id: "settings", name: "Settings" },
    { id: "music-player", name: "Music Player" },
    ...runtimeProfile.downloadedPrograms.filter((program) => !["codepad-plus", "clawder-python", "music-player"].includes(program.id))
  ];
  const coreCatalog = programCatalog.slice(0, 3);
  const refreshProgramCatalog = () => {
    const installedFiles = fileSystem.list("/programs") || [];
    const installed = systemDefinition.programs.filter((program) => installedFiles.some((file) => file.executable === program.id));
    ui.renderProgramMenu([...coreCatalog, ...installed]);
    if (files.currentPath === "/programs") {
      files.setPath("/programs", false);
    }
  };
  ui.renderProgramMenu(programCatalog);
  terminal.availablePrograms = systemDefinition.programs;
  terminal.programChanged = refreshProgramCatalog;
  terminal.launchProgram = (programId) => {
    if (programId === "system") {
      terminal.ui.appendTerminalLine("System daemon is already running.");
      return;
    }
    const process = programId === "terminal"
      ? { id: 2, name: "terminal", windowId: "terminal-main", start: () => terminal.start() }
      : programId === "files"
      ? { id: 3, name: "files", windowId: "files", start: () => files.start() }
      : programId === "task-manager"
      ? { id: 7, name: "task-manager", windowId: "task-manager", start: () => system.start(terminal.processes, resourceManager.snapshot()) }
      : programId === "music-player"
      ? { id: 8, name: "music-player", windowId: "music-player", start: () => musicPlayer.start() }
      : programId === "codepad-plus"
      ? { id: 4, name: "codepad+", windowId: "codepad", start: () => codePad.start() }
      : programId === "clawder-python"
        ? { id: 5, name: "clawder-python", windowId: "clawder-python", start: () => clawderPython.start() }
        : { id: 6, name: "settings", windowId: "settings", start: () => settings.start() };
    const resourceProgramIds = { terminal: "terminal", files: "files", "codepad-plus": "codepad", "clawder-python": "clawder-python", "music-player": "music-player", settings: "settings", "task-manager": "task-manager" };
    const canStart = resourceManager.start(process.id, resourceProgramIds[programId], {
      visible: true,
      getWindowText: () => ui.getWindowText(process.windowId)
    });
    if (!canStart) {
      terminal.ui.appendTerminalLine("Out of memory: launching " + process.name + " requires a reboot.");
      terminal.rebootSystem?.();
      return;
    }
    terminal.processes.set(process.id, process.name);
    windowManager.add(process.windowId);
    ui.setWindowVisible(process.windowId, true);
    process.start();
    resourceManager.notify();
    windowManager.focus(process.windowId);
  };
  terminal.launchProgram = ((launch) => (programId) => {
    launch(programId);
    resourceManager.notify();
  })(terminal.launchProgram);
  terminal.rebootSystem = async () => {
    ui.showBootScreen();
    // Show shutdown sequence before reboot
    await boot.shutdown(ui);
    ui.closeAllWindows();
    windowManager.reset([]);
    terminal.processes = new Map([[1, "system"]]);
    resourceManager.reset();
    fileSystem.reset();
    // Show boot sequence on restart
    await boot.run(ui);
    ui.showDesktop();
    refreshProgramCatalog();
    input.setSessionActive(false);
    ui.showLoginScreen();
  };
  ui.onFileOpen((path) => {
    const node = fileSystem.resolve(path);
    files.open(path);
    if (node && node.type === "file") {
      if (node.format === "audio") {
        if (!terminal.processes.has(8)) terminal.launchProgram("music-player");
        musicPlayer.play(path);
        windowManager.focus("music-player");
      } else {
        if (!terminal.processes.has(4)) terminal.launchProgram("codepad-plus");
        codePad.open(path);
        windowManager.focus("codepad");
      }
    }
  });
  ui.onCodePadTab((path, close) => close ? codePad.close(path) : codePad.open(path));
  ui.onFilesNavigation((target) => {
    if (target.startsWith("/") || ["back", "up", "refresh"].includes(target)) files.navigate(target);
    else files.open(target);
  });
  ui.onWindowOpen((windowId) => {
    const processEntry = [...terminal.processWindows.entries()].find(([, id]) => id === windowId);
    if (processEntry && !terminal.processes.has(processEntry[0])) {
      const processNames = { 2: "terminal", 3: "files", 4: "codepad+", 5: "clawder-python", 6: "settings", 7: "task-manager", 8: "music-player" };
      terminal.processes.set(processEntry[0], processNames[processEntry[0]]);
      const resourceProgramIds = { 2: "terminal", 3: "files", 4: "codepad", 5: "clawder-python", 6: "settings", 7: "task-manager", 8: "music-player" };
      resourceManager.start(processEntry[0], resourceProgramIds[processEntry[0]], {
        visible: true,
        getWindowText: () => ui.getWindowText(windowId)
      });
      windowManager.add(windowId);
      resourceManager.notify();
    }
    ui.setWindowVisible(windowId, true);
    windowManager.focus(windowId);
  });
  ui.onWindowAction((windowId, action) => {
    if (action === "drag-start") {
      windowManager.focus(windowId);
      return;
    }
    const pid = [...terminal.processWindows.entries()].find(([, id]) => id === windowId)?.[0];
    if (action === "minimize") {
      ui.setWindowVisible(windowId, false);
      if (pid) resourceManager.setVisible(pid, false, () => ui.getWindowText(windowId));
    }
    if (action === "focus") {
      windowManager.focus(windowId);
      if (pid) resourceManager.setVisible(pid, true, () => ui.getWindowText(windowId));
      return;
    }
    if (action === "maximize") ui.toggleWindowMaximized(windowId);
    if (action === "close") {
      ui.setWindowVisible(windowId, false);
      if (pid && terminal.processes.has(pid)) terminal.submitCommand("kill " + pid);
    }
  });
  ui.onDesktopFocus(() => windowManager.blur());
  ui.onUserTextColorChange((color) => ui.setUserTextColor(color));
  ui.onProgramLaunch((programId) => terminal.launchProgram(programId));
  ui.onSystemKill((pid) => terminal.submitCommand("kill " + pid));
  terminal.restoreProcess = (pid) => {
    const windowId = terminal.processWindows.get(pid);
    if (!windowId || !terminal.processes.has(pid)) return false;
    ui.setWindowVisible(windowId, true);
    resourceManager.setVisible(pid, true, () => ui.getWindowText(windowId));
    windowManager.focus(windowId);
    return true;
  };
  ui.onSystemFocus((pid) => terminal.restoreProcess(pid));
  ui.onTaskbarProgram((pid) => terminal.restoreProcess(pid));
  ui.onMusicActions({
    play: (path) => musicPlayer.play(path),
    upload: (files) => musicPlayer.upload(files),
    pause: () => musicPlayer.pause(),
    previous: () => musicPlayer.previous(),
    next: () => musicPlayer.next(),
    shuffle: () => musicPlayer.toggleShuffle(),
    repeat: () => musicPlayer.toggleRepeat(),
    seek: (percent) => musicPlayer.seek(percent),
    volume: (value) => musicPlayer.setVolume(value),
    filter: () => musicPlayer.filter(),
    updateMusicControls: (state) => ui.updateMusicControls(state)
  });
  window.setInterval(() => resourceManager.notify(), 500);
  window.setInterval(() => resourceManager.fluctuateSystem(), 1500);
  files.start();
  resourceManager.setVisible(3, true, () => ui.getWindowText("files"));

  terminal.start();
  files.setPath("/", false);
  refreshProgramCatalog();
  terminal.syncProcesses = () => resourceManager.notify();

  const input = new InputDispatcher({
    windowManager,
    terminalApp: terminal,
    ui
  });

  input.attach();
  ui.closeAllWindows();
  terminal.processes = new Map([[1, "system"]]);
  resourceManager.reset();
  windowManager.reset([]);
  ui.onLogout(() => {
    input.setSessionActive(false);
    ui.closeAllWindows();
    terminal.processes = new Map([[1, "system"]]);
    resourceManager.reset();
    windowManager.reset([]);
    ui.showLoginScreen();
  });
  const logIn = (username, password) => {
    if (!loginManager.authenticate(username, password)) {
      ui.showLoginError("Authentication failed");
      return;
    }
    terminal.processes = new Map([[1, "system"]]);
    resourceManager.reset();
    terminal.profile.promptUser = loginManager.currentUser.username;
    terminal.profile.promptHost = systemDefinition.hostname;
    terminal.currentPath = loginManager.currentUser.homeDir;
    terminal.updatePromptPrefix();
    files.setPath(terminal.currentPath, false);
    ui.showDesktop();
    input.setSessionActive(true);
    windowManager.reset([]);
  };
  ui.onLogin(logIn);
  input.setSessionActive(false);
  ui.showLoginScreen();
  ui.appendTerminalLine("Desktop ready. Alt+A and Alt+D cycle focus.");
}

main();
