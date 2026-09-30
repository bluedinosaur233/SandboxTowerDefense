/** One-shot entrances, separate from each panel's responsive layout transform. */
export class HudEntry {
  private animations = new Set<Animation>();

  constructor(private root: HTMLElement) {}

  cancel() {
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
  }

  play() {
    this.cancel();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panels = [
      ['.identity', 'left', 0],
      ['.resource-bar', 'top', 50],
      ['.top-actions', 'right', 100],
      ['.objective', 'left', 130],
      ['.build-dock', 'bottom', 170],
      ['.wave-panel', 'right', 230],
      ['.camera-hint', 'left', 260],
      ['#map-labels, #battle-sites, .version', 'fade', 350],
    ] as const;
    for (const [selector, edge, delay] of panels) {
      for (const element of this.root.querySelectorAll<HTMLElement>(selector)) {
        if (getComputedStyle(element).display === 'none') continue;
        const rect = element.getBoundingClientRect();
        const x = edge === 'left' ? -rect.right - 24 : edge === 'right' ? innerWidth - rect.left + 24 : 0;
        const y = edge === 'top' ? -rect.bottom - 24 : edge === 'bottom' ? innerHeight - rect.top + 24 : 0;
        const opacity = getComputedStyle(element).opacity;
        const frames: Keyframe[] = reduced || edge === 'fade'
          ? [{ opacity: 0 }, { opacity }]
          : [
            { translate: `${x}px ${y}px`, opacity: 0, offset: 0, easing: 'cubic-bezier(.18,.78,.25,1)' },
            { translate: `${-Math.sign(x) * 7}px ${-Math.sign(y) * 7}px`, opacity, offset: .76, easing: 'ease-out' },
            { translate: '0px 0px', opacity, offset: 1 },
          ];
        const animation = element.animate(frames, {
          duration: reduced ? 160 : edge === 'fade' ? 320 : 620,
          delay: reduced ? 0 : delay,
          fill: 'backwards',
        });
        this.animations.add(animation);
        animation.onfinish = () => this.animations.delete(animation);
      }
    }
  }
}
