# DemicubeOS File Structure Guide

**Purpose**: This document explains the project file organization, the modular system architecture, and how to create new systems and missions.

---

## 📂 Root Directory Structure

```
DemicubeOS/
├── content/                    # Game content (systems, missions, profiles, programs)
├── src/                        # Source code for the game engine & UI
├── docs/                       # Documentation files and packaging plans
├── readme/                     # Developer guides (this folder)
│   ├── filetree.md             # File tree & architectural navigation
│   ├── projectgoals.md         # Roadmap, milestones, & completed features
│   └── groups-and-permissions.md # User groups, permissions, & registry documentation
├── scripts/                    # Build and deployment scripts (Vercel / Cloud Run)
├── music/                      # Audio files for in-game music player
├── index.html                  # Main entry point for the web application
├── server.js                   # Node.js / Express static & SPA server (Port 3000)
├── metadata.json               # Platform application metadata and configuration
├── bsod_idea.txt              # Brainstorm/reference files
├── on_off_idea.txt            # Brainstorm/reference files
├── ui_idea*.txt               # UI brainstorm/reference files
└── starting point ideas.txt   # Project brainstorm document
```

---

## 🎮 Content Directory (`content/`)

This folder contains all game content and is the primary place for new developers to add systems and missions.

### Structure
```
content/
├── Systems/                   # Virtual computer systems (modular - copy/paste to add new)
│   ├── 192.168.56.101/       # Example system (Demicube test box)
│   │   ├── system.json       # OS info, programs, ports, theme
│   │   ├── users.json        # User accounts and credentials
│   │   └── filesystem.json   # Virtual file system structure
│   ├── [IP-ADDRESS]/         # Add more systems here (copy template above)
│   └── [IP-ADDRESS]/
├── missions/                  # Mission packs and challenges
│   ├── pack-001/             # Pack for organizing missions
│   │   ├── pack.json         # Pack metadata
│   │   ├── tutorial-boot/    # Individual mission directory
│   │   │   └── manifest.json # Mission details and objectives
│   │   └── [mission-name]/   # Add more missions here (copy above)
│   └── pack-002/             # Additional mission packs
├── profiles/                  # Game profiles/difficulty levels
│   └── kali/                 # Kali Linux profile (currently used)
│       └── profile.json      # Profile configuration
└── programs/                  # Program registry
    ├── README.md             # Programs documentation
    └── builtins/
        └── registry.json     # Built-in programs registry
```

### Key Files Explained

#### Systems
Each system represents a virtual computer that the player can interact with.

**Location**: `content/Systems/[IP-ADDRESS]/`

**Files Required**:
1. **system.json** - Core system configuration
   ```json
   {
     "id": "192.168.56.101",
     "ip": "192.168.56.101",
     "hostname": "demicube-testbox",
     "os": {
       "name": "DemicubeOS",
       "version": "0.1.0",
       "kernel": "6.6.0-demicube"
     },
     "ramMb": 16384,
     "theme": "kali",
     "programs": [],
     "ports": []
   }
   ```

2. **users.json** - User accounts
   ```json
   {
     "users": [
       {
         "id": "admin",
         "username": "admin",
         "password": "admin",
         "role": "admin",
         "permissions": ["full"],
         "homeDir": "/home/admin"
       }
     ]
   }
   ```

3. **filesystem.json** - File system structure
   ```json
   {
     "home": {},
     "documents": {},
     "programs": {},
     "music": {},
     "log": {},
     "sys": {}
   }
   ```

#### Missions
Missions are challenges/objectives in a mission pack.

**Location**: `content/missions/[PACK-NAME]/[MISSION-NAME]/`

**Files Required**:
1. **pack.json** - Pack metadata (one per pack)
   ```json
   {
     "id": "pack-001",
     "name": "Beginner Challenges",
     "version": "1.0.0",
     "missions": ["tutorial-boot"]
   }
   ```

2. **manifest.json** - Mission details
   ```json
   {
     "id": "tutorial-boot",
     "name": "Tutorial: System Boot",
     "description": "Learn how to boot the system",
     "difficulty": "beginner",
     "objectives": [],
     "rewards": {},
     "system": "192.168.56.101"
   }
   ```

---

## 💻 Source Code Directory (`src/`)

This folder contains the game engine implementation. Most development happens here.

