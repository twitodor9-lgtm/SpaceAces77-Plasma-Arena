# SpaceAces77 — Plasma Arena v0.3.0

משחק ארקייד עצמאי ב־Phaser 3.90.0, על בסיס מקור Grok ששוחזר בחבילת Work v0.2. זו זירת הלחימה של Plasma Arena.

## הפעלה מהירה

חלצו את ה־ZIP ופתחו את **Plasma_Arena.html** בדפדפן. המשחק וקובצי הנתונים משובצים ב־HTML. הוראות שליטה ב־[PLAY_HE.md](PLAY_HE.md).

## עבודה על המקור

נבדק ב־Node 24.22.3. הפעילו מתוך שורש החבילה:

```sh
cd plasma-arena
npm ci
npm run check
```

הפקודות בודקות TypeScript, מריצות את בדיקות הליבה ומייצרות את `plasma-arena/dist/Plasma_Arena.html`. העתיקו את הקובץ הזה לשורש החבילה בעת אריזה מחדש. `npm run dev` מפעיל את סביבת הפיתוח המקומית.

- [HOW_TO_ADD_CONTENT_HE.md](HOW_TO_ADD_CONTENT_HE.md) — הוספת תוכן מ־JSON.
- [QA_TECHNICAL.md](QA_TECHNICAL.md) — תוצאות בדיקה, מגבלות ושחזור.
- [HANDOFF.md](HANDOFF.md) — נקודת המשך ואחריות המודולים.
- [CHANGELOG.md](CHANGELOG.md) — שינויים מהמקור.
- `qa/` — פלטי בדיקות, צילומי מסך וטלמטריה.
- `original/` — קלט המקור והעיצוב לשחזור.
- `licenses/` — הודעות הרישיון של תלויות המשחק.


GitHub import: historical original/ and audit/ archives, QA evidence folder and wider campaign map are retained in the original offline ZIP, not included in this public source import. QA claims refer to that release.
