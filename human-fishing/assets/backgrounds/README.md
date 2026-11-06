# Human Fishing – Painted region backgrounds

## Runtime invariant

- Game logical canvas: 1280×720; bitmap water surface anchored at Y=293 exactly.
- All scene bitmaps are baked at 1280×720 for a distortion-free, single drawImage().
- All character sprites, fish, lure, FX, and UI remain separate layers.
- Aquarium glass scene continues to use its dedicated existing drawing path.

## Regions (0-based internal zone -> bitmap basename)
0 열대 수초 수조 → bg_freshwater_planted.webp
1 아마존 유역 → bg_amazon.webp
2 아프리카 호수·강 → bg_african_lake.webp
3 아시아 강·습지 → bg_asian_wetland.webp
4 냉수 강·호수 → bg_alpine_lake.webp
5 동아시아 담수 → bg_east_asia.webp
6 열대 산호초 → bg_tropical.webp (previously approved)
7 해초·모래 바다 → bg_seagrass.webp
8 온대 연안 → bg_harbor.webp (previously approved)
9 외양·대형 어종 → bg_open_ocean.webp
10 심해·발광 → bg_moonlight.webp (previously approved)
11 한대·냉해 → bg_alpine_lake.webp (temporary shared cold-water background; future dedicated polar scene recommended)

Previous `bg_ruins.webp` remains available in source control, but is not assigned to an unrelated habitat.

## Artwork

Each 2026-11-06 new scene is based on the corresponding individually generated full-size PNG.
The original water horizon was remapped to 293px. Each image is converted to a high-quality WebP. No UI, fish or player graphics are baked into the images.
