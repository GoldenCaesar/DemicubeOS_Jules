export class MusicPlayerApp {
  constructor({ ui, fileSystem }) {
    this.ui = ui;
    this.fileSystem = fileSystem;
    this.currentPath = null;
    this.objectUrl = null;
    this.shuffleEnabled = false;
    this.repeatEnabled = false;
    this.audio = new Audio();
    this.audio.volume = 0.82;
    this.audio.addEventListener("pause", () => {
      if (this.currentPath) this.ui.musicStatus("Paused: " + this.fileSystem.resolve(this.currentPath).name);
      this.syncControls();
    });
    this.audio.addEventListener("play", () => this.syncControls());
    this.audio.addEventListener("error", () => this.ui.musicStatus("Unable to play this MP3 in the current browser."));
    this.audio.addEventListener("ended", () => this.repeatEnabled ? this.play(this.currentPath) : this.next());
  }

  start() {
    this.ui.showMusicPlayer();
    this.refresh();
    this.loadWorkspaceDemos();
  }

  refresh() {
    const tracks = (this.fileSystem.list("/music") || []).filter((entry) => entry.format === "audio");
    this.ui.renderMusicTracks(tracks, this.currentPath);
  }

  async loadWorkspaceDemos() {
    for (const name of ["song1.mp3", "song2.mp3"]) {
      try {
        const response = await fetch("./music/" + name);
        if (response.ok) {
          this.fileSystem.addAudioFile(name, await response.blob());
        }
      } catch {
        // Local file pages may not permit fetch; the file picker remains available.
      }
    }
    this.refresh();
  }

  upload(files) {
    for (const file of files) {
      if (file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3")) {
        this.fileSystem.addAudioFile(file.name, file);
      }
    }
    this.refresh();
  }

  play(path) {
    const node = this.fileSystem.resolve(path);
    if (!node || node.format !== "audio") {
      this.ui.musicStatus("Select an MP3 file to play it.");
      return false;
    }
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = node.blob ? URL.createObjectURL(node.blob) : null;
    this.audio.src = this.objectUrl || node.source;
    this.currentPath = path;
    this.ui.renderMusicTracks(this.fileSystem.list("/music"), path);
    const playRequest = this.audio.play();
    if (playRequest) playRequest.catch(() => this.ui.musicStatus("Playback was blocked; press the track again to retry."));
    this.ui.musicStatus("Now playing: " + node.name);
    this.syncControls();
    return true;
  }

  pause() {
    if (this.audio.paused) {
      const playRequest = this.audio.play();
      if (playRequest) playRequest.catch(() => this.ui.musicStatus("Playback was blocked; press the track again to retry."));
    } else {
      this.audio.pause();
    }
  }

  previous() {
    this.selectRelativeTrack(-1);
  }

  next() {
    this.selectRelativeTrack(1);
  }

  selectRelativeTrack(direction) {
    const tracks = (this.fileSystem.list("/music") || []).filter((entry) => entry.format === "audio");
    if (!tracks.length) return;
    const currentIndex = Math.max(0, tracks.findIndex((track) => track.path === this.currentPath));
    const nextIndex = this.shuffleEnabled
      ? Math.floor(Math.random() * tracks.length)
      : (currentIndex + direction + tracks.length) % tracks.length;
    this.play(tracks[nextIndex].path);
  }

  toggleShuffle() {
    this.shuffleEnabled = !this.shuffleEnabled;
    this.ui.musicStatus(this.shuffleEnabled ? "Shuffle enabled" : "Shuffle disabled");
    this.syncControls();
  }

  toggleRepeat() {
    this.repeatEnabled = !this.repeatEnabled;
    this.ui.musicStatus(this.repeatEnabled ? "Repeat enabled" : "Repeat disabled");
    this.syncControls();
  }

  seek(percent) {
    if (this.audio.duration) this.audio.currentTime = this.audio.duration * Number(percent) / 100;
  }

  setVolume(value) {
    this.audio.volume = Number(value);
  }

  filter() {
    this.refresh();
  }

  syncControls() {
    this.ui.updateMusicControls({ playing: !this.audio.paused, shuffle: this.shuffleEnabled, repeat: this.repeatEnabled });
  }

  stop() {
    this.audio.pause();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.audio.removeAttribute("src");
    this.audio.load();
    this.currentPath = null;
    this.ui.musicStatus("No track selected");
  }
}