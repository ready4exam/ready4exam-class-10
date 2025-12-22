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
    const combined = `
        ${q.question_text || q.text || ""}
        ${q.scenario_reason_text || q.scenario_reason || ""}
    `.replace(/\s+/g, " ").trim();

    let assertion = "";
    let reason = "";

    const split = combined.split(/Reason\s*\(R\)\s*:/i);

    if (split.length > 1) {
        assertion = split[0];
        reason = split.slice(1).join(" ");
    } else {
        assertion = combined;
        reason = "";
    }

    assertion = assertion.replace(/Assertion\s*\(A\)\s*:/i, "").trim();

    if (!reason && assertion.match(/Reason\s*\(R\)/i)) {
        const p = assertion.split(/Reason\s*\(R\)\s*:/i);
        assertion = p[0].replace(/Assertion\s*\(A\)\s*:/i, "").trim();
        reason = (p[1] || "").trim();
    }

    return {
        assertion: cleanKatexMarkers(assertion),
        reason: cleanKatexMarkers(reason)
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
            <div class="flex items-start p-4 border-2 rounded-xl transition-all ${cls}">
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

    /* ===== ASSERTION–REASON ===== */
    if (type.includes("ar") || type.includes("assertion")) {
        const { assertion, reason } = normalizeAssertionReason(q);

        els.list.innerHTML = `
            <div class="space-y-6">
                <div class="text-xl font-extrabold">
                    Q${idx}. Assertion (A): ${assertion}
                </div>

                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600">
                    <span class="text-xs font-black uppercase tracking-widest">Reason (R)</span>
                    <div class="text-lg font-bold">${reason}</div>
                </div>

                <div class="italic font-bold text-slate-500">
                    Choose the correct option.
                </div>

                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o =>
                        generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])
                    ).join("")}
                </div>
            </div>`;
        return;
    }

    /* ===== CASE STUDY (MOBILE-FIRST ORDER FIX) ===== */
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="grid md:grid-cols-2 gap-8">
                
                <!-- QUESTION + OPTIONS -->
                <div class="order-2 md:order-1">
                    <div class="text-xl font-extrabold">
                        Q${idx}: ${cleanKatexMarkers(q.text)}
                    </div>

                    <div class="grid gap-3 mt-4">
                        ${['A','B','C','D'].map(o =>
                            generateOptionHtml(q, o, selected, submitted)
                        ).join("")}
                    </div>
                </div>

                <!-- HINT -->
                <div class="order-1 md:order-2 bg-yellow-50 p-6 rounded-2xl italic">
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
   UI HELPERS (UNCHANGED)
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
