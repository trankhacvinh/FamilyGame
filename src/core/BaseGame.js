import { ResourceTracker } from './ResourceTracker.js';

/**
 * Base class cho mọi game 2D/3D.
 * Mỗi game có AbortController và ResourceTracker riêng để cleanup thống nhất.
 */
export class BaseGame {
  constructor(context) {
    this.context = context;
    this.resources = new ResourceTracker();
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;
    this.scene = null;
    this.camera = null;
    this.disposed = false;
  }

  track(resource) {
    return this.resources.track(resource);
  }

  trackObject(object) {
    return this.resources.trackObject(object);
  }

  init() {}

  update() {}

  resize() {}

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abortController.abort();
    this.resources.dispose();
    this.scene = null;
    this.camera = null;
  }
}
