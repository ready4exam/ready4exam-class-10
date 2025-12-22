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
   BULLETPROOF AR NORMALIZER
----------------------------------- */
function normalizeAssertionReason(q) {
    const sources = [
        q.question_text || q.text || "",
        q.scenario_reason_text || q.scenario_reason || ""
    ]
        .map(t => cleanKatexMarkers(t).trim())
        .filter(Boolean);

    let assertion = "";
    let reason = "";

    // PASS 1 — explicit markers
    for (const src of sources) {
        const a = src.match(/Assertion\s*\(A\)\s*:\s*(.*?)(?=Reason\s*\(R\)\s*:|$)/i);
        const r = src.match(/Reason\s*\(R\)\s*:\s*(.*)$/i);
        if (a && !assertion) assertion = a[1].trim();
        if (r && !reason) reason = r[1].trim();
    }

    // PASS 2 — sentence fallback
    if (!assertion) {
        const combined = sources.join(" ");
        const parts = combined.split(/(?<=[.?!])\s+/);
        assertion = parts[0] || "";
        if (!reason && parts.length > 1) {
            reason = parts.slice(1).join(" ");
        }
    }

    // PASS 3 — deduplicate
    if (reason && assertion.includes(reason)) {
        assertion = assertion.replace(reason, "").trim();
    }

    return {
        assertion: assertion || "[Assertion text unavailable]",
        reason: reason || ""
    };
}

/* -----------------------------------
   OPTION HTML
----------------------------------- */
function generateOptionHtml(q, opt, selected, submitted, labelText) {
    const rawText = labelText || q.options?.[opt] || q[`option_${opt.toLowerCase()}`] || "";
    const isSel = selected === opt;
    const isCorrect = submitted && (q.correct_answer === opt || q.correct_answer_key === opt);
    const isWrong = submitted && isSel && !isCorrect;

    const cls =
        isCorrect ? "border-green-600 bg-green-50" :
        isWrong ? "border-red-600 bg-red-50" :
        isSel ? "border-blue-500 bg-blue-50" :
        "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
            <div class="flex items-start p-4 border-2 rounded-xl ${cls}">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 font-bold mr-4">${opt}</span>
                <span class="font-medium">${cleanKatexMarkers(rawText)}</span>
            </div>
        </label>`;
}

/* -----------------------------------
   QUESTION RENDERER
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
    initializeElements();
    if (!els.list) return;

    const type = (q.question_type || "").toLowerCase();

    /* ===== ASSERTION–REASON (FIXED) ===== */
    if (type.includes("ar") || type.includes("assertion")) {
        const { assertion, reason } = normalizeAssertionReason(q);

        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold">
                    Q${idx}. Assertion (A): ${assertion}
                </div>

                ${reason ? `
                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600">
                    <span class="text-xs font-black uppercase">Reason (R)</span>
                    <div class="text-lg font-bold">${reason}</div>
                </div>
                ` : ""}

                <div class="italic font-bold">Choose the correct option.</div>

                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o =>
                        generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])
                    ).join("")}
                </div>
            </div>`;
        return;
    }

    /* ===== CASE STUDY ===== */
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <div class="text-xl font-extrabold">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
                    <div class="grid gap-3 mt-4">
                        ${['A','B','C','D'].map(o =>
                            generateOptionHtml(q, o, selected, submitted)
                        ).join("")}
                    </div>
                </div>
                <div class="bg-yellow-50 p-6 rounded-2xl italic">
                    ${cleanKatexMarkers(q.scenario_reason)}
                </div>
            </div>`;
        return;
    }

    /* ===== MCQ ===== */
    els.list.innerHTML = `
        <div class="space-y-6">
            <div class="text-xl font-extrabold">
                Q${idx}: ${cleanKatexMarkers(q.text)}
            </div>
            <div class="grid gap-3">
                ${['A','B','C','D'].map(o =>
                    generateOptionHtml(q, o, selected, submitted)
                ).join("")}
            </div>
        </div>`;
}

/* -----------------------------------
   RESULTS + COGNITIVE FEEDBACK
----------------------------------- */
export function renderResults(stats) {
    initializeElements();
    showView("results-screen");

    const p = (stats.correct / stats.total) * 100;
    const motivation =
        p === 100 ? "Perfect Score! You are thinking like a subject expert." :
        p >= 80 ? "Excellent work! You are very close to mastery." :
        p >= 50 ? "Good Progress! A little more practice and you'll reach the top." :
        "Every attempt builds understanding. Keep practicing with focus.";

    els.scoreBox.innerHTML = `
        <div class="text-4xl font-black">${stats.correct} / ${stats.total}</div>
        <div class="mt-3 px-4 py-3 bg-blue-50 rounded-2xl text-sm font-bold text-center">
            ${motivation}
        </div>`;
}

/* -----------------------------------
   REVIEW MY MISTAKES
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;

    els.reviewContainer.classList.remove("hidden");
    els.reviewContainer.innerHTML = `
        <div class="mb-10 text-center">
            <h3 class="text-3xl font-black">The Learning Map</h3>
        </div>
        ${qs.map((q, i) => {
            const u = ua[q.id];
            const c = q.correct_answer || q.correct_answer_key;
            const isCorrect = u === c;
            const isAR = q.question_type.toLowerCase().includes("ar");
            const txt = k => isAR ? AR_LABELS[k] : q.options?.[k];

            return `
            <div class="p-6 bg-white rounded-2xl border mb-6 relative">
                <div class="absolute top-0 right-0 px-3 py-1 text-xs font-black text-white ${isCorrect ? "bg-green-500" : "bg-amber-400"}">
                    ${isCorrect ? "Mastered" : "Growing"}
                </div>
                <p class="font-bold mb-4">Q${i + 1}. ${cleanKatexMarkers(q.text)}</p>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-3 bg-slate-50 rounded-xl">
                        <span class="text-xs font-black">Your Thought</span>
                        <p class="text-sm">${u ? txt(u) : "Skipped"}</p>
                    </div>
                    <div class="p-3 bg-indigo-50 rounded-xl">
                        <span class="text-xs font-black">The Golden Key</span>
                        <p class="text-sm">${txt(c)}</p>
                    </div>
                </div>
            </div>`;
        }).join("")}
    `;
}

/* -----------------------------------
   UI HELPERS
----------------------------------- */
export function hideStatus(){ els.status?.classList.add("hidden"); }
export function updateHeader(t,d){ els.header.textContent=t; els.diff.textContent=`Difficulty: ${d}`; }
export function showView(v){
    [els.quiz,els.results,els.paywall].forEach(x=>x?.classList.add("hidden"));
    (v==="quiz-content"?els.quiz:v==="results-screen"?els.results:els.paywall)?.classList.remove("hidden");
}
export function showStatus(m,c=""){ els.status.textContent=m; els.status.className=c; els.status.classList.remove("hidden"); }
export function updateNavigation(i,t,s){
    els.prev?.classList.toggle("hidden",i===0);
    els.next?.classList.toggle("hidden",i===t-1);
    els.submit?.classList.toggle("hidden",s||i!==t-1);
    els.counter.textContent=`${i+1}/${t}`;
}
export function attachAnswerListeners(fn){
    els.list.onchange=e=>{
        if(e.target.type==="radio") fn(e.target.name.slice(2),e.target.value);
    };
}
export function updateAuthUI(u){
    if(u && els.welcomeUser){
        els.welcomeUser.textContent=`Welcome, ${u.email.split("@")[0]}`;
        els.welcomeUser.classList.remove("hidden");
    }
}