### Structure
```
src/
├── main.js                  # Main entry point, orchestrates OS systems and state
├── apps/                    # Individual application implementations
│   ├── terminal.js         # Terminal emulator & command processor (⭐ most complex)
│   ├── files.js            # File browser and directory explorer
│   ├── codepad.js          # Text and script editor (CodePad+)
│   ├── clawder-python.js   # AI assistant interface
│   ├── music-player.js     # Audio & synth player
│   ├── settings.js         # System settings configuration app
│   ├── system.js           # Task manager & resource monitor
│   ├── zenmap.js           # GUI network mapper & port scanner
│   └── vpnguard.js         # VPN tunnel & security manager
├── core/                    # Core operating system engine
│   ├── boot-sequence.js    # Standard boot/shutdown sequence orchestration
│   ├── os-sequence.js      # Dynamic OS-specific boot, shutdown, BSOD generators
│   ├── window-manager.js   # Window hierarchy, dragging, z-index, and focus
│   ├── file-system.js      # In-memory virtual Unix file system & permissions
│   ├── group-manager.js    # User group definitions, registry serializer/parser (/etc/group/system_groups.reg)
│   ├── login-manager.js    # User authentication & session persistence
│   ├── resource-manager.js # RAM calculation, process allocation, OOM crash
│   ├── system-loader.js    # JSON system & filesystem loader
│   ├── input-dispatcher.js # Global keyboard shortcuts & dispatch
│   ├── fake-python.js      # Emulated Python script runner
│   ├── logging-system.js   # Multi-hop SSH chain, audit trails, and daemon
│   └── network-state.js    # Network routing table & interface states
├── media/                   # Multimedia assets
│   └── demicubeOS.mp4      # Cinematic startup splash video
├── config/                  # Configuration files
│   └── game-profile.js     # Game-wide settings and prompt profiles
├── styles/                  # CSS styling
│   ├── base.css            # Base styles, 3D cube animations, splash, main menu
│   └── themes/
│       └── kali.css        # Kali cyber theme (dark, cyan, neon accents)
└── ui/                      # UI rendering and graphical modules
    ├── desktop-shell.js    # Shell HTML template, screen manager, event wiring
    └── menu-canvas.js      # 3D isometric perspective cyber grid & particle engine
```

### Key Modules Explained

#### **src/ui/menu-canvas.js** & **src/ui/desktop-shell.js** ⭐ NEW
Implements the multi-stage visual startup pipeline:
1. **Video Splash Screen (`src/media/demicubeOS.mp4`)**:
   - Autoplays the startup MP4 video container seamlessly on application launch.
   - Built-in frame detection (`playing` / `timeupdate` > 0.05s) smoothly hides the procedural fallback layer.
   - Graceful fallback: If the video is empty, missing, or blocked by browser policies, a high-tech CSS 3D rotating cube animation plays automatically for ~3.5 seconds.
   - Interactive skip: Keyboard press (<kbd>Enter</kbd> / <kbd>Space</kbd> / any key), mouse click anywhere, or "SKIP INTRO ❯" button instantly skips to the Main Menu.
2. **Looping 3D Cyber Main Menu**:
   - High-performance HTML5 Canvas rendering isometric perspective cyber grid, horizon cyan glow, floating cyber particles, and rotating wireframe Demicube.
   - Modular navigation panel featuring **Log In** as the active entry point, with locked Campaign, Missions, Netlink, and Calibration buttons.
   - Web Audio API synthesizer generates retro sci-fi beeps and chirp effects on button hover and activation.
   - "◂ Return to Main Menu" button on the login screen allows jumping back to the 3D menu at any time.

#### **src/apps/terminal.js** ⭐ CRITICAL
The terminal application handles interactive command execution, argument parsing, manual generation (`help <cmd>`), and process management.

**Session Control: `logout` vs `exit`**:
- **`exit`**: Closes the currently active terminal window (`kill <pid>`), or if inside an active SSH hop, drops back to the previous hop in the connection chain (`Connection to <host> closed.`).
- **`logout`**: Formally logs out of the current operating system session.
  - In an SSH session: terminates the remote session and closes the connection.
  - On the local system: ends the authenticated session (`loginManager.logout()`), stops user daemons, closes all desktop application windows, and brings the player back to that system's **Sign In screen** (`ui.showLoginScreen()`).

