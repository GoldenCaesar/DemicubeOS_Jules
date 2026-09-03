export class TerminalApp {
  constructor({ ui, profile, windowManager, fileSystem, filesApp, rebootSystem, fakePython, resourceManager }) {
    this.ui = ui;
    this.profile = profile;
    this.windowManager = windowManager;
    this.fileSystem = fileSystem;
    this.filesApp = filesApp;
    this.rebootSystem = rebootSystem;
    this.fakePython = fakePython;
    this.resourceManager = resourceManager;
    this.currentPath = "/";
    this.running = true;
    this.processWindows = new Map([
      [2, "terminal-main"],
      [3, "files"],
      [4, "codepad"],
      [5, "clawder-python"],
      [6, "settings"],
      [7, "task-manager"],
      [8, "music-player"]
    ]);
    this.processes = new Map([
      [1, "system"],
      [2, "terminal"],
      [3, "files"]
    ]);
    this.buffer = "";
    this.promptPrefix = profile.promptUser + "@" + profile.promptHost + ":~$ ";
    this.commands = ["help", "clear", "echo", "date", "whoami", "pwd", "ls", "cd", "cat", "open", "mv", "rm", "install", "reboot", "python3", "python", "ps", "kill", "focus", "exit", "terminal", "files", "settings", "system", "task-manager", "music-player", "music", "snap"];
    this.commandDocs = {
      help: ["help - show the command index", "Usage: help", "Use '<command> help' for detailed command documentation."],
      clear: ["clear - clear the terminal monitor", "Usage: clear", "Example: clear"],
      echo: ["echo - print text to the terminal", "Usage: echo <text>", "Example: echo mission ready"],
      date: ["date - print the simulated system date and time", "Usage: date"],
      whoami: ["whoami - print the current logged-in user", "Usage: whoami"],
      pwd: ["pwd - print the current virtual directory", "Usage: pwd"],
      ls: ["ls - list files and folders in the current directory", "Usage: ls", "Example: cd /documents then ls"],
      cd: ["cd - change the current virtual directory", "Usage: cd <directory>", "Example: cd /documents", "Use cd .. to move to the parent directory."],
      cat: ["cat - print a virtual file to the terminal", "Usage: cat <file>", "Example: cat /documents/mission-brief.txt"],
      open: ["open - open a virtual file in its appropriate application", "Usage: open <path>", "Text and Python files open in CodePad+."],
      mv: ["mv - move or rename a virtual file", "Usage: mv <source> <destination>", "Example: mv /home/old.txt /home/new.txt"],
      python3: ["python3 - run a Python file in the safe virtual interpreter", "Usage: python3 <file.py>", "Example: python3 /documents/example.py", "Only supported sandboxed Python features can run."],
      python: ["python - alias for the safe virtual Python interpreter", "Usage: python <file.py>", "Example: python /documents/example.py"],
      ps: ["ps - list currently running virtual processes", "Usage: ps", "The PID shown here can be used with kill or focus."],
      kill: ["kill - stop a running virtual process", "Usage: kill <pid>", "Example: kill 4", "Killing system triggers a reboot. The persistent terminal input cannot be removed."],
      focus: ["focus - focus a running application by its process ID", "Usage: focus <pid>", "Example: focus 3", "Use ps to find valid process IDs."],
      exit: ["exit - close the focused application", "Usage: exit", "With no application focused, exit reboots the system."],
      terminal: ["terminal - launch or restore the visible terminal window", "Usage: terminal"],
      files: ["files - launch or focus the Files application", "Usage: files"]
      ,settings: ["settings - launch or focus the game settings", "Usage: settings", "Change the User Text Color used for terminal command history."]
      ,system: ["system - the core OS daemon", "Usage: system", "The daemon has no window. Killing PID 1 reboots the system."]
      ,"task-manager": ["task-manager - open the running-process manager", "Usage: task-manager", "View and terminate running virtual processes."]
      ,"music-player": ["music-player - play MP3 files from the virtual music directory", "Usage: music-player", "Use upload in Music Player to add MP3s to /music."]
      ,snap: ["snap - tile visible applications evenly across the desktop", "Usage: snap [program ...]", "Up to four named programs can be supplied. Inactive named programs are launched first."]
      ,rm: ["rm - remove a file from the current virtual directory", "Usage: rm <file>", "Installed program files can be removed from /programs. Core apps are not files."],
      install: ["install - restore an available program package", "Usage: install <program>", "Example: install clawder-python"],
      reboot: ["reboot - restart the test computer from its original system state", "Usage: reboot", "Files and installed programs removed during the session are restored."]
    };
  }

  start() {
    this.running = true;
    this.updatePromptPrefix();
    this.processes.set(2, "terminal");
    this.resourceManager?.start(2, "terminal", { visible: true, getWindowText: () => this.ui.getWindowText("terminal-main") });
    this.windowManager.add("terminal-main");
    this.ui.setTerminalVisible(true);
    this.ui.clearTerminal();
    this.ui.setPrompt(this.promptPrefix, this.buffer);
    if (this.syncProcesses) this.syncProcesses();
    this.ui.appendTerminalLine("DemicubeOS terminal online.");
    this.ui.appendTerminalLine("Type 'help' to list commands.");
  }

  setCurrentDirectory(path) {
    this.currentPath = this.fileSystem.normalize(path);
    this.updatePromptPrefix();
    this.ui.setPrompt(this.promptPrefix, this.buffer);
  }

  updatePromptPrefix() {
    const displayPath = this.currentPath === "/" ? "~" : this.currentPath;
    this.promptPrefix = this.profile.promptUser + "@" + this.profile.promptHost + ":" + displayPath + "$ ";
  }

  handleKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.submitCommand(this.buffer);
      this.buffer = "";
      this.ui.setPrompt(this.promptPrefix, this.buffer);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      this.buffer = this.buffer.slice(0, -1);
      this.ui.setPrompt(this.promptPrefix, this.buffer);
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      this.buffer += event.key;
      this.ui.setPrompt(this.promptPrefix, this.buffer);
    }
  }

  complete() {
    const beforeCursor = this.buffer;
    const tokenMatch = beforeCursor.match(/(?:^|\s)([^\s]*)$/);
    if (!tokenMatch) return;
    const token = tokenMatch[1];
    const tokenStart = beforeCursor.length - token.length;
    const commandName = beforeCursor.slice(0, tokenStart).trim().split(/\s+/)[0]?.toLowerCase();
    const candidates = commandName === "install"
      ? this.completeProgram(token)
      : commandName && tokenStart > 0
        ? this.completePath(token)
        : this.completeCommand(token);

    if (candidates.length === 0) return;
    const common = this.longestCommonPrefix(candidates);
    const replacement = common.length > token.length ? common : candidates[0];
    this.buffer = beforeCursor.slice(0, tokenStart) + replacement;
    if (candidates.length > 1) {
      this.ui.appendTerminalLine(candidates.join("\n"));
    }
    this.ui.setPrompt(this.promptPrefix, this.buffer);
  }

  completeCommand(prefix) {
    const installed = (this.fileSystem.list("/programs") || [])
      .filter((entry) => entry.type === "file")
      .flatMap((entry) => [entry.name, entry.name.replace(/\.[^.]+$/, "")]);
    return [...new Set([...this.commands, ...installed])]
      .filter((command) => command.toLowerCase().startsWith(prefix.toLowerCase()))
      .sort((left, right) => left.localeCompare(right));
    }

    completeProgram(prefix) {
    return [...new Set((this.availablePrograms || []).flatMap((program) => [program.id, program.name]))]
      .filter((program) => program.toLowerCase().startsWith(prefix.toLowerCase()))
      .sort((left, right) => left.localeCompare(right));
  }

  async simulateNpmInstall(pkgName, pkgSize = 5) {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const clampedSize = Math.max(0, Math.min(10, pkgSize));
    const totalPackages = Math.floor(clampedSize * 42) + 1;
    const auditVulnerabilities = clampedSize > 6 ? 1 : 0;
    const barWidth = 24;
    const totalDurationMs = 800 + clampedSize * 700;
    const steps = 20;
    const stepInterval = totalDurationMs / steps;
    const actions = ['idealTree', 'fetchMetadata', 'reify', 'extract', 'finalize'];
    let lastProgressLine = -1;

    this.ui.appendTerminalLine(`$ npm i ${pkgName}`);
    await sleep(150);
    this.ui.appendTerminalLine(`npm WARN deprecated ${pkgName}-core@0.1.0: legacy build pipeline detected`);
    await sleep(300);

    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const filledLength = Math.round(barWidth * progress);
      const emptyLength = barWidth - filledLength;
      const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
      const pct = Math.floor(progress * 100);
      const stage = actions[Math.min(actions.length - 1, Math.floor(progress * actions.length))];
      const line = `[${bar}] ${stage}: ${pct}%`;
      if (lastProgressLine >= 0) {
        const terminalMonitor = document.querySelector('#terminal-monitor');
        if (terminalMonitor?.children[lastProgressLine]) {
          terminalMonitor.children[lastProgressLine].textContent = line;
        }
      } else {
        this.ui.appendTerminalLine(line);
        lastProgressLine = document.querySelector('#terminal-monitor')?.children.length - 1;
      }
      await sleep(stepInterval);
    }

    const elapsedSec = (totalDurationMs / 1000).toFixed(1);
    this.ui.appendTerminalLine(`added ${totalPackages} package${totalPackages > 1 ? 's' : ''}, and audited ${totalPackages + 8} packages in ${elapsedSec}s`);
    this.ui.appendTerminalLine('');

    if (clampedSize > 2) {
      this.ui.appendTerminalLine(`${Math.max(1, Math.floor(clampedSize * 3))} packages are looking for funding`);
      this.ui.appendTerminalLine('  run `npm fund` for details');
      this.ui.appendTerminalLine('');
    }

    if (auditVulnerabilities > 0) {
      this.ui.appendTerminalLine(`found ${auditVulnerabilities} moderate severity vulnerability`);
      this.ui.appendTerminalLine('  run `npm audit fix` to fix them, or `npm audit` for details');
    } else {
      this.ui.appendTerminalLine('found 0 vulnerabilities');
    }
  }


  completePath(token) {
    const slash = token.lastIndexOf("/");
    const directoryToken = slash === -1 ? "" : token.slice(0, slash + 1);
    const namePrefix = slash === -1 ? token : token.slice(slash + 1);
    const directoryPath = this.resolvePath(directoryToken || ".");
    const entries = this.fileSystem.list(directoryPath) || [];
    return entries
      .filter((entry) => entry.name.toLowerCase().startsWith(namePrefix.toLowerCase()))
      .map((entry) => directoryToken + entry.name + (entry.type === "directory" ? "/" : ""))
      .sort((left, right) => left.localeCompare(right));
  }

  longestCommonPrefix(values) {
    let prefix = values[0];
    for (const value of values.slice(1)) {
      let length = 0;
      while (length < prefix.length && prefix[length].toLowerCase() === value[length]?.toLowerCase()) length += 1;
      prefix = prefix.slice(0, length);
    }
    return prefix;
  }

  submitCommand(raw) {
    const command = raw.trim();
    this.ui.appendTerminalInput(this.promptPrefix + raw);

    if (!command) {
      return;
    }

    const parts = command.split(" ");
    const primary = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (args.length === 1 && ["help", "--help", "-h"].includes(args[0].toLowerCase())) {
      this.showCommandHelp(primary);
      return;
    }

    if (primary === "help") {
      this.ui.appendTerminalLine("Commands:");
      this.ui.appendTerminalLine("help");
      this.ui.appendTerminalLine("clear");
      this.ui.appendTerminalLine("echo");
      this.ui.appendTerminalLine("date");
      this.ui.appendTerminalLine("whoami");
      this.ui.appendTerminalLine("pwd");
      this.ui.appendTerminalLine("ls");
      this.ui.appendTerminalLine("cd <dir>");
      this.ui.appendTerminalLine("cat <file>");
      this.ui.appendTerminalLine("open <path>");
      this.ui.appendTerminalLine("mv <source> <destination>");
      this.ui.appendTerminalLine("rm <file>");
      this.ui.appendTerminalLine("install <program>");
      this.ui.appendTerminalLine("reboot");
      this.ui.appendTerminalLine("python3 <file.py>");
      this.ui.appendTerminalLine("ps");
      this.ui.appendTerminalLine("kill <pid>");
      this.ui.appendTerminalLine("focus <pid>");
      this.ui.appendTerminalLine("exit");
      this.ui.appendTerminalLine("snap [program ...]");
      this.ui.appendTerminalLine("system");
      this.ui.appendTerminalLine("task-manager");
      this.ui.appendTerminalLine("rm <file>");
      this.ui.appendTerminalLine("install <program>");
      this.ui.appendTerminalLine("reboot");
      return;
    }

    if (primary === "clear") {
      this.ui.clearTerminal();
      return;
    }

    if (primary === "echo") {
      this.ui.appendTerminalLine(args.join(" "));
      return;
    }

    if (primary === "date") {
      this.ui.appendTerminalLine(new Date().toString());
      return;
    }

    if (primary === "whoami") {
      this.ui.appendTerminalLine(this.profile.promptUser);
      return;
    }

    if (primary === "python3" || primary === "python") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: python3 <file.py>");
        return;
      }
      const path = this.resolvePath(target);
      const result = this.fakePython.run(path);
      for (const line of result?.output || []) this.ui.appendTerminalLine(line);
      if (result?.error) this.ui.appendTerminalLine("PythonError: " + result.error);
      return;
    }

    if (primary === "exit") {
      const activeWindow = this.windowManager.getActiveWindowId();
      const focusedPid = [...this.processWindows.entries()].find(([, windowId]) => windowId === activeWindow)?.[0];
      this.submitCommand(focusedPid ? "kill " + focusedPid : "kill 1");
      return;
    }

    if (primary === "ps") {
      this.ui.appendTerminalLine("PID  PROGRAM");
      for (const [pid, name] of this.processes) {
        this.ui.appendTerminalLine(String(pid).padEnd(5) + name);
      }
      return;
    }

    if (primary === "kill") {
      const pid = Number(args[0]);
      if (!Number.isInteger(pid)) {
        this.ui.appendTerminalLine("Usage: kill <pid>");
        return;
      }
      if (!this.processes.has(pid)) {
        this.ui.appendTerminalLine("Process not found: " + pid);
        return;
      }
      const name = this.processes.get(pid);
      this.processes.delete(pid);
      this.resourceManager?.stop(pid);
      if (this.syncProcesses) this.syncProcesses();
      const windowId = this.processWindows.get(pid);
      if (this.stopProgram) this.stopProgram(pid, windowId);
      if (pid === 1) {
        this.ui.appendTerminalLine("Critical process terminated. Rebooting system...");
        if (this.rebootSystem) this.rebootSystem();
        return;
      }
      if (pid === 2) {
        this.running = false;
        this.windowManager.remove("terminal-main");
        this.ui.setTerminalVisible(false);
      } else if (windowId) {
        this.windowManager.remove(windowId);
        this.ui.setWindowVisible(windowId, false);
      }
      this.ui.appendTerminalLine("Killed " + name + " (" + pid + ")");
      return;
    }

    if (primary === "mv") {
      if (args.length !== 2) {
        this.ui.appendTerminalLine("Usage: mv <source> <destination>");
        return;
      }
      const source = this.resolvePath(args[0]);
      const destination = this.resolvePath(args[1]);
      if (!this.fileSystem.move(source, destination)) {
        this.ui.appendTerminalLine("Move failed");
        return;
      }
      this.ui.appendTerminalLine(source + " -> " + destination);
      return;
    }

    if (primary === "rm") {
      if (args.length !== 1) {
        this.ui.appendTerminalLine("Usage: rm <file>");
        return;
      }
      const path = this.resolvePath(args[0]);
      const node = this.fileSystem.resolve(path);
      if (!node || node.type !== "file" || !this.fileSystem.remove(path)) {
        this.ui.appendTerminalLine("File not found: " + path);
        return;
      }
      if (node.executable) {
        const programIdToProcessName = { "codepad-plus": "codepad+", "clawder-python": "clawder-python", "music-player": "music-player", "task-manager": "task-manager", "settings": "settings", "files": "files", "terminal": "terminal" };
        const processName = programIdToProcessName[node.executable] || node.executable;
        const processId = [...this.processes.entries()].find(([, name]) => name === processName)?.[0];
        if (processId) this.submitCommand("kill " + processId);
        if (this.programChanged) this.programChanged();
      }
      this.ui.appendTerminalLine("Removed " + path);
      return;
    }

    if (primary === "install") {
      if (args.length !== 1) {
        this.ui.appendTerminalLine("Usage: install <program>");
        return;
      }
      const requested = args[0].toLowerCase();
      const packageInfo = this.availablePrograms?.find((program) => program.id.toLowerCase() === requested || program.name.toLowerCase() === requested);
      if (!packageInfo) {
        this.ui.appendTerminalLine("Package not found: " + args[0]);
        return;
      }
      const pkgSize = Math.max(1, Math.min(10, Math.ceil(packageInfo.ramMb / 400)));
      this.simulateNpmInstall(packageInfo.id, pkgSize).then(() => {
        this.fileSystem.installProgram(packageInfo);
        if (this.programChanged) this.programChanged();
      }).catch(() => {});
      return;
    }

    if (primary === "reboot") {
      this.rebootSystem?.();
      return;
    }

    if (primary === "pwd") {
      this.ui.appendTerminalLine(this.currentPath);
      return;
    }

    if (primary === "ls") {
      const entries = this.fileSystem.list(this.currentPath);
      if (!entries) {
        this.ui.appendTerminalLine("Not a directory: " + this.currentPath);
        return;
      }
      for (const entry of entries) {
        this.ui.appendTerminalLine(entry.type === "directory" ? entry.name + "/" : entry.name);
      }
      return;
    }

    if (primary === "cd") {
      const target = args[0] || "/home";
      const path = this.resolvePath(target);
      const entries = this.fileSystem.list(path);
      if (!entries) {
        this.ui.appendTerminalLine("Directory not found: " + path);
        return;
      }
      this.currentPath = path;
      this.updatePromptPrefix();
      if (this.filesApp) this.filesApp.setPath(path, false);
      this.ui.appendTerminalLine(this.currentPath);
      return;
    }

    if (primary === "cat" || primary === "open") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: " + primary + " <path>");
        return;
      }
      const path = this.resolvePath(target);
      const content = this.fileSystem.read(path);
      if (content === null) {
        this.ui.appendTerminalLine("File not found: " + path);
        return;
      }
      this.ui.appendTerminalLine(content);
      if (primary === "open") {
        const node = this.fileSystem.resolve(path);
        if (node?.format === "audio" && this.launchProgram) {
          this.launchProgram("music-player");
          this.filesApp.open(path);
          this.windowManager.focus("music-player");
        } else if (this.codePadApp && this.codePadApp.open(path)) this.windowManager.focus("codepad");
        else this.filesApp.open(path);
      }
      return;
    }

    if (primary === "focus") {
      const pid = Number(args[0]);
      const target = this.processWindows.get(pid);
      if (!target || !this.processes.has(pid)) {
        this.ui.appendTerminalLine("Usage: focus <pid from ps>");
        return;
      }

      if (this.restoreProcess && !this.restoreProcess(pid)) {
        this.ui.appendTerminalLine("Process window unavailable: " + pid);
        return;
      }
      const ok = this.windowManager.focus(target);
      if (!ok) {
        this.ui.appendTerminalLine("Window not found: " + target);
        return;
      }

      this.ui.appendTerminalLine("Focused " + this.processes.get(pid) + " (" + pid + ")");
      return;
    }

    if (primary === "terminal") {
      this.start();
      this.windowManager.focus("terminal-main");
      return;
    }

    if (primary === "settings") {
      if (this.launchProgram) this.launchProgram("settings");
      this.ui.appendTerminalLine("Opened Settings");
      return;
    }

    if (primary === "system") {
      if (this.launchProgram) this.launchProgram("task-manager");
      this.ui.appendTerminalLine("Opened TaskManager");
      return;
    }

    if (primary === "music-player" || primary === "music") {
      if (this.launchProgram) this.launchProgram("music-player");
      this.ui.appendTerminalLine("Opened Music Player");
      return;
    }

    if (primary === "task-manager") {
      if (this.launchProgram) this.launchProgram("task-manager");
      this.ui.appendTerminalLine("Opened TaskManager");
      return;
    }

    if (primary === "snap") {
      if (args.length > 4) {
        this.ui.appendTerminalLine("Usage: snap [program ...] (maximum 4 programs)");
        return;
      }
      const selected = [];
      for (const name of args) {
        const process = this.resolveProcess(name);
        if (!process) {
          this.ui.appendTerminalLine("Program not found: " + name);
          return;
        }
        if (!this.processes.has(process.pid) && process.launch) process.launch();
        if (!this.processes.has(process.pid)) {
          this.ui.appendTerminalLine("Program is not running: " + name);
          return;
        }
        if (!selected.includes(process.pid)) selected.push(process.pid);
      }
      const windowIds = selected.length ? selected : this.ui.getVisibleWindowIds(this.processWindows);
      if (windowIds.length < 1 || windowIds.length > 4 || !this.ui.snapWindows(windowIds, this.processWindows)) {
        this.ui.appendTerminalLine("snap requires between 1 and 4 open programs");
        return;
      }
      this.ui.appendTerminalLine("Snapped " + windowIds.map((pid) => this.processes.get(pid)).join(", "));
      return;
    }

    const program = this.fileSystem.findProgram(parts[0]);
    if (program) {
      if (this.launchProgram) this.launchProgram(program.executable);
      this.ui.appendTerminalLine("Launched " + program.programName);
      return;
    }

    if (primary === "files") {
      if (!this.processes.has(3)) {
        this.processes.set(3, "files");
        this.resourceManager?.start(3, "files", { visible: true, getWindowText: () => this.ui.getWindowText("files") });
        this.windowManager.add("files");
        this.ui.setWindowVisible("files", true);
      }
      this.windowManager.focus("files");
      this.ui.appendTerminalLine("Opened Files");
      return;
    }

    this.ui.appendTerminalLine("Command not found: " + primary);
  }

  resolvePath(path) {
    return this.fileSystem.normalize(path.startsWith("/") ? path : this.currentPath + "/" + path);
  }

  resolveProcess(name) {
    const requested = name.toLowerCase();
    const aliases = {
      terminal: [2, "terminal"],
      files: [3, "files"],
      "codepad+": [4, "codepad+"],
      codepad: [4, "codepad+"],
      "clawder-python": [5, "clawder-python"],
      clawder: [5, "clawder-python"],
      settings: [6, "settings"],
      "music-player": [8, "music-player"],
      music: [8, "music-player"]
      ,"task-manager": [7, "task-manager"]
      ,"music-player": [8, "music-player"]
    };
    const match = aliases[requested];
    if (!match) return null;
    return {
      pid: match[0],
      name: match[1],
      launch: () => {
        if (match[0] === 1) this.ui.appendTerminalLine("System daemon is already running.");
        else if (match[0] === 2) this.start();
        else if (match[0] === 3) {
          this.processes.set(3, "files");
          this.windowManager.add("files");
          this.ui.setWindowVisible("files", true);
        } else this.launchProgram?.(["codepad", "codepad+"].includes(requested) ? "codepad-plus" : requested);
      }
    };
  }

  showCommandHelp(command) {
    const documentation = this.commandDocs[command];
    if (!documentation) {
      this.ui.appendTerminalLine("No help topic for: " + command);
      return;
    }
    for (const line of documentation) this.ui.appendTerminalLine(line);
  }
}
