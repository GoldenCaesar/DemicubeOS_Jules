export class LoginManager {
  constructor(system, fileSystem = null) {
    this.system = system;
    this.fileSystem = fileSystem;
    this.currentUser = null;
    this.knownLogins = [];
  }

  setFileSystem(fileSystem) {
    this.fileSystem = fileSystem;
  }

  getKnownLogins() {
    const list = [];
    const seen = new Set();
    const addLogin = (user, pass) => {
      const key = `${user}:${pass}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ username: user, password: pass });
      }
    };

    // 1. From system users definition
    if (Array.isArray(this.system?.users)) {
      for (const u of this.system.users) {
        if (u.username) addLogin(u.username, u.password || "");
      }
    }

    // 2. From file system .ssh/pbk/*.key files
    if (this.fileSystem) {
      const homeEntries = this.fileSystem.list("/home") || [];
      for (const entry of homeEntries) {
        if (entry.type === "directory") {
          const pbkPath = `/home/${entry.name}/.ssh/pbk`;
          const keyEntries = this.fileSystem.list(pbkPath) || [];
          for (const keyEntry of keyEntries) {
            if (keyEntry.name.endsWith(".key")) {
              const content = this.fileSystem.read(`${pbkPath}/${keyEntry.name}`);
              if (content) {
                const uMatch = content.match(/username\s*=\s*([^\r\n]+)/i);
                const pMatch = content.match(/password\s*=\s*([^\r\n]+)/i);
                if (uMatch && pMatch) {
                  addLogin(uMatch[1].trim(), pMatch[1].trim());
                }
              }
            }
          }
        }
      }
    }

    return list;
  }

  authenticate(username, password) {
    // 1. Check direct system users
    let user = this.system.users?.find((candidate) => candidate.username === username && candidate.password === password);

    // 2. Check .key files in filesystem if not directly matched
    if (!user && this.fileSystem) {
      const known = this.getKnownLogins();
      const match = known.find((k) => k.username === username && k.password === password);
      if (match) {
        const isAdmin = username === "admin" || username === "root";
        user = {
          id: username,
          username,
          password,
          role: isAdmin ? "admin" : "user",
          permissions: isAdmin ? ["full"] : ["user"],
          homeDir: `/home/${username}`,
          systemId: this.system.id
        };
        if (!this.system.users) this.system.users = [];
        this.system.users.push(user);
      }
    }

    if (!user) return false;
    this.currentUser = user;
    const known = { systemId: this.system.id, username: user.username };
    if (!this.knownLogins.some((login) => login.systemId === known.systemId && login.username === known.username)) {
      this.knownLogins.push(known);
    }
    return true;
  }

  logout() {
    this.currentUser = null;
  }

  isAdmin() {
    if (!this.currentUser) return false;
    return this.currentUser.role === "admin" ||
      this.currentUser.username === "admin" ||
      this.currentUser.username === "root" ||
      this.currentUser.permissions?.includes("full") ||
      false;
  }
}
