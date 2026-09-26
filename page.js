
"use strict";

const QUESTIONS_PER_ROUND = 5;    // how many words per attempt
const OPTIONS_PER_QUESTION = 4;   // answers shown per question


const RATINGS = [
  { min: 100, title: "بيض الله وجهك",       text: "خبير لهجات سعودية" },
  { min: 70,  title: "كفو عليك",            text: "فاهم سوالف الديرة ولهجاتها" },
  { min: 50,  title: "علومك زينة",          text: "واضح عندك معرفة باللهجات السعودية" },
  { min: 30,  title: "عندك فنجال من المعرفة", text: "وننتظر تكمل الدلة" },
  { min: 0,   title: "بداية طيبة",          text: "بس اللهجات يبيلها سوالف أكثر" }
];


const $ = (id) => document.getElementById(id);

const screens = {
  start:  $("screen-start"),
  quiz:   $("screen-quiz"),
  result: $("screen-result")
};


let questions = [];   // the questions for this round
let current = 0;      // which question we're on (starts at 0)
let score = 0;        // how many you got right
let answered = false; // true once you've picked an answer

// The word rotation "deck": a shuffled copy of saudi words
// QUESTIONS_PER_ROUND at a time, so every round gives you fresh words.
// Once the deck runs low, it's reshuffled — so all 20 words get used
// before anything repeats.
let deck = [];
let deckPos = 0;




// Shuffle a list into a random order
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Show one screen and hide the others
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// Hand out the next batch of words for a round, reshuffling the deck
// whenever there aren't enough words left in it.
function nextRoundWords() {
  if (deck.length - deckPos < QUESTIONS_PER_ROUND) {
    deck = shuffle(WORDS);
    deckPos = 0;
  }
  const batch = deck.slice(deckPos, deckPos + QUESTIONS_PER_ROUND);
  deckPos += QUESTIONS_PER_ROUND;
  return batch;
}


function buildQuestion(item) {
  const needed = OPTIONS_PER_QUESTION - 1;

  // Use the wrong answers you wrote (a random selection of them)
  let wrong = shuffle(item.wrong || []).slice(0, needed);

  // If you wrote fewer than needed, borrow meanings from other words
  if (wrong.length < needed) {
    const borrowed = [...new Set(
      WORDS
        .map((w) => w.meaning)
        .filter((m) => m !== item.meaning && !wrong.includes(m))
    )];
    wrong = wrong.concat(shuffle(borrowed)).slice(0, needed);
  }

  return {
    item: item,
    options: shuffle([item.meaning, ...wrong])
  };
}


//start screen

function setupStartScreen() {
  // The game needs at least 4 words to make 4 answer choices
  if (WORDS.length < OPTIONS_PER_QUESTION) {
    $("btn-start").disabled = true;
  }
}

//playing
function startQuiz() {
  questions = nextRoundWords().map(buildQuestion);
  current = 0;
  score = 0;
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = questions[current];
  answered = false;

  $("q-counter").textContent = (current + 1) + " of " + questions.length;
  $("q-score").textContent = score + " صح";
  // The score pill only appears after the first answer
  $("q-score").classList.toggle("is-hidden", current === 0);
  $("progress-fill").style.width = (current / questions.length) * 100 + "%";

  // The word itself
  $("q-word").textContent = q.item.word;

  // The answer rows
  const list = $("options");
  list.innerHTML = "";
  q.options.forEach((text, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";

    const key = document.createElement("span");
    key.className = "option-key";
    key.textContent = "أبجد"[i];

    const label = document.createElement("span");
    label.className = "option-label";
    label.textContent = text;

    btn.append(key, label);
    btn.addEventListener("click", () => chooseAnswer(btn, text));
    li.appendChild(btn);
    list.appendChild(li);
  });

  // Hidden but still taking up space, so the layout doesn't jump when it appears
  $("btn-next").classList.add("is-hidden");
}

function chooseAnswer(clickedBtn, chosenText) {
  if (answered) return;
  answered = true;

  const q = questions[current];
  const isRight = chosenText === q.item.meaning;

  // Color every row: green for the right one, red for the one you picked
  document.querySelectorAll(".option").forEach((btn) => {
    const label = btn.querySelector(".option-label").textContent;
    btn.disabled = true;
    if (label === q.item.meaning) btn.classList.add("correct");
    else if (btn === clickedBtn)  btn.classList.add("wrong");
    else                          btn.classList.add("dim");
  });

  // Update score
  if (isRight) score++;
  $("q-score").textContent = score + " صح";
  $("q-score").classList.remove("is-hidden");
  $("progress-fill").style.width = ((current + 1) / questions.length) * 100 + "%";

  // Next button
  const next = $("btn-next");
  next.classList.remove("is-hidden");
  next.textContent = current === questions.length - 1 ? "شوف نتيجتك" : "الكلمة التالية";
  next.focus();
}

function nextQuestion() {
  current++;
  if (current >= questions.length) showResult();
  else renderQuestion();
}


function showResult() {
  showScreen("result");

  const total = questions.length;
  const percent = Math.round((score / total) * 100);
  const rating = RATINGS.find((r) => percent >= r.min);

  $("ring-emoji").textContent = rating.emoji;
  $("ring-percent").textContent = percent + "%";
  $("ring-score").textContent = score + " / " + total + " correct";
  $("result-title").textContent = rating.title;
  $("result-text").textContent = rating.text;

  // Animate the ring filling up (CSS does the smooth part)
  const ring = $("ring");
  ring.style.setProperty("--pct", 0);
  setTimeout(() => ring.style.setProperty("--pct", percent), 80);
}


//keyboard shortcuts
$("btn-start").addEventListener("click", startQuiz);
$("btn-next").addEventListener("click", nextQuestion);
$("btn-restart").addEventListener("click", () => showScreen("start"));

document.addEventListener("keydown", (e) => {
  if (!screens.quiz.classList.contains("active") || answered) return;
  const n = parseInt(e.key, 10);
  const rows = document.querySelectorAll(".option");
  if (n >= 1 && n <= rows.length) rows[n - 1].click();
});

setupStartScreen();