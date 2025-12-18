import React, {  useMemo, useState } from "react";
import { supabase } from "./supabase";



const STORAGE_KEYS = {
consent: "xmas_cookie_consent", // null | 'essential' | 'all'
session: "xmas_session",
};


function safeJsonParse(value) {
try {
return JSON.parse(value);
} catch {
return null;
}
}

function makeId() {
// short-ish id for local session tracking
return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}


function downloadJson(filename, data) {
const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
a.remove();
URL.revokeObjectURL(url);
}
function clampHandle(handle) {
const h = (handle || "").trim();
if (!h) return "";
// allow @ or not
const normalized = h.startsWith("@") ? h : `@${h}`;
// basic cleanup
return normalized.replace(/\s+/g, "");
}

const QUESTIONS = [
{
id: "q1",
text: "Pick your Christmas vibe:",
options: [
{ label: "Hot chocolate + blanket", score: 2 },
{ label: "Party mode 🎉", score: 1 },
{ label: "Elf on a mission 🧝", score: 3 },
{ label: "Sleep until January", score: 0 },
],
},
{
id: "q2",
text: "Choose a holiday superpower:",
options: [
{ label: "Instant gift wrapping", score: 3 },
{ label: "Never burn cookies", score: 2 },
{ label: "Teleport to the Christmas market", score: 1 },
{ label: "Talk to reindeers", score: 2 },
],
},
{
id: "q3",
text: "Your true weakness is…",
options: [
{ label: "Shiny ornaments", score: 2 },
{ label: "Saying “one more episode”", score: 1 },
{ label: "Buying gifts last minute", score: 0 },
{ label: "Stealing fries from friends", score: 1 },
],
},
{
id: "q4",
text: "Pick a Christmas snack:",
options: [
{ label: "Gingerbread", score: 2 },
{ label: "Chocolate", score: 1 },
{ label: "Mandarins", score: 2 },
{ label: "All of the above", score: 3 },
],
},
{
id: "q5",
text: "When you hear Mariah Carey…",
options: [
{ label: "I run 🏃", score: 0 },
{ label: "I sing loudly (badly)", score: 2 },
{ label: "I become Santa", score: 3 },
{ label: "I pretend it’s not December", score: 1 },
],
},
];

function scoreToVerdict(score) {
if (score >= 12) {
return {
title: "✅ Certified Christmas Legend",
subtitle: "You’re 100% on Santa’s nice list.",
badge: "LEGEND 🎄",
giftPool: [
"A mystery toy 🧸",
"A meme sticker pack 😂",
"A mini surprise 🎁",
"A candy drop 🍬",
],
};
}

if (score >= 7) {
return {
title: "✅ Nice List Approved",
subtitle: "You’re a good boy/girl. Santa is watching (in a normal way 😄).",
badge: "NICE ⭐",
giftPool: ["A meme gift 😂", "A small toy 🧩", "A festive surprise 🎁"],
};
}
return {
title: "🙂 Potentially Nice",
subtitle: "You’re *almost* there. Say ‘Ho Ho Ho’ three times and try again.",
badge: "ALMOST 🎅",
giftPool: ["A consolation meme 😂", "A virtual high-five ✋"],
};
}


function Card({ children }) {
return <div className="card">{children}</div>;
}

function Button({ children, variant = "primary", ...props }) {
const cls = variant === "secondary" ? "btn btn-secondary" : "btn btn-primary";
return (
<button className={cls} {...props}>
{children}
</button>
);
}


function Input({ label, hint, error, ...props }) {
return (
<label className="field">
<span className="label">{label}</span>
<input className={"input" + (error ? " input-error" : "")} {...props} />
{hint ? <span className="hint">{hint}</span> : null}
{error ? <span className="error">{error}</span> : null}
</label>
);
}

function Select({ label, error, children, ...props }) {
return (
<label className="field">
<span className="label">{label}</span>
<select className={"input" + (error ? " input-error" : "")} {...props}>
{children}
</select>
{error ? <span className="error">{error}</span> : null}
</label>
);
}

function CookieBanner({ onChoice }) {
return (
<div className="cookie">
<div className="cookie-inner">
<div className="cookie-text">
<div className="cookie-title">Файли cookie 🍪</div>
<div className="cookie-sub">
Ми використовуємо <b>необхідне</b> збереження, щоб тест працював. Необов’язкові cookie допомагають зрозуміти, як користуються сайтом.
</div>
</div>
<div className="cookie-actions">
<Button variant="secondary" onClick={() => onChoice("essential")}>
Reject non-essential
</Button>
<Button onClick={() => onChoice("all")}>Accept all</Button>
</div>
</div>
</div>
);
}


