import { BOOT_BG } from "./bootSplashStyles";

/**
 * Branded landing shown while the app bootstraps. Covering styles are inline
 * so the first paint is dark even before the stylesheet arrives.
 */
export default function BootSplash({ id }: { id?: string }) {
  return (
    <main
      id={id}
      className="boot-splash"
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background: BOOT_BG,
        color: "#EAF2FF",
        margin: 0,
      }}
    >
      <div className="boot-splash__glow" aria-hidden />
      <div className="boot-splash__card">
        <h1 className="boot-splash__title">
          Greta&apos;s Games
          <span className="boot-splash__tag" aria-hidden="true">
            for fun!
          </span>
        </h1>
        <div className="boot-splash__spin-wrap" aria-hidden>
          <div className="boot-splash__spinner" />
        </div>
        <p className="boot-splash__status">Greta&apos;s Games for Fun is loading</p>
      </div>
    </main>
  );
}
