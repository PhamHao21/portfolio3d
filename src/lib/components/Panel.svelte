<script>
  // Panel co 2 trang thai dung chung 1 khung nen:
  // - gon: tom tat + nut "More", nam sat phai.
  // - chi tiet: khung gian sang trai chiem ~62vw, noi dung cuon ben trong.
  // Khung nen gian ra bang clip-path (khong doi layout) nen chu khong bi reflow giua chung.
  // Noi dung tung muc nam o panels/*Panel.svelte (mode compact / full).
  import { scramble } from '$lib/ui/scramble.js';
  import { PANELS } from './panels/index.js';
  import './panels/panel-ui.css';

  let { section, index = 0, total = 4, open = false, detail = false, onMore, onClose } = $props();

  const code = (i) => String(i + 1).padStart(2, '0');
  const Content = $derived(PANELS[section?.id]);

  let moreBtn = $state();
  let closeBtn = $state();
  let scroller = $state();

  // Mo chi tiet: cuon ve dau + focus nut Dong. Dong: tra focus ve nut More.
  $effect(() => {
    if (detail) {
      if (scroller) scroller.scrollTop = 0;
      closeBtn?.focus({ preventScroll: true });
    } else if (document.activeElement === closeBtn) moreBtn?.focus({ preventScroll: true });
  });
</script>

