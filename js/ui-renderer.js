import { cleanKatexMarkers } from './utils.js';

let els = {};
let isInit = false;

const AR_LABELS = {
    A: "Both A and R are true and R is the correct explanation of A.",
    B: "Both A and R are true but R is not the correct explanation of A.",
    C: "A is true but R is false.",
    D: "A is false but R is true."
};

/* -----------------------------------
   INITIALIZE DOM ELEMENTS
----------------------------------- */
export function initializeElements() {
    if (isInit) return;
    els = {
        list: document.getElementById("question-list"),
        header: document.getElementById("chapter-name-display"),
        diff: document.getElementById("difficulty-display"),
        status: document.getElementById("status-message"),
        quiz: document.getElementById("quiz-content"),
        results: document.getElementById("results-screen"),
        paywall: document.getElementById("paywall-screen"),
        prev: document.getElementById("prev-btn"),
        next: document.getElementById("next-btn"),
        submit: document.getElementById("submit-btn"),
        counter: document.getElementById("question-counter"),
        scoreBox: document.getElementById("score-display"),
        curiosityBox: document.getElementById("curiosity-box"),
        analysisModal: document.getElementById("analysis-modal"),
        analysisContent: document.getElementById("analysis-content"),
        welcomeUser: document.getElementById("user-welcome")
    };

    if (!document.getElementById("review-container") && els.results) {
        const rc = document.createElement("div");
        rc.id = "review-container";
        rc.className = "w-full max-w-4xl text-left mt-10 hidden space-y-6";
        els.results.appendChild(rc);
        els.reviewContainer = rc;
    }
    isInit = true;
}

/* -----------------------------------
   MOTIVATIONAL FEEDBACK (UNCHANGED)
----------------------------------- */
function getMotivationalFeedback(score, total) {
    const p = (score / total) * 100;
    if (p === 100) return "🌟 Perfect Score! You are a Subject Matter Expert!";
    if (p >= 80) return "🚀 Outstanding! You've mastered the core concepts of this chapter.";
    if (p >= 50) return "📈 Good Progress! A little more practice and you'll reach the top.";
    return "💡 Keep Going! Every mistake is a learning opportunity. Try again!";
}

/* -----------------------------------
   OPTION HTML GENERATOR
----------------------------------- */
function generateOptionHtml(q, opt, selected, submitted, labelText) {
    const text = labelText || q.options[opt] || "";
    const isSel = selected === opt;
    const isCorrect = submitted && q.correct_answer === opt;
    const isWrong = submitted && isSel && !isCorrect;

    const borderCls =
        isCorrect ? "border-green-600 bg-green-50 shadow-green-100" :
        isWrong ? "border-red-600 bg-red-50 shadow-red-100" :
        isSel ? "border-blue-500 bg-blue-50 shadow-blue-100" :
        "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer group">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
            <div class="flex items-start p-4 border-2 rounded-xl transition-all ${borderCls}">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 font-bold mr-4">${opt}</span>
                <span class="font-medium pt-1 text-gray-800 leading-snug">
                    ${cleanKatexMarkers(text)}
                </span>
            </div>
        </label>`;
}

/* -----------------------------------
   MAIN QUESTION RENDERER
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
    initializeElements();
    if (!els.list) return;

    const type = (q.question_type || "").toLowerCase();

    /* =====================================================
       ASSERTION–REASON (ROBUST / DEFENSIVE)
    ===================================================== */
    if (type.includes("ar") || type.includes("assertion")) {

        let assertionText = q.text || "";
        let reasonText = q.scenario_reason || "";

        // Case 1: Reason contains both Assertion + Reason
        if (
            reasonText.toLowerCase().includes("assertion") &&
            reasonText.toLowerCase().includes("reason")
        ) {
            const parts = reasonText.split(/Reason\s*\(R\)\s*:/i);
            assertionText = parts[0]
                .replace(/Assertion\s*\(A\)\s*:/ig, "")
                .trim();
            reasonText = (parts[1] || "").trim();
        }

        // Case 2: Assertion text contains Reason
        if (assertionText.toLowerCase().includes("reason")) {
            const parts = assertionText.split(/Reason\s*\(R\)\s*:/i);
            assertionText = parts[0]
                .replace(/Assertion\s*\(A\)\s*:/ig, "")
                .trim();
            if (!reasonText && parts[1]) {
                reasonText = parts[1].trim();
            }
        }

        // Final absolute cleanup
        assertionText = assertionText
            .replace(/Assertion\s*\(A\)\s*:/ig, "")
            .replace(/Reason\s*\(R\)\s*:/ig, "")
            .trim();

        reasonText = reasonText
            .replace(/Assertion\s*\(A\)\s*:/ig, "")
            .replace(/Reason\s*\(R\)\s*:/ig, "")
            .trim();

        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold text-gray-900 leading-snug">
                    Q${idx}. Assertion (A): ${assertionText}
                </div>

                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                    <span class="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 block">
                        Reason (R)
                    </span>
                    <div class="text-lg font-bold text-gray-800">
                        ${reasonText || "<em>Reason not provided.</em>"}
                    </div>
                </div>

                <div class="text-sm font-black text-gray-900 italic px-2">
                    Regarding the assertion and reason, choose the correct option.
                </div>

                <div class="grid gap-3">
                    ${['A','B','C','D']
                        .map(o => generateOptionHtml(q, o, selected, submitted, AR_LABELS[o]))
                        .join("")}
                </div>
            </div>`;
        return;
    }

    /* -----------------------------------
       CASE STUDY
    ----------------------------------- */
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left animate-fadeIn">
                <div class="space-y-6">
                    <div class="text-xl font-extrabold text-gray-900">
                        Q${idx}: ${cleanKatexMarkers(q.text)}
                    </div>
                    <div class="grid gap-3">
                        ${['A','B','C','D']
                            .map(o => generateOptionHtml(q, o, selected, submitted))
                            .join("")}
                    </div>
                </div>
                <div class="bg-yellow-50 p-6 rounded-2xl border border-yellow-100">
                    <h3 class="font-black mb-3 text-yellow-700">💡 Study Hint</h3>
                    <p class="italic text-yellow-900">${q.scenario_reason}</p>
                </div>
            </div>`;
        return;
    }

    /* -----------------------------------
       STANDARD MCQ
    ----------------------------------- */
    els.list.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-6 text-left animate-fadeIn">
            <div class="text-xl font-extrabold text-gray-900">
                Q${idx}: ${cleanKatexMarkers(q.text)}
            </div>
            <div class="grid gap-3">
                ${['A','B','C','D']
                    .map(o => generateOptionHtml(q, o, selected, submitted))
                    .join("")}
            </div>
        </div>`;
}

