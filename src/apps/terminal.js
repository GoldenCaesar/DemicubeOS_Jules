import { playerNetworkState } from "../core/network-state.js";

export class TerminalApp {
  constructor({ ui, profile, windowManager, fileSystem, filesApp, rebootSystem, fakePython, resourceManager, loggingSystem = null }) {
    this.ui = ui;
    this.profile = profile;
    this.windowManager = windowManager;
    this.fileSystem = fileSystem;
    this.filesApp = filesApp;
    this.rebootSystem = rebootSystem;
    this.fakePython = fakePython;
    this.resourceManager = resourceManager;
    this.loggingSystem = loggingSystem;
    this.currentPath = "/home/admin";
    this.running = true;
    this.processWindows = new Map([
      [2, "terminal-main"],
      [3, "files"],
      [4, "codepad"],
      [5, "clawder-python"],
      [6, "settings"],
      [7, "task-manager"],
      [8, "music-player"],
      [9, "zenmap"],
      [10, "vpnguard"]
    ]);
    this.processes = new Map([
      [1, "system"],
      [2, "terminal"],
      [3, "files"]
    ]);
    this.buffer = "";
    this.promptPrefix = profile.promptUser + "@" + profile.promptHost + ":~$ ";
    this.commands = [
      "help", "clear", "echo", "date", "whoami", "hostname", "pwd", "ls", "cd", "cat", "open", "cp", "mv", "rm",
      "install", "reboot", "python3", "python", "ps", "kill", "focus", "exit", "logout",
      "terminal", "files", "settings", "system", "task-manager", "music-player", "music", "zenmap", "vpnguard", "codepad", "codepad+", "clawder-python", "snap",
      "ssh", "nano", "grep", "sudo", "touch", "chmod", "mkdir", "session", "sessions", "ifconfig", "curl", "ip", "route"
    ];
    this.commandDocs = {
      help: ["help - show the command index", "Usage: help", "Use '<command> help' for detailed command documentation."],
      clear: ["clear - clear the terminal monitor", "Usage: clear", "Example: clear"],
      echo: ["echo - print text to the terminal", "Usage: echo <text>", "Example: echo mission ready"],
      date: ["date - print the simulated system date and time", "Usage: date"],
      whoami: ["whoami - print the current logged-in user", "Usage: whoami"],
      hostname: ["hostname - print the current machine hostname", "Usage: hostname"],
      pwd: ["pwd - print the current virtual directory", "Usage: pwd"],
      ls: ["ls - list files and folders in the current directory", "Usage: ls [-a|-la] [directory]", "Example: ls -la /var/log"],
      cd: ["cd - change the current virtual directory", "Usage: cd <directory>", "Example: cd /var/log", "Use cd .. or cd ~ to navigate."],
      cat: ["cat - print a virtual file to the terminal", "Usage: cat <file>", "Example: cat /var/log/auth.log"],
      open: ["open - open a virtual file in its appropriate application", "Usage: open <path>", "Text and Python files open in CodePad+."],
      cp: ["cp - copy virtual files or directories", "Usage: cp <source> <destination>", "Example: cp /documents/zenmap/savedata.ini /home/admin/backup.ini"],
      mv: ["mv - move or rename a virtual file", "Usage: mv <source> <destination>", "Example: mv /home/old.txt /home/new.txt"],
      python3: ["python3 - run a Python file in the safe virtual interpreter", "Usage: python3 <file.py>", "Example: python3 /documents/example.py", "Only supported sandboxed Python features can run."],
      python: ["python - alias for the safe virtual Python interpreter", "Usage: python <file.py>", "Example: python /documents/example.py"],
      ps: ["ps - list currently running virtual processes", "Usage: ps", "The PID shown here can be used with kill or focus."],
      kill: ["kill - stop a running virtual process", "Usage: kill <pid>", "Example: kill 4", "Killing system triggers a reboot. The persistent terminal input cannot be removed."],
      focus: ["focus - focus a running application by its process ID", "Usage: focus <pid>", "Example: focus 3", "Use ps to find valid process IDs."],
      exit: ["exit - disconnect current SSH session or close application", "Usage: exit"],
      logout: ["logout - disconnect current SSH session or log out of system", "Usage: logout"],
      terminal: ["terminal - launch or restore the visible terminal window", "Usage: terminal"],
      files: ["files - launch or focus the Files application", "Usage: files"],
      settings: ["settings - launch or focus the game settings", "Usage: settings", "Change the User Text Color used for terminal command history."],
      system: ["system - the core OS daemon", "Usage: system", "The daemon has no window. Killing PID 1 reboots the system."],
      "task-manager": ["task-manager - open the running-process manager", "Usage: task-manager", "View and terminate running virtual processes."],
      "music-player": ["music-player - play MP3 files from the virtual music directory", "Usage: music-player", "Use upload in Music Player to add MP3s to /music."],
      snap: ["snap - tile visible applications evenly across the desktop", "Usage: snap [program ...]", "Up to four named programs can be supplied. Inactive named programs are launched first."],
      rm: ["rm - remove virtual files or wildcard (*)", "Usage: rm [-r] <file> or rm *", "Example: rm *", "Files and folders are restored upon system reboot."],
      install: ["install - restore an available program package", "Usage: install <program>", "Example: install clawder-python"],
      reboot: ["reboot - restart the test computer from its original system state", "Usage: reboot", "Files and installed programs removed during the session are restored."],
      ssh: ["ssh - connect to a remote host via simulated SSH", "Usage: ssh <user>@<host> or ssh <host>", "Example: ssh admin@steves-computer"],
      nano: ["nano - lightweight terminal text editor", "Usage: nano <file>", "Use ^O to save, ^X to exit editor."],
      grep: ["grep - search for patterns in files or standard input", "Usage: grep [-i] [-v] [-n] [-c] <pattern> [file]", "Example: cat /var/log/syslog | grep sshd"],
      sudo: ["sudo - execute a command with administrative privileges", "Usage: sudo <command>", "Example: sudo chmod 600 book_draft.txt"],
      touch: ["touch - create an empty file or update timestamp", "Usage: touch <file>", "Example: touch /var/log/custom.log"],
      chmod: ["chmod - change file permissions", "Usage: chmod <mode> <file>", "Example: chmod 600 book_draft.txt"],
      mkdir: ["mkdir - create directory", "Usage: mkdir [-p] <directory>", "Example: mkdir /home/admin/notes"],
      session: ["session - display active SSH session chain and hops", "Usage: session"],
      sessions: ["sessions - alias for session", "Usage: sessions"],
      zenmap: [
        "zenmap - launch Zenmap GUI or execute topology mapping commands from terminal",
        "Usage: zenmap [command] [args...]",
        "Commands: open, close, scan, rescan, tab, layout, filter, zoom, inspect, ssh, target, profile, add, rm, list, status, clear, help",
        "Example: zenmap scan",
        "Example: zenmap inspect steves-testbox",
        "Example: zenmap tab hosts",
        "Example: zenmap add 10.0.9.1 vault-server \"Database Vault\" \"FreeBSD 14\"",
        "Data: stored modularly in /documents/zenmap/savedata.ini"
      ],
      vpnguard: [
        "vpnguard - secure network tunnel manager & virtual interface controller",
        "Usage: vpnguard [status | connect <consumer|work|p2p> | disconnect | profiles | reload | gui]",
        "Modes: consumer (Mullvad-style privacy), work (Aegis corporate), p2p (peer direct)",
        "Example: vpnguard connect consumer zurich",
        "Example: vpnguard connect work aegis_work",
        "Example: vpnguard connect p2p 10.9.0.2",
        "Example: vpnguard status",
        "Example: vpnguard disconnect",
        "Config & Profiles: /documents/vpnguard/savedata.ini"
      ],
      ifconfig: [
        "ifconfig - display or configure network interfaces (eth0, tun0)",
        "Usage: ifconfig",
        "Displays active IP, netmask, and virtual VPN interface status."
      ],
      curl: [
        "curl - transfer data from or to a server",
        "Usage: curl <url>",
        "Example: curl ifconfig.me (returns current egress public IP)"
      ]
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
    const currentSession = this.loggingSystem?.getCurrentSession();
    const user = currentSession?.user || this.profile.promptUser;
    const host = currentSession?.hostname || this.profile.promptHost;
    const homeDir = "/home/" + user;
    let displayPath = this.currentPath;
    if (displayPath === homeDir || (displayPath === "/" && !homeDir)) {
      displayPath = "~";
    } else if (displayPath.startsWith(homeDir + "/")) {
      displayPath = "~" + displayPath.slice(homeDir.length);
    }
    this.promptPrefix = user + "@" + host + ":" + displayPath + "$ ";
    this.ui.setTerminalTitle?.("Terminal - " + user + "@" + host + ":" + displayPath);
    this.ui.setPrompt?.(this.promptPrefix, this.buffer);
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

  async simulateFileRemoval(fileName, node) {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    // Scale the dots and duration according to simulated file size and type
    let dots = 6;
    let dotInterval = 45;
    
    if (node) {
      if (node.format === "audio") {
        dots = 14;
        dotInterval = 55;
      } else if (fileName.endsWith(".sys")) {
        dots = 16;
        dotInterval = 60;
      } else if (fileName.endsWith(".bin")) {
        dots = node.executable ? 12 : 9;
        dotInterval = 48;
      } else if (fileName.endsWith(".log")) {
        dots = 8;
        dotInterval = 40;
      } else {
        const len = typeof node.content === "string" ? node.content.length : 80;
        dots = len > 300 ? 7 : 5;
        dotInterval = 35;
      }
    }
    
    const baseText = `removing '${fileName}' `;
    this.ui.appendTerminalLine(baseText + ".");
    const terminalMonitor = document.querySelector("#terminal-monitor");
    const lineIndex = terminalMonitor ? terminalMonitor.children.length - 1 : -1;
    
    for (let d = 2; d <= dots; d++) {
      await sleep(dotInterval);
      if (lineIndex >= 0 && terminalMonitor?.children[lineIndex]) {
        terminalMonitor.children[lineIndex].textContent = baseText + ".".repeat(d);
        terminalMonitor.scrollTop = terminalMonitor.scrollHeight;
      }
    }
    
    await sleep(dotInterval);
    if (lineIndex >= 0 && terminalMonitor?.children[lineIndex]) {
      terminalMonitor.children[lineIndex].textContent = baseText + ".".repeat(dots) + " done";
      terminalMonitor.scrollTop = terminalMonitor.scrollHeight;
    }
    await sleep(35);
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

    // Append to ~/.bash_history
    this.loggingSystem?.logCommand(raw);

    // Check pipeline
    if (command.includes("|")) {
      this.executePipeline(command);
      return;
    }

    // Check standalone redirection (> file or >> file)
    if (command.startsWith(">") || command.startsWith(">>")) {
      const target = command.replace(/^>+/, "").trim();
      if (!target) {
        this.ui.appendTerminalLine("sh: syntax error near unexpected token 'newline'");
        return;
      }
      const resolved = this.resolvePath(target);
      this.fileSystem.write(resolved, "");
      this.loggingSystem?.logFileAccess(resolved, "modified", "/bin/sh");
      return;
    }

    // Check command redirection (cmd > file or cmd >> file)
    if (command.includes(">")) {
      this.executeRedirection(command);
      return;
    }

    this.executeSingleCommand(command);
  }

  executeRedirection(command) {
    const isAppend = command.includes(">>");
    const parts = isAppend ? command.split(">>") : command.split(">");
    const leftCmd = parts[0].trim();
    const targetFile = parts.slice(1).join(isAppend ? ">>" : ">").trim();

    if (!targetFile) {
      this.ui.appendTerminalLine("sh: syntax error near unexpected token 'newline'");
      return;
    }
    const resolved = this.resolvePath(targetFile);

    if (leftCmd === "cat /dev/null" || leftCmd === ":") {
      this.fileSystem.write(resolved, "");
      this.loggingSystem?.logFileAccess(resolved, "modified", "/bin/cat");
      return;
    }

    const output = this.executeCommandCaptured(leftCmd);
    const content = output.join("\n") + (output.length ? "\n" : "");
    if (isAppend) {
      this.fileSystem.append(resolved, content);
    } else {
      this.fileSystem.write(resolved, content);
    }
    this.loggingSystem?.logFileAccess(resolved, "modified", "/bin/sh");
  }

  executePipeline(command) {
    const stages = command.split("|").map((s) => s.trim()).filter(Boolean);
    let currentInput = null;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const isLast = i === stages.length - 1;
      if (isLast) {
        this.executeSingleCommand(stage, currentInput);
      } else {
        currentInput = this.executeCommandCaptured(stage, currentInput);
      }
    }
  }

  executeCommandCaptured(cmdStr, stdin = null) {
    const captured = [];
    const origAppend = this.ui.appendTerminalLine.bind(this.ui);
    this.ui.appendTerminalLine = (line) => {
      captured.push(line);
    };
    try {
      this.executeSingleCommand(cmdStr, stdin);
    } finally {
      this.ui.appendTerminalLine = origAppend;
    }
    return captured;
  }

  executeSingleCommand(command, stdin = null) {
    const parts = command.split(" ");
    const primary = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (args.length === 1 && ["help", "--help", "-h"].includes(args[0].toLowerCase())) {
      this.showCommandHelp(primary);
      return;
    }

    if (primary === "sudo") {
      const rest = args.join(" ");
      this.loggingSystem?.logSudo(rest, this.currentPath);
      if (rest) {
        this.executeSingleCommand(rest, stdin);
      }
      return;
    }

    if (primary === "ssh") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: ssh <user>@<host> or ssh <host>");
        return;
      }
      const newHop = this.loggingSystem?.connectSSH(target);
      if (newHop) {
        this.fileSystem = newHop.fileSystem;
        this.currentPath = "/home/" + newHop.user;
        this.updatePromptPrefix();
        this.ui.setPrompt(this.promptPrefix, this.buffer);
        this.ui.appendTerminalLine("The authenticity of host '" + newHop.hostname + " (" + newHop.ip + ")' can't be established.");
        this.ui.appendTerminalLine("ECDSA key fingerprint is SHA256:7mKp90qXv5hY3bZ1+L8n4wE6uQ2rT1sO.");
        this.ui.appendTerminalLine("Connected to " + newHop.hostname + " (" + newHop.ip + ").");
        const prevIp = this.loggingSystem.getPreviousSession()?.ip || "10.0.0.5";
        this.ui.appendTerminalLine("Last login: " + new Date().toUTCString().slice(0, 25) + " from " + prevIp);
      }
      return;
    }

