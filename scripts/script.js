import { small_library_yushi } from "./small.js";
import { small_library_yushi_st2 } from "./small_st2.js";
import { big_library_yushi } from "./big.js";
import { medium_library_yushi } from "./medium.js";
import { mainDictionary } from "./wordgame.js";

/* =====================
   RESPONSES
===================== */
const responses = [
    ...big_library_yushi,
    ...medium_library_yushi,
    ...small_library_yushi,
    ...small_library_yushi_st2
];

/* =====================
   DOM
===================== */
const textinput = document.querySelector("#chat-girl-input");
const mytext = document.querySelector(".your-text");
const yushitext = document.querySelector(".yushi-text");
const sendBtn = document.querySelector("#chat-girl-conf");
const avatarEl = document.querySelector("#chat-girl-avatar");

/* =====================
   AVATARS
===================== */
const AVATARS = {
    sad: "./avatars/sad.png",
    normal: "./avatars/normal.png",
    happy: "./avatars/happy.png",
    love: "./avatars/love.png",
    waiting: "./avatars/waiting.png"
};

/* =====================
   STATE
===================== */
let userName = localStorage.getItem("username") || "друже";
let lastBotAnswer = "";
let lastUserText = "";
let repeatCounter = 0;

let typing = false;
let waitingTimer = null;
let moodTimer = null;

/* =====================
   LOVE
===================== */
function getLove() {
    return Number(localStorage.getItem("love")) || 50; // старт 50 зі 100
}

function setLove(val) {
    val = Math.max(0, Math.min(100, val)); // обмеження 0-100
    localStorage.setItem("love", val);
    updateAvatarByLove();
}

/* =====================
   AVATAR LOGIC
===================== */
function updateAvatarByLove() {
    const love = getLove();

    if (love <= 10) avatarEl.src = AVATARS.sad;
    else if (love <= 40) avatarEl.src = AVATARS.normal;
    else if (love <= 65) avatarEl.src = AVATARS.happy;
    else avatarEl.src = AVATARS.love;
}

// 👉 тимчасовий сумний аватар
function triggerSadAvatar(timeout = 10000) {
    clearTimeout(moodTimer);
    avatarEl.src = AVATARS.sad;

    moodTimer = setTimeout(() => {
        updateAvatarByLove();
    }, timeout);
}

/* =====================
   WAITING MODE
===================== */
function startWaitingTimer() {
    clearTimeout(waitingTimer);
    waitingTimer = setTimeout(() => {
        avatarEl.src = AVATARS.waiting;
        typeText(yushitext, "Ми ще не пішли кудись?.. 🥺");
    }, 30000);
}

/* =====================
   TYPING EFFECT
===================== */
function typeText(el, text, speed = 25) {
    if (typing) return;
    typing = true;
    el.textContent = "";
    let i = 0;

    const timer = setInterval(() => {
        el.textContent += text[i++] ?? "";
        if (i >= text.length) {
            clearInterval(timer);
            typing = false;
        }
    }, speed);
}

/* =====================
   WORD GAME
===================== */
let booword = false;
let lastWord = "";
let gameDictionary = structuredClone(mainDictionary);

function restoreGame() {
    gameDictionary = structuredClone(mainDictionary);
    lastWord = "";
    booword = false;
}

function wordExists(word) {
    return Object.values(gameDictionary).flat().includes(word);
}

function wordGameLogic(userWord) {
    userWord = normalizeText(userWord);

    if (userWord.length < 2) return "Слово закоротке 🤔";
    if (userWord[0] === "ь") return "Слова не можуть починатися на Ь ❌";
    if (!wordExists(userWord)) return "Такого слова немає ❌";
    if (userWord === lastWord) return "Це слово вже було 🙃";

    if (!lastWord) {
        const keys = Object.keys(gameDictionary).filter(k => gameDictionary[k].length);
        if (!keys.length) {
            restoreGame();
            return "У мене закінчилися слова 🥺";
        }
        const key = random(keys);
        const word = gameDictionary[key].pop();
        lastWord = word;
        return `Моє слово: ${word.toUpperCase()}. Тобі на ${word.at(-1).toUpperCase()}`;
    }

    if (userWord[0] !== lastWord.at(-1)) {
        return `Треба на "${lastWord.at(-1).toUpperCase()}" ❌`;
    }

    const key = userWord.at(-1);
    const arr = gameDictionary[key]?.filter(w => w[0] !== "ь");

    if (!arr?.length) {
        restoreGame();
        return "Ти виграв 🏆";
    }

    const yWord = arr.pop();
    gameDictionary[key] = gameDictionary[key].filter(w => w !== yWord);
    lastWord = yWord;

    return `Моє слово: ${yWord.toUpperCase()}. Тобі на ${yWord.at(-1).toUpperCase()}`;
}

