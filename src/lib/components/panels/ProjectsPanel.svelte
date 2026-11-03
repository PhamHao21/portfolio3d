<script>
  import { PROJECTS, PROJECT_SLOTS } from '$lib/data/projects.js';
  import { formatMonth } from '$lib/ui/format.js';

  // compact: the du an noi bat + o khoa. full: trang du an day du.
  let { mode = 'compact' } = $props();
  const pad = (n) => String(n).padStart(2, '0');
  // O chua co du an: hien "dang cap nhat" de nguoi xem biet se con them.
  const locked = Array.from({ length: Math.max(0, PROJECT_SLOTS - PROJECTS.length) }, (_, i) => ({
    code: `P-${pad(PROJECTS.length + i + 1)}`
  }));
</script>

{#snippet links(p)}
  <div class="pu-links">
    {#each p.links as l (l.href)}
      <a class="pu-link" href={l.href} target="_blank" rel="noopener noreferrer">
        {l.label}<span aria-hidden="true">↗</span>
      </a>
    {/each}
  </div>
{/snippet}

{#if mode === 'compact'}
  <div class="compact">
    {#each PROJECTS as p, i (p.code)}
      <article class="rv card" style:--i={i}>
        <div class="top">
          <span class="code">{p.code}</span>
          <span class="pu-chip pu-chip--accent">{p.status}</span>
        </div>
        <h4>{p.name}</h4>
        <p class="sum">{p.summary}</p>
        <div class="pu-chips">
          {#each p.stack.slice(0, 3) as t (t)}
            <span class="pu-chip">{t}</span>
          {/each}
        </div>
        {@render links(p)}
      </article>
    {/each}
    {#each locked as l, i (l.code)}
      <div class="rv locked" style:--i={PROJECTS.length + i}>
        <span class="code">{l.code}</span>
        <span class="pu-label">Đang cập nhật</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="full">
    {#each PROJECTS as p, i (p.code)}
      <article class="rv project" style:--i={i}>
        <div class="cover" aria-hidden="true">
          <span class="cv-code">{p.code}</span>
          <span class="cv-text">{p.cover}</span>
          <span class="cv-hazard"></span>
        </div>
        <div class="body">
          <div class="meta">
            <span class="pu-chip pu-chip--accent">{p.status}</span>
            <span class="pu-label">Bắt đầu {formatMonth(p.started)}</span>
          </div>
          <h4>{p.name}</h4>
          <p class="pu-p">{p.description}</p>

          <p class="pu-label sub">Tính năng</p>
          <ul class="pu-list">
            {#each p.features as f (f)}
              <li>{f}</li>
            {/each}
          </ul>

          <p class="pu-label sub">Công nghệ</p>
          <div class="pu-chips">
            {#each p.stack as t (t)}
              <span class="pu-chip">{t}</span>
            {/each}
          </div>

          <div class="actions">{@render links(p)}</div>
        </div>
      </article>
    {/each}

    {#each locked as l, i (l.code)}
      <div class="rv locked big" style:--i={PROJECTS.length + i}>
        <span class="code">{l.code}</span>
        <span class="pu-label">Dự án sẽ được cập nhật</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .code {
    font: 600 12px/1 var(--mono);
    letter-spacing: 0.06em;
    color: var(--ink);
  }

  /* --- Gon --- */
  .compact {
    display: grid;
    gap: 10px;
  }
  .card {
    display: grid;
    gap: 10px;
    padding: 16px 18px 18px;
    background: color-mix(in srgb, var(--ink) 4%, transparent);
    border-left: 3px solid var(--accent);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .card h4 {
    margin: 0;
    font: 700 28px/1 var(--cond);
    text-transform: uppercase;
    color: var(--ink);
  }
  .sum {
    margin: 0;
    font: 400 14px/1.5 var(--sans);
    color: var(--ink-soft);
  }
  /* O khoa: vien net dut + soc cheo mo o le trai. */
  .locked {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 44px;
    padding: 0 16px 0 22px;
    position: relative;
    outline: 1px dashed color-mix(in srgb, var(--ink) 30%, transparent);
    outline-offset: -1px;
    color: var(--ink-soft);
  }
  .locked::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background: repeating-linear-gradient(-45deg, var(--ink) 0 4px, transparent 4px 8px);
    opacity: 0.35;
  }
  .locked .code {
    color: var(--ink-soft);
  }

  /* --- Chi tiet --- */
  .full {
    display: grid;
    gap: 16px;
  }
  .project {
    display: grid;
    grid-template-columns: minmax(180px, 0.8fr) minmax(0, 2fr);
    background: color-mix(in srgb, var(--ink) 4%, transparent);
    clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%);
  }
  /* Anh bia tam bang chu (chua co anh chup du an). */
  .cover {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 220px;
    overflow: hidden;
    background: var(--ink);
  }
  .cv-code {
    position: absolute;
    top: 14px;
    left: 14px;
    font: 600 11px/1 var(--mono);
    letter-spacing: 0.08em;
    color: var(--accent);
  }
  .cv-text {
    font: 700 110px/0.8 var(--cond);
    color: transparent;
    -webkit-text-stroke: 1.5px var(--accent);
  }
  .cv-hazard {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 10px;
    background: repeating-linear-gradient(-45deg, var(--ink) 0 7px, var(--accent) 7px 14px);
  }
  .body {
    display: grid;
    align-content: start;
    gap: 12px;
    padding: 22px 26px 26px;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .body h4 {
    margin: 0;
    font: 700 40px/1 var(--cond);
    text-transform: uppercase;
    color: var(--ink);
  }
  .sub {
    margin-top: 8px;
  }
  .actions {
    margin-top: 8px;
  }
  .big {
    height: 64px;
  }

  @media (max-width: 1100px) {
    .project {
      grid-template-columns: 1fr;
    }
    .cover {
      min-height: 140px;
    }
  }
</style>
