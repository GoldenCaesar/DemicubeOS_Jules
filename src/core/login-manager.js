export class LoginManager {
  constructor(system) {
    this.system = system;
    this.currentUser = null;
    this.knownLogins = [];
  }

  authenticate(username, password) {
    const user = this.system.users.find((candidate) => candidate.username === username && candidate.password === password);
    if (!user) return false;
    this.currentUser = user;
    const known = { systemId: this.system.id, username: user.username };
    if (!this.knownLogins.some((login) => login.systemId === known.systemId && login.username === known.username)) this.knownLogins.push(known);
    return true;
  }

  logout() {
    this.currentUser = null;
  }

  isAdmin() {
    return this.currentUser?.permissions.includes("full") || false;
  }
}
