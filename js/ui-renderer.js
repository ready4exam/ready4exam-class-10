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
    if (p === 100) return "🌟 Perfect Score! You are a Subject Matter Expert!";
    if (p >= 80) return "🚀 Outstanding! You've mastered the core concepts of this chapter.";
    if (p >= 50) return "📈 Good Progress! A little more practice and you'll reach the top.";
    return "💡 Keep Going! Every mistake is a learning opportunity.";
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
                <span class="font-medium">${cleanKatexMarkers(text)}</span>
            </div>
        </label>`;
}

/* -----------------------------------
   QUESTION RENDERER
----------------------------------- */
export function renderQuestion(q, idx, selected, submitted) {
    initializeElements();
    const type = (q.question_type || "").toLowerCase();

    /* ASSERTION–REASON (ROBUST) */
    if (type.includes("ar") || type.includes("assertion")) {
        let A = q.text || "";
        let R = q.scenario_reason || "";

        A = A.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
        R = R.replace(/Reason\s*\(R\)\s*:/ig, "").trim();

        els.list.innerHTML = `
            <div class="space-y-6">
                <div class="text-xl font-extrabold">Q${idx}. Assertion (A): ${A}</div>
                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600">
                    <span class="text-xs font-black uppercase">Reason (R)</span>
                    <div class="text-lg font-bold">${R}</div>
                </div>
                <div class="italic font-bold">Choose the correct option.</div>
                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o =>
                        generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])
                    ).join("")}
                </div>
            </div>`;
        return;
    }

    /* CASE STUDY */
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <div class="text-xl font-extrabold">Q${idx}: ${q.text}</div>
                    <div class="grid gap-3 mt-4">
                        ${['A','B','C','D'].map(o =>
                            generateOptionHtml(q, o, selected, submitted)
                        ).join("")}
                    </div>
                </div>
                <div class="bg-yellow-50 p-6 rounded-2xl italic">${q.scenario_reason}</div>
            </div>`;
        return;
    }

    /* MCQ */
    els.list.innerHTML = `
        <div class="space-y-6">
            <div class="text-xl font-extrabold">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
            <div class="grid gap-3">
                ${['A','B','C','D'].map(o =>
                    generateOptionHtml(q, o, selected, submitted)
                ).join("")}
            </div>
        </div>`;
}

/* -----------------------------------
   RESULTS + COGNITIVE FEEDBACK (FIXED)
----------------------------------- */
export function renderResults(stats, diff) {
    initializeElements();
    showView("results-screen");

    els.scoreBox.innerHTML = `
        <div class="text-4xl font-black">${stats.correct} / ${stats.total}</div>
        <div class="italic mt-2">${getMotivationalFeedback(stats.correct, stats.total)}</div>
    `;

    /* ROBUST BUTTON WIRING */
    setTimeout(() => {
        const analysisBtn = document.getElementById("btn-show-analysis");
        if (!analysisBtn) return;

        analysisBtn.onclick = () => {
            const getScore = t => stats[t].t ? stats[t].c / stats[t].t : 0;

            const skills = [
                { name:"Memory Power (MCQ)", s:getScore("mcq"),
                  hi:"🏆 Strong factual recall.",
                  lo:"📖 Revise definitions and facts." },
                { name:"Logic & Connection (A-R)", s:getScore("ar"),
                  hi:"🧠 Strong reasoning ability.",
                  lo:"🔍 Practice linking causes and effects." },
                { name:"Application (Case)", s:getScore("case"),
                  hi:"🔬 Excellent real-world application.",
                  lo:"🌱 Practice applying concepts step-by-step." }
            ];

            els.analysisContent.innerHTML = skills.map(k => `
                <div class="p-4 rounded-xl ${k.s>=0.7?'bg-green-50':'bg-indigo-50'} mb-3">
                    <div class="flex justify-between font-bold">
                        <span>${k.name}</span>
                        <span>${Math.round(k.s*100)}%</span>
                    </div>
                    <p class="text-sm mt-2">${k.s>=0.7?k.hi:k.lo}</p>
                </div>
            `).join("");

            els.analysisModal.classList.remove("hidden");
        };
    }, 0);
}

/* -----------------------------------
   REVIEW MY MISTAKES (FIXED – NO LAYERING)
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;

    els.reviewContainer.innerHTML = "";   // 🔴 FIX: prevents layering
    els.reviewContainer.classList.remove("hidden");

    els.reviewContainer.innerHTML = `
        <div class="mb-10 text-center">
            <h3 class="text-3xl font-black">The Learning Map</h3>
            <p class="italic text-sm">Growing beats guessing.</p>
        </div>

        ${qs.map((q,i)=>{
            const u=ua[q.id], c=q.correct_answer;
            const ar=q.question_type.toLowerCase().includes("ar");
            const txt=k=>ar?AR_LABELS[k]:q.options[k];
            const ok=u===c;

            return `
            <div class="p-6 bg-white rounded-2xl border mb-6 relative">
                <div class="absolute top-0 right-0 px-3 py-1 text-xs font-black text-white
                    ${ok?'bg-green-500':'bg-amber-400'}">
                    ${ok?'Mastered':'Growing'}
                </div>

                <p class="font-bold mb-4">Q${i+1}. ${q.text}</p>

                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-3 bg-slate-50 rounded-xl">
                        <span class="text-xs font-black">Your Thought</span>
                        <p class="text-sm">${u?txt(u):"Skipped"}</p>
                    </div>
                    <div class="p-3 bg-indigo-50 rounded-xl">
                        <span class="text-xs font-black">The Golden Key</span>
                        <p class="text-sm">${txt(c)}</p>
                    </div>
                </div>
            </div>`;
        }).join("")}
    `;

    els.reviewContainer.scrollIntoView({behavior:"smooth"});
}

/* -----------------------------------
   UI HELPERS
----------------------------------- */
export function hideStatus(){els.status?.classList.add("hidden");}
export function updateHeader(t,d){els.header.textContent=t;els.diff.textContent=`Difficulty: ${d}`;}
export function showView(v){
    [els.quiz,els.results,els.paywall].forEach(x=>x?.classList.add("hidden"));
    (v==="quiz-content"?els.quiz:v==="results-screen"?els.results:els.paywall)?.classList.remove("hidden");
}
export function showStatus(m,c=""){els.status.textContent=m;els.status.className=c;els.status.classList.remove("hidden");}
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
    if(u&&els.welcomeUser){
        els.welcomeUser.textContent=`Welcome, ${u.email.split("@")[0]}`;
        els.welcomeUser.classList.remove("hidden");
    }
}
