/** Neon page fill; inlined on <html>/<body> so the first paint is never white. */
export const BOOT_BG = "#0B0F17";

/**
 * Critical boot-landing CSS. Inlined in the root layout so the spinner paints
 * with the HTML instead of waiting for /_next/static CSS.
 */
export const BOOT_SPLASH_CSS = `
html,body{background:${BOOT_BG};color-scheme:dark;margin:0;color:#eaf2ff}
.boot-splash{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;padding:max(24px,env(safe-area-inset-top)) 24px max(28px,env(safe-area-inset-bottom));background:${BOOT_BG};color:#eaf2ff}
.boot-splash[hidden]{display:none!important}
.boot-splash__glow{position:absolute;inset:0;background:radial-gradient(520px 340px at 12% -4%,#3dff882b,transparent 70%),radial-gradient(560px 400px at 95% 104%,#ff4fd824,transparent 70%);pointer-events:none}
.boot-splash__card{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:1.35rem;text-align:center;max-width:22rem}
.boot-splash__title{display:flex;flex-direction:column;align-items:center;margin:0;font-family:var(--font-arcade),ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:clamp(1.85rem,8vw,2.6rem);line-height:1.05;letter-spacing:.04em;text-transform:uppercase;color:#3dff88;text-shadow:0 0 12px #3dff88b3,0 0 36px #3dff8859}
.boot-splash__tag{display:inline-block;margin:.65rem 0 0;padding:.35rem 1.1rem;font-family:var(--font-arcade),ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:.95rem;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:#ff4fd8;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);box-shadow:0 0 10px #ff4fd88c}
.boot-splash__spin-wrap{width:72px;height:72px;animation:boot-spin .85s linear infinite}
.boot-splash__spinner{width:100%;height:100%;border:5px solid #3dff8838;border-top-color:#3dff88;border-radius:50%;box-shadow:0 0 18px #3dff8866}
.boot-splash__status{margin:0;font-family:var(--font-body),ui-sans-serif,system-ui,sans-serif;font-weight:700;font-size:1.05rem;line-height:1.35;color:#93a5be}
@keyframes boot-spin{to{transform:rotate(360deg)}}
@keyframes boot-pulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.boot-splash__spin-wrap{animation:boot-pulse 1.4s ease-in-out infinite}}
`.trim();
