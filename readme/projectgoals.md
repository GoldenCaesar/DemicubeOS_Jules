# DemicubeOS Project Goals

**Project Status**: 🚀 Active Development  
**Last Updated**: September 5, 2026  
**Purpose**: A comprehensive interactive cybersecurity simulation platform with realistic OS emulation, terminal gameplay, and mission-based learning.

---

## 🎯 High-Level Goals

### Goal 1: Core OS Emulation Engine ✅ Advanced
Create a fully functional browser-based operating system emulator that mimics real OS behavior including startup sequence, animated main menu, boot sequences, desktop environments, authentication, file systems, and system management.

### Goal 2: Interactive Terminal & Command System ✅ Advanced
Implement a realistic terminal application that processes commands, manages processes, handles resource allocation, provides authentic command-line interaction, distinguishes session logout from process exit, and manages multi-hop SSH chains.

### Goal 3: Mission & Campaign System 🔄 Planned
Build a scalable framework for creating educational missions and campaigns that teach cybersecurity concepts through interactive gameplay.

### Goal 4: Multi-System Support 🟢 Active
Enable users to interact with multiple virtual computer systems via SSH and network commands, each with unique configurations, credentials, vulnerabilities, and security audit trails.

### Goal 5: Advanced Audio/Visual Experience ✅ Advanced
Enhance immersion through video startup splash screens, procedural 3D wireframe fallbacks, looping 3D perspective cyber grids, retro-futuristic CRT effects, authentic BSOD crash sequences, and Web Audio API synthesizer effects.

### Goal 6: Dynamic Content Creation 🔄 Planned
Provide tools and documentation for community developers to easily create new systems, missions, and content.

---

## 📋 Detailed Goals & Tasks

