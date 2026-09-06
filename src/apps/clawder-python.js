import { DEFAULT_WORDLIST } from "../core/hashed-key.js";

export class ClawderPythonApp {
  constructor({ ui, fileSystem, loginManager, loggingSystem, getFilesApp }) {
    this.ui = ui;
    this.fileSystem = fileSystem;
    this.loginManager = loginManager;
    this.loggingSystem = loggingSystem;
    this.getFilesApp = getFilesApp;

    this.currentView = "store"; // "store" | "details"
    this.activeItemId = "caesar-rip";
    this.animationTimers = [];
    this.isAnimating = false;

    this.items = [
      {
        id: "caesar-rip",
        buttonTitle: "CaesarRip.py",
        scriptName: "CaesarRip.py",
        fileName: "CaesarRip.txt",
        targetDir: "/documents/clawder-python",
        fullPath: "/documents/clawder-python/CaesarRip.txt",
        category: "Auditing & Security",
        summary: "Offline SHA-256 dictionary attack script with attempt counting and error handling.",
        userPromptText:
          'Write a Python script named CaesarRip.py that performs an offline dictionary attack. It should take a target SHA-256 hash and the path to a wordlist.txt file as command-line arguments. The script must read the wordlist line-by-line, calculate the SHA-256 hash of each word, and check if it matches the target hash. Include a simple terminal interface with progress indicators, attempt counts, and error handling for missing files.',
        pythonCode: `import hashlib
import sys
import os

def crack_hash(target_hash, wordlist_path):
    print(f"[*] Starting CaesarRip v1.0 - Offline Hash Auditing Utility")
    print(f"[*] Target Hash: {target_hash}")
    print(f"[*] Wordlist:    {wordlist_path}")
    print("-" * 60)
    
    # Verify if the wordlist exists on the virtual system
    if not os.path.exists(wordlist_path):
        print(f"[!] File Error: Wordlist '{wordlist_path}' not found.")
        print("[!] Please check the file path and try again.")
        return False
        
    attempts = 0
    try:
        # Open file with utf-8 encoding and ignore decoding anomalies
        with open(wordlist_path, 'r', encoding='utf-8', errors='ignore') as file:
            for line in file:
                attempts += 1
                
                # Strip out trailing whitespaces and newline characters
                candidate = line.strip()
                
                # Compute SHA-256 hash of the candidate word
                hasher = hashlib.sha256()
                hasher.update(candidate.encode('utf-8'))
                candidate_hash = hasher.hexdigest()
                
                # Compare the generated hash against our target
                if candidate_hash == target_hash:
                    print(f"[+] SUCCESS! Matching credential identified after {attempts} attempts.")
                    print(f"[+] Plaintext: {candidate}")
                    print(f"[+] Hash:      {candidate_hash}")
                    print("-" * 60)
                    return True
                    
    except Exception as e:
        print(f"[!] Runtime Error: {e}")
        return False
        
    print("-" * 60)
    print(f"[-] Finished. Tested {attempts} candidates. No matching password found.")
    return False

if __name__ == "__main__":
    # Validate command-line arguments
    if len(sys.argv) < 3:
        print("Error: Missing arguments.")
        print("Usage:   python CaesarRip.py <target_sha256_hash> <path_to_wordlist>")
        print("Example: python CaesarRip.py 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918 /home/test_user/wordlist.txt")
        sys.exit(1)
        
    # Standardize inputs (convert hash to lowercase)
    target = sys.argv[1].lower().strip()
    wordlist = sys.argv[2]
    
    crack_hash(target, wordlist)`
      }
    ];

    this.ensureDirectory();
    this.initDOM();
  }

  ensureDirectory() {
    if (!this.fileSystem) return;
    this.fileSystem.mkdir("/documents");
    this.fileSystem.mkdir("/documents/clawder-python");
    if (!this.fileSystem.resolve("/documents/clawder-python/wordlist.txt")) {
      this.fileSystem.write("/documents/clawder-python/wordlist.txt", DEFAULT_WORDLIST, "admin", "admin", "644");
    }
  }

  getActiveUser() {
    if (this.loginManager?.currentUser?.username) {
      return this.loginManager.currentUser.username;
    }
    const sessionUser = this.loggingSystem?.getCurrentSession?.()?.user;
    return sessionUser || "admin";
  }

  initDOM() {
    this.container = document.getElementById("clawder-app-container");
    this.subtitleElement = document.getElementById("clawder-header-subtitle");
    if (this.container) {
      this.bindEvents();
      this.render();
    }
  }

  start() {
    this.ensureDirectory();
    this.ui.showClawderPython();
    if (!this.container) {
      this.initDOM();
    } else {
      this.render();
    }
  }

