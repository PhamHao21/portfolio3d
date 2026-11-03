<script>
  import { WORK } from '$lib/data/work.js';
  import { ABOUT } from '$lib/data/about.js';
  import { formatMonth, monthSpan, durationLabel } from '$lib/ui/format.js';

  // compact: cong viec hien tai. full: dong thoi gian cong viec + hoc van.
  let { mode = 'compact' } = $props();

  const range = (w) =>
    `${formatMonth(w.start)} - ${w.end ? formatMonth(w.end) : 'Nay'}`;
  const span = (w) => durationLabel(monthSpan(w.start, w.end ? new Date(w.end) : new Date()));
  const current = WORK[0];
</script>

{#snippet live()}
  <span class="live"><i aria-hidden="true"></i>Đang làm</span>
{/snippet}

{#if mode === 'compact'}
  {#if current}
    <div class="compact">
      <div class="rv top" style:--i="0">
        {#if !current.end}{@render live()}{/if}
        <span class="pu-label">{range(current)} · {span(current)}</span>
      </div>
      <div class="rv" style:--i="1">
        <h4 class="company">{current.company}</h4>
        <p class="pu-label">{current.location}</p>
      </div>
      <div class="rv pu-chips" style:--i="2">
        {#each current.roles as r (r)}
          <span class="pu-chip pu-chip--ink">{r}</span>
        {/each}
      </div>
      <ul class="rv pu-list" style:--i="3">
        {#each current.duties.slice(0, 2) as d (d)}
          <li>{d}</li>
        {/each}
      </ul>
    </div>
  {/if}
{:else}
  <ol class="timeline">
    {#each WORK as w, i (w.company + w.start)}
      <li class="rv item" class:now={!w.end} style:--i={i}>
        <span class="node" aria-hidden="true"></span>
        <div class="when">
          {#if !w.end}{@render live()}{/if}
          <span class="pu-label">{range(w)} · {span(w)}</span>
        </div>
        <h4 class="company">{w.company}</h4>
        <p class="pu-label">{w.location}</p>
        <div class="pu-chips roles">
          {#each w.roles as r (r)}
            <span class="pu-chip pu-chip--ink">{r}</span>
          {/each}
        </div>
        <ul class="pu-list">
          {#each w.duties as d (d)}
            <li>{d}</li>
          {/each}
        </ul>
        <div class="pu-chips">
          {#each w.tags as t (t)}
            <span class="pu-chip">{t}</span>
          {/each}
        </div>
      </li>
    {/each}

    <li class="rv item" style:--i={WORK.length}>
      <span class="node" aria-hidden="true"></span>
      <div class="when"><span class="pu-label">Học vấn</span></div>
      <h4 class="company">{ABOUT.education.degree}</h4>
      <p class="pu-label">{ABOUT.education.school}</p>
    </li>
  </ol>
{/if}

<style>
  .compact {
    display: grid;
    gap: 14px;
  }
  .top,
  .when {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .company {
    margin: 0 0 4px;
    font: 700 32px/1 var(--cond);
    text-transform: uppercase;
    color: var(--ink);
  }

  /* Trang thai dang lam: o vuong vang nhap nhay nhe (trang thai that, khong trang tri). */
  .live {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 9px;
    background: var(--ink);
    color: var(--accent);
    font: 600 11px/1 var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .live i {
    width: 7px;
    height: 7px;
    background: var(--accent);
    animation: blink 1.6s steps(2, jump-none) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0.25;
    }
  }

  /* --- Dong thoi gian --- */
  .timeline {
    position: relative;
    display: grid;
    gap: 34px;
    margin: 0;
    padding: 0 0 0 34px;
    list-style: none;
  }
  .timeline::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: repeating-linear-gradient(to bottom, var(--ink) 0 6px, transparent 6px 11px);
    opacity: 0.35;
  }
  .item {
    position: relative;
    display: grid;
    gap: 10px;
    max-width: 72ch;
  }
  .node {
    position: absolute;
    left: -34px;
    top: 2px;
    width: 16px;
    height: 16px;
    background: var(--paper);
    box-shadow: inset 0 0 0 2px var(--ink);
    rotate: 45deg;
    scale: 0.8;
  }
  .now .node {
    background: var(--accent);
  }
  .item .company {
    font-size: 36px;
  }
  .roles {
    margin: 2px 0 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    .live i {
      animation: none;
    }
  }
</style>
