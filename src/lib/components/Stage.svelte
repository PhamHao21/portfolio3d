<script>
  import { untrack } from 'svelte';
  import { createStage } from '$lib/three/scene.js';

  let {
    count = 4,
    onProgress,
    onReady,
    onError,
    onChange,
    onSelect,
    // Mat context va phai dung lai canh tu dau: trang thai ve lai nhu luc moi tai.
    onRestart
  } = $props();

  // Cho trinh duyet tu khoi phuc context truoc khi tu dung canvas moi.
  const RESTORE_WAIT_MS = 2500;

  let canvas = $state();
  let gen = $state(0); // doi gia tri -> {#key} tao canvas moi -> $effect dung lai canh
  let stage;
  let stats = $state({ fps: 0, calls: 0, tris: 0, loadMs: 0 });
  // Thong so FPS / draw call chi hien khi mo trang voi ?stats (de do hieu nang).
  const showStats = new URLSearchParams(location.search).has('stats');

  // Cho UI HTML (nut slot) goi vao dia.
  export function select(i) {
    stage?.select(i);
  }

  export function setDetail(on) {
    stage?.setDetail(on);
  }

  // Chi phu thuoc vao `canvas`: moi canvas moi (lan dau hoac sau khi mat context)
  // dung 1 canh moi. Phan con lai chay trong untrack de callback khong keo theo phu thuoc.
  $effect(() => {
    const el = canvas;
    if (!el) return;
    let s;
    let restoreTimer;
    untrack(() => {
      try {
        s = createStage(el, {
          count,
          onProgress: (...a) => onProgress?.(...a),
          onReady: () => onReady?.(),
          onError: (m) => onError?.(m),
          onChange: (i) => onChange?.(i),
          onSelect: (id, i) => onSelect?.(id, i),
          onStats: (st) => showStats && (stats = { ...stats, ...st }),
          onContextLost: () => {
            console.warn('WebGL context lost, dang cho khoi phuc...');
            clearTimeout(restoreTimer);
            restoreTimer = setTimeout(() => {
              // Trinh duyet khong tra lai context: bo canvas nay, dung canh moi.
              onRestart?.();
              gen++;
            }, RESTORE_WAIT_MS);
          },
          onContextRestored: () => clearTimeout(restoreTimer)
        });
        stage = s;
      } catch (err) {
        console.error(err);
        onError?.(
          'Trình duyệt đang chặn WebGL cho trang này sau khi GPU bị reset. Hãy tắt hẳn trình duyệt (mọi cửa sổ) rồi mở lại.'
        );
      }
    });
    return () => {
      clearTimeout(restoreTimer);
      s?.dispose();
      if (stage === s) stage = null;
    };
  });
</script>

{#key gen}
  <canvas bind:this={canvas}></canvas>
{/key}

{#if showStats}
  <div class="stats" aria-hidden="true">
    {stats.fps} FPS / {stats.calls} DC / {stats.tris.toLocaleString('en-US')} TRI / {stats.loadMs} MS
  </div>
{/if}

<style>
  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .stats {
    position: absolute;
    top: 14px;
    left: 50%;
    translate: -50% 0;
    font: 500 11px/1 var(--mono);
    letter-spacing: 0.04em;
    color: var(--ink-soft);
    pointer-events: none;
  }
</style>
