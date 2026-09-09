export function isIOSFamily() {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const classicIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const desktopModeIPad = platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return classicIOS || desktopModeIPad;
}

export function getViewportSize() {
  const visualViewport = window.visualViewport;
  const width = Math.max(
    1,
    Math.round(visualViewport?.width || document.documentElement.clientWidth || window.innerWidth || 1),
  );
  const height = Math.max(
    1,
    Math.round(visualViewport?.height || document.documentElement.clientHeight || window.innerHeight || 1),
  );
  return { width, height };
}

export function getSafePixelRatio() {
  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  return Math.min(devicePixelRatio, isIOSFamily() ? 1.5 : 2);
}

/**
 * Mở diagnostics bằng cách thêm `?diagnostics=1` vào URL GitHub Pages.
 * Overlay này không xuất hiện với người chơi bình thường.
 */
export class DeviceDiagnostics {
  constructor({ renderer, audio, speech, viewport }) {
    this.renderer = renderer;
    this.audio = audio;
    this.speech = speech;
    this.viewport = viewport;
    this.root = null;
    this.pre = null;
    this.intervalId = null;
  }

  shouldMount() {
    return new URLSearchParams(window.location.search).get('diagnostics') === '1';
  }

  mount() {
    if (!this.shouldMount() || this.root) return;

    const root = document.createElement('section');
    root.setAttribute('aria-label', 'Device diagnostics');
    Object.assign(root.style, {
      position: 'fixed',
      zIndex: '10000',
      left: 'max(10px, env(safe-area-inset-left))',
      right: 'max(10px, env(safe-area-inset-right))',
      bottom: 'max(10px, env(safe-area-inset-bottom))',
      maxHeight: '48vh',
      overflow: 'auto',
      padding: '12px',
      borderRadius: '16px',
      background: 'rgba(20, 27, 42, 0.94)',
      color: '#f7fbff',
      font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace',
      boxShadow: '0 10px 32px rgba(0,0,0,.28)',
      pointerEvents: 'auto',
      WebkitUserSelect: 'text',
      userSelect: 'text',
    });

    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
      fontWeight: '800',
    });
    toolbar.textContent = 'FamilyGame Device Diagnostics';

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '✕';
    Object.assign(close.style, {
      minWidth: '44px',
      minHeight: '44px',
      border: '0',
      borderRadius: '12px',
      background: '#fff',
      color: '#26324a',
      fontWeight: '900',
    });
    close.addEventListener('click', () => this.dispose());
    toolbar.append(close);

    const pre = document.createElement('pre');
    Object.assign(pre.style, {
      margin: '0',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    });

    root.append(toolbar, pre);
    document.body.append(root);

    this.root = root;
    this.pre = pre;
    this.refresh();
    this.intervalId = window.setInterval(() => this.refresh(), 1200);
  }

  refresh() {
    if (!this.pre) return;

    const visualViewport = window.visualViewport;
    const lines = [
      `iOS/iPadOS: ${isIOSFamily()}`,
      `User agent: ${navigator.userAgent}`,
      `Platform: ${navigator.platform || 'n/a'}`,
      `Touch points: ${navigator.maxTouchPoints || 0}`,
      `PointerEvent: ${'PointerEvent' in window}`,
      `WebGL2: ${Boolean(this.renderer?.capabilities?.isWebGL2)}`,
      `DPR: ${window.devicePixelRatio || 1} → renderer ${this.renderer?.getPixelRatio?.() ?? 'n/a'}`,
      `Viewport: ${this.viewport.width} × ${this.viewport.height}`,
      `Visual viewport: ${Math.round(visualViewport?.width || 0)} × ${Math.round(visualViewport?.height || 0)}`,
      `AudioContext supported: ${Boolean(window.AudioContext || window.webkitAudioContext)}`,
      `Audio state: ${this.audio?.context?.state || 'not-created'}`,
      `Audio enabled: ${Boolean(this.audio?.enabled)}`,
      `Speech supported: ${Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)}`,
      `Speech enabled: ${Boolean(this.speech?.enabled)}`,
      `Speech voices: ${this.speech?.voices?.length ?? 0}`,
      `Visibility: ${document.visibilityState}`,
      `Orientation: ${screen.orientation?.type || window.orientation || 'n/a'}`,
    ];

    this.pre.textContent = lines.join('\n');
  }

  dispose() {
    window.clearInterval(this.intervalId);
    this.intervalId = null;
    this.root?.remove();
    this.root = null;
    this.pre = null;
  }
}
