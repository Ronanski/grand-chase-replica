# Grand Chase Replica (fan-made)

Side-scrolling action RPG inspired by Grand Chase, para sa Android. Original na art at code ang lahat (walang assets ng KOG).

## Laman
- `game/`: ang HTML5 game (canvas + JS). Ito ang na-hot-patch nang hindi nagre-reinstall.
- `android/`: Kotlin app shell (WebView) + in-app updater.
- `site/`: landing page sa GitHub Pages.
- `.github/workflows/release.yml`: build, release, at deploy.

## Paano gumagana ang updates
| Event | Resulta |
|---|---|
| Push sa `main` | Bagong **BETA** build (APK + game patch) sa Pages |
| Actions → *Build & Release* → Run → `stable` | I-promote ang current `main` sa **STABLE** |

Sa loob ng app:
- **Game patch**: tatanungin muna ang player bago mag-download (o naka-auto kung in-on ang auto-patch). Na-a-apply pagka-restart ng game.
- **App update**: dina-download at ini-install sa loob mismo ng app (PackageInstaller), walang browser. Isang beses lang ia-allow ang "Install unknown apps".
- **Channel**: Settings → Channel (Stable/Beta).

Manifests: `https://ronanski.github.io/grand-chase-replica/{stable|beta}/manifest.json`

## Signing key
Unang build: gagawa ang CI ng signing key at itatabi sa isang **private draft release** na `signing-key`. **Huwag burahin**, kasi kapag nawala 'yan, hindi na mag-a-update ang mga naka-install na app.
Para gumamit ng sariling key: mag-set ng repo secrets `KEYSTORE_BASE64` at `KEYSTORE_PASSWORD` (alias `gcreplica`).

## Controls (keyboard / web)
Arrows = galaw, Up/X/Space = talon (2x = double jump), Down+Jump = baba sa platform, Z = attack combo, Shift o double-tap = dash, A/S/D = skills (1/2/3 MP bars), C = potion, Esc = pause.
Sa phone: virtual joystick + buttons.
