# Site cache — decisions

## 2026-10-26

| ID | Decision | Why | Rejected |
| --- | --- | --- | --- |
| D-01 | HTML navigations wait for the network. A saved page is only used when `fetch` fails. The cache name is `v3`. | A fresh deploy on Azure is slow. After 1.2s the worker served the previous page, whose chunk URLs 404. A reload was warm and arrived in time, so the second try worked. | Keeping the timer and only reloading on the error. Precaching `/` and `/adventure`. |
| D-02 | The root layout reloads the tab once on `ChunkLoadError` / `Loading chunk … failed`. The flag lives in `sessionStorage` and is cleared on `load`. | A tab still controlled by the previous worker can hit this once more after the fix ships. The script is inline so it runs before the app chunks. | An infinite reload. Handling it only inside React, which may not have mounted yet. |
