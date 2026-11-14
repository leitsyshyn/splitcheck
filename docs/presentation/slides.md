---
marp: true
size: 16:9
paginate: true
lang: uk
title: splitcheck
style: |
  @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
  :root { --ink:#1d1b16; --soft:#6b655a; --paper:#f6f1e7; --card:#fffdf8; --line:#ddd3bf; --tomato:#e4572e; }
  section {
    background: var(--paper);
    color: var(--ink);
    font-family: 'Manrope', sans-serif;
    font-size: 28px;
    padding: 64px 80px;
    align-content: start !important;
  }
  h1 { font-family: 'Unbounded', sans-serif; font-weight: 800; font-size: 48px; letter-spacing: -0.02em; margin: 0 0 36px; color: var(--ink); }
  em { color: var(--tomato); font-style: normal; }
  strong { font-weight: 800; }
  code { font-family: 'JetBrains Mono', monospace; font-size: .85em; background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; }
  pre { background: var(--ink); border-radius: 14px; padding: 20px 24px; margin: 0; font-size: 18px; line-height: 1.5; }
  pre code { background: none; border: 0; padding: 0; color: var(--paper); font-size: 1em; }
  .hljs-string { color: #f4b393; } .hljs-attr { color: #9fd3e6; } .hljs-number, .hljs-literal { color: #b8e0a5; } .hljs-title, .hljs-property { color: #f6f1e7; }
  table { width: 100%; border-collapse: collapse; font-size: 24px; background: transparent; }
  table tr, table th, table td { background: transparent !important; border-left: 0; border-right: 0; border-top: 0; }
  th { text-align: left; color: var(--soft); font-weight: 600; font-size: 18px; text-transform: uppercase; letter-spacing: .08em; padding: 0 16px 10px 0; border-bottom: 2px solid var(--ink); background: none; }
  td { padding: 14px 16px 14px 0; border-bottom: 1px solid var(--line); background: none; vertical-align: top; }
  ol, ul { margin: 0; padding-left: 1.2em; } li { margin: 12px 0; } li::marker { color: var(--tomato); font-weight: 800; }
  img { display: block; }
  section::after { font-family: 'JetBrains Mono'; font-size: 16px; color: var(--soft); right: 80px; bottom: 32px; }
  .cols { display: grid; gap: 40px; grid-template-columns: 1fr 1fr; align-items: start; }
  .phones { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .phones img { width: 100%; height: 500px; object-fit: cover; object-position: top; border-radius: 20px; border: 1px solid var(--line); }
  .stat { font-family: 'Unbounded'; font-weight: 800; font-size: 44px; color: var(--tomato); }
  section.title { align-content: center !important; }
  section.title h1 { font-size: 104px; margin: 0; }
  section.title::after { display: none; }
  section.video { padding: 0; background: url(img/demo-poster.jpg) center / cover; }
  section.video video { display: block; width: 1280px; height: 720px; }
  @media print { section.video video { visibility: hidden; } }
---

<!-- _class: title -->

# splitcheck

<p style="font-size:40px;font-weight:700;margin:20px 0 64px">Один чек. <em>Кожен платить</em> за своє.</p>

Тимофій Лейцишин · ТТП-42

---

# Суть

<div class="cols">
<div>

1. Фото чека → **Gemini** розбирає на позиції
2. Друзі сканують **QR** і відмічають своє
3. Кожен бачить свою частку **наживо**
4. Сервіс і знижка — **пропорційно**

</div>
<div>

**Де застосувати**

- Ресторани, бари, кафе
- Подорожі: чеки в іншій валюті
- Спільні покупки

</div>
</div>

---

# API

| Сервіс | Роль | Виклик |
|---|---|---|
| **Vertex AI · Gemini** | Розпізнає чек | `generateContent` + JSON-схема |
| **Firestore** | Кімнати й відмітки, realtime | `arrayUnion` · `onSnapshot` |
| **Cloud Storage** | Фото чеків | `file.save` · `gs://` |
| **Cloud Run** | Хостинг застосунку | `gcloud run deploy --source .` |
| **API НБУ** | Курс валют | `GET /NBUStatService/v1/statdir/exchange` |

---

# Архітектура

<img src="diagrams/architecture.png" style="width:100%;margin-top:60px" />

---

# Взаємодія

<img src="diagrams/flow.png" style="height:540px;margin:0 auto" />

---

# Gemini: запит і відповідь

<div class="cols">

```ts
ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: [{ role: "user", parts: [
    { fileData: { fileUri: "gs://…/x.png" } },
    { text: PROMPT },
  ]}],
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: receiptSchema,
    thinkingConfig: { thinkingLevel: "LOW" },
  },
})
```

```json
{
  "merchant": "Кафе «Варенична №1»",
  "currency": "UAH",
  "items": [{
    "name": "Пиво Львівське 0.5",
    "quantity": 2,
    "line_total": 178.00,
    "box_2d": [366, 123, 426, 950]
  }],
  "service_and_tip": 117.90,
  "total": 1296.90
}
```

</div>

<div style="display:flex;gap:80px;margin-top:36px">
<div><div class="stat">≈3.5 с</div>на чек</div>
<div><div class="stat">8 / 8</div>позицій розпізнано</div>
<div><div class="stat">≈2.5k</div>токенів</div>
</div>

---

# Результат

<div class="phones">
<img src="../review-mobile.png" />
<img src="../room-mobile.png" />
<img src="../summary-mobile.png" />
</div>

---

<!-- _class: video -->
<!-- _paginate: skip -->

<video src="demo.mp4" poster="img/demo-poster.jpg" controls muted playsinline preload="auto"></video>

---

<!-- _class: title -->

<div style="display:grid;grid-template-columns:260px 1fr;gap:56px;align-items:center">
<img src="img/qr-github.svg" style="width:260px;border-radius:16px" />
<div>
<p style="font-family:'JetBrains Mono';font-size:32px;font-weight:700;margin:0">github.com/leitsyshyn/splitcheck</p>
<h1 style="font-size:64px;margin-top:40px">Дякую!</h1>
</div>
</div>
