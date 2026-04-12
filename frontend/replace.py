import re
import os

path = r"c:\Users\user\Desktop\Новая папка\frontend\src\components\chat\ChatWindow.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    # Call Interface
    ('aria-label="Rad etish"', 'aria-label={t("reject")}'),
    ('>Rad etish</span>', '>{t("reject")}</span>'),
    ('aria-label="Qabul qilish"', 'aria-label={t("accept")}'),
    ('>Qabul qilish</span>', '>{t("accept")}</span>'),
    ('>Kamera</span>', '>{t("camera")}</span>'),
    ('aria-label="Chiqish"', 'aria-label={t("exit")}'),
    ("{isMuted ? 'Mikrofon OFF' : 'Mikrofon ON'}", "{isMuted ? t('mic_off') : t('mic_on')}"),
    
    # Pre-call Modal
    ("{pendingCallType === 'video' ? 'Video chaqiruv' : 'Ovozli chaqiruv'}", "{pendingCallType === 'video' ? t('video_call') : t('voice_call')}"),
    ("Past tezlik rejimi yoqilganligi sababli bu qo‘ng‘iroq <span className=\"font-semibold\">audio</span> sifatida boshlanadi.", "Past tezlik rejimi yoqilganligi sababli bu qo‘ng‘iroq <span className=\"font-semibold\">audio</span> sifatida boshlanadi. {/* TODO translate */}"),
    ("Past tezlik rejimi</p>", "Low bandwidth mode</p> {/* TODO translate */}"),
    ("Sezilarli kechikish bo‘lsa, faqat audio rejimga o‘tadi.", "If there is significant delay, it will switch to audio-only mode. {/* TODO translate */}"),
    (">Bekor qilish</button>", ">{t('cancel')}</button>"),
    (">Boshlash</button>", ">{t('accept')}</button>"), # t('accept') or start equivalent
    
    # Forward Modal
    (">Xabarni kimga yuborish?</h2>", ">{t('forward_to') || 'Xabarni kimga yuborish?'}</h2>"),
    (">Boshqa chatlar yo‘q. Kontakt qo‘shing yoki mavjud chatni tanlang.</p>", ">{t('no_other_chats') || 'Boshqa chatlar yo‘q. Kontakt qo‘shing yoki mavjud chatni tanlang.'}</p>"),
    
    # Other Modals
    (">Fayllar yuklanmoqda...</span>", ">{t('translating') || 'Fayllar yuklanmoqda...'}</span>"), # Need uploading key maybe t('loading') ?
    (">Suhbatni tanlang</div>", ">{t('select_chat') || 'Suhbatni tanlang'}</div>"),
    ("ta xabar tanlandi</span>", "ta xabar tanlandi</span>"),
    (">O'chirish</span>", ">{t('delete_messages') || \"O'chirish\"}</span>"),
    (("{isTrade ? 'Savdo Chati' : (isOnlineHeader ? 'Onlayn' : 'Oflayn')}"), ("{isTrade ? t('trade_dialog') : (isOnlineHeader ? t('online') : t('offline'))}")),
    ("placeholder=\"Matn bo'yicha qidirish...\"", "placeholder={t('search_messages') || \"Matn bo'yicha qidirish...\"}"),
    (">Hammasi</option>", ">{t('all')}</option>"),
    (">Matn</option>", ">{t('text') || 'Matn'}</option>"),
    (">Media</option>", ">{t('media') || 'Media'}</option>"),
    (">Fayllar</option>", ">{t('files') || 'Fayllar'}</option>"),
    ("title=\"Boshlanish sana\"", "title={t('start_date') || 'Boshlanish sana'}"),
    ("title=\"Tugash sana\"", "title={t('end_date') || 'Tugash sana'}"),
    ("title=\"Qidiruv\"", "title={t('search') || 'Qidiruv'}"),
    ("title=\"Ovozli chaqiruv\"", "title={t('voice_call')}"),
    ("title=\"Videochaqiruv\"", "title={t('video_call')}"),
    (">Xabarlarni tanlash</span>", ">{t('select_messages') || 'Xabarlarni tanlash'}</span>"),
    ("{isSummarizing ? 'Qisqachalanmoqda…' : 'AI xulosa'}", "{isSummarizing ? (t('translating') || 'Qisqachalanmoqda…') : (t('ai_summary') || 'AI xulosa')}"),
    (">Profilni ko'rsatish</span>", ">{t('show_profile') || \"Profilni ko'rsatish\"}</span>"),
    (">Chat tarixini eksport qilish</span>", ">{t('export_history') || 'Chat tarixini eksport qilish'}</span>"),
    (">Tarixni tozalash</span>", ">{t('clear_history')}</span>"),
    (">Chatni o'chirish</span>", ">{t('delete_chat')}</span>"),
    ("Foydalanuvchi bloklandi", "Foydalanuvchi bloklandi")
]

for old_str, new_str in replacements:
    content = content.replace(old_str, new_str)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Replacements applied successfully.")
