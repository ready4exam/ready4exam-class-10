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
   ROBUST AR NORMALIZER 
   (Separates Assertion from Reason strictly)
----------------------------------- */
function normalizeAssertionReason(q) {
    const raw = [
        q.question_text || q.text || "",
        q.scenario_reason_text || q.scenario_reason || ""
    ].join(" ").replace(/\s+/g, " ").trim();

    let assertion = raw;
    let reason = "";

    // Split strictly on the 'Reason (R):' marker
    if (/Reason\s*\(R\)\s*:/i.test(raw)) {
        const parts = raw.split(/Reason\s*\(R\)\s*:/i);
        assertion = parts[0];
        reason = parts.slice(1).join(" ");
    }

    // Remove labels completely
    assertion = assertion.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
    reason = reason.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();

    // Deduplicate if Reason text leaked into Assertion
    if (reason && assertion.includes(reason)) {
        assertion = assertion.replace(reason, "").trim();
    }

    return { 
        assertion: cleanKatexMarkers(assertion), 
        reason: cleanKatexMarkers(reason) 
    };
}

/* -----------------------------------
   OPTION HTML GENERATOR
----------------------------------- */
function generateOptionHtml(q, opt, selected, submitted, labelText) {
    const rawText = labelText || q.options?.[opt] || q[`option_${opt.toLowerCase()}`] || "";
    const isSel = selected === opt;
    const isCorrect = submitted && (q.correct_answer === opt || q.correct_answer_key === opt);
    const isWrong = submitted && isSel && !isCorrect;

    const cls = isCorrect ? "border-green-600 bg-green-50 shadow-green-100" :
                isWrong ? "border-red-600 bg-red-50 shadow-red-100" :
                isSel ? "border-blue-500 bg-blue-50 shadow-blue-100" :
                "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer group">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
            <div class="flex items-start p-4 border-2 rounded-xl transition-all ${cls}">
                <span class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 font-bold mr-4 group-hover:bg-blue-100">${opt}</span>
                <span class="font-medium pt-1 leading-snug">${cleanKatexMarkers(rawText)}</span>
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

    // 1. ASSERTION-REASON LAYOUT
    if (type.includes("ar") || type.includes("assertion")) {
        const { assertion, reason } = normalizeAssertionReason(q);
        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}. Assertion (A): ${assertion}</div>
                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                    <span class="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 block">Reason (R)</span>
                    <div class="text-lg font-bold text-gray-800 leading-relaxed">${reason}</div>
                </div>
                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])).join("")}
                </div>
            </div>`;
        return;
    }

    // 2. CASE STUDY LAYOUT (Question -> Hint -> Options)
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
                <div class="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-inner">
                    <h3 class="font-black mb-2 text-yellow-700 uppercase text-[10px] tracking-widest border-b border-yellow-200 pb-1">💡 Study Hint</h3>
                    <p class="text-yellow-900 leading-relaxed font-medium italic">${cleanKatexMarkers(q.scenario_reason)}</p>
                </div>
                <div class="grid gap-3 mt-4">
                    ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}
                </div>
            </div>`;
        return;
    }

    // 3. STANDARD MCQ
    els.list.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-6 text-left animate-fadeIn">
            <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
            <div class="grid gap-3">${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}</div>
        </div>`;
}

/* -----------------------------------
   RESULTS + COGNITIVE ANALYSIS
----------------------------------- */
export function renderResults(stats, diff) {
    initializeElements();
    showView("results-screen");

    if (els.scoreBox) {
        els.scoreBox.innerHTML = `
            <div class="text-5xl font-black text-blue-900 mb-2">${stats.correct}/${stats.total}</div>
            <div class="text-lg text-gray-500 font-bold italic text-center">Your brain just grew stronger!</div>
        `;
    }

    const analysisBtn = document.getElementById('btn-show-analysis');
    if (analysisBtn) {
        analysisBtn.onclick = () => {
            const getScore = (type) => (stats[type].t ? (stats[type].c / stats[type].t) : 0);
            const categories = [
                { name: "Memory Power (MCQ)", score: getScore('mcq'), high: "🏆 Master Architect!", low: "📖 Building foundations..." },
                { name: "Logic & Connection (A-R)", score: getScore('ar'), high: "🧠 Strategy Star!", low: "🔍 Pattern seeker..." },
                { name: "Real World Use (Case)", score: getScore('case'), high: "🔬 Explorer Level!", low: "🌱 Apply theory more." }
            ];

            els.analysisContent.innerHTML = categories.map(cat => `
                <div class="p-4 rounded-2xl border ${cat.score >= 0.7 ? 'bg-green-50 border-green-100' : 'bg-indigo-50 border-indigo-100'}">
                    <div class="flex justify-between items-center mb-1"><span class="text-xs font-black uppercase text-slate-600">${cat.name}</span><span class="font-bold">${Math.round(cat.score * 100)}%</span></div>
                    <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2 shadow-inner"><div class="h-full ${cat.score >= 0.7 ? 'bg-green-500' : 'bg-indigo-500'}" style="width: ${cat.score * 100}%"></div></div>
                    <p class="text-sm text-slate-700 leading-relaxed">${cat.score >= 0.7 ? cat.high : cat.low}</p>
                </div>`).join('');
            els.analysisModal?.classList.remove('hidden');
        };
    }
}

/* -----------------------------------
   REVIEW MY MISTAKES (SIDE-BY-SIDE)
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;
    els.reviewContainer.classList.remove("hidden");
    els.reviewContainer.innerHTML = qs.map((q, i) => {
        const u = ua[q.id], c = q.correct_answer || q.correct_answer_key, isCorrect = u === c;
        const isAR = q.question_type.toLowerCase().includes('ar');
        const getAnsText = (key) => isAR ? AR_LABELS[key] : (q.options?.[key] || q[`option_${key.toLowerCase()}`]);
        
        return `
        <div class="p-6 bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm mb-8 relative">
            <div class="absolute top-0 right-0 bg-${isCorrect ? 'green-500' : 'amber-400'} text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">${isCorrect ? 'Mastered' : 'Growing'}</div>
            <div class="flex gap-4 mb-6"><span class="flex-shrink-0 w-10 h-10 rounded-2xl ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center font-black text-lg">${i + 1}</span><p class="font-bold text-slate-800 text-lg pt-1">${cleanKatexMarkers(q.text)}</p></div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-12">
                <div class="p-4 rounded-2xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/50' : 'border-slate-100 bg-slate-50'}">
                    <span class="text-[10px] font-black uppercase text-slate-400 block mb-2 tracking-tighter">Your Thought</span>
                    <p class="text-sm font-bold text-slate-700">${u ? `(${u}) ${cleanKatexMarkers(getAnsText(u))}` : "Skipped"}</p>
                </div>
                <div class="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50">
                    <span class="text-[10px] font-black uppercase text-indigo-500 block mb-2 tracking-tighter">The Golden Key</span>
                    <p class="text-sm font-bold text-indigo-900">(${c}) ${cleanKatexMarkers(getAnsText(c))}</p>
                </div>
            </div>
        </div>`;
    }).join("");
    els.reviewContainer.scrollIntoView({ behavior: "smooth" });
}

/* -----------------------------------
   UI HELPERS
----------------------------------- */
export function hideStatus(){ els.status?.classList.add("hidden"); }
export function updateHeader(t,d){ els.header.textContent=t; els.diff.textContent=`Difficulty: ${d}`; }
export function showView(v){ [els.quiz,els.results,els.paywall].forEach(x=>x?.classList.add("hidden")); (v==="quiz-content"?els.quiz:v==="results-screen"?els.results:els.paywall)?.classList.remove("hidden"); }
export function showStatus(m,c=""){ if(els.status) { els.status.textContent=m; els.status.className=c; els.status.classList.remove("hidden"); }}
export function updateNavigation(i,t,s){
    els.prev?.classList.toggle("hidden",i===0);
    els.next?.classList.toggle("hidden",i===t-1);
    els.submit?.classList.toggle("hidden",s||i!==t-1);
    if(els.counter) els.counter.textContent=`${String(i+1).padStart(2, "0")} / ${t}`;
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