export default function App() {

const [step, setStep] = useState("welcome");


const [ig, setIg] = useState("");
const [answers, setAnswers] = useState(() => ({}));


const [address, setAddress] = useState({
fullName: "",
line1: "",
line2: "",
city: "",
postalCode: "",
country: "FR",
});
const [wantsShipping, setWantsShipping] = useState(true);
const [agree, setAgree] = useState(false);
const [errors, setErrors] = useState({});

const session = useMemo(() => {
const raw = localStorage.getItem(STORAGE_KEYS.session);
const parsed = safeJsonParse(raw);
if (parsed && parsed.id) return parsed;
const created = { id: makeId(), createdAt: new Date().toISOString() };
localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(created));
return created;
}, []);


const [consent, setConsent] = useState(() => {
  const savedConsent = localStorage.getItem(STORAGE_KEYS.consent);
  return savedConsent === "essential" || savedConsent === "all" ? savedConsent : null;
});;


const totalScore = useMemo(() => {
let score = 0;
for (const q of QUESTIONS) {
const pickedIndex = answers[q.id];
if (pickedIndex === undefined) continue;
score += q.options[pickedIndex]?.score ?? 0;
}
return score;
}, [answers]);


const verdict = useMemo(() => scoreToVerdict(totalScore), [totalScore]);


const allAnswered = useMemo(
() => QUESTIONS.every((q) => answers[q.id] !== undefined),
[answers]
);
const chosenGift = useMemo(() => {
// stable “random” based on session id + score
const pool = verdict.giftPool;
const seed = (session.id + "|" + totalScore).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
return pool[seed % pool.length];
}, [session.id, totalScore, verdict.giftPool]);


function saveConsent(choice) {
localStorage.setItem(STORAGE_KEYS.consent, choice);
setConsent(choice);
}


function nextFromWelcome() {
setStep("instagram");
}
function nextFromInstagram() {
const normalized = clampHandle(ig);
if (!normalized || normalized.length < 2) {
setErrors({ ig: "Please enter your Instagram username." });
return;
}
setErrors({});
setIg(normalized);
setStep("quiz");
}


function finishQuiz() {
if (!allAnswered) {
setErrors({ quiz: "Answer all questions to continue." });
return;
}
setErrors({});
setStep("result");
}
function goToClaim() {
setStep("claim");
}


function validateClaim() {
const e = {};
if (!agree) e.agree = "Please confirm you consent to using your address only for shipping.";


if (wantsShipping) {
if (!address.fullName.trim()) e.fullName = "Required";
if (!address.line1.trim()) e.line1 = "Required";
if (!address.city.trim()) e.city = "Required";
if (!address.postalCode.trim()) e.postalCode = "Required";
if (!address.country.trim()) e.country = "Required";
}

setErrors(e);
return Object.keys(e).length === 0;
}


async function submit() {
if (!validateClaim()) return;


const payload = {
sessionId: session.id,
createdAt: session.createdAt,
cookieConsent: consent ?? "(not set)",
instagram: clampHandle(ig),
quiz: {
answers,
totalScore,
verdict: verdict.badge,
},
gift: chosenGift,
shipping: wantsShipping ? address : null,
};

// No backend in this template.
// For now we save locally and let you export the JSON.
localStorage.setItem("xmas_last_submission", JSON.stringify(payload));


try {
await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
} catch {
// clipboard might fail on some browsers
}


downloadJson(`xmas-submission-${session.id}.json`, payload);
setStep("done");
}

