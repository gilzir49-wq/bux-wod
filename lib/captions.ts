// Branded one-liner captions, rotated for sharing. Mix of Hebrew & English.
export const CAPTIONS: string[] = [
  'Crushed it anywhere. Let’s Go BUX 🦌',
  'אין תירוצים. רק תוצאות. 🦌',
  'Trained today. Future me says thanks. 🦌',
  'הקופסה היא בכל מקום. Let’s Go BUX 🦌',
  'No box? No problem. 🦌💪',
  'התאמנתי איפה שאני. בלי תירוצים. 🦌',
  'Sweat now, shine later. Let’s Go BUX 🦌',
  'מיליום, חופשה, בית — תמיד אפשר להתאמן. 🦌',
  'Strong is a choice. I chose it today. 🦌',
  'הזעתי. ניצחתי. Let’s Go BUX 🦌',
  'Anywhere. Anytime. BUX style. 🦌',
  'הגוף שלי תודה לי מחר. 🦌',
  'One workout closer. Let’s Go BUX 🦌',
  'כל אימון נחשב. גם הקטן. 🦌',
  'Earned, not given. 🦌 #BUX',
];

export function randomCaption(): string {
  return CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
}