/* -----------------------------------
   RESULTS (UNCHANGED)
----------------------------------- */
export function renderResults(stats, diff) {
    initializeElements();
    showView("results-screen");

    if (els.scoreBox) {
        const motivation = getMotivationalFeedback(stats.correct, stats.total);
        els.scoreBox.innerHTML = `
            <div class="text-4xl font-black text-blue-900 mb-2">
                ${stats.correct} / ${stats.total}
            </div>
            <div class="text-sm italic text-gray-600">
                ${motivation}
            </div>
        `;
    }
}

/* -----------------------------------
   REVIEW MY MISTAKES (UNCHANGED)
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;

    els.reviewContainer.classList.remove("hidden");

    els.reviewContainer.innerHTML = qs.map((q, i) => {
        const user = ua[q.id];
        const correct = q.correct_answer;
        const isAR = q.question_type.toLowerCase().includes("ar");

        return `
            <div class="p-6 bg-white rounded-2xl border shadow-sm">
                <div class="font-black mb-3">
                    Q${i + 1}. ${cleanKatexMarkers(q.text)}
                </div>
                <div class="text-red-600 font-semibold">
                    ❌ Your Answer: ${user ? (isAR ? AR_LABELS[user] : q.options[user]) : "Not Attempted"}
                </div>
                <div class="text-green-700 font-semibold mt-2">
                    ✅ Correct Answer: ${isAR ? AR_LABELS[correct] : q.options[correct]}
                </div>
            </div>`;
    }).join("");
}

/* -----------------------------------
   UI HELPERS (UNCHANGED)
----------------------------------- */
export function hideStatus() { initializeElements(); els.status?.classList.add("hidden"); }
export function updateHeader(t, d) { initializeElements(); els.header.textContent = t; els.diff.textContent = `Difficulty: ${d}`; }
export function showView(v) {
    initializeElements();
    [els.quiz, els.results, els.paywall].forEach(x => x?.classList.add("hidden"));
    if (v === "quiz-content") els.quiz?.classList.remove("hidden");
    if (v === "results-screen") els.results?.classList.remove("hidden");
    if (v === "paywall-screen") els.paywall?.classList.remove("hidden");
}
export function showStatus(msg, cls = "text-blue-600") {
    initializeElements();
    els.status.textContent = msg;
    els.status.className = `p-4 font-bold ${cls}`;
    els.status.classList.remove("hidden");
}
export function updateNavigation(i, t, s) {
    initializeElements();
    els.prev?.classList.toggle("hidden", i === 0);
    els.next?.classList.toggle("hidden", i === t - 1);
    els.submit?.classList.toggle("hidden", s || i !== t - 1);
    els.counter.textContent = `${String(i + 1).padStart(2, "0")} / ${t}`;
}
export function attachAnswerListeners(fn) {
    initializeElements();
    els.list.onchange = e => {
        if (e.target.type === "radio") {
            fn(e.target.name.substring(2), e.target.value);
        }
    };
}
export function updateAuthUI(user) {
    initializeElements();
    if (user && els.welcomeUser) {
        els.welcomeUser.textContent = `Welcome, ${user.email.split('@')[0]}`;
        els.welcomeUser.classList.remove("hidden");
    }
}