<aside class="panel" class:open class:detail aria-label={section?.label}>
  <!-- Duong mach noi tu panel ve nhan vat dang chon. -->
  <svg class="trace" viewBox="0 0 170 70" aria-hidden="true">
    <polyline points="170,10 110,10 70,50 14,50" />
    <circle cx="10" cy="50" r="4" />
    <rect x="166" y="6" width="8" height="8" />
  </svg>

  <div class="shell" aria-hidden="true"></div>

  <!-- Trang thai gon -->
  <div class="compact" inert={detail}>
    {#key section?.id}
      <header>
        <div class="idx"><span>{code(index)}</span><small>/{code(total - 1)}</small></div>
        <h2 use:scramble={section?.label ?? ''} aria-label={section?.label}></h2>
      </header>
      <div class="summary">
        {#if Content}<Content mode="compact" />{/if}
      </div>
    {/key}
    <div class="actions">
      <button bind:this={moreBtn} type="button" class="more" onclick={() => onMore?.()}>
        <span>More</span>
        <kbd>Enter</kbd>
      </button>
    </div>
  </div>

  <!-- Trang thai chi tiet -->
  <div class="full" inert={!detail} aria-hidden={!detail}>
    <header>
      <div class="idx"><span>{code(index)}</span><small>/{code(total - 1)}</small></div>
      <h2 use:scramble={section?.label ?? ''} aria-label={section?.label}></h2>
      <button bind:this={closeBtn} type="button" class="close" onclick={() => onClose?.()}>
        <span>Đóng</span>
        <kbd>Esc</kbd>
      </button>
    </header>
    <div class="scroll" bind:this={scroller}>
      {#if Content}<Content mode="full" />{/if}
    </div>
  </div>
</aside>

<style>
  .panel {
    --cw: var(--compact-w); /* be rong trang thai gon */
    --cut: 24px;
    position: relative;
    height: 100%;
    pointer-events: none;
    filter: drop-shadow(0 18px 40px rgb(23 24 27 / 0.12));
    opacity: 0;
    translate: 28px 0;
    transition:
      opacity 0.35s var(--ease),
      translate 0.45s var(--ease);
  }
  .panel.open,
  .panel.detail {
    opacity: 1;
    translate: 0 0;
  }

  /* Khung nen: phu kin panel-slot, clip-path cat con be rong gon o ben phai. */
  .shell {
    position: absolute;
    inset: 0;
    background: var(--paper);
    clip-path: polygon(
      calc(100% - var(--cw) + var(--cut)) 0,
      100% 0,
      100% calc(100% - var(--cut)),
      calc(100% - var(--cut)) 100%,
      calc(100% - var(--cw)) 100%,
      calc(100% - var(--cw)) var(--cut)
    );
    transition: clip-path var(--detail-ms) var(--ease-io);
  }
  .detail .shell {
    clip-path: polygon(
      var(--cut) 0,
      100% 0,
      100% calc(100% - var(--cut)),
      calc(100% - var(--cut)) 100%,
      0 100%,
      0 var(--cut)
    );
  }

  /* --- Chung --- */
  /* Tam tieu de toi: tach tieu de khoi noi dung bang mau thay vi ke vach.
     Goc tren-trai vat trung goc khung panel, goc duoi-phai vat nho. */
  header {
    position: relative;
    display: grid;
    gap: 6px;
    padding: 28px 32px 26px;
    color: var(--paper);
    isolation: isolate;
  }
  header::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--ink);
    clip-path: polygon(
      var(--cut) 0,
      100% 0,
      100% calc(100% - 16px),
      calc(100% - 16px) 100%,
      0 100%,
      0 var(--cut)
    );
    transform-origin: left;
  }
  /* Tam toi quet vao tu trai moi khi doi muc (header nam trong {#key}). */
  .compact header::before {
    animation: wipe 0.45s var(--ease) both;
  }
  .detail .full header::before {
    animation: wipe 0.5s var(--ease) both calc(var(--detail-ms) * 0.45);
  }
  .idx {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font: 600 14px/1 var(--mono);
  }
  .idx span {
    padding: 5px 8px;
    background: var(--accent);
    color: var(--ink);
  }
  .idx small {
    font-size: 12px;
    color: color-mix(in srgb, var(--paper) 60%, transparent);
  }
  h2 {
    margin: 0;
    font: 700 clamp(48px, 5vw, 72px)/0.95 var(--cond);
    letter-spacing: -0.01em;
    text-transform: uppercase;
    color: var(--paper);
  }
  kbd {
    display: inline-grid;
    place-items: center;
    height: 20px;
    padding: 0 6px;
    border: 1px solid currentColor;
    font: 600 10px/1 var(--mono);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  /* --- Trang thai gon --- */
  .compact {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--cw);
    display: grid;
    grid-template-rows: auto 1fr auto;
    pointer-events: auto;
    transition:
      opacity 0.3s var(--ease) calc(var(--detail-ms) * 0.55),
      translate 0.5s var(--ease) calc(var(--detail-ms) * 0.55);
  }
  .detail .compact {
    opacity: 0;
    translate: -24px 0;
    pointer-events: none;
    transition:
      opacity 0.18s linear,
      translate 0.3s var(--ease);
  }
  .summary {
    padding: 26px 32px;
    overflow: hidden;
  }
  /* Cac khoi noi dung (.rv, dat trong panels/*) hien lan luot tu duoi len. */
  .summary :global(.rv) {
    animation: rise 0.5s var(--ease) both;
    animation-delay: calc(var(--i, 0) * 60ms + 120ms);
  }
  .actions {
    padding: 0 32px 30px;
  }
  .more {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    height: 48px;
    padding: 0 18px 0 22px;
    border: 0;
    background: var(--ink);
    color: var(--accent);
    font: 700 22px/1 var(--cond);
    letter-spacing: 0.03em;
    text-transform: uppercase;
    cursor: pointer;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
    transition:
      translate 0.2s var(--ease),
      background-color 0.2s var(--ease);
  }
  .more kbd {
    color: var(--paper);
    opacity: 0.7;
  }
  .more:hover {
    translate: 4px 0;
  }
  .more:active {
    translate: 4px 1px;
  }
  .more:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }
  .close:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  /* --- Trang thai chi tiet --- */
  .full {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-rows: auto 1fr;
    opacity: 0;
    translate: 40px 0;
    pointer-events: none;
    transition:
      opacity 0.18s linear,
      translate 0.3s var(--ease);
  }
  .detail .full {
    opacity: 1;
    translate: 0 0;
    pointer-events: auto;
    transition:
      opacity 0.35s var(--ease) calc(var(--detail-ms) * 0.5),
      translate 0.6s var(--ease) calc(var(--detail-ms) * 0.5);
  }
  .full header {
    grid-template-columns: 1fr auto;
    padding: 34px 44px 24px 56px;
  }
  .full header .idx,
  .full header h2 {
    grid-column: 1;
  }
  .full h2 {
    font-size: clamp(56px, 6vw, 96px);
  }
  .close {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 12px 0 16px;
    border: 1px solid color-mix(in srgb, var(--paper) 70%, transparent);
    background: transparent;
    color: var(--paper);
    font: 700 18px/1 var(--cond);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      background-color 0.2s var(--ease),
      color 0.2s var(--ease),
      border-color 0.2s var(--ease);
  }
  .close:hover {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--ink);
  }
  .scroll {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 34px 44px 56px 56px;
    scrollbar-width: thin;
    scrollbar-color: var(--ink) transparent;
  }
  /* Noi dung chi tiet hien lan luot sau khi khung nen da gian ra. */
  .detail .scroll :global(.rv) {
    animation: rise 0.6s var(--ease) both;
    animation-delay: calc(var(--detail-ms) * 0.55 + var(--i, 0) * 70ms);
  }

  /* --- Duong mach --- */
  .trace {
    position: absolute;
    top: 50%;
    right: var(--cw);
    width: 170px;
    height: 70px;
    overflow: visible;
  }
  .trace polyline {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.5;
    stroke-dasharray: 200;
    stroke-dashoffset: 200;
    transition: stroke-dashoffset 0.6s var(--ease) 0.15s;
  }
  .trace circle {
    fill: var(--accent);
    stroke: var(--ink);
    stroke-width: 1.5;
    opacity: 0;
    transition: opacity 0.2s linear 0.65s;
  }
  .trace rect {
    fill: var(--ink);
  }
  .open .trace polyline {
    stroke-dashoffset: 0;
  }
  .open .trace circle {
    opacity: 1;
  }
  /* Khi mo chi tiet, duong mach rut lai truoc de khung nen gian ra. */
  .detail .trace polyline {
    stroke-dashoffset: 200;
    transition-delay: 0s;
    transition-duration: 0.25s;
  }
  .detail .trace circle,
  .detail .trace rect {
    opacity: 0;
    transition: opacity 0.1s linear;
  }

  @keyframes wipe {
    from {
      transform: scaleX(0);
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel,
    .shell,
    .compact,
    .full,
    .trace polyline,
    .trace circle {
      transition: none !important;
    }
    .summary :global(.rv),
    .scroll :global(.rv),
    header::before {
      animation: none !important;
    }
  }
</style>
