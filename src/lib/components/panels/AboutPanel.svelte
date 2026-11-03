<script>
  import { ABOUT as a } from '$lib/data/about.js';

  // compact: the ho so trong bang gon. full: tieu su day du trong che do chi tiet.
  let { mode = 'compact' } = $props();
  const code = (i) => String(i + 1).padStart(2, '0');
</script>

{#snippet links()}
  <div class="pu-links">
    {#each a.links as l (l.href)}
      <a class="pu-link" href={l.href} target="_blank" rel="noopener noreferrer">
        {l.label}<span aria-hidden="true">↗</span>
      </a>
    {/each}
  </div>
{/snippet}

{#if mode === 'compact'}
  <div class="compact">
    <div class="rv id" style:--i="0">
      <span class="name">{a.name}</span>
      <span class="pu-chip pu-chip--ink">{a.alias}</span>
    </div>
    <p class="rv pu-label" style:--i="1">{a.role}</p>

    <dl class="rv pu-kv" style:--i="2">
      <div>
        <dt class="pu-label">Base</dt>
        <dd>{a.base}</dd>
      </div>
      <div>
        <dt class="pu-label">Born</dt>
        <dd>{a.born}</dd>
      </div>
      <div class="wide">
        <dt class="pu-label">Education</dt>
        <dd>{a.education.school}</dd>
      </div>
    </dl>

    <p class="rv pu-p tagline" style:--i="3">{a.tagline}</p>
    <div class="rv" style:--i="4">{@render links()}</div>
  </div>
{:else}
  <div class="full">
    <header class="rv hero" style:--i="0">
      <p class="pu-label">Operator file / {a.alias}</p>
      <p class="big">{a.name}</p>
      <p class="role">{a.role}</p>
    </header>

    <section class="rv" style:--i="1">
      <h3 class="pu-h3"><span>{code(0)}</span>Giới thiệu</h3>
      {#each a.bio as p, i (i)}
        <p class="pu-p">{p}</p>
      {/each}
    </section>

    <section class="rv" style:--i="2">
      <h3 class="pu-h3"><span>{code(1)}</span>Hồ sơ</h3>
      <dl class="pu-kv three">
        <div>
          <dt class="pu-label">Họ tên</dt>
          <dd>{a.name}</dd>
        </div>
        <div>
          <dt class="pu-label">Bí danh</dt>
          <dd>{a.alias}</dd>
        </div>
        <div>
          <dt class="pu-label">Năm sinh</dt>
          <dd>{a.born}</dd>
        </div>
        <div>
          <dt class="pu-label">Nơi ở</dt>
          <dd>{a.base}</dd>
        </div>
        <div class="wide">
          <dt class="pu-label">Học vấn</dt>
          <dd>{a.education.degree}, {a.education.school}</dd>
        </div>
      </dl>
    </section>

    <section class="rv" style:--i="3">
      <h3 class="pu-h3"><span>{code(2)}</span>Định hướng</h3>
      <div class="focus">
        {#each a.focus as f, i (f.title)}
          <article class="card">
            <span class="pu-label">F-{code(i)}</span>
            <h4>{f.title}</h4>
            <p>{f.text}</p>
          </article>
        {/each}
      </div>
    </section>

    <section class="rv" style:--i="4">
      <h3 class="pu-h3"><span>{code(3)}</span>Liên kết</h3>
      {@render links()}
    </section>
  </div>
{/if}

<style>
  .compact {
    display: grid;
    gap: 14px;
  }
  .id {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .name {
    font: 700 32px/1 var(--cond);
    color: var(--ink);
  }
  .wide {
    grid-column: 1 / -1;
  }
  .tagline {
    padding-left: 12px;
    border-left: 3px solid var(--accent);
    font-size: 15px;
  }

  .full {
    display: grid;
    gap: 40px;
  }
  .hero {
    display: grid;
    gap: 6px;
  }
  .big {
    margin: 4px 0 0;
    font: 700 clamp(40px, 4vw, 56px)/1 var(--cond);
    color: var(--ink);
  }
  .role {
    margin: 0;
    font: 500 18px/1.3 var(--sans);
    color: var(--ink-soft);
  }
  .three {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
  .focus {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px;
  }
  .card {
    display: grid;
    align-content: start;
    gap: 8px;
    padding: 16px 18px 18px;
    background: color-mix(in srgb, var(--ink) 4%, transparent);
    border-top: 3px solid var(--accent);
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%);
  }
  .card h4 {
    margin: 0;
    font: 700 22px/1.05 var(--cond);
    text-transform: uppercase;
    color: var(--ink);
  }
  .card p {
    margin: 0;
    font: 400 14px/1.55 var(--sans);
    color: var(--ink-soft);
  }
</style>