    if (primary === "exit" || primary === "logout") {
      if (this.loggingSystem?.isInSSHSession()) {
        const popped = this.loggingSystem.disconnectSSH();
        const current = this.loggingSystem.getCurrentSession();
        this.fileSystem = current.fileSystem;
        this.currentPath = "/home/" + current.user;
        this.updatePromptPrefix();
        this.ui.setPrompt(this.promptPrefix, this.buffer);
        this.ui.appendTerminalLine("Connection to " + popped.hostname + " closed.");
        return;
      }
      const activeWindow = this.windowManager.getActiveWindowId();
      const focusedPid = [...this.processWindows.entries()].find(([, windowId]) => windowId === activeWindow)?.[0];
      this.submitCommand(focusedPid ? "kill " + focusedPid : "kill 1");
      return;
    }

    if (primary === "session" || primary === "sessions") {
      this.ui.appendTerminalLine("SSH Session Chain (Hops):");
      const chain = this.loggingSystem ? this.loggingSystem.getSessionChain() : [];
      chain.forEach((hop, idx) => {
        const isLocal = idx === 0;
        const isCurrent = idx === chain.length - 1;
        const tag = isCurrent ? "[CURRENT]" : isLocal ? "[LOCAL]" : "[HOP]";
        this.ui.appendTerminalLine(`  [${idx}] ${hop.user}@${hop.hostname} (${hop.ip}) ${tag}`);
      });
      return;
    }

