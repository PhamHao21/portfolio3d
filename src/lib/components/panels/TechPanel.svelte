<script>
  import { TECH_GROUPS, THIS_SITE } from '$lib/data/tech.js';

  // compact: 3 nhom, moi nhom 1 hang chip. full: o the tung cong nghe kem mo ta.
  let { mode = 'compact' } = $props();
  const pad = (n) => String(n).padStart(2, '0');
  const code = (i) => pad(i + 1);
</script>

{#if mode === 'compact'}
  <div class="compact">
    {#each TECH_GROUPS as g, gi (g.id)}
      <div class="rv group" style:--i={gi}>
        <div class="head">
          <span class="pu-label">{g.label}</span>
          <span class="count">{pad(g.items.length)}</span>
          <span class="rule" aria-hidden="true"></span>
        </div>
        <div class="pu-chips">
          {#each g.items as t (t.name)}
            <span class="pu-chip">{t.name}</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="full">
    {#each TECH_GROUPS as g, gi (g.id)}
      <section class="rv" style:--i={gi}>
        <h3 class="pu-h3"><span>{code(gi)}</span>{g.label}</h3>
        <p class="pu-p desc">{g.desc}</p>
        <div class="tiles">
          {#each g.items as t (t.name)}
            <div class="tile">
              <span class="nm">{t.name}</span>
              <span class="pu-label">{t.kind}</span>
            </div>
          {/each}
        </div>
      </section>
    {/each}

    <section class="rv" style:--i={TECH_GROUPS.length}>
      <h3 class="pu-h3"><span>{code(TECH_GROUPS.length)}</span>Portfolio này</h3>
      <p class="pu-p desc">Chính trang bạn đang xem được dựng bằng:</p>
      <div class="pu-chips">
        {#each THIS_SITE as t (t)}
          <span class="pu-chip pu-chip--accent">{t}</span>
        {/each}
      </div>
    </section>
  </div>
{/if}

<style>
  .compact {
    display: grid;
    gap: 20px;
  }
  .group {
    display: grid;
    gap: 10px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .count {
    padding: 3px 6px;
    background: var(--ink);
    color: var(--accent);
    font: 600 11px/1 var(--mono);
  }
  .rule {
    flex: 1;
    height: 1px;
    background: var(--line);
  }

  .full {
    display: grid;
    gap: 40px;
  }
  .desc {
    margin-bottom: 14px;
    color: var(--ink-soft);
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }
  .tile {
    display: grid;
    align-content: space-between;
    gap: 14px;
    min-height: 78px;
    padding: 12px 14px;
    background: color-mix(in srgb, var(--ink) 4%, transparent);
    border-left: 3px solid var(--ink);
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
  }
  .nm {
    font: 700 22px/1 var(--cond);
    color: var(--ink);
  }
</style>
