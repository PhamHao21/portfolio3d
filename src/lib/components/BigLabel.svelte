<script>
  // Ten muc co lon phia sau canh, doi theo muc dang chon.
  import { fade } from 'svelte/transition';

  let { label = '', index = 0 } = $props();
  const code = (i) => String(i + 1).padStart(2, '0');
</script>

<div class="big" aria-hidden="true">
  {#key label}
    <div class="item" out:fade={{ duration: 160 }}>
      <div class="meta">
        <span class="idx">{code(index)}</span>
        <span class="rule"></span>
      </div>
      <div class="word">{label}</div>
    </div>
  {/key}
</div>

<style>
  .big {
    position: absolute;
    top: 96px;
    left: 32px;
    pointer-events: none;
    user-select: none;
  }
  .item {
    position: absolute;
    top: 0;
    left: 0;
    white-space: nowrap;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
    width: min(46vw, 620px);
  }
  .idx {
    padding: 4px 8px;
    background: var(--ink);
    color: var(--accent);
    font: 600 13px/1 var(--mono);
  }
  .rule {
    flex: 1;
    height: 1px;
    background: color-mix(in srgb, var(--ink) 25%, transparent);
    transform-origin: left;
    animation: grow 0.8s var(--ease) both 0.1s;
  }
  /* Chu vien rong, lo ra tu trai sang phai. */
  .word {
    margin-top: 6px;
    font: 700 clamp(120px, 15vw, 240px)/0.82 var(--cond);
    letter-spacing: -0.01em;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-stroke: 1.5px color-mix(in srgb, var(--ink) 18%, transparent);
    animation: reveal 0.8s var(--ease) both;
  }

  @keyframes reveal {
    from {
      clip-path: inset(0 100% 0 0);
      translate: 48px 0;
    }
    to {
      clip-path: inset(0 0 0 0);
      translate: 0 0;
    }
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .word,
    .rule {
      animation: none;
    }
  }
</style>