  clearTimers() {
    for (const timer of this.animationTimers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this.animationTimers = [];
    this.isAnimating = false;
  }

  bindEvents() {
    if (!this.container) return;

    this.container.addEventListener("click", (e) => {
      // Store item button click
      const itemBtn = e.target.closest("[data-clawder-item-id]");
      if (itemBtn) {
        const itemId = itemBtn.dataset.clawderItemId;
        this.openDetails(itemId);
        return;
      }

      // Back button click
      const backBtn = e.target.closest("#clawder-back-btn");
      if (backBtn) {
        this.openStore();
        return;
      }

      // Create .txt file button click
      const createBtn = e.target.closest("#clawder-create-file-btn");
      if (createBtn) {
        const itemId = createBtn.dataset.itemId;
        const item = this.items.find((i) => i.id === itemId);
        if (item) {
          this.createTxtFile(item);
        }
        return;
      }

      // Skip animation button click
      const skipBtn = e.target.closest("#clawder-skip-anim-btn");
      if (skipBtn) {
        this.skipAnimation();
        return;
      }
    });
  }

  openStore() {
    this.clearTimers();
    this.currentView = "store";
    if (this.subtitleElement) {
      this.subtitleElement.textContent = "Store Catalog";
    }
    this.render();
  }

  openDetails(itemId) {
    this.clearTimers();
    this.currentView = "details";
    this.activeItemId = itemId;
    const item = this.items.find((i) => i.id === itemId) || this.items[0];
    if (this.subtitleElement) {
      this.subtitleElement.textContent = `${item.buttonTitle} · Details`;
    }
    this.render();
  }

  checkFileExists(item) {
    if (!this.fileSystem) return false;
    const node = this.fileSystem.resolve(item.fullPath);
    return Boolean(node && node.type === "file");
  }

  createTxtFile(item) {
    if (this.checkFileExists(item)) {
      this.showToast(`Notice: ${item.fileName} already exists in ${item.targetDir}`, "info");
      return;
    }

    this.ensureDirectory();
    const user = this.getActiveUser();
    const group = user === "admin" || user === "root" ? "admin" : "users";

    const written = this.fileSystem.write(item.fullPath, item.pythonCode, user, group, "644");
    if (written) {
      this.loggingSystem?.logFileAccess?.(item.fullPath, "created", "/programs/clawder-python");

      // Refresh files app if active
      if (this.getFilesApp) {
        const filesApp = this.getFilesApp();
        if (filesApp?.start) {
          filesApp.start();
        }
      }

      this.showToast(`✓ Successfully created ${item.fileName} in ${item.targetDir}`, "success");
      this.render();
    } else {
      this.showToast(`Error creating file in ${item.targetDir}`, "error");
    }
  }

  showToast(message, type = "info") {
    const toast = document.getElementById("clawder-toast-banner");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `clawder-toast clawder-toast-${type} active`;
    setTimeout(() => {
      if (toast) toast.className = `clawder-toast clawder-toast-${type}`;
    }, 4000);
  }

  render() {
    if (!this.container) return;

    if (this.currentView === "store") {
      this.renderStore();
    } else {
      this.renderDetails();
    }
  }

  renderStore() {
    const cardsHtml = this.items
      .map((item) => {
        const exists = this.checkFileExists(item);
        return `
          <div class="clawder-store-card">
            <div class="clawder-card-header">
              <div class="clawder-card-badge">${item.category}</div>
              ${
                exists
                  ? `<div class="clawder-status-pill exists" title="${item.fullPath} exists">✓ File Created (${item.fileName})</div>`
                  : `<div class="clawder-status-pill ready">Ready to Generate</div>`
              }
            </div>
            <h3 class="clawder-card-title">${item.buttonTitle}</h3>
            <p class="clawder-card-desc">${item.summary}</p>
            <div class="clawder-card-footer">
              <button class="clawder-btn-primary" data-clawder-item-id="${item.id}" id="clawder-btn-${item.id}">
                ${item.buttonTitle}
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    this.container.innerHTML = `
      <div class="clawder-store-view">
        <header class="clawder-store-hero">
          <div class="clawder-store-hero-meta">
            <span class="clawder-hero-tag">CLAWDER PYTHON 3 SCRIPT STORE</span>
            <h2 class="clawder-store-hero-title">Python Script Store & Prompt Library</h2>
            <p class="clawder-store-hero-subtitle">
              Select an automated tool prompt below to view the assistant prompt history, inspect the generated Python source, and create the file into your local system directory.
            </p>
          </div>
        </header>

        <div id="clawder-toast-banner" class="clawder-toast"></div>

        <section class="clawder-catalog-section">
          <div class="clawder-catalog-header">
            <span>Available Scripts (${this.items.length})</span>
            <small>Target Directory: <code>/documents/clawder-python/</code></small>
          </div>
          <div class="clawder-catalog-grid">
            ${cardsHtml}
          </div>
        </section>
      </div>
    `;
  }

  renderDetails() {
    const item = this.items.find((i) => i.id === this.activeItemId) || this.items[0];
    const fileExists = this.checkFileExists(item);
    const username = this.getActiveUser();

    // Setup initial HTML structure
    this.container.innerHTML = `
      <div class="clawder-details-view">
        <header class="clawder-details-header">
          <button id="clawder-back-btn" class="clawder-back-button" title="Return to store catalog">
            ← Back
          </button>
          <div class="clawder-details-title-area">
            <h3 class="clawder-details-title">${item.buttonTitle}</h3>
            <span class="clawder-details-dest">Destination: <code>${item.fullPath}</code></span>
          </div>
          <div class="clawder-details-actions">
            <button 
              id="clawder-create-file-btn" 
              class="clawder-btn-create ${fileExists ? 'disabled' : 'ready'}"
              data-item-id="${item.id}"
              ${fileExists ? 'disabled="true"' : ''}
              title="${fileExists ? 'File already exists in /documents/clawder-python/' : 'Generate file in /documents/clawder-python/'}">
              ${fileExists ? 'create .txt file (exists)' : 'create .txt file'}
            </button>
          </div>
        </header>

        <div id="clawder-toast-banner" class="clawder-toast"></div>

        <div class="clawder-chat-wrapper">
          <div class="clawder-chat-meta-bar">
            <div class="clawder-chat-model-info">
              <span class="clawder-bot-dot"></span>
              <strong>Clawder Assistant</strong>
              <span>Python 3 Code Synthesis</span>
            </div>
            <div class="clawder-chat-controls">
              ${!fileExists ? '<button id="clawder-skip-anim-btn" class="clawder-skip-btn" title="Skip animation">Skip Animation</button>' : ''}
            </div>
          </div>

          <div id="clawder-chat-scroll" class="clawder-chat-messages">
            <!-- Messages rendered here -->
          </div>
        </div>
      </div>
    `;

    const chatContainer = document.getElementById("clawder-chat-scroll");
    if (!chatContainer) return;

    if (fileExists) {
      // "Let's also ensure if the file already exists it does not create a new file and the animation of the chat does not need to occur, just the static messages from the user and the response from the chatbot can be on the details page."
      this.renderStaticChat(chatContainer, item, username);
    } else {
      // Animate user message followed by chatbot response
      this.runChatAnimation(chatContainer, item, username);
    }
  }

  renderStaticChat(container, item, username) {
    container.innerHTML = `
      <div class="clawder-message clawder-message-user">
        <div class="clawder-message-header">
          <div class="clawder-avatar-user">${username[0].toUpperCase()}</div>
          <strong class="clawder-message-author">${username}</strong>
          <span class="clawder-message-time">Prompt Request</span>
        </div>
        <div class="clawder-message-body user-body">
          <p class="clawder-prompt-quote">${this.escapeHtml(username)}: "${this.escapeHtml(item.userPromptText)}"</p>
        </div>
      </div>

      <div class="clawder-message clawder-message-bot">
        <div class="clawder-message-header">
          <div class="clawder-avatar-bot">C</div>
          <strong class="clawder-message-author">Clawder:</strong>
          <span class="clawder-bot-badge">Generated Code</span>
        </div>
        <div class="clawder-message-body bot-body">
          <div class="clawder-code-wrapper">
            <div class="clawder-code-topbar">
              <span class="clawder-code-filename">${item.scriptName}</span>
              <span class="clawder-code-lang">Python 3</span>
            </div>
            <pre class="clawder-code-pre"><code>${this.highlightPython(item.pythonCode)}</code></pre>
          </div>
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;
  }

  runChatAnimation(container, item, username) {
    this.clearTimers();
    this.isAnimating = true;

    // 1. Initial State: Empty container
    container.innerHTML = `
      <div id="clawder-anim-user-msg" class="clawder-message clawder-message-user">
        <div class="clawder-message-header">
          <div class="clawder-avatar-user">${username[0].toUpperCase()}</div>
          <strong class="clawder-message-author">${username}</strong>
          <span class="clawder-message-time">Prompt Request</span>
        </div>
        <div class="clawder-message-body user-body">
          <p class="clawder-prompt-quote" id="clawder-user-typed-text"></p>
        </div>
      </div>
      <div id="clawder-anim-bot-placeholder" class="clawder-message clawder-message-bot hidden">
        <div class="clawder-message-header">
          <div class="clawder-avatar-bot">C</div>
          <strong class="clawder-message-author">Clawder:</strong>
          <span class="clawder-thinking-indicator">
            <i></i><i></i><i></i> synthesizing script...
          </span>
        </div>
      </div>
      <div id="clawder-anim-bot-msg" class="clawder-message clawder-message-bot hidden">
        <div class="clawder-message-header">
          <div class="clawder-avatar-bot">C</div>
          <strong class="clawder-message-author">Clawder:</strong>
          <span class="clawder-bot-badge">Generated Code</span>
        </div>
        <div class="clawder-message-body bot-body">
          <div class="clawder-code-wrapper">
            <div class="clawder-code-topbar">
              <span class="clawder-code-filename">${item.scriptName}</span>
              <span class="clawder-code-lang">Python 3</span>
            </div>
            <pre class="clawder-code-pre"><code id="clawder-bot-code-stream"></code></pre>
          </div>
        </div>
      </div>
    `;

    const userTextElement = document.getElementById("clawder-user-typed-text");
    const botPlaceholder = document.getElementById("clawder-anim-bot-placeholder");
    const botMsg = document.getElementById("clawder-anim-bot-msg");
    const codeStream = document.getElementById("clawder-bot-code-stream");

    const fullUserText = `${username}: "${item.userPromptText}"`;
    let userIndex = 0;
    const userChunk = Math.max(3, Math.floor(fullUserText.length / 28));

    // Phase 1: Animate typing user prompt
    const userTimer = setInterval(() => {
      userIndex += userChunk;
      if (userIndex >= fullUserText.length) {
        userIndex = fullUserText.length;
        clearInterval(userTimer);
        userTextElement.textContent = fullUserText;

        // Phase 2: Show Clawder thinking
        botPlaceholder.classList.remove("hidden");
        container.scrollTop = container.scrollHeight;

        const thinkTimer = setTimeout(() => {
          botPlaceholder.classList.add("hidden");
          botMsg.classList.remove("hidden");

          // Phase 3: Stream Clawder Python code
          const lines = item.pythonCode.split("\n");
          let currentLineIdx = 0;
          let currentCode = "";

          const codeTimer = setInterval(() => {
            if (currentLineIdx < lines.length) {
              currentCode += lines[currentLineIdx] + "\n";
              currentLineIdx++;
              codeStream.innerHTML = this.highlightPython(currentCode) + '<span class="clawder-typing-cursor">▌</span>';
              container.scrollTop = container.scrollHeight;
            } else {
              clearInterval(codeTimer);
              codeStream.innerHTML = this.highlightPython(item.pythonCode);
              this.isAnimating = false;
              const skipBtn = document.getElementById("clawder-skip-anim-btn");
              if (skipBtn) skipBtn.style.display = "none";
            }
          }, 32);

          this.animationTimers.push(codeTimer);
        }, 500);

        this.animationTimers.push(thinkTimer);
      } else {
        userTextElement.textContent = fullUserText.slice(0, userIndex) + "▌";
      }
    }, 24);

    this.animationTimers.push(userTimer);
  }

  skipAnimation() {
    this.clearTimers();
    const item = this.items.find((i) => i.id === this.activeItemId) || this.items[0];
    const username = this.getActiveUser();
    const chatContainer = document.getElementById("clawder-chat-scroll");
    if (chatContainer) {
      this.renderStaticChat(chatContainer, item, username);
    }
    const skipBtn = document.getElementById("clawder-skip-anim-btn");
    if (skipBtn) skipBtn.style.display = "none";
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  highlightPython(code) {
    const escaped = this.escapeHtml(code);

    // Simple, clean syntax highlighter for display
    return escaped
      // Comments
      .replace(/(#.*$)/gm, '<span class="py-comment">$1</span>')
      // Strings (double quoted or f-strings)
      .replace(/(f?&quot;.*?&quot;)/g, '<span class="py-string">$1</span>')
      // Strings (single quoted)
      .replace(/(f?&#039;.*?&#039;)/g, '<span class="py-string">$1</span>')
      // Keywords
      .replace(
        /\b(import|def|return|if|else|elif|try|except|for|in|while|as|with|from|class|pass|break|continue|print)\b/g,
        '<span class="py-keyword">$1</span>'
      )
      // Builtins & Booleans
      .replace(/\b(True|False|None|len|open|Exception|sys|os|hashlib)\b/g, '<span class="py-builtin">$1</span>')
      // Function names
      .replace(/\bdef\s+([a-zA-Z0-9_]+)/g, 'def <span class="py-func">$1</span>');
  }
}
