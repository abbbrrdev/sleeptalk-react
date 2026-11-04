// ── Config ─────────────────────────────────────────────
const APP_STORE_URL = ""; // e.g. "https://apps.apple.com/app/id0000000000"
const CONTACT_EMAIL = ""; // e.g. "support@yourdomain.com"

// ── i18n ───────────────────────────────────────────────
const RU = {
  "nav.how": "Как работает",
  "nav.catches": "Что ловит",
  "nav.pricing": "Цены",
  "nav.faq": "Вопросы",
  "nav.get": "Скачать",
  "hero.issue": "Выпуск №1 · сегодня ночью",
  "hero.title": "Что ты говоришь, когда спишь?",
  "hero.lead": "Положи телефон рядом с кроватью. SleepTalk слушает всю ночь и сохраняет только то, что важно, — разговоры, храп, смех. Утром — твоя ночь, свёрстанная как зин.",
  "store.small": "Скоро в",
  "store.soon": "iPhone · 11 языков · без регистрации",
  "rep.issue": "Выпуск №12 · сб, 4 окт",
  "rep.title": "Отчёт о ночи",
  "rep.said": "Сказано во сне",
  "rep.snore": "Индекс храпа",
  "rep.laugh": "Смех",
  "rep.quote": "Нет, пингвины мои.",
  "how.label": "Как работает",
  "how.title": "Нажал. Уснул.<br />Прочитал утром.",
  "how1.t": "Телефон на тумбочке",
  "how1.p": "Нажми «Начать ночь», поставь на зарядку и положи экраном вниз в метре от подушки.",
  "how2.t": "Тишина выбрасывается",
  "how2.p": "SleepTalk запоминает, насколько тихо в комнате, и сохраняет только то, что выделяется. Ты получаешь клипы, а не восемь часов записи.",
  "how3.t": "Утром — отчёт о ночи",
  "how3.p": "Все клипы на таймлайне, разложенные классификатором звуков прямо на телефоне: речь, храп, смех, кашель.",
  "ct.label": "Что ловит",
  "ct.title": "Четыре вида<br />ночных звуков.",
  "ct.talk.tag": "речь",
  "ct.talk.t": "Разговоры во сне",
  "ct.talk.p": "Бормотание, целые фразы и иногда спор ни с кем.",
  "ct.snore.tag": "храп",
  "ct.snore.t": "Храп",
  "ct.snore.p": "Сколько и как громко — индекс храпа, который видно неделя к неделе.",
  "ct.laugh.tag": "смех",
  "ct.laugh.t": "Смех",
  "ct.laugh.p": "Что бы там ни снилось — было смешно.",
  "ct.cough.tag": "кашель",
  "ct.cough.t": "Кашель",
  "ct.cough.p": "Кашель, чихание и покашливание в 4 утра.",
  "wd.label": "Pro · Что я говорю?",
  "wd.title": "Бормотание,<br />превращённое в текст.",
  "wd.lead": "Нажми на клип с речью — распознавание Apple запишет, что ты сказал, прямо на iPhone. А потом поделись, пока не забыл, что такое было.",
  "wd.quote": "Ещё пять минут, я капитан.",
  "wd.tag": "речь во сне",
  "pv.label": "Приватность",
  "pv.title": "Твоя ночь не покидает<br />телефон.",
  "p1.t": "Без облака",
  "p1.p": "Ни аккаунта, ни серверов. Клипы хранятся на твоём iPhone и больше нигде.",
  "p2.t": "Полная запись удаляется",
  "p2.p": "Запись всей ночи существует, только пока режутся клипы, потом её нет.",
  "p3.t": "Распознаётся на устройстве",
  "p3.p": "Встроенный классификатор звуков Apple сортирует клипы офлайн. Для этого ничего не загружается.",
  "pr.label": "Цены",
  "pr.title": "Бесплатно каждую ночь.",
  "pr.item": "Функция",
  "pr.free": "Бесплатно",
  "pr.1": "Запись каждой ночи, отчёт и таймлайн",
  "pr.2": "Клипов для прослушивания за ночь",
  "pr.3": "Карточки и аудио для шеринга",
  "pr.4": "«Что я говорю?» — речь во сне в текст",
  "pr.5": "Динамика храпа, архив, клипы хранятся всегда",
  "pr.best": "3 ДНЯ БЕСПЛАТНО · −89%",
  "pr.yearly": "Год",
  "pr.yr": "/год",
  "pr.yearly.p": "≈ $0.77 в неделю. Отмена в любой момент.",
  "pr.weekly": "Неделя",
  "pr.wk": "/нед",
  "pr.weekly.p": "Для одной любопытной недели.",
  "pr.fine": "Цены в USD; в App Store будут цены в твоей валюте. Подписка продлевается автоматически, если не отменить её минимум за 24 часа до конца периода.",
  "faq.label": "Вопросы",
  "faq.title": "Перед тем как выключить свет.",
  "q1": "Не сядет ли батарея?",
  "a1": "Запись всю ночь тратит примерно столько же, сколько тихая музыка. Поставь на зарядку — SleepTalk напомнит.",
  "q2": "Он записывает и моего партнёра?",
  "a2": "Он слышит всё в комнате, так что да, чужие звуки могут попасть в клипы. Предупреди перед стартом и делись клипами только с согласия.",
  "q3": "Сколько места занимает?",
  "a3": "Хранятся только клипы — обычно 1–5 МБ за ночь. Полная запись удаляется после обработки ночи.",
  "q4": "Он скажет, есть ли у меня апноэ?",
  "a4": "Нет. SleepTalk — для любопытства, а не для диагнозов. Громкий храп с паузами или всхлипами может быть признаком апноэ сна — это вопрос к врачу.",
  "q5": "Android?",
  "a5": "Пока нет. Сначала iPhone.",
  "q6": "Как отменить подписку?",
  "a6": "Настройки → твоё имя → Подписки → SleepTalk. Отмени минимум за 24 часа до продления — и списания не будет. Удаление приложения подписку не отменяет.",
  "final.title": "Узнай этой ночью.",
  "final.cta": "Скачать SleepTalk для iPhone",
  "final.fine": "Бесплатно каждую ночь. Без регистрации.",
  "ft.privacy": "Конфиденциальность",
  "ft.terms": "Условия использования",
  "ft.contact": "Связаться",
};
const TICKER = {
  en: [["No, the penguins are mine.", "03:14"], ["Put it on the invoice.", "02:40"], ["Five more minutes, I'm the captain.", "04:52"], ["Who moved the cheese?", "01:27"], ["Tell the horse I'm sorry.", "05:03"]],
  ru: [["Нет, пингвины мои.", "03:14"], ["Запиши это в счёт.", "02:40"], ["Ещё пять минут, я капитан.", "04:52"], ["Кто передвинул сыр?", "01:27"], ["Передай коню, что мне жаль.", "05:03"]],
};

