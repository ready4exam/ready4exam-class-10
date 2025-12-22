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
   PERFORMANCE HELPER: Pre-clean data
----------------------------------- */
function getCleanedText(q, key, fallback = "") {
    const cacheKey = `_clean_${key}`;
    if (!q[cacheKey]) {
        q[cacheKey] = cleanKatexMarkers(q[key] || fallback);
    }
    return q[cacheKey];
}

/* -----------------------------------
   OPTION HTML
----------------------------------- */
function generateOptionHtml(q, opt, selected, submitted, labelText) {
    // Map database columns to UI labels
    const rawText = labelText || q.options?.[opt] || q[`option_${opt.toLowerCase()}`] || "";
    const isSel = selected === opt;
    const isCorrect = submitted && (q.correct_answer === opt || q.correct_answer_key === opt);
    const isWrong = submitted && isSel && !isCorrect;

    const cls = isCorrect ? "border-green-600 bg-green-50" :
                isWrong ? "border-red-600 bg-red-50" :
                isSel ? "border-blue-500 bg-blue-50" :
                "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
            <div class="flex items-start p-4 border-2 rounded-xl transition-all duration-200 ${cls}">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 font-bold mr-4">${opt}</span>
                <span class="font-medium">${cleanKatexMarkers(rawText)}</span>
            </div>
        </label>`;
}

/* -----------------------------------
   QUESTION RENDERER (Optimized for Mobile)
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
    initializeElements();
    
    // Defer rendering to the next frame to prevent UI freezing on mobile
    requestAnimationFrame(() => {
        const type = (q.question_type || "").toLowerCase();
        const mainText = getCleanedText(q, 'question_text', q.text);
        const scenario = getCleanedText(q, 'scenario_reason_text', q.scenario_reason);

        /* ASSERTION–REASON */
        if (type.includes("ar") || type.includes("assertion")) {
            let A = mainText.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
            let R = scenario.replace(/Reason\s*\(R\)\s*:/ig, "").trim();

            els.list.innerHTML = `
                <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                    <div class="text-xl font-extrabold">Q${idx}. Assertion (A): ${A}</div>
                    <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600">
                        <span class="text-xs font-black uppercase">Reason (R)</span>
                        <div class="text-lg font-bold">${R}</div>
                    </div>
                    <div class="italic font-bold text-slate-500">Choose the correct option.</div>
                    <div class="grid gap-3">
                        ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])).join("")}
                    </div>
                </div>`;
            return;
        }

        /* CASE STUDY */
        if (type.includes("case")) {
            els.list.innerHTML = `
                <div class="animate-in fade-in duration-300 grid md:grid-cols-2 gap-8">
                    <div>
                        <div class="text-xl font-extrabold">Q${idx}: ${mainText}</div>
                        <div class="grid gap-3 mt-4">
                            ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}
                        </div>
                    </div>
                    <div class="bg-yellow-50 p-6 rounded-2xl border-2 border-dashed border-yellow-200 italic">${scenario}</div>
                </div>`;
            return;
        }

        /* MCQ */
        els.list.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                <div class="text-xl font-extrabold">Q${idx}: ${mainText}</div>
                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}
                </div>
            </div>`;
    });
}

/* -----------------------------------
   RESULTS + REVIEW MISTAKES
----------------------------------- */
export function renderResults(stats) {
    initializeElements();
    showView("results-screen");
    const motivation = (score, total) => {
        const p = (score / total) * 100;
        if (p === 100) return "Perfect Score! You are a subject expert.";
        if (p >= 80) return "Excellent work! Almost mastered.";
        return "Keep practicing, you're getting better!";
    };

    els.scoreBox.innerHTML = `
        <div class="text-4xl font-black text-slate-900">${stats.correct} / ${stats.total}</div>
        <div class="mt-3 px-4 py-3 bg-blue-50 rounded-2xl text-sm font-bold text-blue-800 text-center">
            ${motivation(stats.correct, stats.total)}
        </div>
    `;
}

export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;

    els.reviewContainer.innerHTML = `<div class="py-10 text-center"><h3 class="text-2xl font-black">Reviewing Your Logic...</h3></div>`;
    els.reviewContainer.classList.remove("hidden");

    // Use a timeout to allow the "Reviewing..." message to show before heavy DOM injection
    setTimeout(() => {
        const html = qs.map((q, i) => {
            const userAns = ua[q.id];
            const correctAns = q.correct_answer || q.correct_answer_key;
            const isCorrect = userAns === correctAns;
            const isAR = q.question_type.toLowerCase().includes("ar");
            
            const getOptText = (k) => {
                if (isAR) return AR_LABELS[k];
                return q.options?.[k] || q[`option_${k.toLowerCase()}`] || "N/A";
            };

            return `
            <div class="p-6 bg-white rounded-2xl border mb-6 relative shadow-sm">
                <div class="absolute top-0 right-0 px-3 py-1 text-xs font-black text-white ${isCorrect ? "bg-green-500" : "bg-amber-400"}">
                    ${isCorrect ? "Mastered" : "Learning"}
                </div>
                <p class="font-bold mb-4">Q${i + 1}. ${getCleanedText(q, 'question_text', q.text)}</p>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-3 bg-slate-50 rounded-xl border ${!isCorrect ? 'border-red-100' : ''}">
                        <span class="text-xs font-black text-slate-400 uppercase">Your Choice</span>
                        <p class="text-sm">${userAns ? getOptText(userAns) : "Skipped"}</p>
                    </div>
                    <div class="p-3 bg-green-50 rounded-xl border border-green-100">
                        <span class="text-xs font-black text-green-600 uppercase">Correct Answer</span>
                        <p class="text-sm">${getOptText(correctAns)}</p>
                    </div>
                </div>
            </div>`;
        }).join("");

        els.reviewContainer.innerHTML = `<div class="mb-10 text-center"><h3 class="text-3xl font-black">The Learning Map</h3></div>` + html;
        els.reviewContainer.scrollIntoView({ behavior: "smooth" });
    }, 50);
}

/* -----------------------------------
   UI HELPERS (Standard)
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
    els.list.onchange=e=>{ if(e.target.type==="radio") fn(e.target.name.slice(2),e.target.value); };
}
export function updateAuthUI(u){
    if(u && els.welcomeUser){
        els.welcomeUser.textContent=`Welcome, ${u.email.split("@")[0]}`;
        els.welcomeUser.classList.remove("hidden");
    }
}
