# Rescue Match — Stage 5 FIXED

На скриншоте была проблема с загрузкой ассетов: браузер показывал сломанные текстуры вместо tiles/персонажа.  
В этой версии все игровые изображения для Stage 5 — PNG/WebP с простыми относительными путями; SVG больше не используется.

## Stage 5
- 8×8 Match-3
- 6 типов элементов
- swap соседних клеток
- отмена неправильного swap
- match 3+
- destruction
- gravity
- refill
- cascades
- 25 ходов
- цель 12
- desktop/mobile resize
- пиратский фон
- пиратка на сцене

## Запуск
npm install
npm run dev

Для Vercel можно раздавать папку проекта как static app; index.html находится в корне.

Следом: Stage 6 — special tiles.
