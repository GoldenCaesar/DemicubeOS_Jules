# DemicubeOS User Groups & System Security Guide

**Document Purpose**: Comprehensive developer and architecture reference for the user groups system, virtual registry (`/etc/group/system_groups.reg`), permission evaluations, startup media playback, and session lifecycle management.

---

## 👥 1. User Groups Architecture

### Overview
In DemicubeOS, system user groups dictate file permissions, POSIX rwx evaluations, and `sudo` administrative elevation. 

### Invariants
1. **Primary Group Invariant**: Every user defined on a system automatically belongs to a group matching their own username (e.g., `test_user` is a permanent member of group `test_user`, `admin` is a member of `admin`, `steve` is a member of `steve`).
2. **Undeletable Primary Membership**: A user **cannot** be removed from their primary group. Attempts to run `usermod -rm <user> <user>` will fail with an explicit error.
3. **Write Permission Gate**: Group modifications may **only** be executed by users who have write permission to `/etc/group/system_groups.reg` (or users who possess active `sudo` privileges). Non-permitted users attempting to run `usermod` receive a permission denied error.

---

## 📄 2. The Group Registry: `/etc/group/system_groups.reg`

### Location & Permissions
- **Path**: `/etc/group/system_groups.reg`
- **Owner**: `admin`
- **Group**: `admin`
- **Mode**: `0644` (`-rw-r--r--`) — Readable by all users, writable only by `admin` or sudoers.

### File Format (INI / REG)
```ini
; DemicubeOS System Groups Registry
; File: /etc/group/system_groups.reg

[admin]
sudo=true
users=admin

[test_user]
sudo=false
users=test_user
```

### System Configurations
- **192.168.56.101 (`demicube-testbox`)**:
  - `[admin]`: `sudo=true`, `users=admin`
  - `[test_user]`: `sudo=false`, `users=test_user`
- **192.168.56.108 (`steves-testbox`)**:
  - `[admin]`: `sudo=true`, `users=admin`
  - `[steve]`: `sudo=false`, `users=steve`

---

## 💻 3. Terminal Commands

### `usermod`
Modifies user group memberships in `/etc/group/system_groups.reg`.

#### Syntax
```bash
usermod -aG <group> <user>   # Append user to group
usermod -rm <group> <user>   # Remove user from secondary group
```

#### Examples
```bash
# Add test_user to the admin group (grants sudo privileges)
usermod -aG admin test_user

# Remove test_user from the admin group
usermod -rm admin test_user

# Attempting to remove test_user from test_user group (rejected)
usermod -rm test_user test_user
# Output: usermod: cannot remove user 'test_user' from their primary group 'test_user'
```

### `groups`
Displays all group memberships for a user.

#### Syntax
```bash
groups [username]
```

#### Examples
```bash
groups
# Output: admin : admin test_user

groups test_user
# Output: test_user : test_user admin
```

### `id`
Prints real and effective user ID, group ID, and group memberships.

#### Syntax & Options
```bash
id [options] [username]
  -u    Print only user ID (or name with -n)
  -g    Print only primary group ID (or name with -n)
  -G    Print all group IDs (space-separated)
  -n    Print names instead of numeric IDs
```

#### Examples
```bash
id
# Output: uid=1000(admin) gid=1000(admin) groups=1000(admin)

id test_user
# Output: uid=1001(test_user) gid=1001(test_user) groups=1001(test_user),1000(admin)
```

---

## 🔒 4. File Permission Evaluation (`FileSystem.hasPermission`)

Permission checks evaluate user permissions in the following order:

1. **Sudoer / Root Privilege**: If `user === 'root'` or `FileSystem.isUserSudoer(user)` returns true, access is automatically permitted (`sudo` override).
2. **Owner Match**: If `user === file.owner`, access is checked against owner bits (`rwx------`).
3. **Group Match**: If any of the user's groups (`FileSystem.getUserGroups(user)`) match `file.group`, access is checked against group bits (`---rwx---`).
4. **Other**: Access is checked against other bits (`------rwx`).

---

## 🎥 5. Video Startup Splash & Audio Controls

### Startup Architecture
The application entry point loads `src/media/demicubeOS.mp4`:
- **Element**: `<video id="splash-video" src="./src/media/demicubeOS.mp4" playsinline muted autoplay preload="auto">`
- **Audio Control**: `<button id="splash-audio-btn">🔊 UNMUTE</button>` allows the user to unmute and experience the soundtrack.
- **Autoplay Handling**: If modern browser autoplay security policies block unmuted or initial autoplay, a "▶ PLAY INTRO" button prompt pulses, and clicking anywhere starts playback immediately.
- **Procedural 3D Fallback**: If the video is corrupted or missing, a CSS 3D wireframe cube fallback activates after a safety timeout.
- **Skip**: Clicking "SKIP INTRO ❯" or pressing <kbd>Esc</kbd> bypasses the intro immediately to the 3D Main Menu.

---

## 🚪 6. Session Lifecycle: `logout` vs `exit`

| Feature | `logout` | `exit` / `disconnect` |
|---|---|---|
| **Local Machine** | Terminates session, resets desktop windows, shows local Sign-In screen. | Closes the active terminal window (`kill <pid>`). |
| **Remote SSH Session** | Terminates session on the remote host, resets windows, and displays the **remote system's** Sign-In screen. | Disconnects from the remote host and returns the terminal to the previous hop. |
| **Telemetry** | Emits `auth` logout event in target machine's `/var/log/auth.log`. | Emits `sshd: Received disconnect ... session closed` event. |
| **Login Picker** | Updates known logins dropdown to reflect target system's users and credentials. | Retains current user session. |

---

## 🛠️ 7. Developer Cheat Sheet

### Working with Groups in Code
```javascript
// Get all groups defined in /etc/group/system_groups.reg
const groups = fileSystem.getGroups();

// Query all groups a user belongs to (includes primary group)
const userGroups = fileSystem.getUserGroups("test_user");

// Check if user is a sudoer
const hasSudo = fileSystem.isUserSudoer("test_user");

// Modify user groups
const result = fileSystem.modifyUserGroup("append", "admin", "test_user", "admin");
if (!result.success) {
  console.error("Failed:", result.error);
}
```
