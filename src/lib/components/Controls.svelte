<script>
  // Cum dieu khien duy nhat cua man chon: mui ten doi muc + SELECT mo chi tiet.
  let { onPrev, onNext, onSelect, disabled = false, canSelect = true } = $props();
</script>

<div class="controls" role="group" aria-label="Điều khiển">
  <button type="button" class="arrow prev" aria-label="Mục trước" {disabled} onclick={() => onPrev?.()}>
    <span class="chev" aria-hidden="true"></span>
  </button>

  <button type="button" class="select" disabled={disabled || !canSelect} onclick={() => onSelect?.()}>
    <span class="label">Select</span>
    <kbd>Enter</kbd>
  </button>

  <button type="button" class="arrow next" aria-label="Mục sau" {disabled} onclick={() => onNext?.()}>
    <span class="chev" aria-hidden="true"></span>
  </button>
</div>

<style>
  .controls {
    display: flex;
    align-items: stretch;
    gap: 8px;
    height: 58px;
  }
  button {
    position: relative;
    border: 0;
    cursor: pointer;
    transition:
      translate 0.2s var(--ease),
      background-color 0.2s var(--ease),
      color 0.2s var(--ease),
      opacity 0.2s var(--ease);
  }
  button:disabled {
    cursor: default;
    opacity: 0.45;
  }
  button:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 3px;
  }

  /* --- Mui ten --- */
  .arrow {
    width: 58px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: inset 0 0 0 1.5px var(--ink);
  }
  .prev {
    clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%, 0 14px);
  }
  .next {
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%);
  }
  .chev {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 12px;
    height: 12px;
    border-left: 3px solid currentColor;
    border-bottom: 3px solid currentColor;
  }
  .prev .chev {
    translate: -30% -50%;
    rotate: 45deg;
  }
  .next .chev {
    translate: -70% -50%;
    rotate: -135deg;
  }
  .arrow:not(:disabled):hover {
    background: var(--accent);
  }
  .prev:not(:disabled):hover {
    translate: -3px 0;
  }
  .next:not(:disabled):hover {
    translate: 3px 0;
  }
  .arrow:not(:disabled):active {
    translate: 0 1px;
  }

  /* --- Select --- */
  .select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    min-width: 214px;
    padding: 0 16px 0 24px;
    overflow: hidden;
    background: var(--ink);
    color: var(--accent);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
  }
  .label {
    font: 700 28px/1 var(--cond);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  kbd {
    display: inline-grid;
    place-items: center;
    height: 22px;
    padding: 0 7px;
    border: 1px solid currentColor;
    color: var(--paper);
    opacity: 0.7;
    font: 600 10px/1 var(--mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  /* Vet sang quet qua khi re chuot: phan hoi "nut nay bam duoc". */
  .select::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgb(242 212 12 / 0.35) 50%, transparent 70%);
    translate: -100% 0;
    pointer-events: none;
  }
  .select:not(:disabled):hover::after {
    translate: 100% 0;
    transition: translate 0.6s var(--ease);
  }
  .select:not(:disabled):active {
    translate: 0 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    button,
    .select::after {
      transition: none !important;
    }
  }
</style>
