/**
 * Demo job listings — har bir job_categories qatori uchun 2 e'lon
 * (ish beruvchi + izlovchi). Qayta ishga tushirish: avvalgi demo o‘chiriladi.
 *
 *   node scripts/seed-demo-jobs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');

const raw = process.env.DATABASE_URL || '';
const ssl = /localhost|127\.0\.0\.1/i.test(raw) ? false : { rejectUnauthorized: false };

const DEMO = {
  source: 'demo-seed',
};

/** @type {Record<number, { employer: object, seeker: object }>} */
const byCategory = {
  1: {
    employer: {
      title: 'Yurist (fuqarolik ishlari)',
      company_name: 'Adolat Law Group',
      responsible_person: 'Nilufar Saidova',
      location: 'Toshkent',
      type: 'online',
      work_type: 'full-time',
      work_hours: '09:00 – 18:00',
      salary_text: '10–14 mln so‘m',
      short_text:
        'Shartnomalar, da’vo arizalari va korporativ maslahat. Tajriba 3+ yil, o‘zbek va rus tillari.',
      requirements_json: { list: ['Oliy yuridik ma’lumot', '3+ yil tajriba', 'Sud amaliyoti'] },
    },
    seeker: {
      title: 'Huquqshunos — maslahat beraman',
      full_name: 'Aziz Karimov',
      location: 'Toshkent / online',
      type: 'online',
      experience_years: 5,
      salary_min: 8000000,
      short_text: 'Fuqarolik va oilaviy nizolar bo‘yicha maslahat. Online konsultatsiya.',
      skills_json: { list: ['Fuqarolik kodeksi', 'Shartnoma', 'Mediatsiya'] },
      has_diploma: true,
    },
  },
  2: {
    employer: {
      title: 'Klinik psixolog',
      company_name: 'Nafas Markazi',
      responsible_person: 'Dilnoza Yusupova',
      location: 'Toshkent',
      type: 'online',
      work_type: 'part-time',
      work_hours: '11:00 – 19:00',
      salary_text: 'Seansiga 150–250 ming',
      short_text: 'Kattalar bilan individual seanslar. Haftasiga 3 kun, online yoki ofis.',
      requirements_json: { list: ['Psixologiya diplomi', 'Superviziya tajribasi'] },
    },
    seeker: {
      title: 'Psixolog — oilaviy maslahat',
      full_name: 'Madina Rahimova',
      location: 'Samarqand / online',
      type: 'online',
      experience_years: 4,
      salary_min: 120000,
      short_text: 'Stress, tashvish va juftlik masalalari. Birinchi suhbat bepul tanishuv.',
      skills_json: { list: ['KBT', 'Oilaviy terapiya'] },
      has_diploma: true,
      has_certificate: true,
    },
  },
  3: {
    employer: {
      title: 'Matematika repetitori',
      company_name: 'Ziyo Maktab',
      responsible_person: 'Jasur Aliyev',
      location: 'Toshkent',
      type: 'online',
      work_type: 'part-time',
      work_hours: '16:00 – 20:00',
      salary_text: 'Soatiga 80–120 ming',
      short_text: '9–11 sinf, DTM ga tayyorlov. Guruh 4–6 o‘quvchi, haftasiga 3 dars.',
      requirements_json: { list: ['DTM natijalari', 'Pedagogika'] },
    },
    seeker: {
      title: 'Ingliz tili o‘qituvchisi',
      full_name: 'Sevara Toshpo‘latova',
      location: 'Online',
      type: 'online',
      experience_years: 6,
      salary_min: 100000,
      short_text: 'IELTS 7.5. Bolalar va kattalar uchun individual darslar.',
      skills_json: { list: ['IELTS', 'General English', 'Zoom'] },
      has_certificate: true,
    },
  },
  4: {
    employer: {
      title: 'Santexnik (uy-joy)',
      company_name: 'UyServis',
      responsible_person: 'Bekzod Ergashev',
      location: 'Toshkent, Yunusobod',
      type: 'offline',
      work_type: 'shift',
      work_hours: '08:00 – 17:00',
      salary_text: '5–7 mln so‘m + chaqiriq',
      short_text: 'Quvur, kran, unitaz, qozon. O‘z asboblari bo‘lsa afzal.',
      requirements_json: { list: ['2+ yil', 'O‘z asbob-uskuna'] },
    },
    seeker: {
      title: 'Santexnik — chaqiriqqa boraman',
      full_name: 'Olimjon Nazarov',
      location: 'Toshkent',
      type: 'offline',
      experience_years: 8,
      salary_min: 150000,
      short_text: 'Shoshilinch ta’mir, filtr o‘rnatish. Toshkent bo‘ylab.',
      skills_json: { list: ['PVC', 'PPR', 'Qozon'] },
    },
  },
  5: {
    employer: {
      title: 'Elektrik-montajchi',
      company_name: 'Nur Elektro',
      responsible_person: 'Sardor Qodirov',
      location: 'Toshkent',
      type: 'offline',
      work_type: 'full-time',
      work_hours: '08:00 – 17:00',
      salary_text: '6–9 mln so‘m',
      short_text: 'Yangi qurilishda elektr tarmog‘i, щиток, yoritish. 5/2.',
      requirements_json: { list: ['3-guruh ruxsatnoma', 'Chizma o‘qish'] },
    },
    seeker: {
      title: 'Uy elektrigi',
      full_name: 'Rustam Jo‘rayev',
      location: 'Chirchiq / Toshkent',
      type: 'offline',
      experience_years: 10,
      salary_min: 200000,
      short_text: 'Rozetka, chandelier, hisoblagich. Kechki chaqiriqlar ham.',
      skills_json: { list: ['220V', 'LED', 'Hisoblagich'] },
      has_certificate: true,
    },
  },
  6: {
    employer: {
      title: 'Uy ta’miri ustasi',
      company_name: 'Qulay Uy',
      responsible_person: 'Malika Usmonova',
      location: 'Samarqand',
      type: 'offline',
      work_type: 'full-time',
      work_hours: '09:00 – 18:00',
      salary_text: 'Kelishiladi (obyekt bo‘yicha)',
      short_text: 'Gipsokarton, bo‘yoq, kafel. Brigada 2–3 kishi.',
      requirements_json: { list: ['Portfolio', 'O‘z asbobi'] },
    },
    seeker: {
      title: 'Universal remontchi',
      full_name: 'Islom Abdullayev',
      location: 'Samarqand',
      type: 'offline',
      experience_years: 7,
      salary_min: 180000,
      short_text: 'Kichik ta’mir: eshik, pol, bo‘yoq. Kunlik yoki obyekt.',
      skills_json: { list: ['Bo‘yoq', 'Kafel', 'Gips'] },
    },
  },
  7: {
    employer: {
      title: 'To‘y videografi',
      company_name: 'Moment Studio',
      responsible_person: 'Kamola Norboyeva',
      location: 'Toshkent',
      type: 'offline',
      work_type: 'shift',
      work_hours: 'Dam olish kunlari',
      salary_text: 'Tadbiriga 2–4 mln',
      short_text: 'To‘y va event. O‘z kamerasi (Sony/Canon) bo‘lishi shart.',
      requirements_json: { list: ['Showreel', 'Full-frame kamera'] },
    },
    seeker: {
      title: 'Fotograf — portret va content',
      full_name: 'Iroda Mahmudova',
      location: 'Toshkent / online retush',
      type: 'online',
      experience_years: 3,
      salary_min: 500000,
      short_text: 'Brend kontenti, oilaviy fotosessiya. Lightroom retush.',
      skills_json: { list: ['Portrait', 'Lightroom', 'Reels'] },
    },
  },
  8: {
    employer: {
      title: 'Avtoservis diagnost',
      company_name: 'AvtoLine Servis',
      responsible_person: 'Shuhrat Tursunov',
      location: 'Toshkent, Sergeli',
      type: 'offline',
      work_type: 'full-time',
      work_hours: '09:00 – 19:00',
      salary_text: '7–10 mln so‘m',
      short_text: 'Injector, elektrika, kompyuter diagnostika. Launch/Bosch.',
      requirements_json: { list: ['Diagnostika skaner', '2+ yil'] },
    },
    seeker: {
      title: 'Moy almashtirish / xodovoy',
      full_name: 'Jahongir Sobirov',
      location: 'Toshkent',
      type: 'offline',
      experience_years: 5,
      salary_min: 250000,
      short_text: 'Moy, filtr, tormoz kolodka. Garajim bor — kelib ishlatish mumkin.',
      skills_json: { list: ['Xodovoy', 'Moy', 'Tormoz'] },
    },
  },
  9: {
    employer: {
      title: 'Buxgalter (1C)',
      company_name: 'Baraka Trade',
      responsible_person: 'Gulnora Ismailova',
      location: 'Toshkent (online ham)',
      type: 'online',
      work_type: 'full-time',
      work_hours: '09:00 – 18:00',
      salary_text: '9–12 mln so‘m',
      short_text: 'HISOB-kitob, soliq hisobotlari, 1C. Masofaviy ish mumkin.',
      requirements_json: { list: ['1C', 'Soliq kodeksi', 'Excel'] },
    },
    seeker: {
      title: 'Buxgalter — kichik biznes',
      full_name: 'Nodira Alimova',
      location: 'Online',
      type: 'online',
      experience_years: 6,
      salary_min: 6000000,
      short_text: 'YTT va MCHJ uchun oylik hisobot. Masofadan yuritaman.',
      skills_json: { list: ['1C', 'my.soliq', 'Bank-klient'] },
      has_diploma: true,
    },
  },
  10: {
    employer: {
      title: 'Qarovchi (keksalar)',
      company_name: 'Mehribon Uy',
      responsible_person: 'Fotima Xolmatova',
      location: 'Toshkent, Chilonzor',
      type: 'offline',
      work_type: 'shift',
      work_hours: '12 soatlik smena',
      salary_text: '4.5–6 mln so‘m',
      short_text: 'Uydagi keksa odamga kunduzgi qarov. Tibbiy ma’lumotnoma kerak.',
      requirements_json: { list: ['Sabr', 'Tibbiy ma’lumotnoma'] },
    },
    seeker: {
      title: 'Hamshira — uy sharoiti',
      full_name: 'Zulfiya Karimova',
      location: 'Toshkent',
      type: 'offline',
      experience_years: 9,
      salary_min: 200000,
      short_text: 'Inyeksiya, qon bosimi, keksalarga qarov. Smenali ishlayman.',
      skills_json: { list: ['Inyeksiya', 'Qarov', 'Palliativ'] },
      has_diploma: true,
      has_certificate: true,
    },
  },
};

