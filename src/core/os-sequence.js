/**
 * Simulates OS boot, shutdown, and kernel panic sequences
 * Uses system-specific information to generate unique text for each OS
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulates OS sequence based on state and system name
 * @param {string} osName - Name of the operating system
 * @param {string} state - "on", "off", or "crash"
 * @param {function} print - Callback to render text to the virtual terminal
 */
async function simulateOSSequence(osName = "DemicubeOS", state = "on", print = console.log) {
  // ANSI color map for terminal rendering
  const c = {
    cyan: "\x1b[36m",
    mint: "\x1b[96m", // using bright cyan to approximate the #0df2c9 mint
    red: "\x1b[31m",
    green: "\x1b[32m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    reset: "\x1b[0m",
    white: "\x1b[37m",
    blue: "\x1b[44m", // blue background
    bgBlue: "\x1b[44m" // blue background for BSOD
  };

  const sysName = osName.toUpperCase();

  if (state === "on") {
    // Fast loading delay before starting (< 4 seconds total)
    const initialDelay = 300 + Math.random() * 200;
    await sleep(initialDelay);

    // 1. EFI header phase
    print(`${c.dim}${sysName}-EFI :: BOOT_TARGET_X86_64 | BUILD: 6.8.9-SECUREBOOT-ENFORCED${c.reset}`);
    print(`${c.cyan}${c.bold}${osName} v1.0.4 Enterprise Kernel Bootloader${c.reset}`);
    await sleep(200);
    print(`${c.mint}[MEM]${c.reset} Memory Verification: 65536MB OK`);
    print(`${c.mint}[CPU]${c.reset} Quantum Core x86_64 @ 4.20GHz (16 Cores, 32 Threads)`);
    print(`${c.mint}[SEC]${c.reset} AES-NI: Active | SMEP/SMAP: Enforced`);
    print("");
    
    // Pause before kernel phase
    const kernelDelay = 300 + Math.random() * 200;
    await sleep(kernelDelay);

    // 2. low level kernel logs
    const kLogs = [
      `Linux version 6.8.9-${osName.toLowerCase()}-hardened (root@build-matrix)`,
      `Command line: BOOT_IMAGE=/vmlinuz-6.8.9 ro quiet=0 splash=silent`,
      `secureboot: Secure boot enabled (mode 1: verified lockdown)`,
      `smpboot: CPU0: Quantum Core x86_64 (family: 0x6, model: 0xa5)`,
      `nvme0n1: p1 (EFI System Partition), p2 (Crypto LUKS Container)`,
      `cryptd: max_cpu_qlen set 2 1000 | Hardware crypto acceleration online`,
      `systemd[1]: Starting systemd-udevd.service...`
    ];

    let t = 0.0;
    for (const log of kLogs) {
      t += Math.random() * 0.05;
      print(`${c.dim}[ ${t.toFixed(6)}]${c.reset} ${log}`);
      await sleep(40 + Math.random() * 50);
    }
    print("");

    // Pause before session phase
    const sessionDelay = 300 + Math.random() * 200;
    await sleep(sessionDelay);

    // 3. systemd initialization OKs
    const services = [
      `Started Microcode Watchdog Daemon.`,
      `Reached target System Initialization.`,
      `Mounted /sys/kernel/security (SecurityFS Enclave).`,
      `Initialized Enclave Cryptographic Co-Processor [TPM 2.0 / SHA512].`,
      `Started Precision Audio Subsystem.`,
      `Switched root 2 /sysroot target successfully.`,
      `${c.cyan}${c.bold}Started ${osName} Display Server (Wayland / Neon compositor).${c.reset}`
    ];

    for (const svc of services) {
      print(`[  ${c.mint}OK${c.reset}  ] ${svc}`);
      await sleep(40 + Math.random() * 50);
    }
  } else if (state === "crash") {
    // Blue Screen of Death effect
    print("");
    print("");
    print(`${c.bgBlue}${c.white}${c.bold}A problem has been detected and the system has been shut down to prevent damage.${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.reset}`);
    print(`${c.bgBlue}${c.white}${osName} KERNEL PANIC${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.reset}`);
    print(`${c.bgBlue}${c.white}If this is the first time you've seen this stop error screen,${c.reset}`);
    print(`${c.bgBlue}${c.white}restart your computer. If this screen appears again, follow${c.reset}`);
    print(`${c.bgBlue}${c.white}these steps:${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.reset}`);
    print(`${c.bgBlue}${c.white}Check to make sure any new hardware or software is properly installed.${c.reset}`);
    print(`${c.bgBlue}${c.white}If this is a new installation, ask your hardware or software manufacturer${c.reset}`);
    print(`${c.bgBlue}${c.white}for any ${osName} updates you may need.${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.reset}`);
    print(`${c.bgBlue}${c.white}Technical information:${c.reset}`);
    print(`${c.bgBlue}${c.white}STOP: 0x0000007E (SYSTEM_THREAD_EXCEPTION_NOT_HANDLED)${c.reset}`);
    print(`${c.bgBlue}${c.white}SECURITY_VIOLATION: libenclave_crypto.so+0x4a9f${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.reset}`);
    print(`${c.bgBlue}${c.white}${c.bold}*** System halted for security enclave protection ***${c.reset}`);
    
    // Hold crash screen so total sequence duration is ~3x loading/dump duration (~4.5 seconds)
    await sleep(3000);
    
    print("");
    print(`${c.green}Automatic system recovery initiated. Rebooting...${c.reset}`);
  } else if (state === "off") {
    // 1. shutdown sequence
    print(`${c.cyan}Initiating ${osName} Shutdown Sequence...${c.reset}`);
    await sleep(300);

    const stopServices = [
      `Stopped Display Server.`,
      `Stopped Network Packet Inspection Daemon.`,
      `Stopped Enclave Cryptographic Co-Processor.`,
      `Stopped Microcode Watchdog Daemon.`,
      `Unmounted /sys/kernel/security.`
    ];

    for (const svc of stopServices) {
      print(`[  ${c.cyan}OK${c.reset}  ] ${svc}`);
      await sleep(100 + Math.random() * 150);
    }

    print("");
    print(`${c.dim}Sending SIGTERM 2 all processes...${c.reset}`);
    await sleep(400);
    print(`${c.dim}Sending SIGKILL 2 remaining processes...${c.reset}`);
    await sleep(200);
    print(`${c.dim}Unmounting filesystems...${c.reset}`);
    print(`[  ${c.cyan}OK${c.reset}  ] Reached target Shutdown.`);
    await sleep(600);
    print(`${c.dim}[  24.198302] reboot: Power down${c.reset}`);
  }
}

export class OSSequence {
  constructor(systemDefinition) {
    this.systemDefinition = systemDefinition;
    this.osName = systemDefinition?.os?.name || "DemicubeOS";
    this.totalRam = systemDefinition?.ramMb || 16384;
  }

  /**
   * Run boot sequence
   */
  async runBoot(ui) {
    return simulateOSSequence(this.osName, "on", (text) => ui.appendBootLine(text));
  }

  /**
   * Run shutdown sequence
   */
  async runShutdown(ui) {
    return simulateOSSequence(this.osName, "off", (text) => ui.appendBootLine(text));
  }

  /**
   * Run crash/panic sequence with BSOD screen
   */
  async runCrash(ui, options = {}) {
    const totalMem = options.totalMem || this.totalRam || 16384;
    ui.showCrashScreen(this.osName, { ...options, totalMem });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    
    // Simulate memory dump progression
    // 50 steps at 40ms = 2000ms (2.0 seconds) for the loading bar to complete
    const stepInterval = 40;
    const loadBarDuration = 50 * stepInterval; // 2000ms
    for (let p = 0; p <= 100; p += 2) {
      const dumped = Math.floor((p / 100) * totalMem);
      ui.updateCrashDump(p, dumped, totalMem);
      await sleep(stepInterval);
    }
    
    // Hold crash screen so total BSOD screen is ~3x as long as the loading bar took to complete
    // (1x loading bar duration + 2x hold duration = 3x total screen duration: 6.0 seconds total, max 8.0s)
    const holdDuration = loadBarDuration * 2; // 4000ms
    await sleep(holdDuration);
    
    // Automatically transition to boot screen so BSOD screen never leaks into boot time
    ui.showBootScreen();
  }
}
