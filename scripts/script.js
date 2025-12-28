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
    return Number(localStorage.getItem("love")) || 50;
}

function setLove(val) {
    val = Math.max(0, Math.min(100, val));
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
   HELPER: чи текст містить букви/цифри
===================== */
function hasTextContent(str) {
    return /[\p{L}\p{N}]/u.test(str);
}

/* =====================
   HELPER: чи текст лише смайли
===================== */
function isOnlyEmojis(text) {
    const withoutEmojis = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, "");
    return withoutEmojis.length === 0 && text.trim().length > 0;
}

/* =====================
   BAD WORDS
===================== */
const BAD_WORDS = [
    "бля", "бляд", "хуй", "хуя", "пизд", "пздц", "єб", "їб",
    "нахуй", "сука", "сучка", "гандон",
    "тупа", "ідіотка", "дура", "дебілка", "відвали", "заткнись"
];

function containsBadWords(text) {
    const normalized = normalizeText(text);
    return BAD_WORDS.some(word => normalized.includes(word));
}

/* =====================
   MATCH PHRASES
===================== */
function matchResponses(text, originalText) {
    // Якщо це смайли - шукаємо точне співпадіння
    if (isOnlyEmojis(originalText)) {
        for (const item of responses) {
            if (!item.triggers || !item.answers) continue;
            
            for (const trigger of item.triggers) {
                if (trigger === originalText.trim()) {
                    return random(item.answers);
                }
            }
        }
        return null;
    }

    // Для тексту - шукаємо в triggers
    const input = normalizeText(text);
    let matches = [];

    for (const item of responses) {
        if (!item.triggers || !item.answers) continue;

        for (const trigger of item.triggers) {
            const t = normalizeText(trigger);
            if (t && input.includes(t)) {
                matches.push({ answers: item.answers, weight: t.length });
            }
        }
    }

    if (!matches.length) return null;
    matches.sort((a, b) => b.weight - a.weight);
    return random(matches[0].answers);
}

/* =====================
   MATH CALCULATOR - ВИПРАВЛЕНО
===================== */
function calculateMath(expression) {
    try {
        // Видаляємо всі пробіли
        expression = expression.replace(/\s+/g, "");
        
        // Перевіряємо чи є лише дозволені символи
        if (!/^[\d+\-*/.()]+$/.test(expression)) {
            return null;
        }
        
        // Заміняємо небезпечні оператори
        expression = expression.replace(/\*\*/g, "^"); // степінь (якщо потрібно)
        
        // Безпечний парсинг через Function (обмежений контекст)
        const result = new Function(`'use strict'; return (${expression})`)();
        
        // Перевіряємо чи результат число
        if (typeof result !== "number" || !isFinite(result)) {
            return null;
        }
        
        // Округлюємо до 10 знаків після коми
        return Math.round(result * 10000000000) / 10000000000;
    } catch (error) {
        return null;
    }
}

/* =====================
   BOT BRAIN
===================== */
function botAnswer(text) {
    const lower = normalizeText(text);
    const original = text.trim();

    // Стоп-команди для гри
    if (["стоп", "стоп гра", "стоп слова"].includes(lower)) {
        restoreGame();
        return "Гру зупинено ✅";
    }

    // Гра в слова
    if (lower.startsWith("слово:") || lower.startsWith("слово ") || booword) {
        booword = true;
        const word = lower.replace(/^слово[:\s]+/, "");
        return wordGameLogic(word);
    }

    // Математичні вирази - ВИПРАВЛЕНО
    if (/^[\d+\-*/.()=\s]+$/.test(original)) {
        const cleaned = original.replace(/=/g, "").trim();
        const result = calculateMath(cleaned);
        
        if (result !== null) {
            return `Результат: ${result} ✅`;
        } else {
            return "Не можу порахувати, перевір вираз і чи ти використовуєш чі знаки (+, -,/ ділення, * множення, ** степінь число**степінь, % залишок ділення)";
        }
    }

    // Зміна імені
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

    // Позитивні слова
    const positiveWords = ["люблю", "дякую", "ти класна", "як справи", "красуня", 
                           "розумашка", "розумна", "вибач", "кохання моє", "що робиш", "привітик"];
    if (positiveWords.some(w => lower.includes(w))) {
        love = Math.min(100, love + 1);
    }

    // Негативні слова / мат
    if (lower.includes("ненавиджу") || containsBadWords(text)) {
        love = Math.max(0, love - 1);
        triggerSadAvatar(5000);
        response = "Мені боляче таке чути... 😔";
    }

    setLove(love);

    if (!response) {
        const matched = matchResponses(text, text);

        if (matched) {
            // Якщо знайшла відповідь, але вона лише смайли, а користувач писав текст
            if (!hasTextContent(matched) && hasTextContent(text)) {
                response = `Я не зовсім зрозуміла тебе, ${userName}. Можеш сказати по-іншому?`;
            } else {
                response = matched;
            }
        } else {
            // Не знайшла відповідь
            response = `Я не зовсім зрозуміла тебе, ${userName}. Можеш сказати по-іншому?`;
        }
    }

    return response;
}

/* =====================
   MESSAGE HANDLER
===================== */
function onUserMessage(message) {
    clearTimeout(waitingTimer);

    // Перевірка на повторення
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

    // Отримуємо відповідь
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