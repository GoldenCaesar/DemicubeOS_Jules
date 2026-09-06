import {
  SYSTEM_GROUPS_REG_PATH,
  parseSystemGroups,
  serializeSystemGroups,
  getUserGroups as resolveUserGroups,
  isUserSudoer as resolveIsUserSudoer,
  appendGroupToUser,
  removeGroupFromUser,
  generateDefaultGroups
} from "./group-manager.js";
import { generateHashedKeyContent, DEFAULT_WORDLIST } from "./hashed-key.js";

const binaryPreview = "\u0000\u0001\u0007\u001b\u00a4\u00ff\u0003\u0010\u00d4\u0019\u0088\u0000\u00fe\u0006";

const defaultAuthLog = `Sep 03 12:00:00 demicube-testbox systemd-logind[412]: New session c1 of user admin.
Sep 03 12:00:01 demicube-testbox login[820]: pam_unix(login:session): session opened for user admin(uid=1000) by (uid=0)
`;

const defaultSyslog = `Sep 03 12:00:00 demicube-testbox systemd[1]: Started DemicubeOS Core System Daemon.
Sep 03 12:00:01 demicube-testbox kernel: [ 0.000000] Linux version 6.6.0-demicube (root@build-server) (gcc 13.2.0)
Sep 03 12:00:01 demicube-testbox systemd[1]: Mounted Root File System.
Sep 03 12:00:02 demicube-testbox NetworkManager[524]: <info> [1756900802.12] device (eth0): state change: unmanaged -> unavailable
Sep 03 12:00:03 demicube-testbox NetworkManager[524]: <info> [1756900803.54] device (eth0): state change: unavailable -> disconnected
Sep 03 12:00:04 demicube-testbox NetworkManager[524]: <info> [1756900804.81] device (eth0): IPv4 address 10.0.0.5/24 set
Sep 03 12:00:05 demicube-testbox systemd[1]: Started OpenSSH Server Daemon.
Sep 03 12:00:06 demicube-testbox (10.0.0.5): System telemetry logger initialized.
`;

export function modeToPermissionString(permissions = "644", isDirectory = false) {
  const perms = String(permissions).padStart(3, "0").slice(-3);
  const u = parseInt(perms[0], 10) || 0;
  const g = parseInt(perms[1], 10) || 0;
  const o = parseInt(perms[2], 10) || 0;

  const pStr = (val) => (val & 4 ? "r" : "-") + (val & 2 ? "w" : "-") + (val & 1 ? "x" : "-");
  return (isDirectory ? "d" : "-") + pStr(u) + pStr(g) + pStr(o);
}

