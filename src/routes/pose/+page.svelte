<script>
  // Trang chinh dang nhan vat MMD. Chi co tac dung khi chay `npm run dev`.
  import { dev } from '$app/environment';
</script>

<svelte:head><title>Chỉnh dáng</title></svelte:head>

{#if dev}
  {#await import('$lib/dev/PoseEditor.svelte') then m}
    <m.default />
  {/await}
{:else}
  <p>Trang chỉnh dáng chỉ dùng khi chạy dev.</p>
{/if}
