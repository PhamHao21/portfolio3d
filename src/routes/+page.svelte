<script>
  import Stage from '$lib/components/Stage.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import Controls from '$lib/components/Controls.svelte';
  import BigLabel from '$lib/components/BigLabel.svelte';
  import { SECTIONS, PROFILE } from '$lib/data/sections.js';
  import { stepSlot } from '$lib/three/rotation.js';
  import { page } from '$app/state';

  // /?n=1 de do fps voi 1 nhan vat, /?n=4 cho ca 4.
  const count = Math.min(Number(page.url.searchParams.get('n')) || 4, SECTIONS.length);
  const items = SECTIONS.slice(0, count);

  let stage;
  // `active` doi ngay khi bat dau xoay; `open` chi bat khi dia xoay xong.
  let active = $state(0);
  let open = $state(false);
  let loaded = $state(0);
  let loadingLabel = $state('');
  let ready = $state(false);
  let error = $state('');
  // Che do xem chi tiet: panel gian rong, camera lai gan nhan vat.
  let detail = $state(false);

  function step(dir) {
    stage?.select(stepSlot(active, dir, count));
  }

  function handleChange(i) {
    active = i;
    open = false;
  }

  // Goi 1 lan khi dia xoay xong. Phase 4 mo panel noi dung o day.
  function handleSelect(sectionId, index) {
    if (import.meta.env.DEV) console.log('select', sectionId, index);
    open = true;
  }

  function handleReady() {
    ready = true;
    open = true;
  }

  // Canh bi dung lai tu dau (mat WebGL context): quay ve trang thai luc moi tai.
  function handleRestart() {
    active = 0;
    open = false;
    detail = false;
    ready = false;
    loaded = 0;
    error = '';
  }

  function setDetail(on) {
    // Chi mo khi dia da dung (panel dang hien) va nhan vat da tai xong.
    if (on && (!open || !ready)) return;
    detail = on;
    stage?.setDetail(on);
  }

  function onKey(e) {
    if (e.key === 'Escape' && detail) {
      e.preventDefault();
      setDetail(false);
      return;
    }
    // Enter tren 1 nut da co hanh vi rieng cua nut do.
    if (e.key === 'Enter' && !detail && !e.target.closest?.('button, a, input, textarea')) {
      e.preventDefault();
      setDetail(true);
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>Portfolio 3D</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
  />
</svelte:head>

<main class:detail>
  <!-- Lop nen phia sau canvas: vong tron lon mo + ten muc co lon. -->
  <div class="bg" aria-hidden="true">
    <span class="orbit o1"></span>
    <span class="orbit o2"></span>
  </div>
  <BigLabel label={items[active]?.label ?? ''} index={active} />

  <Stage
    bind:this={stage}
    {count}
    onProgress={(n, total, label) => {
      loaded = n;
      loadingLabel = label;
    }}
    onReady={handleReady}
    onError={(m) => (error = m)}
    onChange={handleChange}
    onSelect={handleSelect}
    onRestart={handleRestart}
  />

  <!-- Khung HUD 4 goc. -->
  <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

  <div class="brand">
    <span class="mark" aria-hidden="true"></span>
    <div>
      <h1>{PROFILE.brand}</h1>
      <p>{PROFILE.tagline}</p>
    </div>
  </div>


  {#if detail}
    <!-- Bam ra ngoai panel de dong; dong thoi chan click xuong canvas. -->
    <div class="backdrop" aria-hidden="true" onclick={() => setDetail(false)}></div>
  {/if}

  <div class="panel-slot">
    <Panel
      section={items[active]}
      index={active}
      total={count}
      {open}
      {detail}
      onMore={() => setDetail(true)}
      onClose={() => setDetail(false)}
    />
  </div>


  <div class="dock">
    {#if error}
      <div class="loader error" role="alert">
        <span class="tag">ERROR</span>
        <span>{error}</span>
      </div>
    {:else if !ready}
      <div class="loader" role="status">
        <span class="tag">LOADING</span>
        <span class="count">{loaded}/{count}</span>
        <span class="cells" aria-hidden="true">
          {#each items as _, i (i)}
            <i class:on={i < loaded}></i>
          {/each}
        </span>
        <span class="what">{loadingLabel}</span>
      </div>
    {/if}
    <Controls
      disabled={!ready}
      canSelect={open}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
      onSelect={() => setDetail(true)}
    />
  </div>
</main>

<style>
  :global(:root) {
    --paper: #f3f4f5;
    --bg: #e7e9ec;
    --bg-edge: #d6d9de;
    --ink: #17181b;
    --ink-soft: #5a5e67;
    --line: rgb(23 24 27 / 0.12);
    --accent: #f2d40c;
    --mono: 'JetBrains Mono', ui-monospace, monospace;
    --cond: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    --sans: 'Barlow', system-ui, sans-serif;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    /* easeInOutCubic, giong camera.js. --detail-ms khop DETAIL_MS trong constants.js. */
    --ease-io: cubic-bezier(0.65, 0, 0.35, 1);
    --detail-ms: 900ms;
    --compact-w: clamp(320px, 29vw, 440px);
    --detail-w: min(62vw, 1080px);
    color-scheme: light;
  }
  :global(html, body) {
    margin: 0;
    height: 100%;
    background: var(--bg);
    color: var(--ink);
  }

  main {
    position: relative;
    width: 100vw;
    height: 100dvh;
    /* clip thay vi hidden: hidden van cho trinh duyet tu cuon khi focus vao nut,
       lam ca man hinh troi len. clip cam cuon hoan toan. */
    overflow: clip;
    background: radial-gradient(120% 95% at 38% 42%, #f6f7f8 0%, var(--bg) 55%, var(--bg-edge) 100%);
  }

  .brand {
    position: absolute;
    top: 28px;
    left: 32px;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .mark {
    width: 30px;
    height: 30px;
    background: var(--accent);
    clip-path: polygon(0 0, 100% 0, 100% 62%, 62% 100%, 0 100%);
    box-shadow: inset 0 0 0 2px var(--ink);
  }
  .brand h1 {
    margin: 0;
    font: 700 26px/0.9 var(--cond);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .brand p {
    margin: 4px 0 0;
    font: 500 11px/1 var(--mono);
    letter-spacing: 0.06em;
    color: var(--ink-soft);
    text-transform: uppercase;
  }

  /* --- Nen phia sau canvas --- */
  .bg {
    position: absolute;
    inset: 0;
    overflow: clip;
    pointer-events: none;
  }
  /* Vong tron lon mo, tam trung tam dia tren man hinh: chi lo phan cung phia tren san. */
  .orbit {
    position: absolute;
    left: 39%;
    top: 59%;
    aspect-ratio: 1;
    translate: -50% -50%;
    border-radius: 50%;
  }
  .o1 {
    width: 150vh;
    border: 1px dashed color-mix(in srgb, var(--ink) 16%, transparent);
  }
  .o2 {
    width: 196vh;
    border: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
  }

  /* --- Khung HUD 4 goc --- */
  .frame {
    position: absolute;
    inset: 12px;
    pointer-events: none;
  }
  .frame i {
    position: absolute;
    width: 22px;
    height: 22px;
    border: 0 solid var(--ink);
  }
  .frame i:nth-child(1) {
    top: 0;
    left: 0;
    border-top-width: 2px;
    border-left-width: 2px;
  }
  .frame i:nth-child(2) {
    top: 0;
    right: 0;
    border-top-width: 2px;
    border-right-width: 2px;
  }
  .frame i:nth-child(3) {
    bottom: 0;
    left: 0;
    border-bottom-width: 2px;
    border-left-width: 2px;
  }
  .frame i:nth-child(4) {
    bottom: 0;
    right: 0;
    border-bottom-width: 2px;
    border-right-width: 2px;
  }

  .panel-slot {
    position: absolute;
    top: 28px;
    right: 32px;
    bottom: 76px;
    width: var(--detail-w);
    pointer-events: none;
  }

  .backdrop {
    position: absolute;
    inset: 0;
  }

  /* --- Dock duoi: thanh tai + cum dieu khien, can giua vung canh ben trai panel --- */
  .dock {
    position: absolute;
    bottom: 28px;
    left: calc((100vw - var(--compact-w) - 32px) / 2);
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }


  /* Khi xem chi tiet: an cac phan UI cua man chon muc. */
  .brand,
  .dock,
  .frame {
    transition:
      opacity 0.3s var(--ease),
      translate 0.4s var(--ease);
  }
  .detail .brand,
  .detail .dock {
    opacity: 0;
    pointer-events: none;
  }
  .detail .dock {
    translate: -50% 16px;
  }

  .loader {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--ink);
    color: var(--paper);
    font: 500 12px/1 var(--mono);
    letter-spacing: 0.06em;
    clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  }
  .tag {
    color: var(--accent);
    font-weight: 600;
  }
  .cells {
    display: flex;
    gap: 3px;
  }
  .cells i {
    width: 18px;
    height: 8px;
    background: rgb(255 255 255 / 0.18);
    transition: background-color 0.3s var(--ease);
  }
  .cells i.on {
    background: var(--accent);
  }
  .what {
    min-width: 70px;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.7);
  }
  .error {
    max-width: 60vw;
  }

  /* Man hinh hep: panel xuong duoi, dieu khien len tren. Bo cuc day du lam o Phase 4. */
  @media (max-width: 900px) {
    :global(:root) {
      --compact-w: 100%;
    }
    .dock {
      left: 50%;
      top: 84px;
      bottom: auto;
    }
    .panel-slot {
      top: auto;
      left: 16px;
      right: 16px;
      bottom: 16px;
      width: auto;
      height: 34dvh;
    }
    .detail .panel-slot {
      height: calc(100dvh - 32px);
    }
  }
</style>
