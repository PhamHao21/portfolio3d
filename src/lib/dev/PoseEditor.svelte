<script>
  // Trang chinh dang cho nhan vat MMD (chi dung khi dev). Bam Luu -> ghi src/lib/data/poses.js.
  import { onMount, untrack } from 'svelte';
  import { SECTIONS } from '$lib/data/sections.js';
  import { POSES } from '$lib/data/poses.js';
  import { createPoseStage } from '$lib/three/poseStage.js';
  import { mirrorPose, mirrorName, normalizePose, curlPose } from '$lib/three/mmd/pose.js';

  const CAST = SECTIONS.filter((s) => s.model.toLowerCase().endsWith('.pmx'));
  const SLOTS = [
    { id: 'idle', label: 'Idle', hint: 'đứng chờ' },
    { id: 'pose', label: 'Pose', hint: 'khi được chọn' },
    { id: 'detail', label: 'Detail', hint: 'khi bấm More' }
  ];
  const sides = (names) => names.flatMap((n) => [`左${n}`, `右${n}`]);
  const GROUPS = [
    { label: 'Thân', bones: ['センター', '下半身', '上半身', '上半身2', '首', '頭', '両目'] },
    { label: 'Tay', bones: sides(['肩', '腕', '腕捩', 'ひじ', '手捩', '手首']) },
    { label: 'Chân (IK)', bones: sides(['足ＩＫ', 'つま先ＩＫ']) },
    {
      label: 'Ngón tay',
      bones: sides(['親指０', '親指１', '親指２', '人指１', '人指２', '人指３', '中指１', '中指２', '中指３', '薬指１', '薬指２', '薬指３', '小指１', '小指２', '小指３']),
      closed: true
    }
  ];
  const MOVABLE = /センター|ＩＫ/;
  const VN = {
    センター: 'Trọng tâm', 下半身: 'Hông', 上半身: 'Lưng', 上半身2: 'Ngực', 首: 'Cổ', 頭: 'Đầu',
    両目: 'Mắt nhìn', 肩: 'Vai', 腕: 'Cánh tay', 腕捩: 'Xoắn tay', ひじ: 'Khuỷu', 手捩: 'Xoắn cổ tay',
    手首: 'Cổ tay', 足ＩＫ: 'Bàn chân', つま先ＩＫ: 'Mũi chân', 親指: 'Cái', 人指: 'Trỏ', 中指: 'Giữa',
    薬指: 'Áp út', 小指: 'Út'
  };
  function label(name) {
    const side = name[0] === '左' ? 'T ' : name[0] === '右' ? 'P ' : '';
    const core = side ? name.slice(1) : name;
    const key = Object.keys(VN).find((k) => core.startsWith(k));
    const rest = key ? core.slice(key.length) : '';
    return key ? `${side}${VN[key]}${rest ? ' ' + rest : ''}` : name;
  }

  // Ban sao lam viec cua toan bo POSES; chi ghi file khi bam Luu.
  const init = structuredClone(POSES);
  for (const s of CAST) {
    init[s.char] ??= {};
    for (const { id } of SLOTS) init[s.char][id] = normalizePose(init[s.char][id]);
  }
  let poses = $state(init);
  let saved = $state(JSON.stringify(init));
  let dirty = $derived(JSON.stringify(poses) !== saved);

  let charId = $state(CAST[0]?.char);
  let slot = $state('idle');
  let live = $state(false);
  let status = $state('');
  let loading = $state(false);
  let boneNames = $state([]);
  let morphNames = $state([]);
  let active = $state('');
  let extra = $state('');
  let curl = $state({ 左: 0, 右: 0 });
  let refUrl = $state('');
  let refOpacity = $state(0.4);

  let canvas;
  let stage = $state();
  let ready = $state(false);

  const pose = $derived(poses[charId]?.[slot]);
  const has = (n) => boneNames.includes(n);
  const extraBones = $derived(
    Object.keys(pose?.rot ?? {}).filter((n) => !GROUPS.some((g) => g.bones.includes(n)))
  );

  onMount(() => {
    stage = createPoseStage(canvas);
    return () => stage.dispose();
  });

  // Doi nhan vat: nap model, dua 2 dang vao.
  $effect(() => {
    const id = charId;
    if (!stage) return;
    const section = CAST.find((s) => s.char === id);
    untrack(async () => {
      ready = false;
      loading = true;
      status = '';
      const info = await stage.load(section, $state.snapshot(poses[id]));
      loading = false;
      if (!info) return;
      boneNames = info.boneNames;
      morphNames = info.morphNames;
      if (info.failed.length) status = `Thiếu: ${info.failed.join(', ')}`;
      stage.show(slot, true);
      stage.setLive(live);
      stage.mark(active);
      ready = true;
    });
  });

  // Moi thay doi so lieu -> cap nhat dang tren model ngay.
  $effect(() => {
    const data = $state.snapshot(poses[charId]?.[slot]);
    if (ready) stage.setSlot(slot, data);
  });
  $effect(() => {
    const s = slot;
    if (ready) untrack(() => stage.show(s));
  });
  $effect(() => {
    if (ready) stage.setLive(live);
  });
  $effect(() => {
    if (ready) stage.mark(active);
  });

  const rot = (n) => pose?.rot[n] ?? [0, 0, 0];
  const move = (n) => pose?.move[n] ?? [0, 0, 0];

  // Gia tri 0 het thi xoa khoi dang cho file gon.
  function setVec(kind, n, axis, value) {
    const v = [...(kind === 'rot' ? rot(n) : move(n))];
    v[axis] = Number(value) || 0;
    if (v.every((x) => x === 0)) delete pose[kind][n];
    else pose[kind][n] = v;
  }
  function resetBone(n) {
    delete pose.rot[n];
    delete pose.move[n];
  }
  function setFace(n, value) {
    const w = Number(value) || 0;
    if (w === 0) delete pose.face[n];
    else pose.face[n] = w;
  }

  function replacePose(next) {
    poses[charId][slot] = normalizePose(next);
  }
  function mirrorAll() {
    replacePose(mirrorPose($state.snapshot(pose)));
  }
  // Chep 1 ben sang ben kia (doi xung), giu nguyen phan giua.
  function copySide(from) {
    const p = $state.snapshot(pose);
    const m = mirrorPose(p);
    const to = from === '左' ? '右' : '左';
    for (const kind of ['rot', 'move']) {
      for (const n of Object.keys(p[kind])) if (n.startsWith(to)) delete p[kind][n];
      for (const [n, v] of Object.entries(m[kind])) if (n.startsWith(to)) p[kind][n] = v;
    }
    replacePose(p);
  }
  function copyFrom(other) {
    if (other) replacePose(structuredClone($state.snapshot(poses[charId][other])));
  }
  function resetSlot() {
    replacePose({});
  }
  function applyCurl(side) {
    const p = $state.snapshot(pose);
    Object.assign(p.rot, curlPose(side, curl[side]));
    for (const [n, v] of Object.entries(p.rot)) if (v.every((x) => x === 0)) delete p.rot[n];
    replacePose(p);
  }
  function addBone() {
    const n = extra.trim();
    if (!has(n)) {
      status = `Không có xương "${n}"`;
      return;
    }
    pose.rot[n] ??= [0, 0, 0.0001];
    active = n;
    extra = '';
  }

  async function save() {
    status = 'Đang lưu...';
    const body = JSON.stringify($state.snapshot(poses));
    try {
      const res = await fetch('/__poses', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      saved = body;
      status = 'Đã lưu vào src/lib/data/poses.js';
    } catch (err) {
      status = `Lỗi lưu: ${err.message}`;
    }
  }

  function onRef(e) {
    const f = e.currentTarget.files?.[0];
    if (refUrl) URL.revokeObjectURL(refUrl);
    refUrl = f ? URL.createObjectURL(f) : '';
  }
</script>

{#snippet vec(kind, n, axis, min, max, step)}
  {@const v = (kind === 'rot' ? rot(n) : move(n))[axis]}
  <label class="ax">
    <span>{kind === 'rot' ? 'XYZ'[axis] : 'xyz'[axis]}</span>
    <input type="range" {min} {max} {step} value={v} oninput={(e) => setVec(kind, n, axis, e.currentTarget.value)} />
    <input type="number" {min} {max} {step} value={v} onchange={(e) => setVec(kind, n, axis, e.currentTarget.value)} />
  </label>
{/snippet}

{#snippet bone(n)}
  {#if has(n)}
    <div class="bone" role="group" aria-label={label(n)} class:on={active === n} class:set={pose.rot[n] || pose.move[n]} onfocusin={() => (active = n)} onpointerenter={() => (active = n)}>
      <div class="bh">
        <b>{label(n)}</b><small>{n}</small>
        <button type="button" class="x" title="Về 0" onclick={() => resetBone(n)}>↺</button>
      </div>
      {#each [0, 1, 2] as a (a)}{@render vec('rot', n, a, -180, 180, 1)}{/each}
      {#if MOVABLE.test(n)}
        {#each [0, 1, 2] as a (a)}{@render vec('move', n, a, -0.4, 0.4, 0.005)}{/each}
      {/if}
    </div>
  {/if}
{/snippet}

<div class="editor">
  <div class="view">
    <canvas bind:this={canvas}></canvas>
    {#if refUrl}<img class="ref" src={refUrl} alt="Ảnh tham khảo" style:opacity={refOpacity} />{/if}
    {#if loading}<p class="loading">Đang tải model...</p>{/if}
    <p class="tip">Kéo chuột: xoay · Chuột phải: dời · Lăn: zoom · Chấm vàng: xương đang chỉnh</p>
  </div>

  <aside>
    <header>
      <h1>Chỉnh dáng</h1>
      <p>Chỉ chạy khi dev. Bấm Lưu để ghi vào poses.js.</p>
    </header>

    <div class="row chars">
      {#each CAST as s (s.char)}
        <button type="button" class:sel={charId === s.char} onclick={() => (charId = s.char)}>{s.name ?? s.char}<small>{s.label}</small></button>
      {/each}
    </div>

    <div class="row slots">
      {#each SLOTS as s (s.id)}
        <button type="button" class:sel={slot === s.id} onclick={() => (slot = s.id)}>{s.label}<small>{s.hint}</small></button>
      {/each}
    </div>

    <div class="row tools">
      <label class="chk"><input type="checkbox" bind:checked={live} /> Chuyển động sống</label>
      <button type="button" onclick={mirrorAll}>Lật T↔P</button>
      <button type="button" onclick={() => copySide('左')}>Chép T→P</button>
      <button type="button" onclick={() => copySide('右')}>Chép P→T</button>
      <select onchange={(e) => (copyFrom(e.currentTarget.value), (e.currentTarget.value = ''))}>
        <option value="">Lấy từ...</option>
        {#each SLOTS.filter((s) => s.id !== slot) as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
      </select>
      <button type="button" class="warn" onclick={resetSlot}>Xoá dáng</button>
    </div>

    <div class="row ref-row">
      <label class="file">Ảnh tham khảo <input type="file" accept="image/*" onchange={onRef} /></label>
      {#if refUrl}<input type="range" min="0.1" max="1" step="0.05" bind:value={refOpacity} title="Độ mờ ảnh" />{/if}
    </div>

    <div class="groups">
      {#if pose}
        {#each GROUPS as g (g.label)}
          <details open={!g.closed}>
            <summary>{g.label}</summary>
            {#if g.label === 'Ngón tay'}
              {#each ['左', '右'] as side (side)}
                <label class="ax curl">
                  <span>{side === '左' ? 'T' : 'P'}</span>
                  <input type="range" min="-20" max="90" step="1" bind:value={curl[side]} oninput={() => applyCurl(side)} />
                  <em>nắm tay {curl[side]}°</em>
                </label>
              {/each}
            {/if}
            {#each g.bones as n (n)}{@render bone(n)}{/each}
          </details>
        {/each}

        <details open>
          <summary>Xương khác</summary>
          <div class="add">
            <input list="bone-list" bind:value={extra} placeholder="Tên xương (vd 左人指１)" />
            <button type="button" onclick={addBone}>Thêm</button>
            <datalist id="bone-list">
              {#each boneNames as n (n)}<option value={n}></option>{/each}
            </datalist>
          </div>
          {#each extraBones as n (n)}{@render bone(n)}{/each}
        </details>

        <details>
          <summary>Biểu cảm ({Object.keys(pose.face).length})</summary>
          {#each morphNames as n (n)}
            <label class="ax morph" class:set={pose.face[n]}>
              <span>{n}</span>
              <input type="range" min="0" max="1" step="0.05" value={pose.face[n] ?? 0} oninput={(e) => setFace(n, e.currentTarget.value)} />
              <em>{(pose.face[n] ?? 0).toFixed(2)}</em>
            </label>
          {/each}
        </details>
      {/if}
    </div>

    <footer>
      <button type="button" class="save" disabled={!dirty} onclick={save}>Lưu{dirty ? ' *' : ''}</button>
      <p>{status}</p>
    </footer>
  </aside>
</div>

<style>
  .editor {
    --ink: #17181b;
    --paper: #f3f4f5;
    --accent: #f2d40c;
    --line: #d5d8dd;
    position: fixed;
    inset: 0;
    display: grid;
    grid-template-columns: 1fr 400px;
    background: var(--paper);
    color: var(--ink);
    font: 13px/1.4 system-ui, sans-serif;
  }
  .view {
    position: relative;
    min-width: 0;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .ref {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }
  .loading,
  .tip {
    position: absolute;
    left: 16px;
    margin: 0;
    padding: 6px 10px;
    background: rgb(255 255 255 / 0.8);
  }
  .loading {
    top: 16px;
  }
  .tip {
    bottom: 16px;
    color: #555;
  }
  aside {
    display: grid;
    grid-template-rows: auto auto auto auto auto 1fr auto;
    gap: 10px;
    min-height: 0;
    padding: 16px;
    border-left: 1px solid var(--line);
    background: #fff;
  }
  header h1 {
    margin: 0;
    font-size: 20px;
  }
  header p {
    margin: 2px 0 0;
    color: #666;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  button {
    padding: 6px 10px;
    border: 1px solid var(--line);
    background: #fff;
    font: inherit;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--ink);
  }
  .chars button,
  .slots button {
    display: grid;
    flex: 1;
    text-align: left;
  }
  button small {
    color: #777;
    font-size: 11px;
  }
  button.sel {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--accent);
  }
  button.sel small {
    color: #bbb;
  }
  .warn {
    color: #b3261e;
  }
  .chk,
  .file {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .file input {
    max-width: 180px;
  }
  .groups {
    min-height: 0;
    overflow-y: auto;
    margin: 0 -16px;
    padding: 0 16px;
  }
  details {
    border-top: 1px solid var(--line);
    padding: 6px 0;
  }
  summary {
    font-weight: 700;
    cursor: pointer;
    padding: 4px 0;
  }
  .bone {
    padding: 6px 8px;
    margin: 4px 0;
    border-left: 3px solid transparent;
    background: #f7f8f9;
  }
  .bone.set {
    border-left-color: #c9ccd2;
  }
  .bone.on {
    border-left-color: var(--accent);
    background: #fffbe0;
  }
  .bh {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .bh small {
    color: #888;
  }
  .x {
    margin-left: auto;
    padding: 0 6px;
  }
  .ax {
    display: grid;
    grid-template-columns: 16px 1fr 64px;
    align-items: center;
    gap: 6px;
  }
  .ax span {
    color: #777;
    font-size: 11px;
  }
  .ax input[type='number'] {
    width: 64px;
    font: inherit;
  }
  .ax em {
    font-style: normal;
    font-size: 11px;
    color: #555;
  }
  .morph {
    grid-template-columns: 90px 1fr 40px;
  }
  .morph.set span {
    color: var(--ink);
    font-weight: 700;
  }
  .curl {
    grid-template-columns: 16px 1fr 90px;
  }
  .add {
    display: flex;
    gap: 6px;
  }
  .add input {
    flex: 1;
    font: inherit;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  footer p {
    margin: 0;
    color: #555;
  }
  .save {
    padding: 10px 22px;
    background: var(--ink);
    color: var(--accent);
    font-weight: 700;
  }
  .save:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
