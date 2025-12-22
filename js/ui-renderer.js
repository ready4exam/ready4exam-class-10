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
   MOTIVATIONAL FEEDBACK
----------------------------------- */
function getMotivationalFeedback(score, total) {
    const p = (score / total) * 100;
    if (p === 100) return "🌟 Perfect Score! You are thinking like a subject expert!";
    if (p >= 80) return "🚀 Excellent work! You are very close to mastery.";
    if (p >= 50) return "📈 Good Progress! A little more practice and you'll reach the top.";
    return "💡 Every attempt builds understanding. Keep practicing with focus.";
}

/* -----------------------------------
   ROBUST AR NORMALIZER (FIXES DUPLICATION)
----------------------------------- */
function normalizeAssertionReason(q) {
    // Combine both fields to catch merged raw data from the table
    const raw = [
        q.question_text || q.text || "",
        q.scenario_reason_text || q.scenario_reason || ""
    ].join(" ").replace(/\s+/g, " ").trim();

    let assertion = raw;
    let reason = "";

    // Strictly split by the "Reason (R):" marker to isolate the reason
    if (/Reason\s*\(R\)\s*:/i.test(raw)) {
        const parts = raw.split(/Reason\s*\(R\)\s*:/i);
        assertion = parts[0];
        reason = parts.slice(1).join(" ");
    }

    // Strip internal labels to prevent nested headers (e.g., Assertion: Assertion:)
    assertion = assertion.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
    reason = reason.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();

    // Deduplicate: If the reason text leaked into the assertion section, clip it out
    if (reason && assertion.includes(reason)) {
        assertion = assertion.replace(reason, "").trim();
        // Remove trailing "Reason:" label if it remains in the assertion part
        assertion = assertion.replace(/Reason\s*\(R\)\s*:?$/i, "").trim();
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
    const text = labelText || q.options[opt] || "";
    const isSel = selected === opt;
    const isCorrect = submitted && q.correct_answer === opt;
    const isWrong = submitted && isSel && !isCorrect;

    const cls =
        isCorrect ? "border-green-600 bg-green-50 shadow-sm" :
        isWrong ? "border-red-600 bg-red-50 shadow-sm" :
        isSel ? "border-blue-500 bg-blue-50 shadow-md" :
        "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer group">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
            <div class="flex items-start p-4 border-2 rounded-xl transition-all ${cls}">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 font-bold mr-4 group-hover:bg-blue-100">${opt}</span>
                <span class="font-medium pt-1 leading-snug text-gray-800">${cleanKatexMarkers(text)}</span>
            </div>
        </label>`;
}

/* -----------------------------------
   QUESTION RENDERER
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
    initializeElements();
    const type = (q.question_type || "").toLowerCase();

    /* ASSERTION–REASON (ROBUST SPLIT) */
    if (type.includes("ar") || type.includes("assertion")) {
        const { assertion, reason } = normalizeAssertionReason(q);

        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}. Assertion (A): ${assertion}</div>
                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                    <span class="text-xs font-black uppercase text-blue-600 tracking-widest mb-2 block">Reason (R)</span>
                    <div class="text-lg font-bold text-gray-800 leading-relaxed">${reason}</div>
                </div>
                <div class="italic font-bold text-gray-500 px-2">Regarding the assertion and reason, choose the correct option.</div>
                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o =>
                        generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])
                    ).join("")}
                </div>
            </div>`;
        return;
    }

    /* CASE STUDY (QUESTION -> HINT -> OPTIONS) */
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
                <div class="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-inner">
                    <h3 class="font-black mb-2 text-yellow-700 uppercase text-[10px] tracking-widest border-b border-yellow-200 pb-1">💡 Study Hint</h3>
                    <p class="text-yellow-900 leading-relaxed font-medium italic">${q.scenario_reason}</p>
                </div>
                <div class="grid gap-3 mt-4">
                    ${['A','B','C','D'].map(o =>
                        generateOptionHtml(q, o, selected, submitted)
                    ).join("")}
                </div>
            </div>`;
        return;
    }

    /* MCQ */
    els.list.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-6 text-left animate-fadeIn">
            <div class="text-xl font-extrabold text-gray-900">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
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
export function renderResults(stats, diff) {
    initializeElements();
    showView("results-screen");

    const motivation = getMotivationalFeedback(stats.correct, stats.total);

    /* MOBILE-SAFE SCORE */
    els.scoreBox.innerHTML = `
        <div class="text-5xl font-black text-slate-900 mb-2">
            ${stats.correct} / ${stats.total}
        </div>
        <div class="mt-3 px-6 py-4 bg-blue-50 rounded-3xl 
                    text-sm font-bold text-blue-800 
                    leading-relaxed text-center shadow-inner">
            ${motivation}
        </div>
    `;

    /* COGNITIVE FEEDBACK */
    setTimeout(() => {
        const analysisBtn = document.getElementById("btn-show-analysis");
        if (!analysisBtn) return;

        analysisBtn.onclick = () => {
            const getScore = t => stats[t].t ? stats[t].c / stats[t].t : 0;
            const skills = [
                {
                    name: "Memory Power (MCQ)",
                    score: getScore("mcq"),
                    strength: "🏆 Master Architect: You recall definitions and facts flawlessly!",
                    improve: "📖 Builder: Revise the NCERT summaries to make facts stick like glue."
                },
                {
                    name: "Logic & Connection (A-R)",
                    score: getScore("ar"),
                    strength: "🧠 Strategy Star: You connect causes to effects beautifully!",
                    improve: "🔍 Detective: Practice the 'Because' test for every statement."
                },
                {
                    name: "Application of Concepts (Case Study)",
                    score: getScore("case"),
                    strength: "🔬 Real-World Hero: You apply theory to situations like a pro!",
                    improve: "🚀 Explorer: Break scenario puzzles into smaller steps first."
                }
            ];

            els.analysisContent.innerHTML = `
                <div class="space-y-5">
                    <div class="p-5 rounded-3xl bg-indigo-600 text-white shadow-lg">
                        <h4 class="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">
                            Learning DNA Profile
                        </h4>
                        <p class="text-sm leading-relaxed italic">
                            "Every mistake is a new connection in your brain. You aren't getting it wrong; you are getting it stronger!"
                        </p>
                    </div>

                    ${skills.map(s => {
                        const pct = Math.round(s.score * 100);
                        const good = s.score >= 0.7;
                        return `
                        <div class="p-5 rounded-3xl border-2 ${good ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"}">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs font-black uppercase text-slate-600 tracking-tight">${s.name}</span>
                                <span class="font-bold text-lg">${pct}%</span>
                            </div>
                            <div class="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-3 shadow-inner">
                                <div class="h-full transition-all duration-1000 ${good ? "bg-green-500" : "bg-orange-500"}" style="width:${pct}%"></div>
                            </div>
                            <p class="text-xs font-medium leading-relaxed text-slate-700">${good ? s.strength : s.improve}</p>
                        </div>`;
                    }).join("")}
                </div>
            `;
            els.analysisModal?.classList.remove("hidden");
        };
    }, 0);
}

/* -----------------------------------
   REVIEW MY MISTAKES (SIDE-BY-SIDE)
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;

    els.reviewContainer.innerHTML = "";
    els.reviewContainer.classList.remove("hidden");

    els.reviewContainer.innerHTML = `
        <div class="mb-10 text-center px-4">
            <h3 class="text-3xl font-black text-slate-800 tracking-tighter">The Learning Map</h3>
            <p class="text-slate-500 font-medium italic text-sm mt-1">Comparing your observation with the fact is how experts grow.</p>
        </div>

        ${qs.map((q, i) => {
            const userAns = ua[q.id];
            const correctAns = q.correct_answer;
            const isCorrect = userAns === correctAns;
            const isAR = q.question_type.toLowerCase().includes("ar");
            const getText = k => isAR ? AR_LABELS[k] : (q.options[k] || "Not Found");

            return `
            <div class="p-6 bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm mb-8 relative overflow-hidden transition-all hover:shadow-md">
                <div class="absolute top-0 right-0 px-5 py-1 text-[10px] font-black text-white uppercase tracking-widest shadow-sm ${isCorrect ? "bg-green-500" : "bg-amber-400"}">
                    ${isCorrect ? "Mastered" : "Growing"}
                </div>

                <div class="flex gap-4 mb-6">
                    <span class="flex-shrink-0 w-10 h-10 rounded-2xl ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center font-black text-lg">
                        ${i + 1}
                    </span>
                    <p class="font-bold text-slate-800 text-lg pt-1 leading-snug">${cleanKatexMarkers(q.text)}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-4 rounded-2xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/30' : 'border-slate-100 bg-slate-50/50'}">
                        <span class="text-[10px] font-black uppercase text-slate-400 tracking-tighter block mb-2">Your Observation</span>
                        <p class="text-sm font-bold text-slate-700 leading-relaxed">${userAns ? getText(userAns) : "Skipped for now"}</p>
                    </div>
                    <div class="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50">
                        <span class="text-[10px] font-black uppercase text-indigo-500 tracking-tighter block mb-2">The Golden Key</span>
                        <p class="text-sm font-bold text-indigo-900 leading-relaxed">${getText(correctAns)}</p>
                    </div>
                </div>
            </div>`;
        }).join("")}
    `;

    els.reviewContainer.scrollIntoView({ behavior: "smooth" });
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
export function showStatus(m,c=""){ if(els.status) { els.status.textContent=m; els.status.className=c; els.status.classList.remove("hidden"); }}
export function updateNavigation(i,t,s){
    els.prev?.classList.toggle("hidden",i===0);
    els.next?.classList.toggle("hidden",i===t-1);
    els.submit?.classList.toggle("hidden",s||i!==t-1);
    if(els.counter) els.counter.textContent=`${String(i+1).padStart(2, '0')} / ${t}`;
}
export function attachAnswerListeners(fn){
    els.list.onchange=e=>{
        if(e.target.type==="radio") fn(e.target.name.substring(2),e.target.value);
    };
}
export function updateAuthUI(u){
    if(u && els.welcomeUser){
        els.welcomeUser.textContent=`Welcome, ${u.email.split("@")[0]}`;
        els.welcomeUser.classList.remove("hidden");
    }
}
