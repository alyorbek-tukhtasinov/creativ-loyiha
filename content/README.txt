╔══════════════════════════════════════════════════════════════╗
║         HEARTQUEST - SAVOLLARNI TAHRIRLASH QO'LLANMASI       ║
╚══════════════════════════════════════════════════════════════╝

Salom! Bu papkadagi fayllarni tahrirlash orqali o'yinni o'zingizga
moslashtirish mumkin. Hech qanday dasturlash bilimlari shart emas!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 FAYLLAR TAVSIFI:
  • categories.json    - Barcha kategoriyalar ro'yxati
  • cat-date.json      - "Uchrashuvga taklif" savollari
  • cat-love.json      - "Sevgi e'tirofi" savollari
  • cat-longdistance.json - "Uzoqdagi sevgi" savollari
  • cat-memory.json    - "Xotiralar" savollari
  • cat-future.json    - "Kelajak rejalari" savollari
  • cat-apology.json   - "Kechirim so'rash" savollari
  • cat-birthday.json  - "Tug'ilgan kun" savollari
  • cat-anniversary.json - "Yillik nishon" savollari
  • cat-flirt.json     - "Flirt" savollari
  • cat-custom.json    - "Maxsus" (to'liq moslashtirish)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 SAVOL QO'SHISH UCHUN:

1. Tegishli cat-*.json faylini oching (masalan: cat-date.json)
2. "questions" bo'limini toping
3. Yangi savol qo'shing, namuna:

{
  "id": 11,
  "text": "Sevimli rangingiz qaysi?",
  "emoji": "🎨",
  "correctIndex": 2,
  "options": [
    "Qora",
    "Oq",
    "Pushti",
    "Ko'k"
  ],
  "wrongMessage": "Yo'q-yo'q, boshqasi! 😄",
  "correctMessage": "Ha, bilardim! 💕"
}

MUHIM ESLATMALAR:
  ✅ "correctIndex" 0 dan boshlanadi:
     0 = birinchi variant (Qora)
     1 = ikkinchi variant (Oq)
     2 = uchinchi variant (Pushti) ← to'g'ri javob
     3 = to'rtinchi variant (Ko'k)

  ✅ Har bir savolning "id" raqami boshqacha bo'lishi kerak
  ✅ To'rttadan ko'p variant qo'shish mumkin emas
  ✅ Faqat bitta to'g'ri javob bo'lishi kerak

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 KATEGORIYA RANGINI O'ZGARTIRISH:

categories.json faylini oching va tegishli kategoriyaning
"color" maydonini o'zgartiring:

"color": "#FF6B9D"   ← shu yerda rangni o'zgartiring
                        (masalan: "#FF0000" = qizil)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎁 OXIRGI SOVG'ANI O'ZGARTIRISH:

categories.json → "endReward" → "details" maydonini toping:

"details": "2 kishi • [LOCATION] • [DATE]"
                       ↑              ↑
               Joyni yozing    Sanani yozing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✏️ NOMLARNI O'ZGARTIRISH:

cat-*.json faylida:
  "senderName": "Sardor"    ← kimdan yuborilmoqda
  "receiverName": "Malika"  ← kimga yuborilmoqda

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  XATOLARDAN SAQLANING:
  ❌ Vergulni unutmang { "key": "value" [VERGUL KERAK] "key2": ... }
  ❌ Qo'shtirnoqlarni yoping: "matn" (ikkalasi ham kerak)
  ❌ Oxirgi elementdan keyin vergul qo'ymang

Saqlash tugmasini bosish ✓ (Ctrl+S)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Savol bo'lsa: admin panelidan foydalaning → /admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
