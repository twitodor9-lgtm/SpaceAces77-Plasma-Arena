# HANDOFF — Plasma Arena v0.4.0-dev (Arcade Feel & Balance)

סטטוס: Milestone 1 (Feel) + Milestone 2 (Validation) הושלמו. Build + HTML אופליין מעודכן. 6 playtests מקלדת תועדו. מיקום בקמפיין / כוח / דמות עדיין פתוחים.

| אחריות | מקור |
|---|---|
| הרכבת סיבוב, שעון הופעה, מעבר בין גלים | `plasma-arena/src/app/gameScene.ts` |
| קלט אמיתי, מגע וקלט אבחון | `src/player/controls.ts`, `src/core/probe.ts` |
| ולידציה, קטלוגים ומצב סיבוב | `src/core/`, `data/` |
| תנועה, התפצלות, נשק וסכנות | `src/behaviors/`, `src/hazards/`, `src/weapons/` |
| יצוא אירועים ו־HUD | `src/core/telemetry.ts`, `src/ui/` |

`plasma-arena-mission` נשמר כ־hook מקומי. מזהי הזירות, הגושים, הנשקים והסכנות המקוריים נשמרו. סכמה זו ממשיכה את נתוני Grok, עם ולידציה מחמירה יותר לערכים שהמימוש דורש. אירועי טלמטריה בגרסה 1 זמינים ב־`?qa`. זמני האירועים הם יחסיים לפתיחת הסיבוב, עם תקרה של 5,000 אירועים ומונה פריטים שהושמטו.

## שחזור

חלצו את `original/grok-plasma-arena.zip` לתיקייה נפרדת. `audit/INPUT_MANIFEST.json` מתעד את מקור הקלט. בדיקות ה־baseline ב־`audit/` נשמרו. `docs/` ו־`design/` משמרים את היסטוריית הביקורת והאפיון. הדוח העדכני הוא `QA_TECHNICAL.md` שבשורש.

## המשך

- Milestone 1+2 הושלמו: Feel tuning + validation playtests + offline HTML.
- עדיין נדרש מבעלים: סיבובי ניצחון אנושיים (יעד מנחה 90–180s), מגע פיזי, Safari/Firefox, מצב אנרגיה מעמיק.
- אין Merge ל־main. Draft PR אופציונלי אחרי סבב בעלים.