return (
<div className="app">
{!consent ? <CookieBanner onChoice={saveConsent} /> : null}


<header className="top">
<div className="brand">🎄 Різдвяний тест</div>
<div className="meta">Зручно на iPhone та Android</div>
</header>


<main className="container">
{step === "welcome" && (
<Card>
<div className="heroWrap">
{/* Додай файл public/santa-me.webp (або .png/.jpg) */}
<img className="hero" src="/santa-me.webp" alt="Санта" />
</div>
<h1>Привіт!</h1>
<p className="lead">Різдво вже скоро 🎅🎁</p>
<p>
Натискай «Почати», відповідай на кілька веселих питань — і подивимось, який подарунок ти відкриєш.
<span className="muted"> (Якщо хочеш реальну доставку — в кінці зможеш ввести адресу.)</span>
</p>
<div className="row">
<Button onClick={nextFromWelcome}>Почати</Button>
<Button
variant="secondary"
onClick={() => {
setStep("instagram");
}}
>
Пропустити
</Button>
</div>
<div className="tiny">
Примітка: необов’язкові cookie не потрібні для проходження тесту.
</div>
</Card>
)}
{step === "instagram" && (
<Card>
<h2>Твій Instagram</h2>
<p className="muted">Щоб я знав, хто пройшов тест (введи свій @нік).</p>
<Input
 label="Instagram нік"
placeholder="@yourname"
value={ig}
onChange={(e) => setIg(e.target.value)}
autoCapitalize="none"
autoCorrect="off"
inputMode="text"
error={errors.ig}
/>
<div className="row">
<Button variant="secondary" onClick={() => setStep("welcome")}>
Back
</Button>
<Button onClick={nextFromInstagram}>Continue</Button>
</div>
</Card>
)}
{step === "quiz" && (
<Card>
<h2>Quick Christmas questionnaire</h2>
<p className="muted">Answer all questions to unlock your result.</p>
{errors.quiz ? <div className="alert">{errors.quiz}</div> : null}


<div className="quiz">
{QUESTIONS.map((q, qi) => (
<div className="q" key={q.id}>
<div className="q-title">
<span className="q-num">{qi + 1}</span>
{q.text}
</div>
<div className="options">
{q.options.map((opt, oi) => {
const picked = answers[q.id] === oi;
return (
<button
type="button"
key={oi}
className={"opt" + (picked ? " opt-picked" : "")}
onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
>
{opt.label}
</button>
);
})}
</div>
</div>
))}
</div>
<div className="row">
<Button variant="secondary" onClick={() => setStep("instagram")}>
Back
</Button>
<Button onClick={finishQuiz} disabled={!allAnswered}>
See result
</Button>
</div>
<div className="tiny">Score: {totalScore}</div>
</Card>
)}

{step === "result" && (
<Card>
<h2>{verdict.title}</h2>
<p className="lead">{verdict.subtitle}</p>
<div className="pill">{verdict.badge}</div>


<div className="gift">
<div className="gift-title">🎁 Your unlocked present</div>
<div className="gift-item">{chosenGift}</div>
<div className="tiny muted">
This is a fun reveal. If you want a real delivery, you can add your shipping address next.
</div>
</div>


<div className="row">
<Button variant="secondary" onClick={() => setStep("quiz")}>
Change answers
</Button>
<Button onClick={goToClaim}>Claim</Button>
</div>
</Card>
)}
{step === "claim" && (
<Card>
<h2>Claim your present 🎁</h2>
<p className="muted">
If you want a physical present, enter a shipping address. If you prefer a meme-only present, you can skip
shipping.
</p>


<div className="toggle">
<button
type="button"
className={"toggle-btn" + (wantsShipping ? " toggle-on" : "")}
onClick={() => setWantsShipping(true)}
>
Ship me a present
</button>
<button
type="button"
className={"toggle-btn" + (!wantsShipping ? " toggle-on" : "")}
onClick={() => setWantsShipping(false)}
>
Meme-only
</button>
</div>
{wantsShipping ? (
<div className="grid">
<Input
label="Full name"
value={address.fullName}
onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))}
error={errors.fullName}
/>
<Input
label="Address line 1"
value={address.line1}
onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
error={errors.line1}
/>
<Input
label="Address line 2 (optional)"
value={address.line2}
onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
/>
<Input
label="City"
value={address.city}
onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
error={errors.city}
/>
<Input
label="Postal code"
value={address.postalCode}
onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
error={errors.postalCode}
/>
<Select
label="Country"
value={address.country}
onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
error={errors.country}
>
<option value="FR">France</option>
<option value="UA">Ukraine</option>
<option value="DE">Germany</option>
<option value="ES">Spain</option>
<option value="IT">Italy</option>
<option value="GB">United Kingdom</option>
<option value="US">United States</option>
<option value="CA">Canada</option>
<option value="OTHER">Other</option>
</Select>
</div>
) : (
<div className="alert">Meme-only selected ✅ No shipping address needed.</div>
)}
<label className="check">
<input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
<span>
I confirm you may use my info <b>only</b> to deliver my present / contact me about the present.
</span>
</label>
{errors.agree ? <div className="error">{errors.agree}</div> : null}


<div className="row">
<Button variant="secondary" onClick={() => setStep("result")}>
Back
</Button>
<Button onClick={submit}>Submit</Button>
</div>


<div className="tiny muted">
Tip: If you later add a backend, send the payload to your API here instead of downloading JSON.
</div>
</Card>
)}
{step === "done" && (
<Card>
<h2>🎉 Submitted</h2>
<p>
Thanks, {clampHandle(ig)}! Your submission was saved locally and exported as a JSON file.
</p>
<div className="row">
<Button
onClick={() => {
const raw = localStorage.getItem("xmas_last_submission");
const parsed = safeJsonParse(raw);
if (parsed) {
downloadJson(`xmas-submission-${session.id}.json`, parsed);
}
}}
>
Download again
</Button>
<Button
variant="secondary"
onClick={() => {
setStep("welcome");
setAnswers({});
setAgree(false);
setWantsShipping(true);
}}
>
Restart
</Button>
</div>
<div className="tiny muted">
Next step: connect a database (Firebase/Supabase) to store submissions centrally.
</div>
</Card>
)}
</main>
<footer className="footer">
<span>Made for Instagram stories 🎄</span>
<span className="dot">•</span>
<span className="muted">No location collection by default</span>
</footer>
</div>
);
}