(async () => {
  const c = new Client({ connectionString: raw, ssl });
  await c.connect();

  const cats = await c.query('SELECT id, name_uz FROM job_categories WHERE is_active = TRUE ORDER BY id');
  const users = await c.query('SELECT id FROM users ORDER BY created_at DESC NULLS LAST LIMIT 12');
  if (users.rows.length === 0) {
    throw new Error('users jadvali bo‘sh — avval akkaunt kerak');
  }

  await c.query(`DELETE FROM jobs WHERE apply_method_json->>'source' = $1`, [DEMO.source]);

  let inserted = 0;
  for (const cat of cats.rows) {
    const pack = byCategory[cat.id];
    if (!pack) {
      console.log('skip unknown category', cat.id, cat.name_uz);
      continue;
    }
    const employerUser = users.rows[inserted % users.rows.length].id;
    const seekerUser = users.rows[(inserted + 3) % users.rows.length].id;

    await c.query(
      `INSERT INTO jobs (
         user_id, title, description, category, type, status, sub_type, category_id,
         payment_status, publication_fee, short_text,
         company_name, responsible_person, location, work_type, work_hours,
         requirements_json, salary_text, apply_method_json
       ) VALUES (
         $1,$2,$3,$4,$5,'active','employer',$6,
         'paid',0,$7,
         $8,$9,$10,$11,$12,
         $13::jsonb,$14,$15::jsonb
       )`,
      [
        employerUser,
        pack.employer.title,
        pack.employer.short_text,
        cat.name_uz,
        pack.employer.type,
        cat.id,
        pack.employer.short_text,
        pack.employer.company_name,
        pack.employer.responsible_person,
        pack.employer.location,
        pack.employer.work_type,
        pack.employer.work_hours,
        JSON.stringify(pack.employer.requirements_json || {}),
        pack.employer.salary_text,
        JSON.stringify(DEMO),
      ]
    );
    inserted += 1;

    await c.query(
      `INSERT INTO jobs (
         user_id, title, description, category, type, status, sub_type, category_id,
         payment_status, publication_fee, short_text,
         full_name, location, experience_years, salary_min, is_salary_negotiable,
         skills_json, has_diploma, has_certificate, apply_method_json
       ) VALUES (
         $1,$2,$3,$4,$5,'active','seeker',$6,
         'paid',0,$7,
         $8,$9,$10,$11,TRUE,
         $12::jsonb,$13,$14,$15::jsonb
       )`,
      [
        seekerUser,
        pack.seeker.title,
        pack.seeker.short_text,
        cat.name_uz,
        pack.seeker.type,
        cat.id,
        pack.seeker.short_text,
        pack.seeker.full_name,
        pack.seeker.location,
        pack.seeker.experience_years,
        pack.seeker.salary_min,
        JSON.stringify(pack.seeker.skills_json || {}),
        !!pack.seeker.has_diploma,
        !!pack.seeker.has_certificate,
        JSON.stringify(DEMO),
      ]
    );
    inserted += 1;
    console.log('ok', cat.id, cat.name_uz);
  }

  const n = await c.query(
    `SELECT category_id, count(*)::int AS n FROM jobs WHERE apply_method_json->>'source' = $1 GROUP BY 1 ORDER BY 1`,
    [DEMO.source]
  );
  console.log('INSERTED', inserted);
  console.log(n.rows);
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