**Key Commands**:
- `help [cmd]` - Interactive manual viewer with detailed synopsis and flags
- `logout` - Formally log out of the current system session and return to login screen
- `exit` - Close the active terminal window or disconnect current SSH hop
- `ls`, `ll` - Directory listing with Unix permissions (`drwxr-xr-x`)
- `cd`, `pwd`, `cat`, `mkdir`, `touch`, `cp`, `mv`, `rm` - Unix filesystem commands
- `ssh [user]@[host]` - Remote system access with multi-hop chain tracking
- `ps`, `kill` - Process listing and process termination (PID 1 kill triggers BSOD)
- `session`, `sessions`, `disconnect` - SSH chain inspection and fast disconnection

#### **src/core/os-sequence.js** ⭐ IMPORTANT
Generates dynamic boot, shutdown, and crash sequences based on the OS name.
- Every sequence is generated using the OS name (`simulateOSSequence(osName, state, print)`).
- BSOD holds for calibrated duration before initiating memory dump and reboot.

#### **src/core/file-system.js**
Virtual file system implementation using in-memory JSON structure.

**Note**: Files are stored in the system definition (filesystem.json), not on disk.

---

## 🛠️ How to Add a New System (Modular Copy-Paste Approach)

### Step 1: Copy the Template
```bash
# Copy the existing system as a template
cp -r content/Systems/192.168.56.101 content/Systems/10.0.0.50
```

### Step 2: Edit system.json
```json
{
  "id": "10.0.0.50",
  "ip": "10.0.0.50",
  "hostname": "my-custom-box",
  "os": {
    "name": "MyCustomOS",        // ⭐ This appears in boot/crash sequences
    "version": "1.0.0",
    "kernel": "5.10.0-custom"
  },
  "ramMb": 32768,
  "theme": "kali",
  "programs": [
    { "id": "my-program", "name": "My Program", "ramMb": 512 }
  ],
  "ports": [
    { "port": 22, "protocol": "tcp", "service": "ssh", "state": "open" }
  ]
}
```

### Step 3: Edit users.json
```json
{
  "users": [
    {
      "id": "user1",
      "username": "user1",
      "password": "password123",
      "role": "user",
      "permissions": ["basic"],
      "homeDir": "/home/user1"
    }
  ]
}
```

### Step 4: Edit filesystem.json
```json
{
  "home": {
    "user1": {
      "secret.txt": {
        "type": "file",
        "format": "text",
        "content": "This is a secret file"
      }
    }
  },
  "documents": {},
  "programs": {},
  "music": {},
  "log": {},
  "sys": {}
}
```

### Step 5: Test
The game will automatically load your new system. Check that:
- Boot sequence shows "MyCustomOS" name
- System loads with correct hostname
- Users can log in
- Files are accessible

**That's it!** Your new system is now part of the game.

---

## 🎯 How to Add a New Mission (Modular Copy-Paste Approach)

### Step 1: Copy the Mission Template
```bash
# Copy an existing mission
cp -r content/missions/pack-001/tutorial-boot content/missions/pack-001/new-mission
```

### Step 2: Edit manifest.json
```json
{
  "id": "new-mission",
  "name": "Your Mission Name",
  "description": "What the player needs to accomplish",
  "difficulty": "intermediate",
  "objectives": [
    "Find the admin password",
    "Execute a command",
    "Collect evidence"
  ],
  "rewards": {
    "points": 500,
    "unlocks": ["next-mission"]
  },
  "system": "192.168.56.101",
  "timeLimit": 600
}
```

### Step 3: Update pack.json
Add your mission to the missions array:
```json
{
  "id": "pack-001",
  "name": "Beginner Challenges",
  "version": "1.0.0",
  "missions": ["tutorial-boot", "new-mission"]
}
```

### Step 4: Create Mission Logic
Mission validation logic will be added to the game engine as the mission system is developed.

---

## 📊 Data Flow

```
index.html
    ↓
main.js (entry point)
    ↓
system-loader.js (loads content/Systems/[IP]/*.json)
    ↓
boot-sequence.js → os-sequence.js (shows boot sequence)
    ↓
desktop-shell.js (creates UI)
    ↓
User logs in
    ↓
Applications launch
    ├── terminal.js (executes commands)
    ├── file-system.js (provides file access)
    ├── window-manager.js (manages windows)
    └── other apps...
```

---

## 🔧 Common Tasks for New Developers

### Add a new terminal command
1. Open `src/apps/terminal.js`
2. Find the command handler switch statement
3. Add a new case for your command
4. Implement the logic
5. Test by typing the command in terminal

### Add a file to a system
1. Edit `content/Systems/[IP]/filesystem.json`
2. Add file object to appropriate directory
3. File will be accessible immediately