const pickLang = () => {
  try {
    const saved = localStorage.getItem("sleeptalk-lang");
    if (saved === "en" || saved === "ru") return saved;
  } catch (e) {}
  const nav = (navigator.languages || [navigator.language || "en"]).map((l) => l.toLowerCase().slice(0, 2));
  return nav.some((c) => ["ru", "kk", "uk", "be", "ky", "uz"].includes(c)) ? "ru" : "en";
};

const EN = {};
function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.dataset.i18n;
    if (!(k in EN)) EN[k] = el.innerHTML;
    el.innerHTML = lang === "ru" && RU[k] ? RU[k] : EN[k];
  });
  document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  document.querySelectorAll("[data-lang-block]").forEach((el) => el.classList.toggle("on", el.dataset.langBlock === lang));
  const titled = document.querySelector("meta[data-title-en]");
  if (titled) document.title = lang === "ru" ? titled.dataset.titleRu : titled.dataset.titleEn;
  const tk = document.querySelector("[data-ticker]");
  if (tk) {
    const html = TICKER[lang].map(([q, t]) => `<span>${q}<em>${t}</em></span>`).join("");
    tk.innerHTML = html + html + html + html;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyLang(pickLang());
  document.querySelectorAll(".lang button").forEach((b) =>
    b.addEventListener("click", () => {
      try { localStorage.setItem("sleeptalk-lang", b.dataset.lang); } catch (e) {}
      applyLang(b.dataset.lang);
    }),
  );
  document.querySelectorAll("[data-store]").forEach((a) => {
    if (APP_STORE_URL) a.href = APP_STORE_URL;
    else if (a.getAttribute("href") === "#") a.addEventListener("click", (e) => e.preventDefault());
  });
  document.querySelectorAll("[data-contact]").forEach((el) => {
    if (CONTACT_EMAIL) {
      const links = el.tagName === "A" ? [el] : el.querySelectorAll("a");
      links.forEach((a) => (a.href = "mailto:" + CONTACT_EMAIL));
      el.querySelectorAll("[data-email]").forEach((s) => (s.textContent = CONTACT_EMAIL));
    } else el.style.display = "none";
  });
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: 0.12 })
    : null;
  document.querySelectorAll(".reveal").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
});
