<script setup lang="ts">
</script>

<template>
  <router-view />
</template>

<style>
:root {
  color-scheme: dark;

  /* Tabletop palette */
  --wfk-tabletop-felt-1: #1f4332;
  --wfk-tabletop-felt-2: #0a1d14;
  --wfk-tabletop-wood-1: #3a2818;
  --wfk-tabletop-wood-2: #1a0f06;

  /* Card / paper */
  --wfk-card-paper-1: #222637;
  --wfk-card-paper-2: #161927;
  --wfk-card-edge: rgba(212, 175, 55, 0.22);
  --wfk-card-edge-strong: rgba(212, 175, 55, 0.55);
  --wfk-parchment-1: #2a2515;
  --wfk-parchment-2: #1a1609;

  /* Heraldic */
  --wfk-gold-1: #d4af37;
  --wfk-gold-2: #f0d886;
  --wfk-gold-deep: #8a6a14;
  --wfk-brass-1: #5a4a22;
  --wfk-brass-2: #2a220e;

  /* Faction */
  --wfk-wolf-blood: #8b1e1e;
  --wfk-wolf-eye: #ff5050;
  --wfk-village-warm: #e9c468;

  /* Phase */
  --wfk-moon-glow: #9ab3ff;
  --wfk-moon-deep: #1a2452;
  --wfk-sun-glow: #ffb877;
  --wfk-sun-deep: #5a2e0e;

  --wfk-ink-deep: #0c0f17;
  --wfk-ink-mid: #161a25;

  /* Display serif stack (no external font) */
  --wfk-font-display: Georgia, "Cormorant Garamond", "Songti SC", "STSong", "FangSong", "FangSong_GB2312", serif;
  --wfk-font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'PingFang SC', 'Microsoft YaHei', sans-serif;

  /* Reusable noise data URI (small grain on transparent bg) */
  --wfk-noise-url: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
}

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: var(--wfk-font-body);
  color: #e6e8eb;
}

body {
  position: relative;
  background:
    radial-gradient(ellipse at center,
      var(--wfk-tabletop-felt-1) 0%,
      var(--wfk-tabletop-felt-2) 65%,
      var(--wfk-ink-deep) 100%);
  background-attachment: fixed;
}

/* Wood-grain vignette at the edges */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center,
      transparent 55%,
      rgba(58, 40, 24, 0.35) 88%,
      rgba(26, 15, 6, 0.85) 100%);
  z-index: 0;
}

/* Felt grain overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: var(--wfk-noise-url);
  opacity: 0.18;
  mix-blend-mode: overlay;
  z-index: 0;
}

#app {
  position: relative;
  z-index: 1;
}
</style>