### Change system difficulty
1. Edit `content/Systems/[IP]/system.json`
2. Adjust `ramMb`, programs, users, etc.
3. More programs = harder to manage resources

### Create a system with a different OS
1. Copy existing system folder
2. Change `os.name` in system.json
3. Boot sequence will automatically show new OS name
4. BSOD will also show new OS name

---

## ⚠️ Important Files vs Placeholders

| File | Status | Purpose |
|------|--------|---------|
| content/Systems/*/system.json | ✅ Working | System configuration |
| content/Systems/*/users.json | ✅ Working | User accounts |
| content/Systems/*/filesystem.json | ✅ Working | Virtual filesystem |
| content/missions/pack.json | ✅ Working | Pack metadata |
| content/missions/*/manifest.json | 🟡 Partial | Mission definitions (validation TBD) |
| src/core/*.js | ✅ Working | Core game engine |
| src/apps/*.js | ✅ Working | Applications |
| docs/ | 🟡 Outdated | Needs updating |
| scripts/ | 🟡 Partial | Build scripts (some WIP) |

---

## 📈 Extending the Modular System

### Adding a New Program
1. Add program entry to `content/Systems/[IP]/system.json` programs array
2. Implement app file in `src/apps/[program].js`
3. Register in program catalog (main.js)
4. Terminal can launch it

### Adding a New Theme
1. Create `src/styles/themes/[theme-name].css`
2. Add theme to system.json: `"theme": "theme-name"`
3. UI will automatically apply theme

### Adding a New Application Type
1. Create `src/apps/[app-name].js`
2. Follow pattern of existing apps
3. Export class with `start()` method
4. Add to main.js initialization

---

## 🧪 Testing New Content

### Test a New System
```javascript
// Temporarily modify system-loader.js to use your system
// Or edit index.html to pass a specific system IP
```

### Test a New Mission
1. Navigate to mission in mission pack
2. Check console for any errors
3. Verify objectives are clear
4. Ensure rewards are set correctly

### Test Terminal Commands
1. Open terminal in the game
2. Type your new command
3. Verify output is correct
4. Check for error handling

---

## 🎓 Learning Resources

- **For UI/UX**: See `src/ui/desktop-shell.js` - excellent example of DOM manipulation
- **For Game Logic**: See `src/core/system-loader.js` - clean data loading pattern
- **For State Management**: See `main.js` - shows how everything connects
- **For Module Pattern**: See any `src/apps/*.js` - consistent structure throughout

---

## 🚀 Best Practices

1. **Use JSON for configuration** - Keep code clean, data in files
2. **Copy-paste for new systems/missions** - Modular design by default
3. **Test in browser** - Use DevTools to debug
4. **Comment your code** - Future developers will thank you
5. **Keep applications modular** - Should work independently
6. **Use meaningful names** - IP addresses, hostnames, usernames should be descriptive
7. **Document your additions** - Update this guide if you change structure

---

## ❓ FAQ

**Q: How do I add a new OS that shows in boot sequences?**
A: Create a new system with a unique `os.name` in system.json. The boot/shutdown/crash sequences automatically use this name.

**Q: Can I change a system's OS after creation?**
A: Yes! Just edit `system.json` and change the `os.name`. Reboot to see changes.

**Q: How do file permissions work?**
A: Currently files don't have strict permissions. This is on the roadmap (see projectgoals.md).

**Q: Can missions reference multiple systems?**
A: Currently each mission references one system. Multi-system missions are planned.

**Q: Where are files actually stored?**
A: All files are in-memory, stored in the system definition (filesystem.json). Not persisted to disk.

---

**Q: Why might `src/media/demicubeOS.mp4` show the fallback animation instead of playing?**
A: If `src/media/demicubeOS.mp4` is created as an empty text file or has 0-2 bytes, the browser's `<video>` decoder triggers a format error. DemicubeOS detects this gracefully and plays the procedural 3D rotating cube cyber intro fallback. To play your custom video, upload or replace `src/media/demicubeOS.mp4` with a real binary `.mp4` video (H.264/AAC recommended).

**Q: What is the difference between `logout` and `exit` in the terminal?**
A: `exit` closes the active terminal window (`kill <pid>`) or disconnects from the current SSH remote hop. `logout` terminates the authenticated operating system session; on the local system, it resets active desktop windows and returns the player to that system's login screen.

---

**Last Updated**: September 5, 2026  
**Maintainer**: DemicubeOS Team  
**Questions?**: Check projectgoals.md for roadmap and priorities