export class FileSystem {
  constructor(programs = [], systemDefinition = null) {
    this.systemDefinition = systemDefinition;
    this.root = systemDefinition?.filesystem ? this.fromDefinition(systemDefinition.filesystem) : {
      type: "directory",
      permissions: "755",
      owner: "admin",
      group: "admin",
      children: {
        home: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            admin: {
              type: "directory",
              permissions: "750",
              owner: "admin",
              group: "admin",
              children: {
                "welcome.txt": this.textFile("Welcome to DemicubeOS.\nYour home directory is ready.", "admin", "admin", "644"),
                ".bash_history": this.textFile("help\nls -la\ncat /documents/mission-brief.txt\n", "admin", "admin", "644"),
                "session.bin": this.binaryFile("admin", "admin", "755")
              }
            },
            test_user: {
              type: "directory",
              permissions: "750",
              owner: "test_user",
              group: "test_user",
              children: {
                "welcome.txt": this.textFile("Welcome, test_user. Standard user.", "test_user", "test_user", "644"),
                ".bash_history": this.textFile("whoami\nls -la\n", "test_user", "test_user", "644")
              }
            }
          }
        },
        documents: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            "mission-brief.txt": this.textFile("Mission files will appear here.\nKeep your notes close.", "admin", "admin", "644"),
            "example.py": { type: "file", format: "py", content: "print('DemicubeOS ready')", permissions: "755", owner: "admin", group: "admin" },
            "evidence.bin": this.binaryFile("admin", "admin", "755"),
            "clawder-python": {
              type: "directory",
              permissions: "755",
              owner: "admin",
              group: "admin",
              children: {}
            }
          }
        },
        programs: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {}
        },
        downloads: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            emulated: {
              type: "directory",
              permissions: "755",
              owner: "admin",
              group: "admin",
              children: {}
            }
          }
        },
        music: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            "song1.mp3": this.audioFile("song1.mp3"),
            "song2.mp3": this.audioFile("song2.mp3")
          }
        },
        var: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            log: {
              type: "directory",
              permissions: "755",
              owner: "admin",
              group: "admin",
              children: {
                "auth.log": this.textFile(defaultAuthLog, "admin", "admin", "644"),
                "syslog": this.textFile(defaultSyslog, "admin", "admin", "644"),
                "boot.log": this.textFile("DemicubeOS boot completed.\nStorage mounted: root\n", "admin", "admin", "644")
              }
            }
          }
        },
        dev: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            null: this.textFile("", "admin", "admin", "666")
          }
        },
        log: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            "boot.log": this.textFile("DemicubeOS boot completed.\nStorage mounted: root\n", "admin", "admin", "644"),
            "kernel.log": this.binaryFile("admin", "admin", "755")
          }
        },
        etc: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            group: {
              type: "directory",
              permissions: "755",
              owner: "admin",
              group: "admin",
              children: {
                "system_groups.reg": this.textFile(
                  serializeSystemGroups(generateDefaultGroups(systemDefinition?.users || ["admin", "test_user"])),
                  "admin",
                  "admin",
                  "644"
                )
              }
            }
          }
        },
        sys: {
          type: "directory",
          permissions: "755",
          owner: "admin",
          group: "admin",
          children: {
            "wallpaper.bin": this.binaryFile("admin", "admin", "755"),
            "theme.bin": this.binaryFile("admin", "admin", "755"),
            "kernel.sys": this.binaryFile("admin", "admin", "755")
          }
        }
      }
    };

    // Ensure realistic logging paths exist even when loaded from custom definition
    this.ensureDefaultPaths();

    for (const program of programs) {
      this.installProgram(program);
    }
    this.initialRoot = structuredClone(this.root);
  }

  ensureDefaultPaths() {
    // If vpnguard exists inside zenmap, separate them immediately
    if (this.resolve("/documents/zenmap/vpnguard")) {
      this.remove("/documents/zenmap/vpnguard");
    }

    this.mkdir("/var/log");
    this.mkdir("/documents");
    this.mkdir("/documents/zenmap");
    this.mkdir("/documents/vpnguard");
    this.mkdir("/documents/clawder-python");
    this.mkdir("/home/admin", "admin", "admin", "750");
    this.mkdir("/home/admin/.ssh", "admin", "admin", "700");
    this.mkdir("/home/admin/.ssh/pbk", "admin", "admin", "700");
    if (this.resolve("/home/admin/.ssh/pkb")) {
      this.remove("/home/admin/.ssh/pkb");
    }
    this.mkdir("/home/admin/.ssh/known_hosts", "admin", "admin", "700");

    this.mkdir("/home/test_user", "test_user", "test_user", "750");
    this.mkdir("/home/test_user/.ssh", "test_user", "test_user", "700");
    this.mkdir("/home/test_user/.ssh/pbk", "test_user", "test_user", "700");
    if (this.resolve("/home/test_user/.ssh/pkb")) {
      this.remove("/home/test_user/.ssh/pkb");
    }
    this.mkdir("/home/test_user/.ssh/known_hosts", "test_user", "test_user", "700");

    this.mkdir("/dev");
    this.mkdir("/etc", "admin", "admin", "755");
    this.mkdir("/etc/group", "admin", "admin", "755");

    if (!this.resolve(SYSTEM_GROUPS_REG_PATH)) {
      const defaultGroups = generateDefaultGroups(this.systemDefinition?.users || ["admin", "test_user"]);
      this.write(SYSTEM_GROUPS_REG_PATH, serializeSystemGroups(defaultGroups), "admin", "admin", "644");
    }

    if (!this.resolve("/var/log/auth.log")) {
      this.write("/var/log/auth.log", defaultAuthLog, "admin", "admin", "644");
    }
    if (!this.resolve("/var/log/syslog")) {
      this.write("/var/log/syslog", defaultSyslog, "admin", "admin", "644");
    }
    if (!this.resolve("/var/log/boot.log")) {
      this.write("/var/log/boot.log", "DemicubeOS boot completed.\nStorage mounted: root\n", "admin", "admin", "644");
    }
    if (!this.resolve("/dev/null")) {
      this.write("/dev/null", "", "admin", "admin", "666");
    }
    if (!this.resolve("/home/admin/.bash_history")) {
      this.write("/home/admin/.bash_history", "help\nls -la\ncat /documents/mission-brief.txt\n", "admin", "admin", "600");
    }
    if (!this.resolve("/documents/clawder-python/wordlist.txt")) {
      this.write("/documents/clawder-python/wordlist.txt", DEFAULT_WORDLIST, "admin", "admin", "644");
    }

    if (!this.resolve("/home/admin/.ssh/pbk/admin.key")) {
      this.write("/home/admin/.ssh/pbk/admin.key", "[ssh_key]\nusername=admin\nip=192.168.56.101\npassword=3tHr90\n", "admin", "admin", "600");
    }
    if (!this.resolve("/home/admin/.ssh/pbk/admin.sh")) {
      this.write("/home/admin/.ssh/pbk/admin.sh", generateHashedKeyContent("admin", "192.168.56.101", "3tHr90"), "admin", "admin", "600");
    }
    if (this.resolve("/home/admin/.ssh/pkb/admin.key")) {
      this.remove("/home/admin/.ssh/pkb/admin.key");
    }
    if (this.resolve("/home/admin/.ssh/pkb/admin.sh")) {
      this.remove("/home/admin/.ssh/pkb/admin.sh");
    }
    if (!this.resolve("/home/test_user/.ssh/pbk/test_user.key")) {
      this.write("/home/test_user/.ssh/pbk/test_user.key", "[ssh_key]\nusername=test_user\nip=192.168.56.101\npassword=password123\n", "test_user", "test_user", "600");
    }
    if (!this.resolve("/home/test_user/.ssh/pbk/test_user.sh")) {
      this.write("/home/test_user/.ssh/pbk/test_user.sh", generateHashedKeyContent("test_user", "192.168.56.101", "password123"), "test_user", "test_user", "600");
    }
    if (this.resolve("/home/test_user/.ssh/pkb/test_user.key")) {
      this.remove("/home/test_user/.ssh/pkb/test_user.key");
    }
    if (this.resolve("/home/test_user/.ssh/pkb/test_user.sh")) {
      this.remove("/home/test_user/.ssh/pkb/test_user.sh");
    }

    // Emulated test-laptop downloaded files on demicube-testbox
    this.mkdir("/downloads", "admin", "admin", "755");
    this.mkdir("/downloads/emulated", "admin", "admin", "755");
    this.mkdir("/downloads/emulated/test-laptop", "admin", "admin", "755");
    this.mkdir("/downloads/emulated/test-laptop/home", "admin", "admin", "755");
    this.mkdir("/downloads/emulated/test-laptop/home/admin", "admin", "admin", "750");
    this.mkdir("/downloads/emulated/test-laptop/home/admin/.ssh", "admin", "admin", "700");
    this.mkdir("/downloads/emulated/test-laptop/home/admin/.ssh/pbk", "admin", "admin", "700");
    if (!this.resolve("/downloads/emulated/test-laptop/home/admin/.ssh/pbk/admin.sh")) {
      this.write(
        "/downloads/emulated/test-laptop/home/admin/.ssh/pbk/admin.sh",
        generateHashedKeyContent("admin", "192.168.56.108", "k8L3m9"),
        "admin",
        "admin",
        "644"
      );
    }

  }

  reset() {
    this.root = structuredClone(this.initialRoot);
  }

  clone() {
    const cloned = new FileSystem([], this.systemDefinition);
    cloned.root = structuredClone(this.root);
    cloned.initialRoot = structuredClone(this.initialRoot);
    return cloned;
  }

  fromDefinition(filesystem) {
    const convert = (value, name = "", currentPath = "") => {
      const fullPath = currentPath ? (currentPath === "/" ? `/${name}` : `${currentPath}/${name}`) : `/${name}`;
      let defaultOwner = "admin";
      let defaultGroup = "admin";
      if (fullPath.startsWith("/home/")) {
        const seg = fullPath.slice("/home/".length).split("/")[0];
        if (seg) {
          defaultOwner = seg;
          defaultGroup = seg;
        }
      }

      if (value.type === "file") {
        const isExe = value.executable || (value.format === "binary" && fullPath.startsWith("/programs")) || fullPath.endsWith(".py") || fullPath.endsWith(".sh");
        const defaultPerm = isExe ? "755" : (fullPath.includes(".ssh") ? "600" : "644");
        const base = value.format === "audio"
          ? this.audioFile(value.name || name, null, value.owner || defaultOwner, value.group || defaultGroup, value.permissions || defaultPerm)
          : {
              ...value,
              content: value.content ?? (value.format === "binary" ? binaryPreview : ""),
              permissions: value.permissions || defaultPerm,
              owner: value.owner || defaultOwner,
              group: value.group || defaultGroup
            };
        return base;
      }

      const isHomeUserDir = fullPath.startsWith("/home/") && !fullPath.slice("/home/".length).includes("/");
      const defaultDirPerm = fullPath.includes(".ssh") ? "700" : (isHomeUserDir ? "750" : "755");
      const children = {};
      const srcChildren = value.children || value;
      for (const [childName, childValue] of Object.entries(srcChildren)) {
        if (childName === "type" || childName === "permissions" || childName === "owner" || childName === "group") continue;
        children[childName] = convert(childValue, childName, fullPath);
      }
      return {
        type: "directory",
        children,
        permissions: value.permissions || defaultDirPerm,
        owner: value.owner || defaultOwner,
        group: value.group || defaultGroup
      };
    };

    const rootChildren = {};
    for (const [name, child] of Object.entries(filesystem)) {
      rootChildren[name] = convert(child, name, "/");
    }
    return {
      type: "directory",
      children: rootChildren,
      permissions: "755",
      owner: "admin",
      group: "admin"
    };
  }

  determineFormat(name) {
    const lower = name.toLowerCase();
    if (lower.endsWith(".py")) return "py";
    if (lower.endsWith(".bin") || lower.endsWith(".sys")) return "binary";
    if (lower.endsWith(".mp3")) return "audio";
    return "text";
  }

  textFile(content, owner = "admin", group = "admin", permissions = "644") {
    return { type: "file", format: "text", content: String(content), owner, group, permissions };
  }

  binaryFile(owner = "admin", group = "admin", permissions = "755") {
    return { type: "file", format: "binary", content: binaryPreview, owner, group, permissions };
  }

  audioFile(name, blob = null, owner = "admin", group = "admin", permissions = "644") {
    return { type: "file", format: "audio", mime: "audio/mpeg", content: binaryPreview, name, blob, source: "./music/" + name, owner, group, permissions };
  }

  normalize(path = "/") {
    const parts = path.split("/").filter(Boolean);
    const normalized = [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") normalized.pop();
      else normalized.push(part);
    }
    return "/" + normalized.join("/");
  }

  getParentPath(path) {
    const normalized = this.normalize(path);
    if (normalized === "/") return "/";
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash === 0 ? "/" : normalized.slice(0, lastSlash);
  }

  resolve(path) {
    const normalized = this.normalize(path);
    if (normalized === "/") return this.root;
    let node = this.root;
    for (const part of normalized.slice(1).split("/")) {
      if (node.type !== "directory" || !node.children[part]) return null;
      node = node.children[part];
    }
    return node;
  }

  hasPermission(activeUser, activeGroups = [], filePath, requiredAccess) {
    const node = this.resolve(filePath);
    if (!node) return false;

    // Root always bypasses DAC checks with full access
    if (activeUser === "root") return true;

    const resolvedGroups = (Array.isArray(activeGroups) && activeGroups.length > 0)
      ? activeGroups
      : (activeUser ? this.getUserGroups(activeUser) : []);

    // Admins and sudo users have full access
    const isSudo = this.isUserSudoer(activeUser);
    const isAdmin = activeUser === "admin" ||
                    isSudo ||
                    (Array.isArray(resolvedGroups) && (resolvedGroups.includes("admin") || resolvedGroups.includes("root") || resolvedGroups.includes("wheel") || resolvedGroups.includes("sudo")));
    if (isAdmin) {
      if (requiredAccess === "execute" && node.type === "file") {
        const pStr = String(node.permissions || "644").padStart(3, "0").slice(-3);
        const hasExecBit = (parseInt(pStr[0], 10) & 1) !== 0 || (parseInt(pStr[1], 10) & 1) !== 0 || (parseInt(pStr[2], 10) & 1) !== 0;
        return hasExecBit || Boolean(node.executable);
      }
      return true;
    }

    // Non-admin traversal check: verify execute permission on all ancestor directories
    const normalized = this.normalize(filePath);
    const parts = normalized.slice(1).split("/").filter(Boolean);
    let curr = "";
    for (let i = 0; i < parts.length - 1; i++) {
      curr += "/" + parts[i];
      const dirNode = this.resolve(curr);
      if (dirNode && dirNode.type === "directory") {
        const dStr = String(dirNode.permissions || "755").padStart(3, "0").slice(-3);
        const du = parseInt(dStr[0], 10) || 0;
        const dg = parseInt(dStr[1], 10) || 0;
        const do_ = parseInt(dStr[2], 10) || 0;
        let dPerm = do_;
        if (activeUser && activeUser === dirNode.owner) {
          dPerm = du;
        } else if (Array.isArray(resolvedGroups) && resolvedGroups.includes(dirNode.group)) {
          dPerm = dg;
        }
        if ((dPerm & 1) === 0) {
          return false;
        }
      }
    }

    const permissionsString = String(node.permissions || (node.type === "directory" ? "755" : "644")).padStart(3, "0").slice(-3);
    const uPerm = parseInt(permissionsString[0] || "0", 10) || 0;
    const gPerm = parseInt(permissionsString[1] || "0", 10) || 0;
    const oPerm = parseInt(permissionsString[2] || "0", 10) || 0;

    let activeRolePerm = oPerm; // Default to Others
    if (activeUser && activeUser === node.owner) {
      activeRolePerm = uPerm;
    } else if (Array.isArray(resolvedGroups) && resolvedGroups.includes(node.group)) {
      activeRolePerm = gPerm;
    }

    if (requiredAccess === "read") return (activeRolePerm & 4) !== 0;
    if (requiredAccess === "write") return (activeRolePerm & 2) !== 0;
    if (requiredAccess === "execute") return (activeRolePerm & 1) !== 0;

    return false;
  }

  getGroups() {
    const regNode = this.resolve(SYSTEM_GROUPS_REG_PATH);
    if (regNode && regNode.type === "file" && typeof regNode.content === "string") {
      const parsed = parseSystemGroups(regNode.content);
      if (parsed.length > 0) return parsed;
    }
    const defaultGroups = generateDefaultGroups(this.systemDefinition?.users || ["admin", "test_user"]);
    return defaultGroups;
  }

  getUserGroups(username) {
    const groups = this.getGroups();
    return resolveUserGroups(groups, username);
  }

  isUserSudoer(username) {
    const groups = this.getGroups();
    return resolveIsUserSudoer(groups, username);
  }

  saveGroups(groups, activeUser = "admin") {
    const content = serializeSystemGroups(groups);
    this.mkdir("/etc", "admin", "admin", "755");
    this.mkdir("/etc/group", "admin", "admin", "755");
    return this.write(SYSTEM_GROUPS_REG_PATH, content, "admin", "admin", "644");
  }

  modifyUserGroup(mode, groupName, targetUser, activeUser = "admin") {
    const userGroups = this.getUserGroups(activeUser);
    const hasWritePermission = activeUser === "root" ||
                               this.isUserSudoer(activeUser) ||
                               this.hasPermission(activeUser, userGroups, SYSTEM_GROUPS_REG_PATH, "write");

    if (!hasWritePermission) {
      return { success: false, error: "Permission denied" };
    }

    const groups = this.getGroups();
    let result;
    if (mode === "append") {
      result = appendGroupToUser(groups, groupName, targetUser);
    } else if (mode === "remove") {
      result = removeGroupFromUser(groups, groupName, targetUser);
    } else {
      return { success: false, error: `unknown mode '${mode}'` };
    }

    if (!result.success) {
      return result;
    }

    this.saveGroups(groups, activeUser);
    return { success: true, group: result.group };
  }

  mkdir(path, owner = "admin", group = "admin", permissions = "755") {
    const normalized = this.normalize(path);
    if (normalized === "/documents/zenmap/vpnguard" || normalized.startsWith("/documents/zenmap/vpnguard/")) {
      return false;
    }
    const parts = normalized.slice(1).split("/").filter(Boolean);
    let current = this.root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isTarget = (i === parts.length - 1);
      if (!current.children[part]) {
        current.children[part] = { type: "directory", children: {}, owner, group, permissions };
      } else if (current.children[part].type !== "directory") {
        return false;
      } else if (isTarget) {
        if (permissions && permissions !== "755") {
          current.children[part].permissions = permissions;
        }
        if (owner) current.children[part].owner = owner;
        if (group) current.children[part].group = group;
      }
      current = current.children[part];
    }
    return true;
  }

  touch(path, owner = "admin", group = "admin") {
    const normalized = this.normalize(path);
    const node = this.resolve(normalized);
    if (node && node.type === "file") return true;
    return this.write(normalized, "", owner, group, "644");
  }

  chmod(path, mode, activeUser = "admin") {
    const node = this.resolve(path);
    if (!node) return { success: false, error: "No such file or directory" };

    const isAdmin = activeUser === "root" || activeUser === "admin" || this.isUserSudoer(activeUser);
    if (!isAdmin && node.owner && node.owner !== activeUser) {
      return { success: false, error: "Operation not permitted" };
    }

    if (/^[0-7]{3,4}$/.test(mode)) {
      node.permissions = mode.slice(-3);
      return { success: true };
    }

    const symbolicRegex = /^([ugoa]*)([+-=])([rwx]+)$/;
    const match = mode.match(symbolicRegex);
    if (match) {
      const [, targets, op, perms] = match;
      const targetList = targets === "" || targets.includes("a") ? ["u", "g", "o"] : targets.split("");
      const current = String(node.permissions || (node.type === "directory" ? "755" : "644"));
      let u = parseInt(current[0], 10) || 0;
      let g = parseInt(current[1], 10) || 0;
      let o = parseInt(current[2], 10) || 0;

      let mask = 0;
      if (perms.includes("r")) mask |= 4;
      if (perms.includes("w")) mask |= 2;
      if (perms.includes("x")) mask |= 1;

      const apply = (val) => {
        if (op === "+") return val | mask;
        if (op === "-") return val & ~mask;
        if (op === "=") return mask;
        return val;
      };

      if (targetList.includes("u")) u = apply(u);
      if (targetList.includes("g")) g = apply(g);
      if (targetList.includes("o")) o = apply(o);

      node.permissions = `${u}${g}${o}`;
      return { success: true };
    }

    return { success: false, error: "invalid mode: '" + mode + "'" };
  }

  chown(path, ownership, activeUser = "admin") {
    const node = this.resolve(path);
    if (!node) return { success: false, error: "No such file or directory" };

    const isAdmin = activeUser === "root" || activeUser === "admin" || this.isUserSudoer(activeUser);
    if (!isAdmin) {
      return { success: false, error: "Operation not permitted" };
    }

    const [user, group] = ownership.split(":");
    if (user) node.owner = user;
    if (group) node.group = group;
    return { success: true };
  }

  list(path = "/") {
    const node = this.resolve(path);
    if (!node || node.type !== "directory") return null;
    return Object.entries(node.children).map(([name, child]) => ({
      name,
      type: child.type,
      format: child.format,
      executable: child.executable,
      programName: child.programName,
      mime: child.mime,
      permissions: child.permissions || (child.type === "directory" ? "755" : "644"),
      owner: child.owner || "admin",
      group: child.group || (child.owner === "admin" ? "admin" : "users"),
      content: child.content,
      path: this.normalize(path + "/" + name)
    }));
  }

  read(path) {
    const normalized = this.normalize(path);
    if (normalized === "/dev/null") return "";
    const node = this.resolve(normalized);
    if (!node || node.type !== "file") return null;
    return ["text", "py"].includes(node.format) ? node.content : binaryPreview;
  }

  write(path, content, owner = "admin", group = "admin", permissions = "644") {
    const normalized = this.normalize(path);
    if (normalized === "/dev/null") return true;
    if (normalized === "/documents/zenmap/vpnguard" || normalized.startsWith("/documents/zenmap/vpnguard/")) {
      return false;
    }
    const parts = normalized.slice(1).split("/");
    const name = parts.pop();
    const parentPath = "/" + parts.join("/");
    let parent = this.resolve(parentPath);
    if (!parent) {
      this.mkdir(parentPath, owner, group);
      parent = this.resolve(parentPath);
    }
    if (!name || !parent || parent.type !== "directory") return false;
    const format = this.determineFormat(name);
    if (format === "binary") return false;
    if (parent.children[name]) {
      parent.children[name].content = String(content);
      parent.children[name].format = format;
    } else {
      parent.children[name] = { type: "file", format, content: String(content), owner, group, permissions };
    }
    return true;
  }

  append(path, content) {
    const normalized = this.normalize(path);
    if (normalized === "/dev/null") return true;
    let node = this.resolve(normalized);
    if (!node) {
      return this.write(normalized, String(content));
    }
    if (node.type !== "file") return false;
    if (!["text", "py"].includes(node.format)) node.format = "text";
    node.content = (node.content || "") + String(content);
    return true;
  }

  remove(path) {
    const normalized = this.normalize(path);
    if (normalized === "/") return false;
    const parts = normalized.slice(1).split("/");
    const name = parts.pop();
    const parent = this.resolve("/" + parts.join("/"));
    if (!parent || parent.type !== "directory" || !parent.children[name]) return false;
    delete parent.children[name];
    return true;
  }

  addAudioFile(name, blob) {
    if (!name.toLowerCase().endsWith(".mp3")) return false;
    this.root.children.music.children[name] = this.audioFile(name, blob);
    return true;
  }

  cloneNode(node) {
    if (!node) return null;
    if (node.type === "directory") {
      const cloned = {
        type: "directory",
        children: {},
        permissions: node.permissions || "755",
        owner: node.owner || "admin",
        group: node.group || "admin"
      };
      for (const [key, child] of Object.entries(node.children || {})) {
        cloned.children[key] = this.cloneNode(child);
      }
      return cloned;
    }
    return { ...node };
  }

  copy(sourcePath, destinationPath, owner = null, group = null) {
    const source = this.normalize(sourcePath);
    let destination = this.normalize(destinationPath);
    const sourceNode = this.resolve(source);
    if (!sourceNode) return false;

    const destNode = this.resolve(destination);
    if (destNode && destNode.type === "directory") {
      const sourceName = source.split("/").pop();
      destination = this.normalize(destination + "/" + sourceName);
    }

    const destParts = destination.slice(1).split("/").filter(Boolean);
    const destName = destParts.pop();
    const destParentPath = "/" + destParts.join("/");
    let parent = this.resolve(destParentPath);
    if (!parent) {
      this.mkdir(destParentPath, owner || "admin", group || "admin");
      parent = this.resolve(destParentPath);
    }
    if (!parent || parent.type !== "directory" || !destName) return false;

    const copied = this.cloneNode(sourceNode);
    if (owner) copied.owner = owner;
    if (group) copied.group = group;
    parent.children[destName] = copied;
    return true;
  }

  move(sourcePath, destinationPath) {
    const source = this.normalize(sourcePath);
    const destination = this.normalize(destinationPath);
    const sourceParts = source.slice(1).split("/");
    const destinationParts = destination.slice(1).split("/");
    const sourceName = sourceParts.pop();
    const sourceParent = this.resolve("/" + sourceParts.join("/"));
    const destinationParent = this.resolve("/" + destinationParts.slice(0, -1).join("/"));
    const destinationName = destinationParts[destinationParts.length - 1];

    if (!sourceParent || sourceParent.type !== "directory" || !sourceParent.children[sourceName]) return false;
    if (!destinationParent || destinationParent.type !== "directory") return false;
    destinationParent.children[destinationName] = sourceParent.children[sourceName];
    if (destinationParent.children[destinationName].format === "audio" && !destinationParent.children[destinationName].blob) {
      destinationParent.children[destinationName].name = destinationName;
      destinationParent.children[destinationName].source = "./music/" + destinationName;
    }
    delete sourceParent.children[sourceName];
    return true;
  }

  findProgram(command) {
    const entries = this.list("/programs") || [];
    const requested = command.toLowerCase();
    return entries.find((entry) => {
      if (entry.type !== "file") return false;
      const name = entry.name.toLowerCase();
      return name === requested || name.replace(/\.[^.]+$/, "") === requested;
    });
  }

  installProgram(program) {
    const filename = (program.fileName || program.id || "program") + ".bin";
    this.root.children.programs.children[filename] = {
      ...this.binaryFile(),
      executable: program.id,
      programName: program.name || program.id
    };
  }
}