    if (primary === "nano") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: nano <path>");
        return;
      }
      const path = this.resolvePath(target);
      let content = this.fileSystem.read(path);
      if (content === null) {
        content = "";
      }
      this.ui.openNano?.(
        path,
        content,
        (savePath, newContent) => {
          this.fileSystem.write(savePath, newContent);
          this.loggingSystem?.logFileAccess(savePath, "modified", "/bin/nano");
          if (this.zenmapApp && (savePath.includes("zenmap") || savePath.includes("savedata.ini") || savePath.includes("hosts.ini"))) {
            this.zenmapApp.reloadFromDisk();
          }
          if (this.vpnguardApp && (savePath.includes("vpnguard") || savePath.includes("savedata.ini"))) {
            this.vpnguardApp.loadFromDisk();
          }
        },
        () => {
          this.ui.appendTerminalLine("Exited nano (" + path + ")");
        }
      );
      return;
    }

    if (primary === "grep") {
      let ignoreCase = false;
      let invert = false;
      let showLineNumbers = false;
      let countOnly = false;
      const filteredArgs = [];
      for (const arg of args) {
        if (arg.startsWith("-") && arg.length > 1) {
          if (arg.includes("i")) ignoreCase = true;
          if (arg.includes("v")) invert = true;
          if (arg.includes("n")) showLineNumbers = true;
          if (arg.includes("c")) countOnly = true;
        } else {
          filteredArgs.push(arg);
        }
      }
      let pattern = filteredArgs[0] || "";
      if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) {
        pattern = pattern.slice(1, -1);
      }
      const filePath = filteredArgs[1];

      let linesToSearch = [];
      if (filePath) {
        const resolved = this.resolvePath(filePath);
        const content = this.fileSystem.read(resolved);
        if (content === null) {
          this.ui.appendTerminalLine("grep: " + filePath + ": No such file or directory");
          return;
        }
        this.loggingSystem?.logFileAccess(resolved, "opened", "/bin/grep");
        linesToSearch = content.split("\n");
      } else if (stdin && Array.isArray(stdin)) {
        linesToSearch = stdin;
      } else {
        this.ui.appendTerminalLine("Usage: grep [-i] [-v] [-n] [-c] <pattern> [file]");
        return;
      }

      const matches = [];
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), ignoreCase ? "i" : "");

      linesToSearch.forEach((line, index) => {
        if (!line && index === linesToSearch.length - 1) return;
        const isMatch = regex.test(line);
        if ((isMatch && !invert) || (!isMatch && invert)) {
          matches.push(showLineNumbers ? `${index + 1}:${line}` : line);
        }
      });

      if (countOnly) {
        this.ui.appendTerminalLine(String(matches.length));
        return;
      }

      for (const m of matches) {
        this.ui.appendTerminalLine(m);
      }
      return;
    }

    if (primary === "touch") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: touch <path>");
        return;
      }
      const path = this.resolvePath(target);
      this.fileSystem.touch(path);
      this.loggingSystem?.logFileAccess(path, "modified", "/bin/touch");
      return;
    }

    if (primary === "chmod") {
      if (args.length < 2) {
        this.ui.appendTerminalLine("Usage: chmod <mode> <path>");
        return;
      }
      const mode = args[0];
      const path = this.resolvePath(args[1]);
      const ok = this.fileSystem.chmod(path, mode);
      if (!ok) {
        this.ui.appendTerminalLine("chmod: cannot access '" + args[1] + "': No such file or directory");
        return;
      }
      this.loggingSystem?.logFileAccess(path, "modified", "/bin/chmod");
      return;
    }

    if (primary === "mkdir") {
      const nonFlags = args.filter((a) => !a.startsWith("-"));
      const target = nonFlags[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: mkdir [-p] <directory>");
        return;
      }
      const path = this.resolvePath(target);
      this.fileSystem.mkdir(path);
      this.loggingSystem?.logFileAccess(path, "modified", "/bin/mkdir");
      return;
    }

    if (primary === "hostname") {
      const currentSession = this.loggingSystem?.getCurrentSession();
      this.ui.appendTerminalLine(currentSession?.hostname || this.profile.promptHost);
      return;
    }

    if (primary === "help") {
      this.ui.appendTerminalLine("Commands:");
      this.ui.appendTerminalLine("help, clear, echo, date, whoami, hostname, pwd, ls, cd <dir>");
      this.ui.appendTerminalLine("cat <file>, open <path>, nano <file>, grep <pattern> [file]");
      this.ui.appendTerminalLine("touch <file>, chmod <mode> <file>, mkdir <dir>");
      this.ui.appendTerminalLine("mv <source> <destination>, rm [-r] <file> or rm *");
      this.ui.appendTerminalLine("ssh <host>, session, sudo <cmd>, exit, logout");
      this.ui.appendTerminalLine("install <program>, reboot, python3 <file.py>, ps, kill <pid>, focus <pid>");
      this.ui.appendTerminalLine("snap [program ...], system, files, settings, task-manager, music-player, zenmap");
      this.ui.appendTerminalLine("Pipes (|) and Redirections (> / >>) supported.");
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
      const currentSession = this.loggingSystem?.getCurrentSession();
      this.ui.appendTerminalLine(currentSession?.user || this.profile.promptUser);
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
        this.ui.appendTerminalLine("Critical process terminated. System crash initiated...");
        if (this.crashSystem) {
          this.crashSystem("kill_1");
        } else if (this.rebootSystem) {
          this.rebootSystem();
        }
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
      this.loggingSystem?.logSyslog("systemd[1]: Process " + name + " [PID " + pid + "] terminated.");
      this.ui.appendTerminalLine("Killed " + name + " (" + pid + ")");
      return;
    }

    if (primary === "cp") {
      if (args.length !== 2) {
        this.ui.appendTerminalLine("Usage: cp <source> <destination>");
        return;
      }
      const source = this.resolvePath(args[0]);
      const destination = this.resolvePath(args[1]);
      if (!this.fileSystem.copy(source, destination)) {
        this.ui.appendTerminalLine("cp: cannot copy '" + args[0] + "' to '" + args[1] + "'");
        return;
      }
      this.loggingSystem?.logFileAccess(source, "copied to " + destination, "/bin/cp");
      this.ui.appendTerminalLine(source + " -> " + destination);
      if (this.filesApp) {
        this.filesApp.start();
      }
      if (this.zenmapApp && (destination.includes("zenmap") || source.includes("zenmap"))) {
        this.zenmapApp.reloadFromDisk();
      }
      if (this.vpnguardApp && (destination.includes("vpnguard") || source.includes("vpnguard"))) {
        this.vpnguardApp.loadFromDisk();
      }
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
      this.loggingSystem?.logFileAccess(source, "moved to " + destination, "/bin/mv");
      this.ui.appendTerminalLine(source + " -> " + destination);
      if (this.filesApp) {
        this.filesApp.start();
      }
      if (this.zenmapApp && (destination.includes("zenmap") || source.includes("zenmap"))) {
        this.zenmapApp.reloadFromDisk();
      }
      if (this.vpnguardApp && (destination.includes("vpnguard") || source.includes("vpnguard"))) {
        this.vpnguardApp.loadFromDisk();
      }
      return;
    }

    if (primary === "rm") {
      if (args.length === 0) {
        this.ui.appendTerminalLine("Usage: rm [-r] <file> or rm *");
        return;
      }
      const flags = args.filter((a) => a.startsWith("-"));
      const operands = args.filter((a) => !a.startsWith("-"));
      const recursive = flags.some((f) => f.includes("r") || f.includes("R"));

      if (operands.length === 0) {
        this.ui.appendTerminalLine("Usage: rm [-r] <file> or rm *");
        return;
      }

      const programIdToProcessName = {
        "codepad-plus": "codepad+",
        "clawder-python": "clawder-python",
        "music-player": "music-player",
        "task-manager": "task-manager",
        "settings": "settings",
        "files": "files",
        "terminal": "terminal"
      };

      const executeRm = async () => {
        for (const operand of operands) {
          if (operand.includes("*")) {
            let dirPath = ".";
            let pattern = operand;
            const lastSlash = operand.lastIndexOf("/");
            if (lastSlash !== -1) {
              dirPath = operand.slice(0, lastSlash) || "/";
              pattern = operand.slice(lastSlash + 1);
            }
            const resolvedDir = this.resolvePath(dirPath);
            const dirNode = this.fileSystem.resolve(resolvedDir);
            if (!dirNode || dirNode.type !== "directory") {
              this.ui.appendTerminalLine("rm: cannot access '" + operand + "': No such directory");
              continue;
            }
            const entries = this.fileSystem.list(resolvedDir) || [];
            if (entries.length === 0) {
              this.ui.appendTerminalLine("rm: cannot remove '" + operand + "': Directory is empty");
              continue;
            }

            const regex = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$", "i");
            const matchedEntries = entries.filter((e) => regex.test(e.name));
            if (matchedEntries.length === 0) {
              this.ui.appendTerminalLine("rm: cannot remove '" + operand + "': No such file or directory");
              continue;
            }

            for (const entry of matchedEntries) {
              if (entry.type === "directory" && !recursive) {
                this.ui.appendTerminalLine("rm: cannot remove '" + entry.name + "': Is a directory");
                continue;
              }

              const fullPath = this.fileSystem.normalize(resolvedDir + "/" + entry.name);
              const node = this.fileSystem.resolve(fullPath);
              if (!node) continue;

              await this.simulateFileRemoval(entry.name, node);

              if (node.executable) {
                const processName = programIdToProcessName[node.executable] || node.executable;
                const processId = [...this.processes.entries()].find(([, name]) => name === processName)?.[0];
                if (processId) this.submitCommand("kill " + processId);
                if (this.programChanged) this.programChanged();
              }

              this.fileSystem.remove(fullPath);
              this.loggingSystem?.logFileAccess(fullPath, "removed", "/bin/rm");
            }

            if (this.filesApp) {
              this.filesApp.start();
            }
            if (this.zenmapApp) {
              this.zenmapApp.reloadFromDisk();
            }
            if (this.resourceManager) {
              this.resourceManager.notify();
            }
          } else {
            const path = this.resolvePath(operand);
            const node = this.fileSystem.resolve(path);
            if (!node) {
              this.ui.appendTerminalLine("File not found: " + path);
              continue;
            }
            if (node.type === "directory" && !recursive) {
              this.ui.appendTerminalLine("rm: cannot remove '" + operand + "': Is a directory");
              continue;
            }

            const fileName = path.split("/").pop() || operand;
            await this.simulateFileRemoval(fileName, node);

            if (node.executable) {
              const processName = programIdToProcessName[node.executable] || node.executable;
              const processId = [...this.processes.entries()].find(([, name]) => name === processName)?.[0];
              if (processId) this.submitCommand("kill " + processId);
              if (this.programChanged) this.programChanged();
            }

            this.fileSystem.remove(path);
            this.loggingSystem?.logFileAccess(path, "removed", "/bin/rm");
            this.ui.appendTerminalLine("Removed " + path);
            if (this.filesApp) {
              this.filesApp.start();
            }
            if (this.zenmapApp && (path.includes("zenmap") || path.includes("savedata.ini") || path.includes("hosts.ini"))) {
              this.zenmapApp.reloadFromDisk();
            }
            if (this.vpnguardApp && (path.includes("vpnguard") || path.includes("savedata.ini"))) {
              this.vpnguardApp.loadFromDisk();
            }
            if (this.resourceManager) {
              this.resourceManager.notify();
            }
          }
        }
      };

      executeRm().catch((err) => {
        console.error("Error executing rm:", err);
      });
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
      const flags = args.filter((a) => a.startsWith("-"));
      const nonFlags = args.filter((a) => !a.startsWith("-"));
      const showHidden = flags.some((f) => f.includes("a") || f.includes("A"));
      const target = nonFlags[0] ? this.resolvePath(nonFlags[0]) : this.currentPath;
      const entries = this.fileSystem.list(target);
      if (!entries) {
        this.ui.appendTerminalLine("Not a directory: " + target);
        return;
      }
      for (const entry of entries) {
        if (!showHidden && entry.name.startsWith(".")) continue;
        this.ui.appendTerminalLine(entry.type === "directory" ? entry.name + "/" : entry.name);
      }
      return;
    }

    if (primary === "cd") {
      const currentSession = this.loggingSystem?.getCurrentSession();
      const defaultDir = currentSession?.user ? "/home/" + currentSession.user : "/home";
      const target = args[0] || defaultDir;
      const path = this.resolvePath(target);
      const entries = this.fileSystem.list(path);
      if (!entries) {
        this.ui.appendTerminalLine("Directory not found: " + path);
        return;
      }
      this.currentPath = path;
      this.updatePromptPrefix();
      if (this.filesApp) this.filesApp.setPath(path, true);
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
      this.loggingSystem?.logFileAccess(path, "opened", primary === "open" ? "./programs/CodePad+.bin" : "/bin/cat");
      if (content.length > 0) {
        this.ui.appendTerminalLine(content);
      }
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
      this.windowManager.focus("settings");
      this.ui.appendTerminalLine("Opened Settings");
      return;
    }

    if (primary === "system") {
      if (this.launchProgram) this.launchProgram("task-manager");
      this.windowManager.focus("task-manager");
      this.ui.appendTerminalLine("Opened TaskManager");
      return;
    }

    if (primary === "music-player" || primary === "music") {
      if (this.launchProgram) this.launchProgram("music-player");
      this.windowManager.focus("music-player");
      this.ui.appendTerminalLine("Opened Music Player");
      return;
    }

    if (primary === "zenmap") {
      if (this.zenmapApp) {
        this.zenmapApp.executeCli(args, this);
        return;
      }
      if (this.launchProgram) this.launchProgram("zenmap");
      this.windowManager.focus("zenmap");
      this.ui.appendTerminalLine("Opened Zenmap 7.94 (Network Topology Mapper)");
      return;
    }

    if (primary === "vpnguard") {
      if (this.vpnguardApp) {
        this.vpnguardApp.executeCli(args, this);
        return;
      }
      if (this.launchProgram) this.launchProgram("vpnguard");
      this.windowManager.focus("vpnguard");
      this.ui.appendTerminalLine("Opened VPNguard 2.4.1 (Network Tunnel Controller)");
      return;
    }

    if (primary === "ifconfig") {
      const state = playerNetworkState.getState();
      const tun0 = state.activeInterfaces.tun0;
      this.ui.appendTerminalLine(`eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`);
      this.ui.appendTerminalLine(`        inet ${state.activeInterfaces.eth0.ip}  netmask 255.255.255.0  broadcast ${state.activeInterfaces.eth0.broadcast}`);
      this.ui.appendTerminalLine(`        ether ${state.activeInterfaces.eth0.mac}  txqueuelen 1000  (Ethernet)`);
      this.ui.appendTerminalLine("");
      if (tun0) {
        this.ui.appendTerminalLine(`tun0: flags=4305<UP,POINTOPOINT,RUNNING,NOARP,MULTICAST>  mtu 1420`);
        this.ui.appendTerminalLine(`        inet ${tun0.ip}  netmask 255.255.255.0  destination ${tun0.destination || tun0.gateway}`);
        this.ui.appendTerminalLine(`        unspec 00-00-00-00-00-00-00-00-00-00-00-00-00-00-00-00  txqueuelen 500  (UNSPEC)`);
        this.ui.appendTerminalLine(`        [VPN Mode: ${state.vpnMode} | Public Egress: ${state.publicIP}]`);
      } else {
        this.ui.appendTerminalLine(`tun0: [INTERFACE DOWN / UNCONFIGURED - VPNguard is OFF]`);
      }
      return;
    }

    if (primary === "curl") {
      const target = (args[0] || "").toLowerCase();
      const state = playerNetworkState.getState();
      if (target.includes("ifconfig.me") || target.includes("ipinfo") || target.includes("icanhazip") || target.includes("myip")) {
        this.ui.appendTerminalLine(state.publicIP);
        return;
      }
      this.ui.appendTerminalLine(`curl: connecting to ${args[0] || "localhost"} via ${state.activeInterfaces.tun0 ? "tun0" : "eth0"}...`);
      this.ui.appendTerminalLine(`HTTP/1.1 200 OK`);
      this.ui.appendTerminalLine(`Client IP detected: ${state.publicIP}`);
      return;
    }

    if (primary === "ip") {
      if (args[0] === "a" || args[0] === "addr" || args[0] === "address" || !args[0]) {
        this.submitCommand("ifconfig");
        return;
      }
      if (args[0] === "route" || args[0] === "r") {
        this.submitCommand("route");
        return;
      }
    }

    if (primary === "route") {
      const state = playerNetworkState.getState();
      const isConnected = state.vpnMode !== "OFF";
      const tun0 = state.activeInterfaces.tun0;
      this.ui.appendTerminalLine("Kernel IP routing table");
      this.ui.appendTerminalLine("Destination     Gateway         Genmask         Flags Metric Ref    Use Iface");
      this.ui.appendTerminalLine(`0.0.0.0         ${isConnected ? (tun0?.gateway || "10.8.0.1") : state.activeInterfaces.eth0.gateway}     0.0.0.0         UG    ${isConnected ? "50" : "100"}    0        0 ${isConnected ? "tun0" : "eth0"}`);
      this.ui.appendTerminalLine(`${state.activeInterfaces.eth0.ip.replace(/\.\d+$/, ".0")}    0.0.0.0         255.255.255.0   U     100    0        0 eth0`);
      if (isConnected && tun0) {
        this.ui.appendTerminalLine(`${tun0.targetSubnet || "10.8.0.0/24"}     0.0.0.0         255.255.255.0   U     50     0        0 tun0`);
      }
      if (isConnected && state.vpnMode === "WORK") {
        this.ui.appendTerminalLine("10.10.10.0      10.10.10.1      255.255.255.0   UG    50     0        0 tun0");
      }
      if (isConnected && state.vpnMode === "P2P") {
        this.ui.appendTerminalLine("10.9.0.0        0.0.0.0         255.255.255.0   U     50     0        0 tun0");
      }
      return;
    }

    if (primary === "task-manager") {
      if (this.launchProgram) this.launchProgram("task-manager");
      this.windowManager.focus("task-manager");
      this.ui.appendTerminalLine("Opened TaskManager");
      return;
    }

    if (primary === "codepad" || primary === "codepad+" || primary === "codepad-plus") {
      if (args.length > 0) {
        this.submitCommand("open " + args[0]);
        return;
      }
      if (this.launchProgram) this.launchProgram("codepad-plus");
      this.windowManager.focus("codepad");
      this.ui.appendTerminalLine("Opened CodePad+");
      return;
    }

    if (primary === "clawder-python" || primary === "clawder") {
      if (this.launchProgram) this.launchProgram("clawder-python");
      this.windowManager.focus("clawder-python");
      this.ui.appendTerminalLine("Opened Clawder Python");
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
    if (!path) return this.currentPath;
    let target = path.trim();
    const currentSession = this.loggingSystem?.getCurrentSession();
    const user = currentSession?.user || this.profile.promptUser;
    const homeDir = "/home/" + user;

    if (target === "~") {
      target = homeDir;
    } else if (target.startsWith("~/")) {
      target = homeDir + target.slice(1);
    }
    return this.fileSystem.normalize(target.startsWith("/") ? target : this.currentPath + "/" + target);
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
      music: [8, "music-player"],
      "task-manager": [7, "task-manager"],
      zenmap: [9, "zenmap"],
      vpnguard: [10, "vpnguard"]
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