### 1. CORE OS FEATURES
- [x] Startup Splash Screen with video playback (`src/media/demicubeOS.mp4`) & procedural 3D fallback
- [x] Looping Animated 3D Cyber Main Menu (`src/ui/menu-canvas.js`)
- [x] Main Menu -> Boot Sequence -> Login Screen -> Desktop Shell flow
- [x] Boot sequence with dynamic OS name support
- [x] Shutdown sequence with dynamic OS name support
- [x] Authentic BSOD screen with inspired Windows blue (#0078d7), :( emoticon, and Oops! message
- [x] Immediate RAM exhaustion BSOD crash and reboot when task manager calculation reaches 100%
- [x] Kernel panic/crash sequence on critical process termination (PID 1) with tuned hold time (~3x loading bar)
- [x] Desktop shell with window management
- [x] Login screen with user authentication (`admin`, `test_user`) and known logins picker
- [x] "Return to Main Menu" action on login screen with clean state reset
- [x] Taskbar and window controls (minimize, maximize, close, drag, resize)
- [x] System logout flow (`logout` command and Start Menu -> Log Out) returning to system sign-in screen
- [ ] Proper file permissions system (POSIX rwx simulation active, enforcement in progress)
- [x] User privilege levels (admin, user, guest, root / sudo)
- [ ] Process state management improvements
- [x] Memory management refinements (proactive RAM tracking and out-of-memory crash trigger)
- [ ] Signal handling (SIGTERM, SIGKILL, SIGINT)

### 2. FILE SYSTEM
- [x] Virtual file system with directory structure
- [x] File types (text, binary, audio)
- [x] Directory navigation and browsing
- [ ] File permissions (rwx for owner/group/other)
- [ ] Symbolic links and hard links
- [ ] File locking mechanisms
- [ ] Disk space management
- [ ] File recovery/deletion mechanics

### 3. TERMINAL APPLICATION
- [x] Command input and execution with cursor navigation
- [x] Process window management and process linking
- [x] Command history (Up/Down arrow navigation)
- [x] Directory navigation (cd, pwd, ls, ll)
- [x] File operations (cat, cp, mv, rm, rm * with wildcard and animated loading simulation, mkdir, touch)
- [x] Dedicated `logout` command (ends system session and returns to that system's login screen)
- [x] Dedicated `exit` command (closes active terminal window or disconnects active SSH hop)
- [x] Multi-hop SSH remote terminal login (`ssh`, `session`, `sessions`, `disconnect`)
- [x] Comprehensive manual system (`help [cmd]`) with syntax, flags, and examples
- [x] Python command simulation (clawder-python)
- [ ] Pipe operations (|)
- [ ] Input/output redirection (>, <, >>)
- [ ] Environment variables
- [ ] Shell scripts and batch execution
- [ ] Background process management (&)
- [ ] Job control (fg, bg, jobs)

### 4. APPLICATION ECOSYSTEM
- [x] Terminal application
- [x] File browser
- [x] CodePad+ (text/code editor)
- [x] Clawder Python (AI assistant)
- [x] Music player (synth audio player)
- [x] Settings application
- [x] Task manager / System monitor
- [x] Zenmap (GUI network scanner & mapper)
- [x] VPNGuard (VPN tunnel manager)
- [ ] Web browser simulation
- [ ] Email client
- [ ] System logs viewer
- [ ] Network packet sniffer
- [ ] Firewall configuration tool

### 5. SYSTEM DEFINITIONS & MODULAR ARCHITECTURE
- [x] Base system definition structure (system.json, users.json, filesystem.json)
- [x] Dynamic OS name support across boot/shutdown/crash sequences
- [x] Profile-based system loading
- [x] Default fallback system
- [ ] System template library with presets
- [ ] Difficulty scaling per system
- [ ] Vulnerability database per system
- [ ] Custom system attributes and metadata

### 6. MISSIONS & CAMPAIGNS
- [x] Mission pack structure (pack.json)
- [x] Tutorial mission framework
- [x] Mission manifest definitions
- [ ] Mission objectives system
- [ ] Mission rewards/scoring
- [ ] Branching mission paths
- [ ] Campaign progression tracking
- [ ] Difficulty progression
- [ ] Hint system
- [ ] Mission validation and completion detection
- [ ] Leaderboard/statistics tracking

### 7. NETWORKING & SYSTEMS INTERACTION
- [x] SSH remote login with authentication and credentials cache
- [x] Multi-hop SSH session chaining (`[LOCAL] -> [HOP] -> [CURRENT]`)
- [x] Network interfaces and routing simulation (`ifconfig`, `ip`, `route`)
- [x] Network security audit logs (`/var/log/auth.log` daemon)
- [ ] Network packet simulation
- [ ] Port scanning and service detection
- [ ] Network services (HTTP, FTP)
- [ ] Inter-system communication
- [ ] Network traffic monitoring
- [ ] Firewall rules and packet filtering
- [ ] DNS resolution
- [ ] Network vulnerabilities

### 8. SECURITY & VULNERABILITIES
- [x] Authentication failure tracking & audit logging
- [x] Credential harvesting in `/home/*` directories
- [ ] SQL injection simulation
- [ ] Buffer overflow examples
- [ ] Privilege escalation scenarios
- [ ] Social engineering challenges
- [ ] Cryptography basics
- [ ] Password cracking simulations
- [ ] Malware behavior simulation
- [ ] Intrusion detection scenarios

### 9. USER EXPERIENCE & INTERFACE
- [x] Video startup splash screen (`src/media/demicubeOS.mp4`) with frame detection
- [x] Procedural 3D CSS wireframe cube fallback intro with progress track
- [x] Interactive skip controls (keyboard, click anywhere, Skip button)
- [x] Looping 3D Cyber Main Menu with HTML5 Canvas (`src/ui/menu-canvas.js`)
- [x] Web Audio API sound synthesis (button hover and activation beeps)
- [x] Sign-in screen with "◂ Return to Main Menu" action
- [x] Authentic BSOD crash screen with memory dump progression
- [x] Dynamic boot/shutdown sequences
- [x] Window dragging, resizing, and z-index management
- [x] Desktop focus and taskbar integration
- [ ] Theme customization
- [ ] Accessibility features
- [ ] Tutorial mode
- [ ] Keyboard shortcuts documentation
- [ ] In-game help system

### 10. DEVELOPMENT & COMMUNITY
- [x] Modular system file structure
- [x] JSON-based configuration files
- [x] Developer documentation (`filetree.md`, `projectgoals.md`)
- [ ] System and mission creation templates
- [ ] Example systems and missions
- [ ] Community contribution guidelines
- [ ] Version control best practices

---

## 📊 Completion Summary

| Category | Status | Progress |
|----------|--------|----------|
| Core OS Emulation | 🟢 Active | 85% |
| Terminal & Commands | 🟢 Active | 80% |
| Applications | 🟢 Active | 90% |
| File System | 🟡 Planned | 65% |
| Missions & Campaigns | 🟡 Planned | 25% |
| Networking | 🟢 Active | 50% |
| Security Scenarios | 🟡 Planned | 25% |
| Documentation | 🟢 Active | 75% |

---

## 🚦 Current Priority Tasks

### Immediate (Next Sprint)
1. [ ] Add custom binary asset upload workflow for media assets
2. [ ] Implement pipe operations (|)
3. [ ] Add input/output redirection (>, <, >>)
4. [ ] Enhance file permissions enforcement (chmod, chown checks)
5. [ ] Document modular system creation process

### Short Term (Next 2-3 Sprints)
1. [ ] Build mission objective system
2. [ ] Create mission validation framework
3. [ ] Implement scoring/rewards system
4. [ ] Add environment variables support
5. [ ] Build system template library

### Medium Term (Next Quarter)
1. [ ] Expand network simulation layer
2. [ ] Add simulated HTTP web services
3. [ ] Create vulnerability scenarios
4. [ ] Build comprehensive mission pack
5. [ ] Implement campaign progression system

### Long Term (Ongoing)
1. [ ] Expand security scenarios
2. [ ] Build community content platform
3. [ ] Add multiplayer/competitive modes
4. [ ] Create advanced networking challenges
5. [ ] Build comprehensive telemetry system

---

## 💡 Design Principles

1. **Modularity**: Everything is copy-paste extensible (systems, missions, applications)
2. **Authenticity**: Mimic real OS behavior as closely as possible
3. **Accessibility**: Easy for new developers to understand and extend
4. **Learning-Focused**: Every feature should teach cybersecurity concepts
5. **Performance**: Optimize for browser-based execution
6. **Community-Driven**: Enable developers to create and share content

---

## 📝 Notes for New Developers

- Read `filetree.md` first to understand the project structure
- Systems are in `content/Systems/` - copy an existing one to create a new system
- Missions are in `content/missions/` - follow the same copy-paste pattern
- Core game logic is in `src/core/` - respect the architecture
- Applications are in `src/apps/` - modular and independently loadable
- Video/media assets reside in `src/media/` - ensure real binary `.mp4` files are provided (text stubs trigger fallback)
- Configuration files are JSON-based for easy editing

---

## ✨ Recent Accomplishments

- ✅ **Looping 3D Cyber Main Menu**: Built responsive HTML5 Canvas engine (`src/ui/menu-canvas.js`) rendering an isometric perspective cyber grid with cyan horizon glows, floating particles, rotating wireframe Demicube, and Web Audio API synthesizer effects.
- ✅ **Video Startup Splash Screen**: Integrated `src/media/demicubeOS.mp4` with automatic video playback detection, multiple source paths (`/src/media/` and `./src/media/`), a high-tech 3D procedural cube fallback, and keyboard/click skip controls.
- ✅ **Fixed `logout` Command**: Completely separated `logout` from `exit`. Typing `logout` now formally terminates the operating system user session, clears active process windows, logs auth telemetry, and returns the player to that system's **Sign In screen** (`ui.showLoginScreen()`).
- ✅ **Distinct `exit` Command**: Dedicated to closing the active terminal window (`kill <pid>`) or disconnecting from an active SSH hop, without disrupting the underlying user session.
- ✅ **Sign In Navigation**: Added "◂ Return to Main Menu" button on the login screen for clean navigation back to the 3D menu canvas.
- ✅ **Dynamic OS-Specific Boot & Shutdown Sequences**: Dynamic branding based on system JSON definition.
- ✅ **Authentic BSOD Crash Sequences**: Windows-inspired blue screen (#0078d7) with RAM exhaustion crash triggers at 100% memory and PID 1 critical termination.
- ✅ **Multi-Hop SSH Session Management**: Implemented `ssh`, `session`, `sessions`, and `disconnect` commands with `/var/log/auth.log` daemon.
- ✅ **Wildcard Deletion Animation**: Realistic Linux `rm *` dot loader animation with non-destructive reboot restoration.

---

## 🐛 Known Issues & Technical Debt

1. **Empty Media Stubs**: Creating a media file in the editor without binary content results in a 0-2 byte text file. The browser video decoder triggers an error on empty stubs, which is caught and gracefully redirects to the procedural cyber fallback. Upcoming developers should ensure real binary MP4 files are uploaded.
2. Command piping (`|`) not yet implemented
3. Input/output redirection (`>`, `<`) pending
4. File permissions enforcement needs strict mode checks
5. Mission validation system not started

---

**Last Reviewed**: September 5, 2026  
**Next Review**: [To be scheduled]
