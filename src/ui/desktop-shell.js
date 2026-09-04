export function createDesktopShell(rootElement, profile) {
  rootElement.innerHTML = [
    "<main class=\"shell\">",
    "  <section id=\"boot-screen\" class=\"boot-screen\">",
    "    <pre id=\"boot-log\" class=\"boot-log\"></pre>",
    "  </section>",
    "  <section id=\"crash-screen\" class=\"crash-screen hidden\">",
    "    <div class=\"crash-container\">",
    "      <div class=\"crash-sad-face\">:(</div>",
    "      <div class=\"crash-message-block\">",
    "        <h1 class=\"crash-oops-title\">Oops! Your PC ran into a problem and needs to restart.</h1>",
    "        <p class=\"crash-oops-subtitle\">We're just collecting some error info, and then we'll restart for you.</p>",
    "      </div>",
    "      <div class=\"crash-progress-block\">",
    "        <div class=\"crash-dump-row\"><span id=\"crash-dump-pct\">0%</span> complete</div>",
    "        <div id=\"crash-dump-progress\" class=\"crash-dump-bar\">",
    "          <div class=\"crash-dump-fill\"></div>",
    "        </div>",
    "        <div class=\"crash-dump-stats\"><span id=\"crash-dump-info\">0 MB / 16384 MB</span> dumped</div>",
    "      </div>",
    "      <div class=\"crash-details-row\">",
    "        <div class=\"crash-qr-container\">",
    "          <svg class=\"crash-qr-icon\" viewBox=\"0 0 100 100\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\">",
    "            <rect width=\"100\" height=\"100\" fill=\"#ffffff\"/>",
    "            <rect x=\"8\" y=\"8\" width=\"28\" height=\"28\" fill=\"#0078d7\"/>",
    "            <rect x=\"14\" y=\"14\" width=\"16\" height=\"16\" fill=\"#ffffff\"/>",
    "            <rect x=\"18\" y=\"18\" width=\"8\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"64\" y=\"8\" width=\"28\" height=\"28\" fill=\"#0078d7\"/>",
    "            <rect x=\"70\" y=\"14\" width=\"16\" height=\"16\" fill=\"#ffffff\"/>",
    "            <rect x=\"74\" y=\"18\" width=\"8\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"8\" y=\"64\" width=\"28\" height=\"28\" fill=\"#0078d7\"/>",
    "            <rect x=\"14\" y=\"70\" width=\"16\" height=\"16\" fill=\"#ffffff\"/>",
    "            <rect x=\"18\" y=\"74\" width=\"8\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"42\" y=\"12\" width=\"6\" height=\"6\" fill=\"#0078d7\"/>",
    "            <rect x=\"52\" y=\"16\" width=\"6\" height=\"6\" fill=\"#0078d7\"/>",
    "            <rect x=\"42\" y=\"26\" width=\"6\" height=\"6\" fill=\"#0078d7\"/>",
    "            <rect x=\"50\" y=\"32\" width=\"8\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"16\" y=\"44\" width=\"8\" height=\"6\" fill=\"#0078d7\"/>",
    "            <rect x=\"30\" y=\"42\" width=\"6\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"44\" y=\"46\" width=\"12\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"64\" y=\"44\" width=\"8\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"78\" y=\"42\" width=\"14\" height=\"6\" fill=\"#0078d7\"/>",
    "            <rect x=\"42\" y=\"62\" width=\"6\" height=\"12\" fill=\"#0078d7\"/>",
    "            <rect x=\"54\" y=\"58\" width=\"8\" height=\"6\" fill=\"#0078d7\"/>",
    "            <rect x=\"66\" y=\"62\" width=\"8\" height=\"14\" fill=\"#0078d7\"/>",
    "            <rect x=\"80\" y=\"58\" width=\"12\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"44\" y=\"80\" width=\"8\" height=\"12\" fill=\"#0078d7\"/>",
    "            <rect x=\"58\" y=\"78\" width=\"12\" height=\"8\" fill=\"#0078d7\"/>",
    "            <rect x=\"76\" y=\"78\" width=\"16\" height=\"14\" fill=\"#0078d7\"/>",
    "          </svg>",
    "        </div>",
    "        <div class=\"crash-support-info\">",
    "          <p class=\"crash-support-headline\">For more information about this issue and possible fixes, visit <span class=\"crash-support-link\">https://<span id=\"crash-url-osname\">demicubeos</span>.com/stopcode</span></p>",
    "          <p class=\"crash-support-call\">If you call a support person, give them this info:</p>",
    "          <div class=\"crash-support-metadata\">",
    "            <p>Stop code: <span id=\"crash-stop-code\" class=\"crash-code-val\">CRITICAL_PROCESS_DIED</span></p>",
    "            <p>What failed: <span id=\"crash-fault-module\" class=\"crash-code-val\">demicube_kernel.sys</span></p>",
    "            <p id=\"crash-message-line\">Failure reason: <span id=\"crash-message\" class=\"crash-code-val\">System encountered an unrecoverable error</span></p>",
    "            <p class=\"crash-os-tag\">Operating system: <span id=\"crash-os-name\">DEMICUBEOS</span></p>",
    "          </div>",
    "        </div>",
    "      </div>",
    "      <div class=\"crash-footer-note\">System will automatically reboot shortly...</div>",
    "    </div>",
    "  </section>",
    "  <section id=\"desktop-screen\" class=\"desktop-screen hidden\" aria-label=\"Desktop\">",
    "    <div class=\"desktop-bg\">",
    "      <div class=\"desktop-logo\">DEMICUBE</div>",
    "    </div>",
    "    <section id=\"login-screen\" class=\"login-screen hidden\" aria-label=\"User login\"><div class=\"login-panel\"><div class=\"login-kicker\">DEMICUBEOS SESSION</div><h1>Sign in</h1><p id=\"login-system\">Local test computer</p><div class=\"known-logins\"><button type=\"button\" data-known-login=\"admin\" data-known-password=\"admin\">admin</button></div><form id=\"login-form\"><label for=\"login-user\">User</label><input id=\"login-user\" autocomplete=\"username\" value=\"admin\" /><label for=\"login-password\">Password</label><input id=\"login-password\" type=\"password\" autocomplete=\"current-password\" /><button type=\"submit\">Log in</button></form><div id=\"login-error\" class=\"login-error\" role=\"alert\"></div></div></section>",
    "    <section id=\"files-window\" class=\"files-window window-surface\" data-window-id=\"files\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">Files</div><div id=\"files-path\" class=\"focus-label\">/</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div class=\"files-toolbar\"><button data-files-action=\"back\">&lt;</button><button data-files-action=\"up\">^</button><button data-files-action=\"refresh\">R</button><input id=\"files-url\" aria-label=\"File path\" value=\"/\" /></div>",
    "      <div class=\"files-workspace\"><aside class=\"files-sidebar\"><strong>Places</strong><button data-files-path=\"/\">Root /</button><button data-files-path=\"/home\">Home</button><button data-files-path=\"/documents\">Documents</button><button data-files-path=\"/programs\">Programs</button><button data-files-path=\"/music\">Music</button><button data-files-path=\"/var/log\">Logs</button><button data-files-path=\"/sys\">System</button></aside><div class=\"files-content\"><div id=\"files-breadcrumbs\" class=\"files-breadcrumbs\"></div>",
    "      <div id=\"files-list\" class=\"files-list\"></div>",
    "      <pre id=\"file-preview\" class=\"file-preview hidden\"></pre>",
    "      </div></div>",
    "    </section>",
    "    <section id=\"codepad-window\" class=\"app-window window-surface hidden\" data-window-id=\"codepad\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">CodePad+</div><div id=\"codepad-path\" class=\"focus-label\">No file open</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div id=\"codepad-tabs\" class=\"codepad-tabs\"></div>",
    "      <pre id=\"codepad-content\" class=\"file-preview\">Open a .txt or .py file to view it.</pre>",
    "    </section>",
    "    <section id=\"clawder-window\" class=\"app-window window-surface hidden\" data-window-id=\"clawder-python\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">Clawder Python</div><div class=\"focus-label\">AI assistant</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div class=\"clawder-content\"><strong>Clawder Python</strong><span>no prompts</span></div>",
    "    </section>",
    "    <section id=\"start-menu\" class=\"start-menu hidden\" aria-label=\"Start Menu\">",
    "      <div class=\"start-menu-search\">Search apps and missions...</div>",
      "      <div id=\"start-menu-list\" class=\"start-menu-list\"></div>",
    "      <div class=\"start-menu-footer\">",
    "        <button id=\"logout-button\" class=\"start-item muted\">Log out</button>",
    "      </div>",
    "    </section>",
    "    <section id=\"task-manager-window\" class=\"app-window window-surface hidden\" data-window-id=\"task-manager\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">TaskManager <span class=\"system-badge\">PROCESS MONITOR</span></div><div class=\"focus-label\">system://processes</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
      "      <div class=\"system-toolbar\"><strong>Running Processes</strong><span>Live virtual process table</span></div>",
      "      <div class=\"system-summary\"><div><span class=\"summary-pulse\"></span><span>Tasks</span><strong id=\"system-task-count\">0</strong></div><div><span>Running</span><strong id=\"system-running-count\">0</strong></div><div><span>RAM</span><strong id=\"system-ram-label\">0 / 16384 MB</strong></div><div class=\"system-health\"><span>System health</span><strong>NOMINAL</strong></div></div>",
      "      <div class=\"system-memory\"><div class=\"system-memory-label\"><span>Total RAM usage</span><strong id=\"system-memory-percent\">0%</strong></div><div class=\"system-memory-track\"><div id=\"system-memory-fill\" class=\"system-memory-fill\"></div></div></div>",
    "      <div id=\"system-processes\" class=\"system-processes\"></div>",
    "      <footer class=\"system-status\"><span id=\"system-footer-ram\">RAM: 0 / 16384 MB (0%)</span><span>CPU load: 32.2%</span><span>Uptime: 4d 18h 32m</span><strong>SYSTEM HEALTH: NOMINAL</strong></footer>",
    "    </section>",
    "    <section id=\"settings-window\" class=\"app-window window-surface hidden\" data-window-id=\"settings\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">Settings</div><div class=\"focus-label\">Game settings</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div class=\"settings-content\"><label for=\"user-text-color\">User Text Color</label><div class=\"color-control\"><input id=\"user-text-color\" type=\"color\" value=\"#f4d35e\" /><input id=\"user-text-color-hex\" type=\"text\" value=\"#f4d35e\" maxlength=\"7\" /></div><p>Terminal command history color</p></div>",
    "    </section>",
    "    <section id=\"music-player-window\" class=\"app-window window-surface hidden\" data-window-id=\"music-player\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">Music Player</div><div class=\"focus-label\">/music</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div class=\"music-toolbar\"><strong>Music Library</strong><label class=\"upload-button\">Add MP3s<input id=\"music-upload\" type=\"file\" accept=\"audio/mpeg,.mp3\" multiple /></label></div>",
    "      <div class=\"music-workspace\"><aside class=\"music-sidebar\"><strong>Library</strong><button class=\"active\" data-music-view=\"all\">Now Playing</button><small>/music mounted</small></aside><div class=\"music-main\"><div class=\"music-hero\"><div class=\"music-art\">◈</div><div><h2 id=\"music-track-title\">No track selected</h2><p>Virtual audio library · DemicubeOS</p><div class=\"music-visualizer\"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div><div id=\"music-tracks\" class=\"music-tracks\"></div></div></div>",
    "      <div class=\"music-now-playing\"><span id=\"music-status\">No track selected</span><div class=\"music-controls\"><button data-music-control=\"shuffle\" title=\"Shuffle\">⇄</button><button data-music-control=\"previous\" title=\"Previous\">|&lt;</button><button id=\"music-play\" data-music-control=\"play\" class=\"music-play\" title=\"Play\">▶</button><button data-music-control=\"next\" title=\"Next\">&gt;|</button><button data-music-control=\"repeat\" title=\"Repeat\">↻</button></div><input id=\"music-seek\" type=\"range\" min=\"0\" max=\"100\" value=\"0\" /><label class=\"music-volume\">VOL <input id=\"music-volume\" type=\"range\" min=\"0\" max=\"1\" step=\"0.01\" value=\"0.82\" /></label></div>",
    "    </section>",
    "    <section id=\"zenmap-window\" class=\"app-window window-surface hidden zenmap-window\" data-window-id=\"zenmap\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">Zenmap 7.94 <span class=\"system-badge\">NETWORK TOPOLOGY MAPPER</span></div><div class=\"focus-label\" id=\"zenmap-title-label\">Data: /documents/zenmap/savedata.ini</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div class=\"zenmap-toolbar\"><div class=\"zenmap-tool-group\"><label for=\"zenmap-target\">Target:</label><input id=\"zenmap-target\" class=\"zenmap-input\" type=\"text\" value=\"192.168.56.0/24, 10.0.0.0/16, 172.16.5.0/24\" spellcheck=\"false\" title=\"CLI: zenmap target <cidr>\" /></div><div class=\"zenmap-tool-group\"><label for=\"zenmap-profile\">Profile:</label><select id=\"zenmap-profile\" class=\"zenmap-select\" title=\"CLI: zenmap profile <profile>\"><option value=\"intense\">Intense scan, all TCP ports</option><option value=\"quick\">Quick traceroute &amp; sweep</option><option value=\"ping\">Ping scan</option><option value=\"regular\">Regular scan</option></select></div><button id=\"zenmap-scan-btn\" class=\"zenmap-scan-button\" title=\"Run scan &amp; update savedata.ini [CLI: zenmap scan]\">Scan</button><span class=\"zenmap-cli-hint\">CLI: <code>zenmap [command]</code></span></div>",
    "      <div id=\"zenmap-status-banner\" class=\"zenmap-status-bar\"><strong>Status:</strong> 9/9 hosts online · Latency: 0.8ms avg · Data: /documents/zenmap/savedata.ini</div>",
    "      <div class=\"zenmap-nav-tabs\"><button class=\"zenmap-tab-btn active\" data-zenmap-tab=\"topology\" title=\"CLI: zenmap tab topology\">Topology (Node Map)</button><button class=\"zenmap-tab-btn\" data-zenmap-tab=\"hosts\" title=\"CLI: zenmap tab hosts\">Hosts (9)</button><button class=\"zenmap-tab-btn\" data-zenmap-tab=\"services\" title=\"CLI: zenmap tab services\">Services</button><button class=\"zenmap-tab-btn\" data-zenmap-tab=\"nmap-output\" title=\"CLI: zenmap tab output\">Nmap Output</button></div>",
    "      <div class=\"zenmap-content-area\">",
    "        <div id=\"zenmap-view-topology\" class=\"zenmap-tab-view zenmap-topology-view\">",
    "          <div class=\"zenmap-subbar\"><div class=\"zenmap-filter-group\"><span class=\"zenmap-subbar-label\">Subnet Filter:</span><button class=\"zenmap-pill active\" data-zenmap-filter=\"all\" title=\"CLI: zenmap filter all\">All Subnets</button><button class=\"zenmap-pill\" data-zenmap-filter=\"192.168.56.0/24\" title=\"CLI: zenmap filter local\">Local (192.168.56.x)</button><button class=\"zenmap-pill\" data-zenmap-filter=\"10.0.0.0/16\" title=\"CLI: zenmap filter internal\">Internal (10.0.x)</button><button class=\"zenmap-pill\" data-zenmap-filter=\"10.10.10.0/24\" title=\"CLI: zenmap filter corporate\">Aegis Corp (10.10.10.x)</button><button class=\"zenmap-pill\" data-zenmap-filter=\"10.9.0.0/24\" title=\"CLI: zenmap filter p2p\">P2P Peer (10.9.0.x)</button><button class=\"zenmap-pill\" data-zenmap-filter=\"remote\" title=\"CLI: zenmap filter remote\">Remote WAN</button></div><div class=\"zenmap-layout-group\"><span class=\"zenmap-subbar-label\">Layout:</span><button class=\"zenmap-pill active\" data-zenmap-layout=\"radial\" title=\"CLI: zenmap layout radial\">Radial Ring</button><button class=\"zenmap-pill\" data-zenmap-layout=\"tree\" title=\"CLI: zenmap layout tree\">Tree / Flow</button></div></div>",
    "          <div class=\"zenmap-workspace\"><div class=\"zenmap-canvas-container\"><svg id=\"zenmap-topology-svg\" class=\"zenmap-svg-canvas\" viewBox=\"0 0 860 520\" preserveAspectRatio=\"xMidYMid meet\"></svg><div class=\"zenmap-radar-sweep\"></div><div class=\"zenmap-controls\"><button id=\"zenmap-zoom-in\" class=\"zenmap-zoom-btn\" title=\"Zoom In [CLI: zenmap zoom in]\">+</button><button id=\"zenmap-zoom-out\" class=\"zenmap-zoom-btn\" title=\"Zoom Out [CLI: zenmap zoom out]\">-</button><button id=\"zenmap-zoom-reset\" class=\"zenmap-zoom-btn\" title=\"Reset View [CLI: zenmap zoom reset]\">Fit</button></div></div><aside id=\"zenmap-host-inspector\" class=\"zenmap-inspector-panel\"></aside></div>",
    "        </div>",
    "        <div id=\"zenmap-view-hosts\" class=\"zenmap-tab-view hidden\"><div class=\"zenmap-table-header-bar\"><button id=\"zenmap-btn-add-host\" class=\"zenmap-mini-btn zenmap-action-add\" title=\"Add host to savedata.ini [CLI: zenmap add <ip> <hostname>]\">+ Add Host</button><span class=\"zenmap-table-note\">Data source: <code id=\"zenmap-table-data-path\">/documents/zenmap/savedata.ini</code></span></div><div class=\"zenmap-table-wrapper\"><table class=\"zenmap-table\"><thead><tr><th>HOSTNAME</th><th>IP ADDRESS</th><th>STATUS</th><th>LATENCY</th><th>OPEN PORTS</th><th>OPERATING SYSTEM</th><th>ROLE</th><th>ACTIONS</th></tr></thead><tbody id=\"zenmap-hosts-tbody\"></tbody></table></div></div>",
    "        <div id=\"zenmap-view-services\" class=\"zenmap-tab-view hidden\"><div id=\"zenmap-services-list\" class=\"zenmap-services-grid\"></div></div>",
    "        <div id=\"zenmap-view-output\" class=\"zenmap-tab-view hidden\"><pre id=\"zenmap-raw-output\" class=\"zenmap-output-pre\"></pre></div>",
    "      </div>",
    "    </section>",
    "    <section id=\"vpnguard-window\" class=\"app-window window-surface hidden vpnguard-window\" data-window-id=\"vpnguard\">",
    "      <header class=\"terminal-titlebar window-titlebar\"><div class=\"title-left\">VPNguard 2.4.1 <span class=\"system-badge\">NETWORK ENCRYPTION LAYER</span></div><div class=\"focus-label\" id=\"vpnguard-header-subtext\">Interface: tun0 · Egress: 74.125.19.102</div><div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div></header>",
    "      <div class=\"vpnguard-toolbar\"><div class=\"vpnguard-status-pill disconnected\" id=\"vpnguard-status-pill\"><span class=\"vpnguard-pulse off\"></span> DISCONNECTED</div></div>",
    "      <div id=\"vpnguard-content-area\" class=\"vpnguard-content-area\"></div>",
    "    </section>",
    "    <section class=\"terminal-window window-surface\" data-window-id=\"terminal-main\">",
    "      <header class=\"terminal-titlebar window-titlebar\">",
    "        <div class=\"title-left\" id=\"terminal-title-text\">Terminal - " + profile.promptUser + "@" + profile.promptHost + ":~</div>",
    "        <div id=\"focus-label\" class=\"focus-label\"></div>",
    "        <div class=\"window-controls\"><button data-window-action=\"minimize\">_</button><button data-window-action=\"maximize\">[]</button><button data-window-action=\"close\">X</button></div>",
    "      </header>",
    "      <pre id=\"terminal-monitor\" class=\"terminal-monitor\"></pre>",
    "      <div id=\"terminal-nano-container\" class=\"terminal-nano hidden\">",
    "        <div class=\"nano-header\">",
    "          <span class=\"nano-app-title\">GNU nano 7.2</span>",
    "          <span id=\"nano-file-path\" class=\"nano-file-path\">/var/log/auth.log</span>",
    "          <span id=\"nano-modified\" class=\"nano-modified\"></span>",
    "        </div>",
    "        <textarea id=\"nano-editor-textarea\" class=\"nano-textarea\" spellcheck=\"false\"></textarea>",
    "        <div id=\"nano-status-bar\" class=\"nano-status-bar\">[ Read 0 lines ]</div>",
    "        <div class=\"nano-footer\">",
    "          <button type=\"button\" id=\"nano-btn-writeout\" class=\"nano-shortcut\" title=\"Save file (^O)\"><span>^O</span> WriteOut</button>",
    "          <button type=\"button\" id=\"nano-btn-exit\" class=\"nano-shortcut\" title=\"Exit editor (^X)\"><span>^X</span> Exit</button>",
    "          <button type=\"button\" id=\"nano-btn-cut\" class=\"nano-shortcut\" title=\"Cut line (^K)\"><span>^K</span> Cut Line</button>",
    "          <button type=\"button\" id=\"nano-btn-help\" class=\"nano-shortcut\" title=\"Help (^G)\"><span>^G</span> Help</button>",
    "        </div>",
    "      </div>",
    "      <div class=\"terminal-input-row\">",
    "        <span class=\"prompt\" id=\"window-prompt-prefix\"></span>",
    "        <span class=\"command-input\" id=\"window-command-input\"></span>",
    "        <span class=\"cursor\">_</span>",
    "      </div>",
    "    </section>",
    "    <div class=\"command-dock\"><span id=\"taskbar-focus-label\" class=\"taskbar-focus-label\">Focused: terminal-main</span><span class=\"prompt\" id=\"taskbar-prompt-prefix\"></span><span class=\"command-input\" id=\"taskbar-command-input\"></span><span class=\"cursor\">_</span></div>",
    "    <div class=\"taskbar\">",
    "      <div class=\"taskbar-left\">",
    "        <button id=\"start-button\" class=\"start-button\" aria-label=\"Open start menu\">Start</button>",
    "      </div>",
      "      <div id=\"taskbar-apps\" class=\"taskbar-apps\"></div>",
    "      <div id=\"clock\" class=\"clock\"></div>",
    "    </div>",
    "  </section>",
    "</main>"
  ].join("\n");

  const bootScreen = document.getElementById("boot-screen");
  const crashScreen = document.getElementById("crash-screen");
  const crashOsName = document.getElementById("crash-os-name");
  const crashUrlOsName = document.getElementById("crash-url-osname");
  const crashMessage = document.getElementById("crash-message");
  const crashStopCode = document.getElementById("crash-stop-code");
  const crashFaultModule = document.getElementById("crash-fault-module");
  const crashDumpFill = document.querySelector(".crash-dump-fill");
  const crashDumpPct = document.getElementById("crash-dump-pct");
  const crashDumpInfo = document.getElementById("crash-dump-info");
  const desktopScreen = document.getElementById("desktop-screen");
  const loginScreen = document.getElementById("login-screen");
  const loginSystem = document.getElementById("login-system");
  const bootLog = document.getElementById("boot-log");
  const terminalMonitor = document.getElementById("terminal-monitor");
  const windowCommandInput = document.getElementById("window-command-input");
  const windowPromptPrefix = document.getElementById("window-prompt-prefix");
  const taskbarCommandInput = document.getElementById("taskbar-command-input");
  const taskbarPromptPrefix = document.getElementById("taskbar-prompt-prefix");
  const focusLabel = document.getElementById("focus-label");
  const taskbarFocusLabel = document.getElementById("taskbar-focus-label");
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");
  const logoutButton = document.getElementById("logout-button");
  const loginForm = document.getElementById("login-form");
  const loginUser = document.getElementById("login-user");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const knownLoginButtons = document.querySelectorAll("[data-known-login]");
  const clock = document.getElementById("clock");
  const taskbarApps = document.getElementById("taskbar-apps");
  const startMenuList = document.getElementById("start-menu-list");
  const filesPath = document.getElementById("files-path");
  const filesList = document.getElementById("files-list");
  const filePreview = document.getElementById("file-preview");
  const filesUrl = document.getElementById("files-url");
  const filesBreadcrumbs = document.getElementById("files-breadcrumbs");
  const codepadWindow = document.getElementById("codepad-window");
  const codepadPath = document.getElementById("codepad-path");
  const codepadContent = document.getElementById("codepad-content");
  const codepadTabs = document.getElementById("codepad-tabs");
  const clawderWindow = document.getElementById("clawder-window");
  const settingsWindow = document.getElementById("settings-window");
  const systemProcesses = document.getElementById("system-processes");
  const systemTaskCount = document.getElementById("system-task-count");
  const systemRunningCount = document.getElementById("system-running-count");
  const systemRamLabel = document.getElementById("system-ram-label");
  const systemMemoryPercent = document.getElementById("system-memory-percent");
  const systemMemoryFill = document.getElementById("system-memory-fill");
  const systemFooterRam = document.getElementById("system-footer-ram");
  const musicTracks = document.getElementById("music-tracks");
  const musicStatusElement = document.getElementById("music-status");
  const musicUpload = document.getElementById("music-upload");
  const musicTitle = document.getElementById("music-track-title");
  const musicPlay = document.getElementById("music-play");
  const musicSeek = document.getElementById("music-seek");
  const musicVolume = document.getElementById("music-volume");
  const userTextColor = document.getElementById("user-text-color");
  const userTextColorHex = document.getElementById("user-text-color-hex");
  const terminalWindow = document.querySelector(".terminal-window");
  const terminalTitleText = document.getElementById("terminal-title-text");
  const terminalNanoContainer = document.getElementById("terminal-nano-container");
  const nanoFilePath = document.getElementById("nano-file-path");
  const nanoTextarea = document.getElementById("nano-editor-textarea");
  const nanoStatusBar = document.getElementById("nano-status-bar");
  const nanoModified = document.getElementById("nano-modified");
  const nanoBtnWriteout = document.getElementById("nano-btn-writeout");
  const nanoBtnExit = document.getElementById("nano-btn-exit");
  const nanoBtnCut = document.getElementById("nano-btn-cut");
  const nanoBtnHelp = document.getElementById("nano-btn-help");

  let nanoCurrentPath = "";
  let nanoSaveHandler = null;
  let nanoExitHandler = null;

  if (nanoTextarea) {
    nanoTextarea.addEventListener("input", () => {
      nanoModified.textContent = "Modified";
    });

    const triggerNanoSave = () => {
      if (nanoSaveHandler) {
        const lines = nanoTextarea.value.split("\n").length;
        nanoSaveHandler(nanoCurrentPath, nanoTextarea.value);
        nanoModified.textContent = "";
        nanoStatusBar.textContent = `[ Wrote ${lines} lines ]`;
      }
    };

    const triggerNanoExit = () => {
      closeNano();
      if (nanoExitHandler) nanoExitHandler();
    };

    nanoBtnWriteout?.addEventListener("click", triggerNanoSave);
    nanoBtnExit?.addEventListener("click", triggerNanoExit);
    nanoBtnCut?.addEventListener("click", () => {
      const pos = nanoTextarea.selectionStart;
      const val = nanoTextarea.value;
      const start = val.lastIndexOf("\n", pos - 1) + 1;
      let end = val.indexOf("\n", pos);
      if (end === -1) end = val.length;
      else end += 1;
      nanoTextarea.value = val.slice(0, start) + val.slice(end);
      nanoTextarea.setSelectionRange(start, start);
      nanoModified.textContent = "Modified";
      nanoStatusBar.textContent = "[ Cut 1 line ]";
    });
    nanoBtnHelp?.addEventListener("click", () => {
      nanoStatusBar.textContent = "[ Nano Help: ^O WriteOut / Save, ^X Exit, ^K Cut Line ]";
    });

    nanoTextarea.addEventListener("keydown", (e) => {
      if (e.ctrlKey && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        triggerNanoSave();
      } else if (e.ctrlKey && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        triggerNanoExit();
      } else if (e.ctrlKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        nanoBtnCut?.click();
      }
    });
  }

  function openNano(path, content, onSave, onExit) {
    nanoCurrentPath = path;
    nanoSaveHandler = onSave;
    nanoExitHandler = onExit;
    if (nanoFilePath) nanoFilePath.textContent = path;
    if (nanoTextarea) {
      nanoTextarea.value = content || "";
      const lines = (content || "").split("\n").length;
      if (nanoStatusBar) nanoStatusBar.textContent = `[ Read ${lines} lines ]`;
      if (nanoModified) nanoModified.textContent = "";
    }
    terminalMonitor.classList.add("hidden");
    const inputRow = document.querySelector(".terminal-input-row");
    if (inputRow) inputRow.classList.add("hidden");
    if (terminalNanoContainer) terminalNanoContainer.classList.remove("hidden");
    nanoTextarea?.focus();
  }

  function closeNano() {
    if (terminalNanoContainer) terminalNanoContainer.classList.add("hidden");
    terminalMonitor.classList.remove("hidden");
    const inputRow = document.querySelector(".terminal-input-row");
    if (inputRow) inputRow.classList.remove("hidden");
  }

  function isNanoOpen() {
    return terminalNanoContainer && !terminalNanoContainer.classList.contains("hidden");
  }

  function setTerminalTitle(title) {
    if (terminalTitleText) terminalTitleText.textContent = title;
  }
  let desktopFocusHandler = null;
  let logoutHandler = null;
  let systemKillHandler = null;
  let systemFocusHandler = null;
  let taskbarProgramHandler = null;

  function tickClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  tickClock();
  setInterval(tickClock, 1000);


  function toggleStartMenu() {
    startMenu.classList.toggle("hidden");
  }

  function closeStartMenu() {
    startMenu.classList.add("hidden");
  }

  if (startButton) {
    startButton.addEventListener("click", toggleStartMenu);
  }

  document.addEventListener("click", (event) => {
    if (!startMenu.classList.contains("hidden") && !event.target.closest("#start-menu, #start-button")) {
      closeStartMenu();
    }
  });

  document.querySelector(".desktop-bg").addEventListener("click", () => {
    if (desktopFocusHandler) desktopFocusHandler();
  });

  function appendBootLine(text, type = "default") {
    const marker = type === "system" ? ">" : "-";
    bootLog.textContent += marker + " " + text + "\n";
    bootLog.scrollTop = bootLog.scrollHeight;
  }

  function showDesktop() {
    loginScreen.classList.add("hidden");
    bootScreen.classList.add("hidden");
    crashScreen.classList.add("hidden");
    desktopScreen.classList.remove("hidden");
  }

  function showLoginScreen() {
    closeStartMenu();
    loginScreen.classList.remove("hidden");
    loginPassword.value = "";
    loginError.textContent = "";
    loginSystem.textContent = profile.distroName + " · " + profile.systemId;
    loginUser.focus();
  }

  knownLoginButtons.forEach((button) => button.addEventListener("click", () => {
    loginUser.value = button.dataset.knownLogin;
    loginPassword.value = button.dataset.knownPassword || "";
    loginPassword.focus();
  }));

  logoutButton.addEventListener("click", () => {
    closeStartMenu();
    if (logoutHandler) logoutHandler();
  });

  function showLoginError(message) {
    loginError.textContent = message;
  }

  function setPrompt(prefix, commandBuffer) {
    windowPromptPrefix.textContent = prefix;
    taskbarPromptPrefix.textContent = prefix;
    windowCommandInput.textContent = commandBuffer;
    taskbarCommandInput.textContent = commandBuffer;
  }

  let terminalChangeHandler = null;
  function onTerminalChange(handler) {
    terminalChangeHandler = handler;
  }

  function appendTerminalLine(line) {
    const element = document.createElement("div");
    element.textContent = line;
    terminalMonitor.append(element);
    while (terminalMonitor.children.length > 500) terminalMonitor.firstElementChild.remove();
    terminalMonitor.scrollTop = terminalMonitor.scrollHeight;
    if (terminalChangeHandler) terminalChangeHandler();
  }

  function clearTerminal() {
    terminalMonitor.textContent = "";
    if (terminalChangeHandler) terminalChangeHandler();
  }
  function appendTerminalInput(line) {
    const element = document.createElement("div");
    element.className = "terminal-user-line";
    element.textContent = line;
    terminalMonitor.append(element);
    while (terminalMonitor.children.length > 500) terminalMonitor.firstElementChild.remove();
    terminalMonitor.scrollTop = terminalMonitor.scrollHeight;
    if (terminalChangeHandler) terminalChangeHandler();
  }

  function setUserTextColor(color) {
    document.documentElement.style.setProperty("--user-text-color", color);
    userTextColor.value = color;
    userTextColorHex.value = color;
  }

  function onUserTextColorChange(handler) {
    userTextColor.addEventListener("input", () => handler(userTextColor.value));
    userTextColorHex.addEventListener("input", () => {
      if (/^#[0-9a-f]{6}$/i.test(userTextColorHex.value)) handler(userTextColorHex.value);
    });
  }

  function setTerminalVisible(visible) {
    terminalWindow.classList.toggle("hidden", !visible);
  }

  function setWindowVisible(windowId, visible) {
    const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
    if (window) {
      window.classList.toggle("hidden", !visible);
      if (visible) clampWindowPosition(window);
    }
  }

  function isWindowVisible(windowId) {
    const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
    return Boolean(window && !window.classList.contains("hidden"));
  }

  function getWindowText(windowId) {
    const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
    return window ? window.textContent : "";
  }

  function getVisibleWindowIds(processWindows) {
    return [...processWindows.entries()]
      .filter(([, windowId]) => {
        const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
        return window && !window.classList.contains("hidden");
      })
      .map(([pid]) => pid);
  }

  function snapWindows(windowIds, processWindows) {
    const width = desktopScreen.clientWidth;
    const height = desktopScreen.clientHeight - 40;
    const layouts = {
      1: [[0, 0, width, height]],
      2: [[0, 0, width / 2, height], [width / 2, 0, width / 2, height]],
      3: [[0, 0, width, height / 3], [0, height / 3, width, height / 3], [0, height * 2 / 3, width, height / 3]],
      4: [[0, 0, width / 2, height / 2], [width / 2, 0, width / 2, height / 2], [0, height / 2, width / 2, height / 2], [width / 2, height / 2, width / 2, height / 2]]
    }[windowIds.length];
    if (!layouts) return false;
    windowIds.forEach((pid, index) => {
      const windowId = processWindows.get(pid);
      const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
      if (!window) return;
      const [left, top, windowWidth, windowHeight] = layouts[index];
      window.classList.remove("maximized");
      window.style.left = left + "px";
      window.style.top = top + "px";
      window.style.width = Math.max(320, windowWidth - 1) + "px";
      window.style.height = Math.max(220, windowHeight - 1) + "px";
    });
    return true;
  }

  function clampWindowPosition(window) {
    const maxWidth = Math.max(320, desktopScreen.clientWidth - window.offsetLeft - 1);
    const maxHeight = Math.max(220, desktopScreen.clientHeight - 40 - window.offsetTop - 1);
    if (window.offsetWidth > maxWidth) window.style.width = maxWidth + "px";
    if (window.offsetHeight > maxHeight) window.style.height = maxHeight + "px";
    const maxLeft = Math.max(0, desktopScreen.clientWidth - window.offsetWidth - 1);
    const maxTop = Math.max(0, desktopScreen.clientHeight - 40 - window.offsetHeight - 1);
    window.style.left = Math.min(Math.max(0, window.offsetLeft), maxLeft) + "px";
    window.style.top = Math.min(Math.max(0, window.offsetTop), maxTop) + "px";
  }

  function resetWindows() {
    document.querySelectorAll(".window-surface").forEach((window) => window.classList.add("hidden"));
    setWindowVisible("files", true);
    setTerminalVisible(true);
  }

  function closeAllWindows() {
    document.querySelectorAll(".window-surface").forEach((window) => window.classList.add("hidden"));
  }

  function showBootScreen() {
    bootLog.textContent = "";
    desktopScreen.classList.add("hidden");
    crashScreen.classList.add("hidden");
    loginScreen.classList.add("hidden");
    bootScreen.classList.remove("hidden");
  }

  function showCrashScreen(osName, details = {}) {
    desktopScreen.classList.add("hidden");
    bootScreen.classList.add("hidden");
    loginScreen.classList.add("hidden");
    crashScreen.classList.remove("hidden");
    const nameStr = (osName || profile?.distroName || "DEMICUBEOS").toString();
    if (crashOsName) crashOsName.textContent = nameStr.toUpperCase();
    if (crashUrlOsName) crashUrlOsName.textContent = nameStr.toLowerCase();
    const stopCode = details.stopCode || (details.reason === "out_of_memory" ? "SYSTEM_RESOURCE_EXHAUSTION_0x00000101" : "CRITICAL_PROCESS_DIED_0x000000EF");
    const faultModule = details.faultModule || (details.reason === "out_of_memory" ? "mm_allocator.sys" : "libenclave_crypto.so+0x4a9f");
    const message = details.message || (details.reason === "out_of_memory"
      ? "Physical RAM usage reached 100%. The system was forced to halt to prevent data corruption."
      : nameStr + " encountered an unrecoverable security enclave violation and was forced to halt execution.");
    if (crashStopCode) crashStopCode.textContent = stopCode;
    if (crashFaultModule) crashFaultModule.textContent = faultModule;
    if (crashMessage) crashMessage.textContent = message;
    if (crashDumpFill) crashDumpFill.style.width = "0%";
    if (crashDumpPct) crashDumpPct.textContent = "0%";
    const totalMem = details.totalMem || 16384;
    if (crashDumpInfo) crashDumpInfo.textContent = "0 MB / " + totalMem + " MB";
  }

  function updateCrashDump(percent, dumpedMb, totalMb = 16384) {
    if (crashDumpFill) crashDumpFill.style.width = percent + "%";
    if (crashDumpPct) crashDumpPct.textContent = percent + "%";
    if (crashDumpInfo) crashDumpInfo.textContent = dumpedMb + " MB / " + totalMb + " MB";
  }

  function renderFiles(path, entries) {
    filesPath.textContent = path;
    filePreview.classList.add("hidden");
    filesList.classList.remove("hidden");
    filesUrl.value = path;
    filesBreadcrumbs.innerHTML = path.split("/").filter(Boolean).reduce((html, part, index, parts) => {
      const target = "/" + parts.slice(0, index + 1).join("/");
      return html + "<button data-files-path=\"" + target + "\">" + part + "</button><span>/</span>";
    }, "<button data-files-path=\"/\">root</button>");
    filePreview.classList.add("hidden");
    filesList.classList.remove("hidden");
    filesList.innerHTML = entries.map((entry) => {
      const marker = entry.type === "directory" ? "[DIR]" : entry.format === "audio" ? "[AUD]" : ["text", "py"].includes(entry.format) ? "[TXT]" : "[BIN]";
      return "<button class=\"file-entry\" data-file-path=\"" + entry.path + "\"><span>" + marker + "</span><strong>" + entry.name + "</strong></button>";
    }).join("");
  }

  function showFilePreview(path, content, format) {
    filesPath.textContent = path;
    filesList.classList.add("hidden");
    filePreview.classList.remove("hidden");
    filePreview.textContent = (format === "text" ? "TEXT FILE\n\n" : "BINARY FILE\n\n") + content;
  }

  function showCodePad() {
    codepadWindow.classList.remove("hidden");
  }

  function showCodePadFile(path, content) {
    showCodePad();
    codepadPath.textContent = path;
    codepadContent.textContent = content;
  }

  function renderCodePadTabs(tabs, activePath) {
    codepadTabs.innerHTML = tabs.map((path) => "<span class=\"codepad-tab" + (path === activePath ? " active" : "") + "\"><button data-codepad-path=\"" + path + "\">" + path.split("/").pop() + "</button><button class=\"codepad-tab-close\" data-codepad-close=\"" + path + "\" title=\"Close tab\">x</button></span>").join("");
  }

  function showClawderPython() {
    clawderWindow.classList.remove("hidden");
  }
  function showSettings() {
    settingsWindow.classList.remove("hidden");
  }

  function showSystem() {
    document.getElementById("task-manager-window").classList.remove("hidden");
  }

  function showMusicPlayer() {
    document.getElementById("music-player-window").classList.remove("hidden");
  }

  function renderMusicTracks(tracks, activePath) {
    musicTracks.innerHTML = tracks.map((track) => "<button class=\"music-track" + (track.path === activePath ? " active" : "") + "\" data-music-path=\"" + track.path + "\"><span>♪</span><strong>" + track.name + "</strong><small>MP3 · /music</small></button>").join("");
    musicTitle.textContent = activePath ? activePath.split("/").pop() : "No track selected";
  }

  function musicStatus(message) {
    musicStatusElement.textContent = message;
  }

  function updateMusicControls({ playing, shuffle, repeat }) {
    musicPlay.textContent = playing ? "||" : "▶";
    musicPlay.title = playing ? "Pause" : "Play";
    document.querySelector('[data-music-control="shuffle"]').classList.toggle("active", shuffle);
    document.querySelector('[data-music-control="repeat"]').classList.toggle("active", repeat);
  }

  function onMusicActions({ play, upload, pause, previous, next, shuffle, repeat, seek, volume }) {
    musicTracks.addEventListener("click", (event) => {
      const track = event.target.closest("[data-music-path]");
      if (track) play(track.dataset.musicPath);
    });
    musicUpload.addEventListener("change", () => upload(musicUpload.files));
    document.querySelectorAll("[data-music-control]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.musicControl;
      if (action === "play") pause();
      if (action === "previous") previous();
      if (action === "next") next();
      if (action === "shuffle") shuffle();
      if (action === "repeat") repeat();
    }));
    musicSeek.addEventListener("input", () => seek(musicSeek.value));
    musicVolume.addEventListener("input", () => volume(musicVolume.value));
  }

  function onFileOpen(handler) {
    filesList.addEventListener("click", (event) => {
      const entry = event.target.closest("[data-file-path]");
      if (entry) handler(entry.dataset.filePath);
    });
  }

  function onCodePadTab(handler) {
    codepadTabs.addEventListener("click", (event) => {
      const close = event.target.closest("[data-codepad-close]");
      if (close) {
        handler(close.dataset.codepadClose, true);
        return;
      }
      const tab = event.target.closest("[data-codepad-path]");
      if (tab) handler(tab.dataset.codepadPath, false);
    });
  }

  function onFilesNavigation(handler) {
    document.addEventListener("click", (event) => {
      const element = event.target.closest("[data-files-path]");
      if (element) handler(element.dataset.filesPath);
    });
    filesUrl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") handler(filesUrl.value);
    });
    document.querySelectorAll("[data-files-action]").forEach((element) => element.addEventListener("click", () => handler(element.dataset.filesAction)));
  }

  function onWindowAction(handler) {
    document.querySelectorAll(".window-surface").forEach((window) => {
      window.addEventListener("pointerdown", () => handler(window.dataset.windowId, "focus"));
      window.querySelector(".window-titlebar").addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        handler(window.dataset.windowId, "drag-start", event);
        const startX = event.clientX;
        const startY = event.clientY;
        const startLeft = window.offsetLeft;
        const startTop = window.offsetTop;
        const move = (moveEvent) => {
          window.style.left = startLeft + moveEvent.clientX - startX + "px";
          window.style.top = startTop + moveEvent.clientY - startY + "px";
          clampWindowPosition(window);
        };
        const stop = () => {
          clampWindowPosition(window);
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", stop);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", stop);
      });
      window.addEventListener("resize", () => clampWindowPosition(window));
      window.querySelectorAll("[data-window-action]").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        handler(window.dataset.windowId, button.dataset.windowAction, event);
      }));
    });
  }

  function refreshStartMenu(processes, processWindows) {
    startMenuList.innerHTML = "";
    for (const [pid, name] of processes) {
      const item = document.createElement("button");
      item.className = "start-item";
      item.dataset.processId = pid;
      item.textContent = name;
      if (processWindows.has(pid)) item.dataset.windowId = processWindows.get(pid);
      startMenuList.append(item);
    }
  }

  function renderProgramMenu(programs) {
    startMenuList.innerHTML = "";
    for (const program of programs) {
      const item = document.createElement("button");
      item.className = "start-item";
      item.dataset.programId = program.id;
      item.textContent = program.name;
      startMenuList.append(item);
    }
  }

  function renderSystemProcesses(processes) {
    systemProcesses.innerHTML = "";
    systemTaskCount.textContent = processes.size;
    systemRunningCount.textContent = processes.size;
    for (const [pid, name] of processes) {
      const row = document.createElement("div");
      row.className = "system-process-row";
      row.innerHTML = "<span class=\"system-pid\">" + pid + "</span><strong data-system-focus=\"" + pid + "\">" + name + "</strong><span class=\"system-process-memory\">0 MB</span><span class=\"system-process-state\">RUNNING</span><button data-system-kill=\"" + pid + "\">Kill</button>";
      const killButton = row.querySelector("[data-system-kill]");
      let handled = false;
      const kill = (event) => {
        event.stopPropagation();
        if (handled) return;
        handled = true;
        if (systemKillHandler) systemKillHandler(pid);
      };
      killButton.addEventListener("pointerdown", kill);
      killButton.addEventListener("click", kill);
      systemProcesses.append(row);
    }
  }

  function renderSystemResources(snapshot) {
    systemRamLabel.textContent = snapshot.usedRam + " / " + snapshot.totalRam + " MB";
    systemMemoryPercent.textContent = snapshot.percentage.toFixed(1) + "%";
    systemFooterRam.textContent = "RAM: " + snapshot.usedRam + " / " + snapshot.totalRam + " MB (" + snapshot.percentage.toFixed(1) + "%)";
    systemMemoryFill.style.width = Math.min(100, snapshot.percentage) + "%";
    systemMemoryFill.classList.toggle("critical", snapshot.percentage >= 90);
    renderSystemProcesses(new Map(snapshot.processes.map((process) => [process.pid, process.name])));
    systemProcesses.querySelectorAll(".system-process-row").forEach((row) => {
      const pid = Number(row.querySelector(".system-pid").textContent);
      const process = snapshot.processes.find((item) => item.pid === pid);
      if (process) row.querySelector(".system-process-memory").textContent = process.totalRam + " MB";
    });
  }

  function onWindowOpen(handler) {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-file-path], [data-files-path], [data-files-action], [data-window-action]")) return;
      const element = event.target.closest("[data-window-id]");
      if (element) handler(element.dataset.windowId);
    });
  }

  function toggleWindowMaximized(windowId) {
    const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
    if (window) window.classList.toggle("maximized");
  }

  function onProgramLaunch(handler) {
    document.addEventListener("click", (event) => {
      const element = event.target.closest("[data-program-id]");
      if (element) {
        closeStartMenu();
        handler(element.dataset.programId);
      }
    });
  }

  function onSystemKill(handler) {
    systemKillHandler = handler;
  }

  function onSystemFocus(handler) {
    systemFocusHandler = handler;
    const focusProcess = (event) => {
      const processName = event.target.closest("[data-system-focus]");
      if (processName) {
        event.stopPropagation();
        handler(Number(processName.dataset.systemFocus));
      }
    };
    systemProcesses.addEventListener("pointerdown", focusProcess);
    systemProcesses.addEventListener("click", focusProcess);
  }

  function renderTaskbarApps(processes, processWindows) {
    taskbarApps.innerHTML = "";
    for (const [pid, name] of processes) {
      const windowId = processWindows.get(pid);
      if (!windowId) continue;
      const window = document.querySelector(".window-surface[data-window-id='" + windowId + "']");
      if (!window) continue;
      const button = document.createElement("button");
      button.className = "task-app" + (window.classList.contains("hidden") ? " minimized" : "");
      button.dataset.taskbarPid = pid;
      button.textContent = name;
      taskbarApps.append(button);
    }
  }

  function onTaskbarProgram(handler) {
    taskbarProgramHandler = handler;
    taskbarApps.addEventListener("click", (event) => {
      const button = event.target.closest("[data-taskbar-pid]");
      if (button) handler(Number(button.dataset.taskbarPid));
    });
  }


  function setFocus(windowId) {
    const focusTargets = document.querySelectorAll("[data-window-id]");
    let zIndex = 10;
    for (const element of focusTargets) {
      const targetId = element.getAttribute("data-window-id");
      if (targetId === windowId) {
        element.classList.add("focused");
        if (element.classList.contains("window-surface")) element.style.zIndex = "30";
      } else {
        element.classList.remove("focused");
        if (element.classList.contains("window-surface")) element.style.zIndex = String(zIndex++);
      }
    }

    const status = windowId ? "Focused: " + windowId : "Focused: desktop";
    focusLabel.textContent = status + " (Alt+A/Alt+D)";
    taskbarFocusLabel.textContent = status;
  }

  return {
    appendBootLine,
    showDesktop,
    showLoginScreen,
    showLoginError,
    onLogin(handler) {
      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        handler(loginUser.value.trim(), loginPassword.value);
      });
    },
    onLogout(handler) {
      logoutHandler = handler;
    },
    setPrompt,
    appendTerminalLine,
    appendTerminalInput,
    onTerminalChange,
    clearTerminal,
    setTerminalVisible,
    setWindowVisible,
    isWindowVisible,
    getWindowText,
    getVisibleWindowIds,
    snapWindows,
    resetWindows,
    closeAllWindows,
    showBootScreen,
    showCrashScreen,
    updateCrashDump,
    setFocus,
    toggleStartMenu,
    closeStartMenu,
    renderFiles,
    showFilePreview,
    onFileOpen,
    onFilesNavigation,
    onWindowOpen,
    onWindowAction,
      toggleWindowMaximized,
    refreshStartMenu,
    renderProgramMenu,
    renderSystemProcesses,
    onSystemKill,
    onSystemFocus,
    renderSystemResources,
    renderTaskbarApps,
    onTaskbarProgram,
    onDesktopFocus(handler) {
      desktopFocusHandler = handler;
    },
    onProgramLaunch,
    showCodePad,
    showCodePadFile,
    renderCodePadTabs,
    onCodePadTab,
    showClawderPython,
    showSettings,
    showSystem,
    showMusicPlayer,
    showZenmap() {
      setWindowVisible("zenmap", true);
    },
    showVPNGuard() {
      setWindowVisible("vpnguard", true);
    },
    renderMusicTracks,
    musicStatus,
    updateMusicControls,
    onMusicActions,
    setUserTextColor,
    onUserTextColorChange,
    openNano,
    closeNano,
    isNanoOpen,
    setTerminalTitle
  };
}
