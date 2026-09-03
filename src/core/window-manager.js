export class WindowManager {
  constructor(windowIds, onFocusChanged) {
    this.windowIds = windowIds;
    this.activeIndex = 0;
    this.onFocusChanged = onFocusChanged;
    this.isAvailable = () => true;

    if (this.windowIds.length > 0) {
      this.onFocusChanged(this.getActiveWindowId());
    }
  }

  getActiveWindowId() {
    if (this.activeIndex < 0 || this.windowIds.length === 0) {
      return null;
    }
    return this.windowIds[this.activeIndex];
  }

  cycleNext() {
    const nextIndex = this.findNextIndex(1);
    if (nextIndex === -1) {
      return;
    }
    this.activeIndex = nextIndex;
    this.onFocusChanged(this.getActiveWindowId());
  }

  cyclePrevious() {
    const nextIndex = this.findNextIndex(-1);
    if (nextIndex === -1) {
      return;
    }
    this.activeIndex = nextIndex;
    this.onFocusChanged(this.getActiveWindowId());
  }

  focus(windowId) {
    const nextIndex = this.windowIds.indexOf(windowId);
    if (nextIndex === -1 || !this.isAvailable(windowId)) {
      return false;
    }
    this.activeIndex = nextIndex;
    this.onFocusChanged(this.getActiveWindowId());
    return true;
  }

  setAvailabilityChecker(checker) {
    this.isAvailable = checker;
  }

  findNextIndex(direction) {
    if (this.windowIds.length === 0) return -1;
    for (let offset = 1; offset <= this.windowIds.length; offset += 1) {
      const index = (this.activeIndex + direction * offset + this.windowIds.length) % this.windowIds.length;
      if (this.isAvailable(this.windowIds[index])) return index;
    }
    return -1;
  }

  blur() {
    this.activeIndex = -1;
    this.onFocusChanged(null);
  }

  add(windowId) {
    if (!this.windowIds.includes(windowId)) this.windowIds.push(windowId);
  }

  reset(windowIds) {
    this.windowIds = windowIds;
    this.activeIndex = 0;
    if (this.windowIds.length > 0) this.onFocusChanged(this.getActiveWindowId());
  }

  remove(windowId) {
    const index = this.windowIds.indexOf(windowId);
    if (index === -1) return false;
    const wasActive = this.activeIndex === index;
    this.windowIds.splice(index, 1);
    if (this.windowIds.length === 0) {
      this.activeIndex = -1;
      this.onFocusChanged(null);
      return true;
    }

    if (this.activeIndex > index) this.activeIndex -= 1;
    if (wasActive || !this.isAvailable(this.getActiveWindowId())) {
      const nextIndex = this.findIndexFrom(index % this.windowIds.length, 1);
      this.activeIndex = nextIndex === -1 ? -1 : nextIndex;
      this.onFocusChanged(this.getActiveWindowId());
    }
    return true;
  }

  findIndexFrom(startIndex, direction) {
    for (let offset = 0; offset < this.windowIds.length; offset += 1) {
      const index = (startIndex + direction * offset + this.windowIds.length) % this.windowIds.length;
      if (this.isAvailable(this.windowIds[index])) return index;
    }
    return -1;
  }

  describeWindows() {
    return this.windowIds.join(", ");
  }
}
