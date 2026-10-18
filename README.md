# Testna stran: Toyota GR Yaris se obrne ob scrollu

## Datoteke
- `index.html`: struktura in besedila zgoraj desno (spredaj / bok / zadaj)
- `style.css`: barve, svetli/temni način, posterska postavitev
- `script.js`: 3D scena, nalaganje GLB, obračanje ob scrollu. Nastavitve so na vrhu v `CONFIG`.
- `toyota-gr-yaris-rally1.glb`: tvoj model, stisnjen s 27 MB na 8 MB (teksture 2048 px, WebP)
- `skoda-fabia-rally2.stl`: prejšnji model (Fabia), trenutno ni v uporabi.

## Kako zagnati
Brskalnik ne prebere modela, če stran odpreš z dvoklikom (file://). Zaženi jo prek lokalnega strežnika:
v VS Code namesti razširitev **Live Server** in klikni "Go Live", ali v tej mapi v terminalu `npx serve`.

## Kaj lahko spreminjaš
- Besedila: v `index.html` pri `<article class="caption">`.
- Drug avto: daj `.glb` v mapo in spremeni `modelUrl`. Če gleda nazaj, nastavi `modelTurnDeg: 180`.
