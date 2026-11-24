# Plasma Arena — חוזה תוכן נתוני v0.1

הקבצים ב־`examples/` מציגים **מבנה מומלץ**, לא schema מחייב של מימוש קיים. בעת הפיתוח יש להגדיר סכמה אמיתית ולהציע מיגרציה ב־HANDOFF אם יוחלף המבנה.

## חוזי נתונים
- `entity`: מזהה יציב, assetId, רכיבי תנועה/נזק/התחלקות ומקשי behavior נתמכים.
- `weapon`: מזהה יציב, mode, cooldown, קליע, פגיעה, עלות אנרגיה אופציונלית.
- `hazard`: behavior type, מיקום/מקטע, trigger/telegraph/cooldown.
- `arena`: מאפייני זירה, spawn zones, מכשולים, הגדרת גלים, תנאי ניצחון.
- `asset catalog`: assetId → נתיב נכס, הגדרות scale/anchor/collision fallback. תצוגה לא קובעת פיזיקה.

## מבנה קוד רצוי
```text
src/
  app/           # bootstrap, lifecycle, scene composition
  core/          # events, config validation, fixed timestep if needed
  player/        # controls, movement, damage
  weapons/       # weapon factory, projectiles, cooldown
  hazards/       # hazard registry, split/telegraph rules
  behaviors/     # reusable motion and attack behaviors
  stages/        # arena factory, waves, win/lose, progression
  assets/        # catalog and placeholder/real assets
  ui/            # HUD and menus
data/
  arenas/        # independent arena definitions
  entities/      # plasma/enemies
  weapons/       # each weapon config
  hazards/       # stage hazards
  balance.json
```

## בדיקות חוזה
1. הצהרות JSON עוברות ולידציה עם שגיאה מועילה, במיוחד IDs שבורים.
2. הוספת `new_plasma` שמבוססת על `bounce` ו־`split` מופיעה ללא שינוי קוד ליבה.
3. עריכת `splitChildren` משנה את תוצאות ההתפצלות.
4. זירה נוספת נטענת על ידי שינוי מזהה זירה או תפריט ניפוי.
5. אין לולאת התפצלות אינסופית, spawn של עשרות גופים בפריים או טעינה של נכס מרוחק.

**חשוב:** לא נדרשת מערכת נתונים דינמית בזמן ריצה אם זה מחייב תשתית גדולה. עריכת JSON ואחריה Build תקין היא עדיין הרחבת תוכן בלי שינוי קוד מקור. 
