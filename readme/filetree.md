# DemicubeOS File Structure Guide

**Purpose**: This document explains the project file organization, the modular system architecture, and how to create new systems and missions.

---

## 📂 Root Directory Structure

```
DemicubeOS/
├── content/                    # Game content (systems, missions, profiles, programs)
├── src/                        # Source code for the game engine
├── docs/                       # Documentation files
├── readme/                     # Developer guides (this folder)
├── scripts/                    # Build and deployment scripts
├── music/                      # Audio files for game
├── index.html                  # Main entry point for the application
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
├── main.js                  # Main entry point, initializes all systems
├── apps/                    # Individual application implementations
│   ├── terminal.js         # Terminal emulator (⭐ most complex)
│   ├── files.js            # File browser
│   ├── codepad.js          # Text/code editor
│   ├── clawder-python.js   # AI assistant
│   ├── music-player.js     # Music player
│   ├── settings.js         # Settings app
│   └── system.js           # Task manager / system monitor
├── core/                    # Core game engine systems
│   ├── boot-sequence.js    # Boot/shutdown sequences
│   ├── os-sequence.js      # OS-specific sequences (dynamic per OS name)
│   ├── window-manager.js   # Window management and focus
│   ├── file-system.js      # Virtual file system implementation
│   ├── terminal.js         # Terminal execution engine
│   ├── login-manager.js    # User authentication
│   ├── resource-manager.js # RAM/process management
│   ├── system-loader.js    # Loads system definition from JSON
│   ├── input-dispatcher.js # Keyboard/input handling
│   └── fake-python.js      # Python command simulation
├── config/                  # Configuration files
│   └── game-profile.js     # Game-wide settings
├── styles/                  # CSS styling
│   ├── base.css            # Main styles
│   └── themes/
│       └── kali.css        # Kali theme (dark, cyan, etc.)
└── ui/                      # UI generation
    └── desktop-shell.js    # Creates HTML UI structure
```

### Key Modules Explained

#### **src/core/os-sequence.js** ⭐ IMPORTANT
Generates dynamic boot, shutdown, and crash sequences based on the OS name.

**Key Functions**:
- `simulateOSSequence(osName, state, print)` - Main function
  - `osName`: The operating system name (e.g., "DemicubeOS", "KaliLinux")
  - `state`: "on" (boot), "off" (shutdown), or "crash" (BSOD)
  - `print`: Callback to display text to terminal

**How it works**:
- Every sequence is generated using the OS name
- This ensures unique boot/shutdown/crash text for each OS
- BSOD holds for 8 seconds before allowing reboot

#### **src/core/system-loader.js**
Loads system definitions from `content/Systems/[IP]/`.

**FALLBACK_SYSTEM**: Used if system.json can't be loaded (for development)

#### **src/apps/terminal.js** ⭐ CRITICAL
The terminal application handles command execution.

**Key Commands** (documented in terminal.js):
- `ls` - List directory
- `cd` - Change directory
- `pwd` - Print working directory
- `cat` - Display file contents
- `echo` - Print text
- `mkdir` - Make directory
- `touch` - Create file
- And more...

**Adding New Commands**:
1. Look for the command handler switch statement
2. Add new case: `case 'yourcommand':`
3. Implement command logic
4. Return appropriate output

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

**Last Updated**: September 3, 2026  
**Maintainer**: DemicubeOS Team  
**Questions?**: Check projectgoals.md for roadmap and priorities