/* =====================
   TEXT HELPERS
===================== */
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}

function random(arr) {
    if (!arr?.length) return "";
    const filtered = arr.filter(a => a !== lastBotAnswer);
    const pool = filtered.length ? filtered : arr;
    const res = pool[Math.floor(Math.random() * pool.length)];
    lastBotAnswer = res;
    return res;
}

/* =====================
   BAD WORDS
===================== */
const BAD_WORDS = [
    // мат
    "бля", "бляд", "хуй", "хуя", "пизд", "пздц", "єб", "їб",
    "нахуй", "сука", "сучка", "гандон",

    // образи
    "тупа", "ідіотка", "дура", "дебілка", "відвали", "заткнись"
];

function containsBadWords(text) {
    const normalized = normalizeText(text);
    return BAD_WORDS.some(word => normalized.includes(word));
}

/* =====================
   MATCH PHRASES
===================== */
function matchResponses(text) {
    const input = normalizeText(text);
    let matches = [];

    for (const item of responses) {
        if (!item.triggers || !item.answers) continue;

        for (const trigger of item.triggers) {
            const t = normalizeText(trigger);
            if (input.includes(t)) {
                matches.push({ answers: item.answers, weight: t.length });
            }
        }
    }

    if (!matches.length) return null;
    matches.sort((a, b) => b.weight - a.weight);
    return random(matches[0].answers);
}

/* =====================
   BOT BRAIN
===================== */
function botAnswer(text) {
    const lower = normalizeText(text);

    if (["стоп", "стоп-гра", "стоп-слова"].includes(lower)) {
        restoreGame();
        return "Гру зупинено ✅";
    }

    if (lower.startsWith("слово:") || booword) {
        booword = true;
        return wordGameLogic(lower.replace("слово:", ""));
    }

    if (/^[\d+\-*/().\s]+$/.test(lower)) {
        try {
            return "Результат: " + new Function(`return ${lower}`)();
        } catch {
            return "Не можу порахувати 🤔";
        }
    }

    if (lower.startsWith("мене звати ")) {
        userName = text.slice(11).trim();
        localStorage.setItem("username", userName);
        return `Приємно познайомитись, ${userName} 💜`;
    }

    return null;
}

/* =====================
   MAIN RESPONSE
===================== */
function getYushiResponse(text) {
    let love = getLove();
    const lower = normalizeText(text);

    let response = "";

    // позитив
    if (["люблю", "дякую", "ти класна", "як справи", "красуння", "розумашка", "розумна", "вибач", "😘", "💓", "💝", "кохання моє", "що робиш", "привітик"].some(w => lower.includes(w))) {
        love = Math.min(100, love + 1); // +1 любові
    }

    // негатив / мат / образи
    if (
        ["ненавиджу"].some(w => lower.includes(w)) ||
        containsBadWords(text)
    ) {
        love = Math.max(0, love - 1); // -1 любові
        triggerSadAvatar(5000); // сумна на 5 сек
        response = "Мені боляче таке чути... 😔";
    }

    // завжди оновлюємо любов та аватар
    setLove(love);

    if (!response) {
        response =
            matchResponses(text) ||
            random([
                `Я не зовсім зрозуміла тебе, ${userName} 🤍`,
                "Можеш сказати інакше? 😊",
                "Я трохи розгубилась 😅"
            ]);
    }

    return response;
}

/* =====================
   MESSAGE HANDLER
===================== */
function onUserMessage(message) {
    clearTimeout(waitingTimer);

    // якщо повторює повідомлення
    if (message === lastUserText) {
        repeatCounter++;
        if (repeatCounter >= 3) {
            typeText(yushitext, "Ти це вже казав 🙃");
            return;
        }
    } else {
        repeatCounter = 0;
    }

    lastUserText = message;

    let response = botAnswer(message);
    if (!response) response = getYushiResponse(message);

    typeText(yushitext, response);
    startWaitingTimer();
}

/* =====================
   INPUT
===================== */
function inputtext() {
    const msg = textinput.value.trim();
    if (!msg) return;

    mytext.textContent = msg;
    textinput.value = "";
    yushitext.textContent = "Юші набирає...";
    setTimeout(() => onUserMessage(msg), 400);
}

/* =====================
   EVENTS
===================== */
sendBtn.addEventListener("click", inputtext);
textinput.addEventListener("keydown", e => {
    if (e.key === "Enter") inputtext();
});

/* =====================
   INIT
===================== */
updateAvatarByLove();
startWaitingTimer();
