import { playerNetworkState } from "../core/network-state.js";
import { modeToPermissionString } from "../core/file-system.js";
import { sha256, parseHashedKeyContent, DEFAULT_WORDLIST } from "../core/hashed-key.js";

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
    this.logoutHandler = null;
    this.currentPath = "/home/admin";
    this.waitingForPassword = null;
    this.caesarRipSession = null;
    this.caesarRipRunning = null;
    this.running = true;
    this.isElevated = false;
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
      "help", "clear", "echo", "date", "whoami", "id", "groups", "hostname", "pwd", "ls", "ll", "cd", "cat", "open", "cp", "mv", "rm",
      "install", "reboot", "python3", "python", "ps", "kill", "focus", "exit", "logout", "disconnect",
      "terminal", "files", "settings", "system", "task-manager", "music-player", "music", "zenmap", "vpnguard", "codepad", "codepad+", "clawder-python", "snap",
      "ssh", "nano", "grep", "sudo", "touch", "chmod", "chown", "mkdir", "session", "sessions", "ifconfig", "curl", "ip", "route",
      "head", "tail", "more", "less", "sed"
    ];
    this.commandDocs = {
      help: [
        "NAME",
        "  help - display command index or specific command documentation",
        "",
        "SYNOPSIS",
        "  help [COMMAND]",
        "  <COMMAND> --help",
        "",
        "DESCRIPTION",
        "  Without arguments, prints the categorized index of all commands available in DemicubeOS.",
        "  When supplied with a COMMAND name, displays the full reference manual explaining syntax,",
        "  all available modifiers/flags, permission details, and realistic examples.",
        "",
        "EXAMPLES",
        "  help",
        "  help ls",
        "  help chmod",
        "  help id"
      ],
      ls: [
        "NAME",
        "  ls - list directory contents and inspect permissions",
        "",
        "SYNOPSIS",
        "  ls [OPTIONS] [FILE/DIR]",
        "  ll [OPTIONS] [FILE/DIR]",
        "",
        "DESCRIPTION",
        "  List information about the files and directories in the target path (or current directory).",
        "  Provides metadata including Unix permissions (rwx), ownership, size, and timestamps.",
        "",
        "MODIFIERS & OPTIONS",
        "  -l, --long             Use long listing format: displays file mode permissions (e.g.",
        "                         drwxr-xr-x), link count, owner, group, file size, date, and name.",
        "  -a, --all              Include hidden files (starting with '.') as well as '.' and '..'.",
        "  -A, --almost-all       List all hidden entries except '.' and '..'.",
        "  -la, -al               Combined flag: detailed long listing including all hidden files.",
        "  -h, --human-readable   With -l, print sizes in readable units (e.g. 1K, 234B, 4.2M).",
        "  -lh                    Long listing format with human-readable file sizes.",
        "  -F, --classify         Append indicator: '/' for directories, '*' for executables.",
        "  -t                     Sort entries by modification time (newest first).",
        "  -S                     Sort entries by file size (largest first).",
        "  -r, --reverse          Reverse the sorting order.",
        "  -d, --directory        List directory entries themselves instead of their contents.",
        "  -1                     List one entry per line.",
        "  --help                 Display this comprehensive help manual.",
        "",
        "FILE PERMISSIONS GUIDE (ls -l output breakdown)",
        "  Example: drwxr-xr-x  2 admin admin 4096 Sep 04 14:15 documents",
        "  • Position 1: Entry type ('d' = directory, '-' = regular file)",
        "  • Positions 2-4: Owner permissions ('r'=read, 'w'=write, 'x'=execute)",
        "  • Positions 5-7: Group permissions ('r'=read, 'w'=write, 'x'=execute)",
        "  • Positions 8-10: Others / public permissions",
        "  • 2: Number of hard links / subdirectories",
        "  • admin admin: User owner and group name",
        "  • 4096: File size in bytes (or human-readable with -h)",
        "  • Sep 04 14:15: Last modified timestamp",
        "",
        "EXAMPLES",
        "  ls                     List visible files and folders in current directory",
        "  ls -a                  List all files, revealing hidden config dotfiles",
        "  ls -l                  Display permissions, owner, group, and sizes",
        "  ls -la                 Display long listing including hidden files (alias: ll)",
        "  ls -lh /var/log        Display /var/log files with readable sizes",
        "  ls -S /documents       Display files sorted by size (largest first)",
        "  ls -la /home/admin/.ssh Inspect SSH key permissions"
      ],
      ll: [
        "NAME",
        "  ll - alias for ls -la (long listing with permissions and all files)",
        "",
        "SYNOPSIS",
        "  ll [OPTIONS] [FILE/DIR]",
        "",
        "DESCRIPTION",
        "  Standard convenience alias equivalent to 'ls -la'. Displays all directory entries",
        "  (including hidden dotfiles) formatted with full Unix permissions, link counts,",
        "  owner usernames, group names, byte sizes, and timestamps.",
        "",
        "MODIFIERS",
        "  Supports all 'ls' modifiers: -h (human readable), -S (sort by size), -t (sort by time), -r (reverse).",
        "",
        "EXAMPLES",
        "  ll                     List all files in current directory with permissions",
        "  ll /var/log            List all logs with permissions",
        "  ll -h /home/admin      List home folder with human-readable sizes"
      ],
      chmod: [
        "NAME",
        "  chmod - change file access permissions mode",
        "",
        "SYNOPSIS",
        "  chmod <mode> <path>",
        "",
        "DESCRIPTION",
        "  Change the file mode bits (read, write, execute) of a file or directory.",
        "  Permissions control who can inspect, modify, or execute files on the system.",
        "",
        "OCTAL MODES EXPLAINED (3 digits)",
        "  Mode format: <owner><group><others>",
        "  Values:",
        "    7 = rwx (Read + Write + Execute: 4 + 2 + 1)",
        "    6 = rw- (Read + Write: 4 + 2)",
        "    5 = r-x (Read + Execute: 4 + 1)",
        "    4 = r-- (Read-only: 4)",
        "    0 = --- (No permissions)",
        "",
        "COMMON PERMISSION PRESETS",
        "  755  rwxr-xr-x   Standard for scripts & directories (owner full, others read/run)",
        "  644  rw-r--r--   Standard for regular documents & text files",
        "  600  rw-------   Confidential files: owner read/write only (e.g. private SSH keys)",
        "  700  rwx------   Confidential directories: owner only (e.g. .ssh/ directory)",
        "",
        "EXAMPLES",
        "  chmod 755 /documents/script.py         Make a Python script executable",
        "  chmod 600 /home/admin/.ssh/pbk/admin.key Secure private SSH key against other users",
        "  chmod 644 /var/log/audit.log           Set standard read-only for group/others"
      ],
      chown: [
        "NAME",
        "  chown - change file owner and group",
        "",
        "SYNOPSIS",
        "  chown <owner[:group]> <path>",
        "",
        "DESCRIPTION",
        "  Changes the user and/or group ownership of the given file or directory.",
        "  Requires root or administrative privileges.",
        "",
        "SYNTAX VARIATIONS",
        "  chown <owner> <path>          Change user owner only",
        "  chown <owner>:<group> <path>  Change both user owner and security group",
        "  chown :<group> <path>         Change group only",
        "",
        "EXAMPLES",
        "  chown admin:admin /documents/savedata.ini",
        "  chown test_user /home/test_user/notes.txt",
        "  chown :users /shared/project"
      ],
      whoami: [
        "NAME",
        "  whoami - print effective user name",
        "",
        "SYNOPSIS",
        "  whoami",
        "",
        "DESCRIPTION",
        "  Prints the username of the user currently logged into the active terminal or SSH session.",
        "",
        "EXAMPLES",
        "  whoami"
      ],
      id: [
        "NAME",
        "  id - print real and effective user and group IDs and permissions",
        "",
        "SYNOPSIS",
        "  id [OPTIONS]",
        "",
        "DESCRIPTION",
        "  Display user identity (UID), primary group (GID), and all supplementary security",
        "  groups for the currently active user account.",
        "",
        "MODIFIERS & OPTIONS",
        "  -u     Print effective user ID (UID) only",
        "  -g     Print effective group ID (GID) only",
        "  -un    Print username instead of numeric UID",
        "  -gn    Print primary group name instead of numeric GID",
        "  -G     Print all group IDs",
        "  --help Display this help manual",
        "",
        "EXAMPLES",
        "  id            Show full user identity and group memberships",
        "  id -un        Show username only"
      ],
      groups: [
        "NAME",
        "  groups - print security group memberships for current user",
        "",
        "SYNOPSIS",
        "  groups",
        "",
        "DESCRIPTION",
        "  Prints the names of the primary and supplementary groups to which the active user belongs.",
        "",
        "EXAMPLES",
        "  groups"
      ],
      cd: [
        "NAME",
        "  cd - change the working directory",
        "",
        "SYNOPSIS",
        "  cd [DIRECTORY]",
        "",
        "DESCRIPTION",
        "  Change the current shell working directory to DIRECTORY.",
        "  If DIRECTORY is not supplied, navigates to the user's home directory (/home/<user>).",
        "",
        "SPECIAL PATHS",
        "  .      Current directory",
        "  ..     Parent directory (one level up)",
        "  ~      User's home directory (/home/<user>)",
        "  /      Root filesystem directory",
        "",
        "EXAMPLES",
        "  cd /var/log             Navigate to system log directory",
        "  cd ..                   Move up one level to parent folder",
        "  cd ~                    Return to home directory",
        "  cd /home/admin/.ssh/pbk Navigate to SSH key vault"
      ],
      pwd: [
        "NAME",
        "  pwd - print name of current/working directory",
        "",
        "SYNOPSIS",
        "  pwd",
        "",
        "DESCRIPTION",
        "  Print the full absolute path of the current working directory.",
        "",
        "EXAMPLES",
        "  pwd"
      ],
      cat: [
        "NAME",
        "  cat - concatenate and display file contents",
        "",
        "SYNOPSIS",
        "  cat [OPTIONS] <FILE>",
        "",
        "DESCRIPTION",
        "  Print the content of FILE to standard output in the terminal.",
        "  Supports output redirection (> and >>) and pipeline commands (|).",
        "",
        "MODIFIERS & OPTIONS",
        "  -n            Number all output lines starting from 1",
        "  -b            Number non-empty output lines only",
        "  --help        Display this help manual",
        "",
        "EXAMPLES",
        "  cat /var/log/auth.log         View system authentication log",
        "  cat -n /etc/passwd            Display passwd with line numbers",
        "  cat savedata.ini | grep host  Pipe file content into grep"
      ],
      open: [
        "NAME",
        "  open - open virtual file in graphical desktop application",
        "",
        "SYNOPSIS",
        "  open <PATH>",
        "",
        "DESCRIPTION",
        "  Opens a file using its registered graphical viewer or editor.",
        "  Text and Python files (.txt, .py, .ini, .log, .json) launch in CodePad+.",
        "",
        "EXAMPLES",
        "  open /documents/zenmap/savedata.ini",
        "  open /documents/example.py"
      ],
      cp: [
        "NAME",
        "  cp - copy files and directories",
        "",
        "SYNOPSIS",
        "  cp [OPTIONS] <SOURCE> <DESTINATION>",
        "",
        "DESCRIPTION",
        "  Copy SOURCE to DESTINATION, or multiple SOURCE(s) to DIRECTORY.",
        "",
        "MODIFIERS & OPTIONS",
        "  -r, -R, --recursive   Copy directories recursively",
        "  --help                Display this help manual",
        "",
        "EXAMPLES",
        "  cp /documents/zenmap/savedata.ini savedata.bak",
        "  cp -r /home/admin/.ssh /home/admin/.ssh_backup"
      ],
      mv: [
        "NAME",
        "  mv - move (rename) files and directories",
        "",
        "SYNOPSIS",
        "  mv <SOURCE> <DESTINATION>",
        "",
        "DESCRIPTION",
        "  Rename SOURCE to DESTINATION, or move SOURCE into a target DIRECTORY.",
        "",
        "EXAMPLES",
        "  mv old_name.txt new_name.txt",
        "  mv draft.py /documents/python/"
      ],
      rm: [
        "NAME",
        "  rm - remove files or directories",
        "",
        "SYNOPSIS",
        "  rm [OPTIONS] <FILE...>",
        "",
        "DESCRIPTION",
        "  Remove (delete) the specified files or directories from the virtual file system.",
        "",
        "MODIFIERS & OPTIONS",
        "  -r, -R, --recursive   Remove directories and their contents recursively",
        "  -f, --force           Ignore nonexistent files and never prompt",
        "  *                     Wildcard to remove all files in the current folder",
        "  --help                Display this help manual",
        "",
        "EXAMPLES",
        "  rm obsolete.txt",
        "  rm -r /tmp/build_cache",
        "  rm -rf /tmp/scratch"
      ],
      mkdir: [
        "NAME",
        "  mkdir - make directories",
        "",
        "SYNOPSIS",
        "  mkdir [OPTIONS] <DIRECTORY>",
        "",
        "DESCRIPTION",
        "  Create the DIRECTORY if it does not already exist.",
        "",
        "MODIFIERS & OPTIONS",
        "  -p, --parents   Create parent directories as needed without error",
        "  --help          Display this help manual",
        "",
        "EXAMPLES",
        "  mkdir projects",
        "  mkdir -p /home/admin/workspace/tools"
      ],
      touch: [
        "NAME",
        "  touch - create empty file or update timestamp",
        "",
        "SYNOPSIS",
        "  touch [OPTIONS] <FILE>",
        "",
        "DESCRIPTION",
        "  Update the access and modification timestamps of FILE.",
        "  If FILE does not exist, an empty file is created automatically.",
        "",
        "MODIFIERS & OPTIONS",
        "  -c, --no-create   Do not create any files if they do not exist",
        "  --help            Display this help manual",
        "",
        "EXAMPLES",
        "  touch new_file.txt",
        "  touch /var/log/custom.log"
      ],
      nano: [
        "NAME",
        "  nano - terminal text editor",
        "",
        "SYNOPSIS",
        "  nano <FILE>",
        "",
        "DESCRIPTION",
        "  Launch the in-terminal interactive text editor to view and modify files.",
        "",
        "EDITOR KEYBOARD SHORTCUTS",
        "  ^O (Ctrl+O)    Save / Write out buffer to file",
        "  ^X (Ctrl+X)    Exit the editor buffer",
        "",
        "EXAMPLES",
        "  nano notes.txt",
        "  nano /documents/zenmap/savedata.ini"
      ],
      grep: [
        "NAME",
        "  grep - print lines matching a pattern",
        "",
        "SYNOPSIS",
        "  grep [OPTIONS] <PATTERN> [FILE]",
        "",
        "DESCRIPTION",
        "  Search for PATTERN in FILE or standard input (from pipes).",
        "",
        "MODIFIERS & OPTIONS",
        "  -i, --ignore-case   Ignore case distinctions in patterns and input data",
        "  -v, --invert-match  Invert matching: select non-matching lines",
        "  -n, --line-number   Prefix each output line with its line number",
        "  -c, --count         Suppress normal output; write count of matching lines",
        "  --help              Display this help manual",
        "",
        "EXAMPLES",
        "  grep sshd /var/log/auth.log          Search for SSH events in auth log",
        "  grep -i \"failed\" /var/log/auth.log   Case-insensitive search for failed logins",
        "  grep -v \"root\" /etc/passwd           Find all non-root user entries",
        "  cat /var/log/syslog | grep -n \"error\" Pipe log stream with line numbers"
      ],
      sudo: [
        "NAME",
        "  sudo - execute a command as root/superuser",
        "",
        "SYNOPSIS",
        "  sudo <COMMAND> [ARGS...]",
        "",
        "DESCRIPTION",
        "  Execute COMMAND with administrative / root privileges.",
        "  Allows modifying protected system files, changing root permissions, or accessing audit logs.",
        "",
        "EXAMPLES",
        "  sudo chmod 700 /var/log/audit.log",
        "  sudo chown root:root /etc/shadow",
        "  sudo cat /etc/shadow"
      ],
      echo: [
        "NAME",
        "  echo - display a line of text",
        "",
        "SYNOPSIS",
        "  echo [TEXT...]",
        "",
        "DESCRIPTION",
        "  Write arguments to standard output. Can be combined with redirection operators",
        "  (> overwrite, >> append) to write text directly to files.",
        "",
        "EXAMPLES",
        "  echo \"Hello, World!\"",
        "  echo \"audit complete\" >> /var/log/audit.log"
      ],
      date: [
        "NAME",
        "  date - print operating system date and time",
        "",
        "SYNOPSIS",
        "  date",
        "",
        "DESCRIPTION",
        "  Display the current simulated operating system date, time, and timezone.",
        "",
        "EXAMPLES",
        "  date"
      ],
      clear: [
        "NAME",
        "  clear - clear the terminal screen buffer",
        "",
        "SYNOPSIS",
        "  clear",
        "",
        "DESCRIPTION",
        "  Clears the visible terminal output scrollback for a clean workspace.",
        "",
        "EXAMPLES",
        "  clear"
      ],
      hostname: [
        "NAME",
        "  hostname - show current system hostname",
        "",
        "SYNOPSIS",
        "  hostname",
        "",
        "DESCRIPTION",
        "  Displays the hostname of the current machine (or remote host if in SSH session).",
        "",
        "EXAMPLES",
        "  hostname"
      ],
      python3: [
        "NAME",
        "  python3 - sandboxed virtual Python interpreter",
        "",
        "SYNOPSIS",
        "  python3 [OPTIONS] [FILE.py]",
        "  python [OPTIONS] [FILE.py]",
        "",
        "DESCRIPTION",
        "  Executes Python code or script files (.py) in the sandboxed client runtime.",
        "",
        "MODIFIERS & OPTIONS",
        "  -c \"<code>\"    Execute Python code passed directly as a string",
        "  --help         Display this help manual",
        "",
        "EXAMPLES",
        "  python3 /documents/example.py",
        "  python3 -c \"print(2 + 2)\"",
        "  python script.py"
      ],
      ps: [
        "NAME",
        "  ps - report a snapshot of current virtual processes",
        "",
        "SYNOPSIS",
        "  ps [OPTIONS]",
        "",
        "DESCRIPTION",
        "  Displays information about running virtual processes: PID (Process ID),",
        "  command name, and status.",
        "",
        "MODIFIERS & OPTIONS",
        "  -a, aux, -ef   Show all system and background processes",
        "  --help         Display this help manual",
        "",
        "EXAMPLES",
        "  ps",
        "  ps aux"
      ],
      kill: [
        "NAME",
        "  kill - terminate a process by PID",
        "",
        "SYNOPSIS",
        "  kill [OPTIONS] <PID>",
        "",
        "DESCRIPTION",
        "  Terminates the process matching PID. Use 'ps' to discover active Process IDs.",
        "",
        "MODIFIERS & OPTIONS",
        "  -9, -KILL      Force kill process immediately",
        "  --help         Display this help manual",
        "",
        "EXAMPLES",
        "  kill 3",
        "  kill -9 4"
      ],
      focus: [
        "NAME",
        "  focus - bring program window to foreground",
        "",
        "SYNOPSIS",
        "  focus <PID | APP_NAME>",
        "",
        "DESCRIPTION",
        "  Brings an active application window to the front of the desktop stack.",
        "",
        "EXAMPLES",
        "  focus 2",
        "  focus files"
      ],
      snap: [
        "NAME",
        "  snap - tile application windows evenly",
        "",
        "SYNOPSIS",
        "  snap [APP1 APP2 ...]",
        "",
        "DESCRIPTION",
        "  Automatically tiles open desktop windows side-by-side or in a 2x2 grid.",
        "",
        "EXAMPLES",
        "  snap",
        "  snap terminal files"
      ],
      ssh: [
        "NAME",
        "  ssh - OpenSSH simulated remote login client",
        "",
        "SYNOPSIS",
        "  ssh [USER@]HOSTNAME_OR_IP [PASSWORD]",
        "",
        "DESCRIPTION",
        "  Connects to a remote host across the network topology and opens an interactive shell.",
        "  Supports public key authentication (via keys stored in ~/.ssh/pbk/) and password authentication.",
        "",
        "SYNTAX FORMS",
        "  ssh user@host.domain",
        "  ssh user@192.168.56.101",
        "  ssh host.domain         (uses current active user)",
        "",
        "EXAMPLES",
        "  ssh admin@steves-computer",
        "  ssh 192.168.56.101",
        "  ssh test_user@192.168.56.101"
      ],
      session: [
        "NAME",
        "  session - display active SSH session chain and hops",
        "",
        "SYNOPSIS",
        "  session",
        "  sessions",
        "",
        "DESCRIPTION",
        "  Displays the current machine connection route, remote hostname, IP address,",
        "  and hop count through the network topology.",
        "",
        "EXAMPLES",
        "  session"
      ],
      disconnect: [
        "NAME",
        "  disconnect - disconnect from active remote SSH session",
        "",
        "SYNOPSIS",
        "  disconnect",
        "",
        "DESCRIPTION",
        "  Terminates the current remote SSH session and returns the prompt to the local machine.",
        "  Equivalent to typing 'exit' while connected remotely.",
        "",
        "EXAMPLES",
        "  disconnect"
      ],
      scp: [
        "NAME",
        "  scp - secure copy (remote file copy to local home system)",
        "",
        "SYNOPSIS",
        "  scp [-r] <remote_file_or_directory> ...",
        "",
        "DESCRIPTION",
        "  Copies files and directories from the active remote SSH system back to your local home system.",
        "  Copied files are automatically saved to the local machine under:",
        "  /downloads/emulated/<remote_hostname><remote_file_structure>/",
        "",
        "OPTIONS",
        "  -r, -R, --recursive   Recursively copy entire directories",
        "  --help                Display this help documentation",
        "",
        "EXAMPLES",
        "  scp welcome.txt                     Copy welcome.txt back to local downloads",
        "  scp ./home/admin/welcome.txt        Copy using relative or absolute path",
        "  scp -r logs                         Recursively copy directory to local system"
      ],
      exit: [
        "NAME",
        "  exit - close active terminal window or disconnect SSH session",
        "",
        "SYNOPSIS",
        "  exit",
        "",
        "DESCRIPTION",
        "  If connected to a remote host via SSH, disconnects and returns to the previous hop.",
        "  If on local shell, closes the active terminal window without logging out of the OS session.",
        "",
        "EXAMPLES",
        "  exit"
      ],
      logout: [
        "NAME",
        "  logout - log out of the current system session",
        "",
        "SYNOPSIS",
        "  logout",
        "",
        "DESCRIPTION",
        "  Ends the active session on the current system (local or remote SSH host) and returns",
        "  to that specific system's login screen.",
        "",
        "EXAMPLES",
        "  logout"
      ],
      usermod: [
        "NAME",
        "  usermod - modify user group memberships in /etc/group/system_groups.reg",
        "",
        "SYNOPSIS",
        "  usermod -aG <GROUP> <USER>",
        "  usermod -rm <GROUP> <USER>",
        "",
        "DESCRIPTION",
        "  Modifies user group memberships in the virtual registry (/etc/group/system_groups.reg).",
        "  Requires write permission to /etc/group/system_groups.reg or administrative/sudo privileges.",
        "  Users cannot be removed from their primary group.",
        "",
        "MODIFIERS & OPTIONS",
        "  -aG, -a -G      Append user to group",
        "  -rm, -r, -d     Remove user from group",
        "  --help          Display this help manual",
        "",
        "EXAMPLES",
        "  usermod -aG admin test_user",
        "  usermod -rm admin test_user"
      ],
      groups: [
        "NAME",
        "  groups - print the groups a user is in",
        "",
        "SYNOPSIS",
        "  groups [USER]",
        "",
        "DESCRIPTION",
        "  Prints group memberships for the specified user or current active user from system_groups.reg.",
        "",
        "EXAMPLES",
        "  groups",
        "  groups test_user",
        "  groups steve"
      ],
      id: [
        "NAME",
        "  id - print real and effective user and group IDs",
        "",
        "SYNOPSIS",
        "  id [OPTIONS] [USER]",
        "",
        "MODIFIERS & OPTIONS",
        "  -u             Print only the effective user ID",
        "  -g             Print only the effective group ID",
        "  -G             Print all group IDs",
        "  -n             Print names instead of numbers for -u/-g",
        "  --help         Display this help manual",
        "",
        "EXAMPLES",
        "  id",
        "  id -u -n",
        "  id test_user"
      ],
      reboot: [
        "NAME",
        "  reboot - restart virtual operating system",
        "",
        "SYNOPSIS",
        "  reboot",
        "",
        "DESCRIPTION",
        "  Reboots the virtual machine and restores baseline filesystem files and services.",
        "",
        "EXAMPLES",
        "  reboot"
      ],
      install: [
        "NAME",
        "  install - restore or install program packages",
        "",
        "SYNOPSIS",
        "  install <PROGRAM>",
        "",
        "DESCRIPTION",
        "  Restores available package programs such as clawder-python or codepad.",
        "",
        "EXAMPLES",
        "  install clawder-python"
      ],
      ifconfig: [
        "NAME",
        "  ifconfig - display or configure network interfaces",
        "",
        "SYNOPSIS",
        "  ifconfig [INTERFACE]",
        "",
        "DESCRIPTION",
        "  Displays active network interfaces (eth0 physical link, tun0 virtual VPN link),",
        "  IP addresses, netmasks, broadcast addresses, and interface state.",
        "",
        "EXAMPLES",
        "  ifconfig",
        "  ifconfig eth0"
      ],
      ip: [
        "NAME",
        "  ip - show / manipulate routing, network devices, and tunnels",
        "",
        "SYNOPSIS",
        "  ip <OBJECT> [COMMAND]",
        "",
        "OBJECTS & MODIFIERS",
        "  a, addr, address   Display interface IP addresses",
        "  r, route           Display IP routing table and gateway routes",
        "  --help             Display this help manual",
        "",
        "EXAMPLES",
        "  ip a",
        "  ip route"
      ],
      route: [
        "NAME",
        "  route - show network routing table",
        "",
        "SYNOPSIS",
        "  route",
        "",
        "DESCRIPTION",
        "  Display current IP routing table, default gateways, and network metrics.",
        "",
        "EXAMPLES",
        "  route"
      ],
      curl: [
        "NAME",
        "  curl - transfer data from or to a server",
        "",
        "SYNOPSIS",
        "  curl [OPTIONS] <URL>",
        "",
        "DESCRIPTION",
        "  Command line tool to transfer data using supported network protocols.",
        "",
        "MODIFIERS & OPTIONS",
        "  -I, --head   Fetch HTTP headers only",
        "  -s, --silent Silent mode: don't show progress meter or error messages",
        "  --help       Display this help manual",
        "",
        "EXAMPLES",
        "  curl ifconfig.me               Returns current public egress IP address",
        "  curl http://192.168.56.101     Probe HTTP server on local network"
      ],
      zenmap: [
        "NAME",
        "  zenmap - network scanner & topology mapper CLI and GUI",
        "",
        "SYNOPSIS",
        "  zenmap [SUBCOMMAND] [ARGS...]",
        "",
        "DESCRIPTION",
        "  Inspect, discover, and map network hosts, topology routes, open ports, and services.",
        "  Can be controlled directly from terminal or launched as a visual desktop application.",
        "",
        "SUBCOMMANDS & MODIFIERS",
        "  open                       Launch or focus the Zenmap graphical window",
        "  scan [target]              Trigger network sweep for targets (e.g. 192.168.56.0/24)",
        "  rescan [host]              Rescan target host or currently selected host",
        "  tab <top|hosts|serv|raw>   Switch GUI tab (topology, hosts, services, output)",
        "  inspect <host>             Show detailed ports, OS, hops, and route for host",
        "  ssh <host|ip>              Initiate direct SSH connection to host",
        "  target <cidr>              Configure target CIDR or IP range",
        "  profile <profile>          Set scan profile (intense, quick, ping, regular)",
        "  add <ip> <host> [role] [os] Add custom host entry to network map",
        "  rm <host>                  Remove host entry from network map",
        "  list                       List currently scannable targets",
        "  status                     Display mapper database status",
        "  clear                      Reset scan topology to baseline defaults",
        "  --help                     Display this help manual",
        "",
        "EXAMPLES",
        "  zenmap scan",
        "  zenmap inspect steves-testbox",
        "  zenmap ssh 192.168.56.101",
        "  zenmap tab hosts"
      ],
      vpnguard: [
        "NAME",
        "  vpnguard - secure network tunnel manager & interface controller",
        "",
        "SYNOPSIS",
        "  vpnguard [SUBCOMMAND] [ARGS...]",
        "",
        "DESCRIPTION",
        "  Manage virtual private network tunnels (tun0 interface) and route traffic",
        "  through consumer privacy tunnels, corporate work nodes, or p2p endpoints.",
        "",
        "SUBCOMMANDS & MODIFIERS",
        "  status                     Display active VPN interface, IP, and status",
        "  connect <mode> [profile]   Connect to tunnel (consumer, work, p2p)",
        "  disconnect                 Disconnect active tunnel and restore direct route",
        "  profiles                   List available configuration profiles",
        "  reload                     Reload configuration from savedata.ini",
        "  gui                        Launch or focus VPN Guard graphical window",
        "  --help                     Display this help manual",
        "",
        "EXAMPLES",
        "  vpnguard status",
        "  vpnguard connect consumer zurich",
        "  vpnguard connect work aegis_work",
        "  vpnguard disconnect"
      ],
      terminal: [
        "NAME",
        "  terminal - open or focus the interactive terminal window",
        "",
        "SYNOPSIS",
        "  terminal",
        "",
        "EXAMPLES",
        "  terminal"
      ],
      files: [
        "NAME",
        "  files - open or focus graphical Files manager",
        "",
        "SYNOPSIS",
        "  files",
        "",
        "EXAMPLES",
        "  files"
      ],
      settings: [
        "NAME",
        "  settings - open game and display settings",
        "",
        "SYNOPSIS",
        "  settings",
        "",
        "EXAMPLES",
        "  settings"
      ],
      system: [
        "NAME",
        "  system - core OS daemon (PID 1)",
        "",
        "SYNOPSIS",
        "  system",
        "",
        "DESCRIPTION",
        "  Simulated system init process.",
        "",
        "EXAMPLES",
        "  system"
      ],
      "task-manager": [
        "NAME",
        "  task-manager - process monitor and task manager GUI",
        "",
        "SYNOPSIS",
        "  task-manager",
        "",
        "EXAMPLES",
        "  task-manager"
      ],
      "music-player": [
        "NAME",
        "  music-player - graphical MP3 audio player",
        "",
        "SYNOPSIS",
        "  music-player",
        "  music",
        "",
        "EXAMPLES",
        "  music-player"
      ],
      "codepad+": [
        "NAME",
        "  codepad+ - graphical code and text editor",
        "",
        "SYNOPSIS",
        "  codepad+",
        "  codepad",
        "",
        "EXAMPLES",
        "  codepad+"
      ],
      "clawder-python": [
        "NAME",
        "  clawder-python - Python development environment",
        "",
        "SYNOPSIS",
        "  clawder-python",
        "  clawder",
        "",
        "EXAMPLES",
        "  clawder-python"
      ],
      head: [
        "NAME",
        "  head - output the first part of files",
        "",
        "SYNOPSIS",
        "  head [OPTION]... [FILE]...",
        "",
        "DESCRIPTION",
        "  Print the first 10 lines of each FILE to standard output.",
        "  Requires read (r) permission on the target file and execute (x) on all ancestor directories.",
        "",
        "OPTIONS",
        "  -n NUM   print the first NUM lines instead of the first 10",
        "",
        "EXAMPLES",
        "  head welcome.txt",
        "  head -n 5 system.log"
      ],
      tail: [
        "NAME",
        "  tail - output the last part of files",
        "",
        "SYNOPSIS",
        "  tail [OPTION]... [FILE]...",
        "",
        "DESCRIPTION",
        "  Print the last 10 lines of each FILE to standard output.",
        "  Requires read (r) permission on the target file and execute (x) on all ancestor directories.",
        "",
        "OPTIONS",
        "  -n NUM   output the last NUM lines, instead of the last 10",
        "",
        "EXAMPLES",
        "  tail welcome.txt",
        "  tail -n 20 /var/log/syslog"
      ],
      more: [
        "NAME",
        "  more - file perusal filter for crt viewing",
        "",
        "SYNOPSIS",
        "  more [FILE]",
        "",
        "DESCRIPTION",
        "  Displays the contents of a file in the terminal window.",
        "  Enforces standard Unix read permissions before opening.",
        "",
        "EXAMPLES",
        "  more welcome.txt"
      ],
      less: [
        "NAME",
        "  less - opposite of more; view file contents",
        "",
        "SYNOPSIS",
        "  less [FILE]",
        "",
        "DESCRIPTION",
        "  View the contents of a file in the terminal window.",
        "  Enforces standard Unix read permissions before opening.",
        "",
        "EXAMPLES",
        "  less welcome.txt"
      ],
      sed: [
        "NAME",
        "  sed - stream editor for filtering and transforming text",
        "",
        "SYNOPSIS",
        "  sed [-i] 's/regexp/replacement/flags' [FILE]",
        "",
        "DESCRIPTION",
        "  Sed is a stream editor used to perform basic text transformations.",
        "  Enforces read permission when displaying changes and write permission when using -i in-place editing.",
        "",
        "OPTIONS",
        "  -i       edit files in place (requires write permission on the file)",
        "",
        "EXAMPLES",
        "  sed 's/foo/bar/g' test.txt",
        "  sed -i 's/127.0.0.1/localhost/g' hosts.ini"
      ]
    };
  }

  appendLine(line) {
    if (this.ui?.appendTerminalLine) {
      this.ui.appendTerminalLine(line);
    }
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

  getActiveUser() {
    if (this.isElevated) return "root";
    if (this.loggingSystem?.sessionChain?.length > 1) {
      const currentSession = this.loggingSystem.getCurrentSession();
      if (currentSession?.user) return currentSession.user;
    }
    if (this.loginManager?.currentUser?.username) {
      return this.loginManager.currentUser.username;
    }
    const currentSession = this.loggingSystem?.getCurrentSession();
    return currentSession?.user || this.profile?.promptUser || "admin";
  }

  getActiveGroups() {
    const user = this.getActiveUser();
    if (this.fileSystem && typeof this.fileSystem.getUserGroups === "function") {
      const groups = this.fileSystem.getUserGroups(user);
      if (groups && groups.length > 0) {
        return groups;
      }
    }
    const isAdmin = user === "root" ||
                    user === "admin" ||
                    (this.loginManager?.currentUser?.username === user && this.loginManager?.isAdmin?.());
    if (isAdmin) {
      return ["root", "admin", "wheel", "sudo"];
    }
    return ["users", user];
  }

  setCurrentDirectory(path) {
    this.currentPath = this.fileSystem.normalize(path);
    this.updatePromptPrefix();
    this.ui.setPrompt(this.promptPrefix, this.buffer);
  }

  updatePromptPrefix() {
    const currentSession = this.loggingSystem?.getCurrentSession();
    const user = this.getActiveUser();
    const host = currentSession?.hostname || this.profile.promptHost;
    const homeDir = "/home/" + user;
    let displayPath = this.currentPath;
    if (displayPath === homeDir || (displayPath === "/" && !homeDir)) {
      displayPath = "~";
    } else if (displayPath.startsWith(homeDir + "/")) {
      displayPath = "~" + displayPath.slice(homeDir.length);
    }
    const symbol = (user === "root" || this.isElevated) ? "# " : "$ ";
    this.promptPrefix = user + "@" + host + ":" + displayPath + symbol;
    this.ui.setTerminalTitle?.("Terminal - " + user + "@" + host + ":" + displayPath);
    this.ui.setPrompt?.(this.promptPrefix, this.buffer);
  }

  handleKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      if (event.ctrlKey && (event.key === "v" || event.key === "V")) {
        event.preventDefault();
        navigator.clipboard?.readText().then((text) => {
          if (text) {
            this.buffer += text.trim();
            this.ui.setPrompt(this.promptPrefix, this.buffer);
          }
        }).catch((err) => {
          // ignore
        });
      }
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

  findSavedKeyPassword(currentUser, targetUser, targetIp) {
    const knownHostsDir = `/home/${currentUser}/.ssh/known_hosts`;
    const entries = this.fileSystem.list(knownHostsDir) || [];
    for (const entry of entries) {
      if (entry.type === "file" && entry.name.endsWith(".key")) {
        const content = this.fileSystem.read(`${knownHostsDir}/${entry.name}`);
        if (content && content.includes(`username=${targetUser}`) && content.includes(`ip=${targetIp}`)) {
          const match = content.match(/password=(.+)/);
          if (match) return match[1].trim();
        }
      }
    }
    return null;
  }

  submitCommand(raw) {
    const command = raw.trim();
    this.ui.appendTerminalInput(this.promptPrefix + raw);

    if (this.caesarRipSession) {
      this.handleCaesarRipInput(raw.trim());
      return;
    }

    if (this.caesarRipRunning) {
      this.ui.appendTerminalLine("[*] CaesarRip dictionary audit in progress... Use 'kill " + this.caesarRipRunning.pid + "' to stop.");
      return;
    }

    if (!command) {
      return;
    }

    if (this.waitingForPassword) {
      const password = raw.trim();
      const { targetUser, targetHost, remoteSystem, targetArg } = this.waitingForPassword;
      this.waitingForPassword = null;

      const validPasswords = remoteSystem.passwords || { admin: "3tHr90" };
      const expectedPassword = validPasswords[targetUser] || "3tHr90";

      if (password === expectedPassword) {
        const currentSession = this.loggingSystem.getCurrentSession();
        const currentUser = currentSession.user || "admin";
        const knownHostsDir = `/home/${currentUser}/.ssh/known_hosts`;
        if (!this.fileSystem.resolve(knownHostsDir)) {
          this.fileSystem.mkdir(knownHostsDir);
        }
        const keyFilePath = `${knownHostsDir}/${targetUser}_${remoteSystem.ip}.key`;
        this.fileSystem.write(keyFilePath, [
          "[ssh_key]",
          `username=${targetUser}`,
          `ip=${remoteSystem.ip}`,
          `password=${password}`
        ].join("\n"));

        const newHop = this.loggingSystem.connectSSH(targetArg, targetUser);
        if (newHop) {
          this.fileSystem = newHop.fileSystem;
          this.currentPath = "/home/" + newHop.user;
          this.updatePromptPrefix();
          this.ui.setPrompt(this.promptPrefix, this.buffer);
          this.ui.appendTerminalLine("Connected to " + newHop.hostname + " (" + newHop.ip + ").");
          const prevIp = this.loggingSystem.getPreviousSession()?.ip || "10.0.0.5";
          this.ui.appendTerminalLine("Last login: " + new Date().toUTCString().slice(0, 25) + " from " + prevIp);
        }
      } else {
        this.ui.appendTerminalLine("Permission denied (publickey,password).");
      }
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
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const existing = this.fileSystem.resolve(resolved);
      if (existing) {
        if (!this.fileSystem.hasPermission(user, groups, resolved, "write")) {
          this.ui.appendTerminalLine(`sh: ${target}: Permission denied`);
          return;
        }
      } else {
        const parentDir = resolved.slice(0, resolved.lastIndexOf("/")) || "/";
        if (!this.fileSystem.hasPermission(user, groups, parentDir, "write")) {
          this.ui.appendTerminalLine(`sh: ${target}: Permission denied`);
          return;
        }
      }
      this.fileSystem.write(resolved, "", user, groups[0] || "users");
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
    const user = this.getActiveUser();
    const groups = this.getActiveGroups();
    const existing = this.fileSystem.resolve(resolved);
    if (existing) {
      if (!this.fileSystem.hasPermission(user, groups, resolved, "write")) {
        this.ui.appendTerminalLine(`sh: ${targetFile}: Permission denied`);
        return;
      }
    } else {
      const parentDir = resolved.slice(0, resolved.lastIndexOf("/")) || "/";
      if (!this.fileSystem.hasPermission(user, groups, parentDir, "write")) {
        this.ui.appendTerminalLine(`sh: ${targetFile}: Permission denied`);
        return;
      }
    }

    if (leftCmd === "cat /dev/null" || leftCmd === ":") {
      this.fileSystem.write(resolved, "", user, groups[0] || "users");
      this.loggingSystem?.logFileAccess(resolved, "modified", "/bin/cat");
      return;
    }

    const output = this.executeCommandCaptured(leftCmd);
    if (output.hadError) return;
    const content = output.join("\n") + (output.length ? "\n" : "");
    if (isAppend) {
      this.fileSystem.append(resolved, content);
    } else {
      this.fileSystem.write(resolved, content, user, groups[0] || "users");
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
    const errors = [];
    const origAppend = this.ui.appendTerminalLine.bind(this.ui);
    this.ui.appendTerminalLine = (line) => {
      if (typeof line === "string" && (line.includes("Permission denied") || line.includes("No such file") || line.includes("Is a directory") || line.includes("cannot access") || line.includes("Command not found") || line.includes("invalid mode"))) {
        errors.push(line);
      } else {
        captured.push(line);
      }
    };
    try {
      this.executeSingleCommand(cmdStr, stdin);
    } finally {
      this.ui.appendTerminalLine = origAppend;
    }
    for (const err of errors) {
      origAppend(err);
    }
    if (errors.length > 0) {
      captured.hadError = true;
    }
    return captured;
  }

  formatModeString(octal = "644", type = "file", isExecutable = false) {
    const typeChar = type === "directory" ? "d" : "-";
    const digits = String(octal || (type === "directory" ? "755" : "644")).padStart(3, "0").slice(-3);
    const map = {
      "0": "---",
      "1": "--x",
      "2": "-w-",
      "3": "-wx",
      "4": "r--",
      "5": "r-x",
      "6": "rw-",
      "7": "rwx"
    };
    let u = map[digits[0]] || "rw-";
    let g = map[digits[1]] || "r--";
    let o = map[digits[2]] || "r--";
    if (isExecutable && u[2] === "-") {
      u = u.slice(0, 2) + "x";
    }
    return `${typeChar}${u}${g}${o}`;
  }

  formatFileSize(bytes = 0, humanReadable = false) {
    const num = Number(bytes) || 0;
    if (!humanReadable) {
      return String(num).padStart(6, " ");
    }
    if (num < 1024) return `${num}B`.padStart(6, " ");
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)}K`.padStart(6, " ");
    return `${(num / (1024 * 1024)).toFixed(1)}M`.padStart(6, " ");
  }

  formatLsDate(mtime = null) {
    const d = mtime ? new Date(mtime) : new Date();
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${month} ${day} ${hours}:${mins}`;
  }

  formatShortLsEntry(entry, classify = false) {
    let name = entry.name;
    if (classify) {
      if (entry.type === "directory") name += "/";
      else if (entry.executable || entry.format === "py") name += "*";
    } else if (entry.type === "directory" && name !== "." && name !== "..") {
      name += "/";
    }
    return name;
  }

  formatLongLsEntry(entry, humanReadable = false, classify = false) {
    const isExec = Boolean(entry.executable || entry.format === "py");
    const mode = this.formatModeString(entry.permissions, entry.type, isExec);
    const links = entry.type === "directory" ? "2" : "1";
    const owner = (entry.owner || "admin").padEnd(8, " ");
    const group = (entry.group || (entry.owner === "admin" ? "admin" : "users")).padEnd(8, " ");
    const size = this.formatFileSize(entry.size, humanReadable);
    const dateStr = this.formatLsDate(entry.mtime);
    let displayName = entry.name;
    if (classify) {
      if (entry.type === "directory") displayName += "/";
      else if (isExec) displayName += "*";
    }
    return `${mode} ${links.padStart(2, " ")} ${owner} ${group} ${size} ${dateStr} ${displayName}`;
  }

  executeSingleCommand(command, stdin = null) {
    const parts = command.split(" ");
    const primary = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (this.ui.isNanoOpen?.()) {
      if (primary === "save") {
        this.ui.triggerNanoSave?.();
        return;
      }
      if (primary === "exit") {
        this.ui.triggerNanoExit?.();
        return;
      }
      this.ui.appendTerminalLine("nano: active editing session in progress. Type 'save' to save or 'exit' to quit without saving.");
      return;
    }

    if (
      args.includes("--help") ||
      (args.length === 1 && args[0].toLowerCase() === "help") ||
      (args.length === 1 && args[0] === "-h" && primary !== "ls" && primary !== "ps")
    ) {
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
      const targetArg = args[0];
      const providedPassword = args[1];

      if (!targetArg) {
        this.ui.appendTerminalLine("Usage: ssh <user>@<host> [password] or ssh <host>");
        return;
      }

      let targetUser = "admin";
      let targetHost = targetArg;
      if (targetArg.includes("@")) {
        const parts = targetArg.split("@");
        targetUser = parts[0] || "admin";
        targetHost = parts[1];
      }

      let remoteSystem = this.loggingSystem?.remoteSystems.get(targetHost) || this.loggingSystem?.networkRegistry?.getSystem(targetHost);
      if (!remoteSystem) {
        remoteSystem = {
          hostname: targetHost.match(/^\d+\.\d+\.\d+\.\d+$/) ? "host-" + targetHost.replace(/\./g, "-") : targetHost,
          ip: targetHost.match(/^\d+\.\d+\.\d+\.\d+$/) ? targetHost : "172.16.20.10",
          user: targetUser,
          passwords: { admin: "3tHr90" },
          fileSystem: this.fileSystem?.clone ? this.fileSystem.clone() : new FileSystem()
        };
      }

      const validPasswords = remoteSystem.passwords || { admin: "3tHr90" };
      const expectedPassword = validPasswords[targetUser] || "3tHr90";

      const currentSession = this.loggingSystem.getCurrentSession();
      const currentUser = currentSession.user || "admin";

      let passwordToUse = providedPassword;
      if (!passwordToUse) {
        const savedPw = this.findSavedKeyPassword(currentUser, targetUser, remoteSystem.ip);
        if (savedPw) {
          passwordToUse = savedPw;
        }
      }

      if (passwordToUse) {
        if (passwordToUse === expectedPassword) {
          const knownHostsDir = `/home/${currentUser}/.ssh/known_hosts`;
          if (!this.fileSystem.resolve(knownHostsDir)) {
            this.fileSystem.mkdir(knownHostsDir);
          }
          const keyFilePath = `${knownHostsDir}/${targetUser}_${remoteSystem.ip}.key`;
          this.fileSystem.write(keyFilePath, [
            "[ssh_key]",
            `username=${targetUser}`,
            `ip=${remoteSystem.ip}`,
            `password=${passwordToUse}`
          ].join("\n"));

          const newHop = this.loggingSystem.connectSSH(targetArg, targetUser);
          if (newHop) {
            this.fileSystem = newHop.fileSystem;
            this.currentPath = "/home/" + newHop.user;
            this.updatePromptPrefix();
            this.ui.setPrompt(this.promptPrefix, this.buffer);
            this.ui.appendTerminalLine("Connected to " + newHop.hostname + " (" + newHop.ip + ").");
            const prevIp = this.loggingSystem.getPreviousSession()?.ip || "10.0.0.5";
            this.ui.appendTerminalLine("Last login: " + new Date().toUTCString().slice(0, 25) + " from " + prevIp);
          }
        } else {
          this.ui.appendTerminalLine("Permission denied (publickey,password).");
        }
      } else {
        this.ui.appendTerminalLine(`${targetUser}@${targetHost}'s password: `);
        this.waitingForPassword = { targetUser, targetHost, remoteSystem, targetArg };
      }
      return;
    }

    if (primary === "exit") {
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

    if (primary === "logout") {
      if (this.ui.isNanoOpen?.()) {
        this.ui.closeNano?.();
      }
      if (this.caesarRipRunning) {
        for (const t of this.caesarRipRunning.timers) clearTimeout(t);
        this.caesarRipRunning = null;
      }
      this.caesarRipSession = null;
      for (const [pid, name] of [...this.processes.entries()]) {
        if (pid !== 1) {
          this.processes.delete(pid);
          this.resourceManager?.stop(pid);
        }
      }
      const currentSession = this.loggingSystem?.getCurrentSession();
      const hostname = currentSession?.hostname || this.profile?.promptHost || "demicube-test";
      this.ui.appendTerminalLine(`Logging out of ${hostname}...`);
      if (this.logoutHandler) {
        this.logoutHandler(currentSession);
      } else {
        this.ui.showLoginScreen();
      }
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

    if (primary === "disconnect") {
      if (this.loggingSystem?.isInSSHSession()) {
        this.loggingSystem.resetSessionChain();
        const current = this.loggingSystem.getCurrentSession();
        this.fileSystem = current.fileSystem;
        this.currentPath = "/home/" + current.user;
        this.updatePromptPrefix();
        this.ui.setPrompt(this.promptPrefix, this.buffer);
        this.ui.appendTerminalLine("Connection closed. Returned to local host (" + current.hostname + ").");
      } else {
        this.ui.appendTerminalLine("Not in an active SSH session.");
      }
      return;
    }

    if (primary === "scp") {
      if (!this.loggingSystem?.isInSSHSession()) {
        this.ui.appendTerminalLine("scp: Not in an active SSH session.");
        this.ui.appendTerminalLine("Use scp while connected to a remote system via SSH to copy files back to your home system.");
        return;
      }

      let recursive = false;
      const operands = [];
      for (const arg of args) {
        if (arg === "-r" || arg === "-R" || arg === "--recursive") {
          recursive = true;
        } else if (!arg.startsWith("-")) {
          operands.push(arg);
        }
      }

      if (operands.length === 0) {
        this.ui.appendTerminalLine("Usage: scp [-r] <remote_path> ...");
        return;
      }

      const currentSession = this.loggingSystem.getCurrentSession();
      const remoteFs = this.fileSystem;
      const remoteHostname = currentSession?.hostname || "remote";
      const homeSession = this.loggingSystem.sessionChain[0];
      const homeFs = homeSession?.fileSystem || this.loggingSystem.localFileSystem;
      const homeHostname = homeSession?.hostname || this.loggingSystem.localSystem?.hostname || "demicube-testbox";
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();

      const isSudo = typeof remoteFs.isUserSudoer === "function" ? remoteFs.isUserSudoer(user) : false;
      let isRemoteAdmin = (
        user === "root" ||
        user === "admin" ||
        isSudo ||
        (Array.isArray(groups) && (groups.includes("admin") || groups.includes("root") || groups.includes("wheel") || groups.includes("sudo"))) ||
        Boolean(this.isElevated)
      );

      if (!isRemoteAdmin) {
        const regSys = this.loggingSystem?.networkRegistry?.getSystem?.(remoteHostname) ||
                       this.loggingSystem?.networkRegistry?.getSystem?.(currentSession?.ip) ||
                       this.loggingSystem?.remoteSystems?.get?.(remoteHostname);
        if (regSys) {
          if (regSys.user === user && (regSys.role?.toLowerCase()?.includes("admin") || regSys.role?.toLowerCase()?.includes("root"))) {
            isRemoteAdmin = true;
          }
          if (Array.isArray(regSys.users)) {
            const uDef = regSys.users.find((u) => (u.username || u.id) === user);
            if (uDef && (uDef.role === "admin" || uDef.sudo === true || uDef.permissions?.includes("full") || uDef.groups?.includes("admin"))) {
              isRemoteAdmin = true;
            }
          }
        }
      }

      let anySuccess = false;

      const sanitizeStructurePath = (p) => {
        return p.replace(/^\.?\//, "/").replace(/\/+/g, "/");
      };

      for (const operand of operands) {
        const sourcePath = this.resolvePath(operand);
        const parentPath = remoteFs.getParentPath(sourcePath);

        if (!isRemoteAdmin && parentPath && parentPath !== "/" && !remoteFs.hasPermission(user, groups, parentPath, "execute")) {
          this.ui.appendTerminalLine("scp: cannot stat '" + operand + "': Permission denied");
          continue;
        }

        const srcNode = remoteFs.resolve(sourcePath);

        if (!srcNode) {
          this.ui.appendTerminalLine("scp: cannot stat '" + operand + "': No such file or directory");
          continue;
        }

        if (!isRemoteAdmin && !remoteFs.hasPermission(user, groups, sourcePath, "read")) {
          this.ui.appendTerminalLine("scp: cannot open '" + operand + "' for reading: Permission denied");
          continue;
        }

        if (srcNode.type === "directory") {
          if (!recursive) {
            this.ui.appendTerminalLine("scp: " + operand + ": Is a directory (not copied). Use -r to copy directories.");
            continue;
          }

          if (!isRemoteAdmin && !remoteFs.hasPermission(user, groups, sourcePath, "execute")) {
            this.ui.appendTerminalLine("scp: cannot open '" + operand + "' for reading: Permission denied");
            continue;
          }

          const targetStructure = sanitizeStructurePath(sourcePath);
          const destDirPath = homeFs.normalize("/downloads/emulated/" + remoteHostname + targetStructure);
          const parentDestDir = homeFs.getParentPath(destDirPath);
          homeFs.mkdir(parentDestDir, "admin", "admin", "755");
          const parentNode = homeFs.resolve(parentDestDir);
          const dirName = destDirPath.split("/").pop();

          if (!parentNode || parentNode.type !== "directory") {
            this.ui.appendTerminalLine("scp: failed to create destination directory on " + homeHostname);
            continue;
          }

          const copyDirRecursive = (currentRemotePath) => {
            const dirNode = remoteFs.resolve(currentRemotePath);
            if (!dirNode || dirNode.type !== "directory") return null;

            const destNode = {
              type: "directory",
              children: {},
              owner: "admin",
              group: "admin",
              permissions: "755"
            };

            for (const [childName, childNode] of Object.entries(dirNode.children || {})) {
              const childRemotePath = remoteFs.normalize(currentRemotePath + "/" + childName);

              if (childNode.type === "directory") {
                if (!isRemoteAdmin && (!remoteFs.hasPermission(user, groups, childRemotePath, "read") ||
                                       !remoteFs.hasPermission(user, groups, childRemotePath, "execute"))) {
                  this.ui.appendTerminalLine("scp: cannot open directory '" + childRemotePath + "': Permission denied");
                  continue;
                }
                const clonedSub = copyDirRecursive(childRemotePath);
                if (clonedSub) {
                  destNode.children[childName] = clonedSub;
                }
              } else if (childNode.type === "file") {
                if (!isRemoteAdmin && !remoteFs.hasPermission(user, groups, childRemotePath, "read")) {
                  this.ui.appendTerminalLine("scp: cannot open '" + childRemotePath + "' for reading: Permission denied");
                  continue;
                }
                const clonedFile = remoteFs.cloneNode(childNode);
                clonedFile.owner = "admin";
                clonedFile.group = "admin";
                clonedFile.permissions = clonedFile.permissions || "644";
                destNode.children[childName] = clonedFile;
                this.loggingSystem?.logFileAccess(childRemotePath, "copied via scp to " + homeHostname, "/bin/scp");
              }
            }

            return destNode;
          };

          const clonedDir = copyDirRecursive(sourcePath);
          if (!clonedDir) {
            continue;
          }

          parentNode.children[dirName] = clonedDir;
          this.loggingSystem?.logFileAccess(sourcePath, "copied via scp -r to " + homeHostname, "/bin/scp");
          this.ui.appendTerminalLine(`Transferred directory: ${sourcePath} -> ${homeHostname}:${destDirPath}`);
          anySuccess = true;
          continue;
        }

        // Single file copy
        const lastSlash = sourcePath.lastIndexOf("/");
        const remoteDir = lastSlash > 0 ? sourcePath.slice(0, lastSlash) : (lastSlash === 0 ? "/" : "");
        const fileName = sourcePath.slice(lastSlash + 1);

        const targetStructure = sanitizeStructurePath(remoteDir === "/" ? "" : remoteDir);
        const destDir = homeFs.normalize("/downloads/emulated/" + remoteHostname + targetStructure);
        homeFs.mkdir(destDir, "admin", "admin", "755");
        const destParentNode = homeFs.resolve(destDir);

        if (!destParentNode || destParentNode.type !== "directory") {
          this.ui.appendTerminalLine("scp: failed to create destination directory: " + destDir);
          continue;
        }

        const clonedFile = remoteFs.cloneNode(srcNode);
        clonedFile.owner = "admin";
        clonedFile.group = "admin";
        clonedFile.permissions = clonedFile.permissions || "644";
        destParentNode.children[fileName] = clonedFile;

        this.loggingSystem?.logFileAccess(sourcePath, "copied via scp to " + homeHostname, "/bin/scp");

        const size = clonedFile.content ? String(clonedFile.content).length : (clonedFile.format === "binary" ? 1024 : 0);
        const sizeStr = size < 1024 ? `${size}B` : `${(size / 1024).toFixed(1)}KB`;
        const destFilePath = homeFs.normalize(destDir + "/" + fileName);

        this.ui.appendTerminalLine(`${fileName.padEnd(24)} 100%  ${sizeStr.padStart(6)}   1.4MB/s   00:00`);
        this.ui.appendTerminalLine(`Transferred: ${sourcePath} -> ${homeHostname}:${destFilePath}`);
        anySuccess = true;
      }

      if (anySuccess && this.filesApp) {
        this.filesApp.start();
      }
      return;
    }

    if (primary === "nano") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: nano <path>");
        return;
      }
      const path = this.resolvePath(target);
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const existing = this.fileSystem.resolve(path);

      if (existing) {
        if (existing.type === "directory") {
          this.ui.appendTerminalLine("nano: " + target + ": Is a directory");
          return;
        }
        if (!this.fileSystem.hasPermission(user, groups, path, "write")) {
          this.ui.appendTerminalLine("nano: cannot open '" + target + "': Permission denied");
          return;
        }
      } else {
        const parentDir = path.slice(0, path.lastIndexOf("/")) || "/";
        if (!this.fileSystem.hasPermission(user, groups, parentDir, "write")) {
          this.ui.appendTerminalLine("nano: cannot create file '" + target + "': Permission denied");
          return;
        }
      }

      let content = this.fileSystem.read(path);
      if (content === null) {
        content = "";
      }
      const nanoPid = Math.max(...this.processes.keys(), 10) + 1;
      this.processes.set(nanoPid, "nano");

      this.ui.openNano?.(
        path,
        content,
        (savePath, newContent) => {
          const saveNode = this.fileSystem.resolve(savePath);
          if (saveNode) {
            if (!this.fileSystem.hasPermission(user, groups, savePath, "write")) {
              this.ui.appendTerminalLine("nano: cannot write to '" + savePath + "': Permission denied");
              return;
            }
          } else {
            const parent = savePath.slice(0, savePath.lastIndexOf("/")) || "/";
            if (!this.fileSystem.hasPermission(user, groups, parent, "write")) {
              this.ui.appendTerminalLine("nano: cannot create '" + savePath + "': Permission denied");
              return;
            }
          }
          this.fileSystem.write(savePath, newContent, user, groups[0] || "users");
          this.loggingSystem?.logFileAccess(savePath, "modified", "/bin/nano");
          if (this.zenmapApp && (savePath.includes("zenmap") || savePath.includes("savedata.ini") || savePath.includes("hosts.ini"))) {
            this.zenmapApp.reloadFromDisk();
          }
          if (this.vpnguardApp && (savePath.includes("vpnguard") || savePath.includes("savedata.ini"))) {
            this.vpnguardApp.loadFromDisk();
          }
        },
        () => {
          this.processes.delete(nanoPid);
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
        const node = this.fileSystem.resolve(resolved);
        if (!node) {
          this.ui.appendTerminalLine("grep: " + filePath + ": No such file or directory");
          return;
        }
        if (node.type === "directory") {
          this.ui.appendTerminalLine("grep: " + filePath + ": Is a directory");
          return;
        }
        const user = this.getActiveUser();
        const groups = this.getActiveGroups();
        if (!this.fileSystem.hasPermission(user, groups, resolved, "read")) {
          this.ui.appendTerminalLine("grep: " + filePath + ": Permission denied");
          return;
        }
        const content = this.fileSystem.read(resolved);
        this.loggingSystem?.logFileAccess(resolved, "opened", "/bin/grep");
        linesToSearch = (content || "").split("\n");
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
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const existing = this.fileSystem.resolve(path);
      if (existing) {
        if (!this.fileSystem.hasPermission(user, groups, path, "write")) {
          this.ui.appendTerminalLine("touch: cannot touch '" + target + "': Permission denied");
          return;
        }
      } else {
        const parentDir = path.slice(0, path.lastIndexOf("/")) || "/";
        if (!this.fileSystem.hasPermission(user, groups, parentDir, "write")) {
          this.ui.appendTerminalLine("touch: cannot touch '" + target + "': Permission denied");
          return;
        }
      }
      this.fileSystem.touch(path, user, groups[0] || "users");
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
      const user = this.getActiveUser();
      const res = this.fileSystem.chmod(path, mode, user);
      if (!res || !res.success) {
        this.ui.appendTerminalLine("chmod: " + (res?.error || "cannot access '" + args[1] + "'"));
        return;
      }
      this.loggingSystem?.logFileAccess(path, "modified", "/bin/chmod");
      return;
    }

    if (primary === "chown") {
      if (args.length < 2) {
        this.ui.appendTerminalLine("Usage: chown <owner[:group]> <path>");
        return;
      }
      const ownership = args[0];
      const path = this.resolvePath(args[1]);
      const activeUser = this.getActiveUser();
      const res = this.fileSystem.chown(path, ownership, activeUser);
      if (!res || !res.success) {
        this.ui.appendTerminalLine("chown: " + (res?.error || "cannot access '" + args[1] + "'"));
        return;
      }
      this.loggingSystem?.logFileAccess(path, "modified", "/bin/chown");
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
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const parentDir = path.slice(0, path.lastIndexOf("/")) || "/";
      if (!this.fileSystem.hasPermission(user, groups, parentDir, "write")) {
        this.ui.appendTerminalLine("mkdir: cannot create directory '" + target + "': Permission denied");
        return;
      }
      this.fileSystem.mkdir(path, user, groups[0] || "users", "755");
      this.loggingSystem?.logFileAccess(path, "modified", "/bin/mkdir");
      return;
    }

    if (primary === "hostname") {
      const currentSession = this.loggingSystem?.getCurrentSession();
      this.ui.appendTerminalLine(currentSession?.hostname || this.profile.promptHost);
      return;
    }

    if (primary === "help") {
      if (args[0]) {
        this.showCommandHelp(args[0].toLowerCase());
        return;
      }
      this.ui.appendTerminalLine("=== DemicubeOS Command Index ===");
      this.ui.appendTerminalLine("File & Directory Management:");
      this.ui.appendTerminalLine("  ls, ll, cd, pwd, cat, touch, mkdir, cp, mv, rm, chmod, chown, open, nano");
      this.ui.appendTerminalLine("Text Processing & Inspection:");
      this.ui.appendTerminalLine("  grep, echo");
      this.ui.appendTerminalLine("User & System Identity:");
      this.ui.appendTerminalLine("  whoami, id, groups, usermod, hostname, date");
      this.ui.appendTerminalLine("Networking & Remote Access:");
      this.ui.appendTerminalLine("  ssh, scp, session, disconnect, zenmap, vpnguard, ifconfig, ip, route, curl");
      this.ui.appendTerminalLine("Processes & Administration:");
      this.ui.appendTerminalLine("  ps, kill, sudo, reboot, install, logout, exit, python3");
      this.ui.appendTerminalLine("Desktop & Window Control:");
      this.ui.appendTerminalLine("  terminal, files, settings, task-manager, music-player, codepad+, clawder-python, snap, focus, clear, exit");
      this.ui.appendTerminalLine("");
      this.ui.appendTerminalLine("Type 'help <command>' or '<command> --help' for complete documentation and modifiers.");
      this.ui.appendTerminalLine("Examples: 'help ls', 'help chmod', 'help id', 'ls --help'");
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

    if (primary === "id") {
      const targetUser = args.find((a) => !a.startsWith("-")) || this.getActiveUser();
      const userGroups = (this.fileSystem && typeof this.fileSystem.getUserGroups === "function")
        ? this.fileSystem.getUserGroups(targetUser)
        : (targetUser === "admin" || targetUser === "root" ? ["admin", "sudo"] : [targetUser]);
      const uid = targetUser === "root" ? 0 : (targetUser === "admin" ? 1000 : 1001);
      const gid = targetUser === "root" ? 0 : (targetUser === "admin" ? 1000 : 1001);
      const primaryGroup = userGroups[0] || targetUser;
      const groupsStr = userGroups.map((g, idx) => {
        const idNum = g === "root" ? 0 : (g === "admin" ? 1000 : 1000 + idx);
        return `${idNum}(${g})`;
      }).join(",");

      if (args.includes("-u")) {
        this.ui.appendTerminalLine(args.includes("-n") ? targetUser : String(uid));
      } else if (args.includes("-g")) {
        this.ui.appendTerminalLine(args.includes("-n") ? primaryGroup : String(gid));
      } else if (args.includes("-G")) {
        this.ui.appendTerminalLine(userGroups.map((g, idx) => (g === "root" ? "0" : String(1000 + idx))).join(" "));
      } else {
        this.ui.appendTerminalLine(`uid=${uid}(${targetUser}) gid=${gid}(${primaryGroup}) groups=${groupsStr}`);
      }
      return;
    }

    if (primary === "groups") {
      const targetUser = args.find((a) => !a.startsWith("-")) || this.getActiveUser();
      const userGroups = (this.fileSystem && typeof this.fileSystem.getUserGroups === "function")
        ? this.fileSystem.getUserGroups(targetUser)
        : (targetUser === "admin" || targetUser === "root" ? ["admin", "sudo"] : [targetUser]);
      this.ui.appendTerminalLine(`${targetUser} : ${userGroups.join(" ")}`);
      return;
    }

    if (primary === "usermod") {
      const activeUser = this.getActiveUser();
      let mode = null;
      let groupName = null;
      let targetUser = null;

      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "-aG" || arg === "-Ga") {
          mode = "append";
          groupName = args[++i];
        } else if (arg === "-rm" || arg === "-r" || arg === "-d") {
          mode = "remove";
          groupName = args[++i];
        } else if (arg === "-a") {
          if (args[i + 1] === "-G") {
            mode = "append";
            i++;
            groupName = args[++i];
          }
        } else if (arg === "-G") {
          if (mode === "append" && !groupName) {
            groupName = args[++i];
          }
        } else if (!arg.startsWith("-")) {
          if (!groupName) {
            groupName = arg;
          } else if (!targetUser) {
            targetUser = arg;
          }
        }
      }

      if (!mode || !groupName || !targetUser) {
        this.ui.appendTerminalLine("Usage: usermod -aG <group> <user>  or  usermod -rm <group> <user>");
        return;
      }

      if (!this.fileSystem || typeof this.fileSystem.modifyUserGroup !== "function") {
        this.ui.appendTerminalLine("usermod: filesystem group management unavailable");
        return;
      }

      const res = this.fileSystem.modifyUserGroup(mode, groupName, targetUser, activeUser);
      if (!res.success) {
        this.ui.appendTerminalLine(`usermod: ${res.error}`);
        return;
      }

      if (mode === "append") {
        this.ui.appendTerminalLine(`Added user '${targetUser}' to group '${groupName}'.`);
      } else {
        this.ui.appendTerminalLine(`Removed user '${targetUser}' from group '${groupName}'.`);
      }
      this.loggingSystem?.logFileAccess?.("/etc/group/system_groups.reg", "modified", "/bin/usermod");
      return;
    }

    if (primary === "python3" || primary === "python" || primary === "./caesarrip.py" || primary === "caesarrip.py") {
      let target = args[0];
      if (primary === "./caesarrip.py" || primary === "caesarrip.py") {
        target = "CaesarRip.py";
      }
      if (!target) {
        this.ui.appendTerminalLine("Usage: python3 <file.py>");
        return;
      }

      const isCaesarRip =
        target.toLowerCase() === "caesarrip.py" ||
        target.toLowerCase().endsWith("/caesarrip.py") ||
        target.toLowerCase() === "caesarrip.txt" ||
        target.toLowerCase().endsWith("/caesarrip.txt");

      if (isCaesarRip) {
        const resolvedPath = this.resolveFlexiblePath(target);
        let scriptNode = this.fileSystem.resolve(resolvedPath);
        if (!scriptNode) {
          const alt1 = this.resolvePath("CaesarRip.py");
          const alt2 = this.resolvePath("CaesarRip.txt");
          const alt3 = "/documents/clawder-python/CaesarRip.py";
          const alt4 = "/documents/clawder-python/CaesarRip.txt";
          if (this.fileSystem.resolve(alt1)) scriptNode = this.fileSystem.resolve(alt1);
          else if (this.fileSystem.resolve(alt2)) scriptNode = this.fileSystem.resolve(alt2);
          else if (this.fileSystem.resolve(alt3)) scriptNode = this.fileSystem.resolve(alt3);
          else if (this.fileSystem.resolve(alt4)) scriptNode = this.fileSystem.resolve(alt4);
        }

        if (!scriptNode) {
          this.ui.appendTerminalLine("python3: can't open file '" + target + "': [Errno 2] No such file or directory");
          return;
        }

        const cliArgs = (primary === "./caesarrip.py" || primary === "caesarrip.py") ? args : args.slice(1);
        if (cliArgs.length >= 2) {
          const targetSh = this.resolveFlexiblePath(cliArgs[0]);
          const wordlist = this.resolveFlexiblePath(cliArgs[1]);
          if (!this.fileSystem.resolve(targetSh)) {
            this.ui.appendTerminalLine(`[!] File Error: Target file '${cliArgs[0]}' not found.`);
            return;
          }
          if (!this.fileSystem.resolve(wordlist)) {
            this.ui.appendTerminalLine(`[!] File Error: Wordlist '${cliArgs[1]}' not found.`);
            return;
          }
          this.startCaesarRipAttack(targetSh, wordlist);
          return;
        }

        this.caesarRipSession = {
          step: "target_sh",
          targetShPath: null
        };
        this.ui.appendTerminalLine("[*] CaesarRip v1.4 - Cryptographic Hash & Key Recovery Suite");
        this.ui.appendTerminalLine("[*] Initializing virtual dictionary auditing runtime...");
        this.ui.appendTerminalLine("Enter location of the .sh file to be cracked: ");
        return;
      }

      const path = this.resolvePath(target);
      const node = this.fileSystem.resolve(path);
      if (!node) {
        this.ui.appendTerminalLine("python3: can't open file '" + target + "': [Errno 2] No such file or directory");
        return;
      }
      if (node.type === "directory") {
        this.ui.appendTerminalLine("python3: can't open file '" + target + "': [Errno 21] Is a directory");
        return;
      }
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      if (!this.fileSystem.hasPermission(user, groups, path, "read")) {
        this.ui.appendTerminalLine("python3: can't open file '" + target + "': [Errno 13] Permission denied");
        return;
      }
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
      if (this.caesarRipRunning && this.caesarRipRunning.pid === pid) {
        for (const t of this.caesarRipRunning.timers) clearTimeout(t);
        this.caesarRipRunning = null;
        this.ui.appendTerminalLine(`[CaesarRip PID ${pid} terminated]`);
      }
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
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const source = this.resolvePath(args[0]);
      const destination = this.resolvePath(args[1]);

      const srcNode = this.fileSystem.resolve(source);
      if (!srcNode) {
        this.ui.appendTerminalLine("cp: cannot stat '" + args[0] + "': No such file or directory");
        return;
      }
      if (!this.fileSystem.hasPermission(user, groups, source, "read")) {
        this.ui.appendTerminalLine("cp: cannot open '" + args[0] + "' for reading: Permission denied");
        return;
      }

      const destNode = this.fileSystem.resolve(destination);
      let targetWriteDir;
      if (destNode && destNode.type === "directory") {
        targetWriteDir = destination;
      } else if (destNode) {
        if (!this.fileSystem.hasPermission(user, groups, destination, "write")) {
          this.ui.appendTerminalLine("cp: cannot create regular file '" + args[1] + "': Permission denied");
          return;
        }
        targetWriteDir = null;
      } else {
        targetWriteDir = destination.slice(0, destination.lastIndexOf("/")) || "/";
      }

      if (targetWriteDir && !this.fileSystem.hasPermission(user, groups, targetWriteDir, "write")) {
        this.ui.appendTerminalLine("cp: cannot create regular file '" + args[1] + "': Permission denied");
        return;
      }

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
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const source = this.resolvePath(args[0]);
      const destination = this.resolvePath(args[1]);

      const srcNode = this.fileSystem.resolve(source);
      if (!srcNode) {
        this.ui.appendTerminalLine("mv: cannot stat '" + args[0] + "': No such file or directory");
        return;
      }

      const srcParent = source.slice(0, source.lastIndexOf("/")) || "/";
      if (!this.fileSystem.hasPermission(user, groups, srcParent, "write")) {
        this.ui.appendTerminalLine("mv: cannot move '" + args[0] + "': Permission denied");
        return;
      }

      const destNode = this.fileSystem.resolve(destination);
      let targetWriteDir;
      if (destNode && destNode.type === "directory") {
        targetWriteDir = destination;
      } else if (destNode) {
        if (!this.fileSystem.hasPermission(user, groups, destination, "write")) {
          this.ui.appendTerminalLine("mv: cannot move to '" + args[1] + "': Permission denied");
          return;
        }
        targetWriteDir = null;
      } else {
        targetWriteDir = destination.slice(0, destination.lastIndexOf("/")) || "/";
      }

      if (targetWriteDir && !this.fileSystem.hasPermission(user, groups, targetWriteDir, "write")) {
        this.ui.appendTerminalLine("mv: cannot move to '" + args[1] + "': Permission denied");
        return;
      }

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

      const user = this.getActiveUser();
      const groups = this.getActiveGroups();

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
            if (!this.fileSystem.hasPermission(user, groups, resolvedDir, "write")) {
              this.ui.appendTerminalLine("rm: cannot remove in '" + operand + "': Permission denied");
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

            const parentDir = path.slice(0, path.lastIndexOf("/")) || "/";
            if (!this.fileSystem.hasPermission(user, groups, parentDir, "write")) {
              this.ui.appendTerminalLine("rm: cannot remove '" + operand + "': Permission denied");
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
      this.ui.appendTerminalLine("Broadcast message from root@demicube-testbox (pts/0):");
      this.ui.appendTerminalLine("The system is going down for reboot NOW!");
      this.ui.appendTerminalLine("[  OK  ] Stopping systemd-logind service...");
      this.ui.appendTerminalLine("[  OK  ] Unmounting remote sessions and virtual filesystems...");

      const procs = [...this.processes.entries()];
      (async () => {
        for (const [pid, name] of procs) {
          if (pid === 1) continue;
          this.ui.appendTerminalLine(`[  OK  ] Stopping process [PID ${pid}] ${name}...`);
          await new Promise((r) => setTimeout(r, 350));
          this.processes.delete(pid);
          this.resourceManager?.stop(pid);
          if (this.syncProcesses) this.syncProcesses();
          const windowId = this.processWindows.get(pid);
          if (this.stopProgram) {
            this.stopProgram(pid, windowId);
          } else if (windowId) {
            this.windowManager.remove(windowId);
            this.ui.setWindowVisible(windowId, false);
          }
        }
        this.ui.appendTerminalLine("[  OK  ] Reached target Reboot.");
        this.ui.appendTerminalLine("[  OK  ] Restarting system kernel...");
        await new Promise((r) => setTimeout(r, 500));
        this.rebootSystem?.();
      })();
      return;
    }

    if (primary === "pwd") {
      this.ui.appendTerminalLine(this.currentPath);
      return;
    }

    if (primary === "ls" || primary === "ll") {
      const flags = args.filter((a) => a.startsWith("-"));
      const nonFlags = args.filter((a) => !a.startsWith("-"));
      
      const isLl = primary === "ll";
      const isLong = isLl || flags.some((f) => f === "--long" || (f.startsWith("-") && !f.startsWith("--") && f.includes("l")));
      const showAll = isLl || flags.some((f) => f === "--all" || (f.startsWith("-") && !f.startsWith("--") && f.includes("a")));
      const almostAll = !showAll && flags.some((f) => f === "--almost-all" || (f.startsWith("-") && !f.startsWith("--") && f.includes("A")));
      const humanReadable = flags.some((f) => f === "--human-readable" || (f.startsWith("-") && !f.startsWith("--") && f.includes("h")));
      const classify = flags.some((f) => f === "--classify" || (f.startsWith("-") && !f.startsWith("--") && f.includes("F")));
      const sortByTime = flags.some((f) => f.startsWith("-") && !f.startsWith("--") && f.includes("t"));
      const sortBySize = flags.some((f) => f.startsWith("-") && !f.startsWith("--") && f.includes("S"));
      const reverseSort = flags.some((f) => f === "--reverse" || (f.startsWith("-") && !f.startsWith("--") && f.includes("r")));
      const directoryOnly = flags.some((f) => f === "--directory" || (f.startsWith("-") && !f.startsWith("--") && f.includes("d")));

      const targetRaw = nonFlags[0] || this.currentPath;
      const target = this.resolvePath(targetRaw);
      const targetNode = this.fileSystem.resolve(target);

      if (!targetNode) {
        this.ui.appendTerminalLine("ls: cannot access '" + (nonFlags[0] || targetRaw) + "': No such file or directory");
        return;
      }

      const user = this.getActiveUser();
      const groups = this.getActiveGroups();

      if (targetNode.type !== "directory" || directoryOnly) {
        const singleEntry = {
          name: nonFlags[0] || target.split("/").pop() || target,
          type: targetNode.type || "file",
          permissions: targetNode.permissions || "644",
          owner: targetNode.owner || "admin",
          group: targetNode.group || "admin",
          size: targetNode.size || 0,
          mtime: targetNode.mtime || Date.now(),
          executable: Boolean(targetNode.executable)
        };
        if (isLong) {
          this.ui.appendTerminalLine(this.formatLongLsEntry(singleEntry, humanReadable, classify));
        } else {
          this.ui.appendTerminalLine(this.formatShortLsEntry(singleEntry, classify));
        }
        return;
      }

      if (!this.fileSystem.hasPermission(user, groups, target, "read")) {
        this.ui.appendTerminalLine("ls: cannot open directory '" + (nonFlags[0] || targetRaw) + "': Permission denied");
        return;
      }

      const entries = this.fileSystem.list(target);
      if (!entries) {
        this.ui.appendTerminalLine("ls: cannot open directory '" + (nonFlags[0] || targetRaw) + "': Permission denied");
        return;
      }

      let displayList = [];
      if (showAll) {
        displayList.push({
          name: ".",
          type: "directory",
          permissions: targetNode.permissions || "755",
          owner: targetNode.owner || "admin",
          group: targetNode.group || (targetNode.owner === "admin" ? "admin" : "users"),
          size: 4096,
          mtime: targetNode.mtime || Date.now()
        });
        displayList.push({
          name: "..",
          type: "directory",
          permissions: "755",
          owner: "root",
          group: "root",
          size: 4096,
          mtime: Date.now()
        });
        for (const entry of entries) {
          displayList.push(entry);
        }
      } else if (almostAll) {
        for (const entry of entries) {
          if (entry.name !== "." && entry.name !== "..") {
            displayList.push(entry);
          }
        }
      } else {
        for (const entry of entries) {
          if (!entry.name.startsWith(".")) {
            displayList.push(entry);
          }
        }
      }

      if (sortBySize) {
        displayList.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
      } else if (sortByTime) {
        displayList.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
      } else {
        displayList.sort((a, b) => {
          if (a.name === ".") return -1;
          if (b.name === ".") return 1;
          if (a.name === "..") return -1;
          if (b.name === "..") return 1;
          return a.name.localeCompare(b.name);
        });
      }

      if (reverseSort) {
        displayList.reverse();
      }

      if (isLong) {
        const totalBytes = displayList.reduce((sum, e) => sum + (Number(e.size) || 0), 0);
        const totalBlocks = Math.max(displayList.length > 0 ? 4 : 0, Math.ceil(totalBytes / 1024) * 4);
        this.ui.appendTerminalLine("total " + totalBlocks);
        for (const entry of displayList) {
          this.ui.appendTerminalLine(this.formatLongLsEntry(entry, humanReadable, classify));
        }
      } else {
        for (const entry of displayList) {
          this.ui.appendTerminalLine(this.formatShortLsEntry(entry, classify));
        }
      }
      return;
    }

    if (primary === "cd") {
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      const defaultDir = "/home/" + user;
      const target = args[0] || defaultDir;
      const path = this.resolvePath(target);
      const node = this.fileSystem.resolve(path);
      if (!node) {
        this.ui.appendTerminalLine("bash: cd: " + target + ": No such file or directory");
        return;
      }
      if (node.type !== "directory") {
        this.ui.appendTerminalLine("bash: cd: " + target + ": Not a directory");
        return;
      }
      if (!this.fileSystem.hasPermission(user, groups, path, "execute")) {
        this.ui.appendTerminalLine("bash: cd: " + target + ": Permission denied");
        return;
      }
      this.currentPath = path;
      this.updatePromptPrefix();
      if (this.filesApp?.setPath) this.filesApp.setPath(path, true);
      return;
    }

    if (primary === "cat" || primary === "open") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: " + primary + " <path>");
        return;
      }
      const path = this.resolvePath(target);
      const node = this.fileSystem.resolve(path);
      if (!node) {
        this.ui.appendTerminalLine(primary + ": " + target + ": No such file or directory");
        return;
      }
      if (node.type === "directory") {
        this.ui.appendTerminalLine(primary + ": " + target + ": Is a directory");
        return;
      }
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      if (!this.fileSystem.hasPermission(user, groups, path, "read")) {
        this.ui.appendTerminalLine(primary + ": " + target + ": Permission denied");
        return;
      }
      const content = this.fileSystem.read(path);
      if (content === null) {
        this.ui.appendTerminalLine(primary + ": " + target + ": Permission denied");
        return;
      }
      this.loggingSystem?.logFileAccess(path, "opened", primary === "open" ? "./programs/CodePad+.bin" : "/bin/cat");
      if (content.length > 0) {
        this.ui.appendTerminalLine(content);
      }
      if (primary === "open") {
        if (node?.format === "audio" && this.launchProgram) {
          this.launchProgram("music-player");
          this.filesApp.open(path);
          this.windowManager.focus("music-player");
        } else if (this.codePadApp && this.codePadApp.open(path)) {
          if (this.launchProgram) this.launchProgram("codepad-plus");
          this.windowManager.focus("codepad");
        } else {
          this.filesApp.open(path);
        }
      }
      return;
    }

    if (primary === "more" || primary === "less") {
      const target = args[0];
      if (!target) {
        this.ui.appendTerminalLine("Usage: " + primary + " <file>");
        return;
      }
      const path = this.resolvePath(target);
      const node = this.fileSystem.resolve(path);
      if (!node) {
        this.ui.appendTerminalLine(primary + ": " + target + ": No such file or directory");
        return;
      }
      if (node.type === "directory") {
        this.ui.appendTerminalLine(primary + ": " + target + ": Is a directory");
        return;
      }
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      if (!this.fileSystem.hasPermission(user, groups, path, "read")) {
        this.ui.appendTerminalLine(primary + ": " + target + ": Permission denied");
        return;
      }
      const content = this.fileSystem.read(path);
      if (content !== null && content.length > 0) {
        this.ui.appendTerminalLine(content);
      }
      this.loggingSystem?.logFileAccess(path, "opened", "/bin/" + primary);
      return;
    }

    if (primary === "head") {
      let lineCount = 10;
      let target = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "-n" && args[i + 1]) {
          lineCount = parseInt(args[i + 1], 10) || 10;
          i++;
        } else if (args[i].startsWith("-n") && args[i].length > 2) {
          lineCount = parseInt(args[i].slice(2), 10) || 10;
        } else if (!args[i].startsWith("-")) {
          target = args[i];
        }
      }
      let lines = [];
      if (target) {
        const path = this.resolvePath(target);
        const node = this.fileSystem.resolve(path);
        if (!node) {
          this.ui.appendTerminalLine("head: cannot open '" + target + "' for reading: No such file or directory");
          return;
        }
        if (node.type === "directory") {
          this.ui.appendTerminalLine("head: error reading '" + target + "': Is a directory");
          return;
        }
        const user = this.getActiveUser();
        const groups = this.getActiveGroups();
        if (!this.fileSystem.hasPermission(user, groups, path, "read")) {
          this.ui.appendTerminalLine("head: cannot open '" + target + "' for reading: Permission denied");
          return;
        }
        const content = this.fileSystem.read(path);
        lines = (content || "").split("\n");
        this.loggingSystem?.logFileAccess(path, "opened", "/bin/head");
      } else if (stdin && Array.isArray(stdin)) {
        lines = stdin;
      } else {
        this.ui.appendTerminalLine("Usage: head [-n lines] <file>");
        return;
      }
      const result = lines.slice(0, lineCount);
      for (const line of result) {
        this.ui.appendTerminalLine(line);
      }
      return;
    }

    if (primary === "tail") {
      let lineCount = 10;
      let target = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "-n" && args[i + 1]) {
          lineCount = parseInt(args[i + 1], 10) || 10;
          i++;
        } else if (args[i].startsWith("-n") && args[i].length > 2) {
          lineCount = parseInt(args[i].slice(2), 10) || 10;
        } else if (!args[i].startsWith("-")) {
          target = args[i];
        }
      }
      let lines = [];
      if (target) {
        const path = this.resolvePath(target);
        const node = this.fileSystem.resolve(path);
        if (!node) {
          this.ui.appendTerminalLine("tail: cannot open '" + target + "' for reading: No such file or directory");
          return;
        }
        if (node.type === "directory") {
          this.ui.appendTerminalLine("tail: error reading '" + target + "': Is a directory");
          return;
        }
        const user = this.getActiveUser();
        const groups = this.getActiveGroups();
        if (!this.fileSystem.hasPermission(user, groups, path, "read")) {
          this.ui.appendTerminalLine("tail: cannot open '" + target + "' for reading: Permission denied");
          return;
        }
        const content = this.fileSystem.read(path);
        lines = (content || "").split("\n");
        this.loggingSystem?.logFileAccess(path, "opened", "/bin/tail");
      } else if (stdin && Array.isArray(stdin)) {
        lines = stdin;
      } else {
        this.ui.appendTerminalLine("Usage: tail [-n lines] <file>");
        return;
      }
      const result = lines.slice(-lineCount);
      for (const line of result) {
        this.ui.appendTerminalLine(line);
      }
      return;
    }

    if (primary === "sed") {
      let inPlace = false;
      let script = null;
      let target = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === "-i") {
          inPlace = true;
        } else if (!script) {
          script = args[i];
        } else if (!target) {
          target = args[i];
        }
      }
      if (!script) {
        this.ui.appendTerminalLine("Usage: sed [-i] 's/find/replace/g' [file]");
        return;
      }
      if ((script.startsWith("'") && script.endsWith("'")) || (script.startsWith('"') && script.endsWith('"'))) {
        script = script.slice(1, -1);
      }
      const sMatch = script.match(/^s\/([^/]*)\/([^/]*)\/([gi]*)$/);
      if (!sMatch) {
        this.ui.appendTerminalLine("sed: -e expression #1, char 1: unknown command");
        return;
      }
      const [, findStr, replaceStr, sedFlags] = sMatch;
      const regex = new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), sedFlags);

      let text = "";
      let path = null;
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      if (target) {
        path = this.resolvePath(target);
        const node = this.fileSystem.resolve(path);
        if (!node) {
          this.ui.appendTerminalLine("sed: can't read " + target + ": No such file or directory");
          return;
        }
        if (node.type === "directory") {
          this.ui.appendTerminalLine("sed: couldn't edit " + target + ": Is a directory");
          return;
        }
        if (!this.fileSystem.hasPermission(user, groups, path, "read")) {
          this.ui.appendTerminalLine("sed: couldn't open file " + target + ": Permission denied");
          return;
        }
        if (inPlace && !this.fileSystem.hasPermission(user, groups, path, "write")) {
          this.ui.appendTerminalLine("sed: couldn't open temporary file: Permission denied");
          return;
        }
        text = this.fileSystem.read(path) || "";
      } else if (stdin && Array.isArray(stdin)) {
        text = stdin.join("\n");
      } else {
        this.ui.appendTerminalLine("Usage: sed [-i] 's/find/replace/g' [file]");
        return;
      }

      const replaced = text.split("\n").map((line) => line.replace(regex, replaceStr)).join("\n");
      if (inPlace && path) {
        this.fileSystem.write(path, replaced, user, groups[0] || "users");
        this.loggingSystem?.logFileAccess(path, "modified", "/bin/sed");
      } else {
        for (const line of replaced.split("\n")) {
          this.ui.appendTerminalLine(line);
        }
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

  onLogout(handler) {
    this.logoutHandler = handler;
  }

  showCommandHelp(command) {
    const aliasMap = {
      python: "python3",
      sessions: "session",
      disconnect: "exit",
      music: "music-player",
      codepad: "codepad+",
      "codepad-plus": "codepad+",
      clawder: "clawder-python",
      dir: "ls"
    };
    const key = (command || "").trim().toLowerCase();
    const resolved = aliasMap[key] || key;
    const documentation = this.commandDocs[resolved];
    if (!documentation) {
      this.ui.appendTerminalLine("No manual entry found for: " + command);
      this.ui.appendTerminalLine("Type 'help' to see the complete list of available commands.");
      return;
    }
    for (const line of documentation) {
      this.ui.appendTerminalLine(line);
    }
  }

  resolveFlexiblePath(inputPath) {
    if (!inputPath) return "";
    const clean = inputPath.trim();
    const p1 = this.resolvePath(clean);
    if (this.fileSystem.resolve(p1)) return p1;

    const fromRoot = clean.startsWith("./") ? "/" + clean.slice(2) : (clean.startsWith("/") ? clean : "/" + clean);
    const p2 = this.fileSystem.normalize(fromRoot);
    if (this.fileSystem.resolve(p2)) return p2;

    const p3 = this.fileSystem.normalize(clean);
    if (this.fileSystem.resolve(p3)) return p3;

    const p4 = this.fileSystem.normalize("/downloads/emulated/test-laptop/home/admin/.ssh/pbk/" + clean);
    if (this.fileSystem.resolve(p4)) return p4;

    const p5 = this.fileSystem.normalize("/documents/clawder-python/" + clean);
    if (this.fileSystem.resolve(p5)) return p5;

    const p6 = this.fileSystem.normalize("/home/admin/.ssh/pbk/" + clean);
    if (this.fileSystem.resolve(p6)) return p6;

    return p1;
  }

  handleCaesarRipInput(input) {
    if (!this.caesarRipSession) return;
    const trimmed = input.trim();
    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit" || trimmed === "^C") {
      this.ui.appendTerminalLine("[*] CaesarRip operation aborted.");
      this.caesarRipSession = null;
      this.updatePromptPrefix();
      this.ui.setPrompt(this.promptPrefix, this.buffer);
      return;
    }

    if (!trimmed) {
      if (this.caesarRipSession.step === "target_sh") {
        this.ui.appendTerminalLine("Enter location of the .sh file to be cracked: ");
      } else {
        this.ui.appendTerminalLine("Enter location of the word list to use for cracking: ");
      }
      return;
    }

    if (this.caesarRipSession.step === "target_sh") {
      const resolvedSh = this.resolveFlexiblePath(trimmed);
      const node = this.fileSystem.resolve(resolvedSh);
      if (!node) {
        this.ui.appendTerminalLine(`[!] File Error: Target file '${trimmed}' not found.`);
        this.ui.appendTerminalLine("Enter location of the .sh file to be cracked: ");
        return;
      }
      if (node.type === "directory") {
        this.ui.appendTerminalLine(`[!] Error: '${trimmed}' is a directory, not a .sh file.`);
        this.ui.appendTerminalLine("Enter location of the .sh file to be cracked: ");
        return;
      }
      const user = this.getActiveUser();
      const groups = this.getActiveGroups();
      if (!this.fileSystem.hasPermission(user, groups, resolvedSh, "read")) {
        this.ui.appendTerminalLine(`[!] Permission Denied: Unable to read '${trimmed}'.`);
        this.caesarRipSession = null;
        this.updatePromptPrefix();
        this.ui.setPrompt(this.promptPrefix, this.buffer);
        return;
      }

      this.caesarRipSession.targetShPath = resolvedSh;
      this.caesarRipSession.step = "wordlist";
      this.ui.appendTerminalLine("Enter location of the word list to use for cracking: ");
      return;
    }

    if (this.caesarRipSession.step === "wordlist") {
      let resolvedWl = this.resolveFlexiblePath(trimmed);
      let node = this.fileSystem.resolve(resolvedWl);
      if (!node) {
        const cand1 = "/documents/clawder-python/" + trimmed;
        const cand2 = "/documents/clawder-python/wordlist.txt";
        if (this.fileSystem.resolve(cand1)) {
          resolvedWl = cand1;
          node = this.fileSystem.resolve(cand1);
        } else if (this.fileSystem.resolve(cand2)) {
          resolvedWl = cand2;
          node = this.fileSystem.resolve(cand2);
        }
      }

      if (!node) {
        this.ui.appendTerminalLine(`[!] File Error: Wordlist '${trimmed}' not found.`);
        this.ui.appendTerminalLine("Enter location of the word list to use for cracking: ");
        return;
      }

      const targetShPath = this.caesarRipSession.targetShPath;
      this.caesarRipSession = null;
      this.startCaesarRipAttack(targetShPath, resolvedWl);
      return;
    }
  }

  startCaesarRipAttack(targetShPath, wordlistPath) {
    if (this.caesarRipRunning?.timers) {
      for (const t of this.caesarRipRunning.timers) clearTimeout(t);
    }

    const shContent = this.fileSystem.read(targetShPath) || "";
    const parsed = parseHashedKeyContent(shContent);

    let targetUser = parsed?.username || "admin";
    let targetIp = parsed?.ip || "192.168.56.108";
    let targetPassword = parsed?.password;

    if (!targetPassword) {
      if (targetShPath.includes("test-laptop") || targetIp === "192.168.56.108") {
        targetPassword = "k8L3m9";
        targetUser = "admin";
        targetIp = "192.168.56.108";
      } else if (targetUser === "admin") {
        targetPassword = "3tHr90";
      } else if (targetUser === "test_user") {
        targetPassword = "password123";
      } else if (targetUser === "steve") {
        targetPassword = "password";
      } else {
        targetPassword = "password";
      }
    }

    const targetHash = sha256(targetPassword);

    const wlContent = this.fileSystem.read(wordlistPath) || DEFAULT_WORDLIST;
    let words = wlContent
      .split(/\r?\n/)
      .map((w) => w.trim())
      .filter((w) => w && !w.startsWith("#"));

    const commonPasswords = ["password", "123456", "admin", "root", "dragon", "letmein", "shadow", "welcome", "password123", "demicube"];
    for (const cp of commonPasswords) {
      if (!words.includes(cp)) words.unshift(cp);
    }
    if (!words.includes(targetPassword)) {
      words.push(targetPassword);
    }

    const pid = Math.max(...this.processes.keys(), 10) + 1;
    this.processes.set(pid, "python3 CaesarRip.py");
    this.caesarRipRunning = { pid, timers: [] };

    this.ui.appendTerminalLine("");
    this.ui.appendTerminalLine("[*] ========================================================");
    this.ui.appendTerminalLine("[*] CaesarRip v1.4 - Cryptographic Hash & Key Recovery Suite");
    this.ui.appendTerminalLine("[*] ========================================================");
    this.ui.appendTerminalLine(`[*] Target Vault:    ${targetShPath}`);
    this.ui.appendTerminalLine(`[*] Target Identity: ${targetUser}@${targetIp}`);
    this.ui.appendTerminalLine(`[*] Target Digest:   ${targetHash}`);
    this.ui.appendTerminalLine(`[*] Wordlist:        ${wordlistPath} (${words.length} candidates loaded)`);
    this.ui.appendTerminalLine("[*] Mode:            SHA-256 Dictionary Audit [Multi-core simulated]");
    this.ui.appendTerminalLine("[*] Commencing dictionary audit attack...");
    this.ui.appendTerminalLine("");

    const timers = [];

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;
      const w0 = words[0] || "password";
      this.ui.appendTerminalLine(`[+] [Attempt 1/${words.length}] Testing: '${w0}' -> ${sha256(w0).slice(0, 16)}... [FAILED]`);
    }, 1500));

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;
      const w1 = words[1] || "123456";
      const w2 = words[2] || "admin";
      this.ui.appendTerminalLine(`[+] [Attempt 2/${words.length}] Testing: '${w1}' -> ${sha256(w1).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine(`[+] [Attempt 3/${words.length}] Testing: '${w2}' -> ${sha256(w2).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine("[*] Progress: [████░░░░░░░░░░░░░░░░] 20% | Hash Rate: 1,380 H/s");
    }, 3200));

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;
      const w3 = words[3] || "root";
      const w4 = words[4] || "dragon";
      this.ui.appendTerminalLine(`[+] [Attempt 4/${words.length}] Testing: '${w3}' -> ${sha256(w3).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine(`[+] [Attempt 5/${words.length}] Testing: '${w4}' -> ${sha256(w4).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine("[*] Progress: [████████░░░░░░░░░░░░] 40% | Hash Rate: 1,440 H/s");
    }, 5200));

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;
      const w5 = words[5] || "letmein";
      const w6 = words[6] || "shadow";
      this.ui.appendTerminalLine(`[+] [Attempt 6/${words.length}] Testing: '${w5}' -> ${sha256(w5).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine(`[+] [Attempt 7/${words.length}] Testing: '${w6}' -> ${sha256(w6).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine("[*] Progress: [████████████░░░░░░░░] 60% | Hash Rate: 1,490 H/s");
    }, 7200));

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;
      const w7 = words[7] || "welcome";
      const w8 = words[8] || "password123";
      this.ui.appendTerminalLine(`[+] [Attempt 8/${words.length}] Testing: '${w7}' -> ${sha256(w7).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine(`[+] [Attempt 9/${words.length}] Testing: '${w8}' -> ${sha256(w8).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine("[*] Progress: [████████████████░░░░] 80% | Hash Rate: 1,510 H/s");
    }, 9200));

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;
      const w9 = words[9] || "demicube";
      this.ui.appendTerminalLine(`[+] [Attempt 10/${words.length}] Testing: '${w9}' -> ${sha256(w9).slice(0, 16)}... [FAILED]`);
      this.ui.appendTerminalLine("[*] Progress: [████████████████████] 98% | Hash Rate: 1,540 H/s");
    }, 11000));

    timers.push(setTimeout(() => {
      if (!this.caesarRipRunning) return;

      this.ui.appendTerminalLine(`[+] [Attempt 11/${words.length}] Testing: '${targetPassword}' -> ${targetHash} [MATCH FOUND!]`);
      this.ui.appendTerminalLine("");
      this.ui.appendTerminalLine("============================================================");
      this.ui.appendTerminalLine("[***] CRACK COMPLETED: PASSWORD IDENTIFIED [***]");
      this.ui.appendTerminalLine("============================================================");
      this.ui.appendTerminalLine(`[*] Target User:     ${targetUser}`);
      this.ui.appendTerminalLine(`[*] Target System:   ${targetIp}`);
      this.ui.appendTerminalLine(`[*] Plain Password:  ${targetPassword}`);
      this.ui.appendTerminalLine(`[*] Digest Hash:     ${targetHash}`);
      this.ui.appendTerminalLine("------------------------------------------------------------");

      const keyFilePath = targetShPath.replace(/\.sh$/, ".key");
      const keyContent = [
        "[ssh_key]",
        `username=${targetUser}`,
        `ip=${targetIp}`,
        `password=${targetPassword}`,
        ""
      ].join("\n");

      this.fileSystem.write(keyFilePath, keyContent, "admin", "admin", "600");
      this.loggingSystem?.logFileAccess?.(keyFilePath, "created", "/documents/clawder-python/CaesarRip.py");

      if (this.filesApp?.start) {
        this.filesApp.start();
      }

      this.ui.appendTerminalLine(`[✓] Mirror key successfully unlocked and written to:`);
      this.ui.appendTerminalLine(`    ${keyFilePath}`);
      this.ui.appendTerminalLine("============================================================");

      this.processes.delete(pid);
      this.caesarRipRunning = null;
      this.updatePromptPrefix();
      this.ui.setPrompt(this.promptPrefix, this.buffer);
      this.ui.focusInput?.();
    }, 12500));

    this.caesarRipRunning.timers = timers;
  }
}

