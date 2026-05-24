# 4 på stribe

Et browserbaseret Connect Four-spil med tre spiltilstande — spil lokalt, mod computeren eller online mod en ven.

**[Spil nu →](https://marurup.github.io/in-a-row-game/)**

## Funktioner

- **Lokal 2-spiller** — skiftes på samme enhed
- **Mod computer** — AI der vinder hvis den kan og blokerer hvis nødvendigt
- **Online multiplayer** — P2P via PeerJS med 6-tegns rum-kode; ingen server nødvendig
- **PWA** — kan installeres på telefon og tablet, virker offline
- **Husker navne** — gemmer spillernavne mellem sessioner via `localStorage`

## Teknisk

Bygget med vanilla JavaScript uden frameworks eller build-trin.

| Fil | Indhold |
|-----|---------|
| `public/index.html` | Alle skærmbilleder i én fil |
| `public/js/game.js` | Al spilLogik (state, board, AI, netværk, rendering) |
| `public/css/style.css` | CSS custom properties, minimalistisk design |
| `public/sw.js` | Service worker — stale-while-revalidate cache |
| `tests/test-logic.js` | Node.js-tests for board-logik og AI |

Online multiplayer bruger [PeerJS](https://peerjs.com/) (WebRTC P2P) — kommunikationen går direkte mellem browserne, ingen spilserver.

## Kom i gang lokalt

```bash
npx serve public
```

Åbn derefter `http://localhost:3000`.

## Tests

```bash
node tests/test-logic.js
```

## Deploy

GitHub Actions deployer automatisk `public/`-mappen til GitHub Pages ved push til `main`. Se [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Licens

[MIT](LICENSE)
