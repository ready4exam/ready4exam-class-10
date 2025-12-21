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
   MOTIVATIONAL FEEDBACK
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
        isCorrect ? "border-green-600 bg-green-50" :
        isWrong ? "border-red-600 bg-red-50" :
        isSel ? "border-blue-500 bg-blue-50" :
        "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer group">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden"
                ${isSel ? "checked" : ""} ${submitted ? "disabled" : ""}>
            <div class="flex items-start p-4 border-2 rounded-xl transition-all ${borderCls}">
                <span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 font-bold mr-4">${opt}</span>
                <span class="font-medium pt-1">${cleanKatexMarkers(text)}</span>
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

    /* ===== ASSERTION–REASON (ROBUST) ===== */
    if (type.includes("ar") || type.includes("assertion")) {
        let assertionText = q.text || "";
        let reasonText = q.scenario_reason || "";

        if (reasonText.toLowerCase().includes("assertion") && reasonText.toLowerCase().includes("reason")) {
            const parts = reasonText.split(/Reason\s*\(R\)\s*:/i);
            assertionText = parts[0].replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
            reasonText = (parts[1] || "").trim();
        }

        if (assertionText.toLowerCase().includes("reason")) {
            const parts = assertionText.split(/Reason\s*\(R\)\s*:/i);
            assertionText = parts[0].replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
            if (!reasonText && parts[1]) reasonText = parts[1].trim();
        }

        assertionText = assertionText.replace(/Assertion\s*\(A\)\s*:/ig, "").trim();
        reasonText = reasonText.replace(/Reason\s*\(R\)\s*:/ig, "").trim();

        els.list.innerHTML = `
            <div class="space-y-6">
                <div class="text-xl font-extrabold">Q${idx}. Assertion (A): ${assertionText}</div>
                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600">
                    <span class="text-xs font-black uppercase">Reason (R)</span>
                    <div class="text-lg font-bold">${reasonText}</div>
                </div>
                <div class="italic font-bold">Choose the correct option.</div>
                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])).join("")}
                </div>
            </div>`;
        return;
    }

    /* ===== CASE STUDY ===== */
    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="grid md:grid-cols-2 gap-8">
                <div>
                    <div class="text-xl font-extrabold">Q${idx}: ${q.text}</div>
                    <div class="grid gap-3 mt-4">
                        ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}
                    </div>
                </div>
                <div class="bg-yellow-50 p-6 rounded-2xl italic">${q.scenario_reason}</div>
            </div>`;
        return;
    }

    /* ===== MCQ ===== */
    els.list.innerHTML = `
        <div class="space-y-6">
            <div class="text-xl font-extrabold">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
            <div class="grid gap-3">
                ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}
            </div>
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
            <div class="text-4xl font-black">${stats.correct} / ${stats.total}</div>
            <div class="italic mt-2">${getMotivationalFeedback(stats.correct, stats.total)}</div>
        `;
    }

    const analysisBtn = document.getElementById("btn-show-analysis");
    if (analysisBtn) {
        analysisBtn.onclick = () => {
            const getScore = t => stats[t].t ? stats[t].c / stats[t].t : 0;

            const categories = [
                { name: "Memory Power (MCQ)", score: getScore("mcq"),
                  high: "🏆 Strong factual recall.",
                  low: "📖 Revise definitions and facts." },
                { name: "Logic & Connection (A-R)", score: getScore("ar"),
                  high: "🧠 Strong reasoning skills.",
                  low: "🔍 Practice linking causes and effects." },
                { name: "Real World Use (Case)", score: getScore("case"),
                  high: "🔬 Excellent application ability.",
                  low: "🌱 Practice applying concepts." }
            ];

            els.analysisContent.innerHTML = categories.map(c => `
                <div class="p-4 rounded-xl ${c.score>=0.7?'bg-green-50':'bg-indigo-50'}">
                    <div class="flex justify-between">
                        <b>${c.name}</b><span>${Math.round(c.score*100)}%</span>
                    </div>
                    <p class="text-sm mt-2">${c.score>=0.7?c.high:c.low}</p>
                </div>
            `).join("");

            els.analysisModal.classList.remove("hidden");
        };
    }
}

/* -----------------------------------
   REVIEW MY MISTAKES (ENHANCED)
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;

    els.reviewContainer.classList.remove("hidden");

    els.reviewContainer.innerHTML = `
        <h3 class="text-3xl font-black text-center mb-8">The Learning Map</h3>
        ${qs.map((q,i)=>{
            const u=ua[q.id], c=q.correct_answer, ar=q.question_type.toLowerCase().includes("ar");
            const txt=k=>ar?AR_LABELS[k]:q.options[k];
            return `
            <div class="p-6 bg-white rounded-2xl mb-6">
                <b>Q${i+1}. ${q.text}</b>
                <p class="text-red-600 mt-2">Your Answer: ${u?txt(u):"Skipped"}</p>
                <p class="text-green-700">Correct: ${txt(c)}</p>
            </div>`;
        }).join("")}
    `;
}

/* -----------------------------------
   UI HELPERS
----------------------------------- */
export function hideStatus(){els.status?.classList.add("hidden");}
export function updateHeader(t,d){els.header.textContent=t;els.diff.textContent=`Difficulty: ${d}`;}
export function showView(v){[els.quiz,els.results,els.paywall].forEach(x=>x?.classList.add("hidden"));els[v==="quiz-content"?"quiz":v==="results-screen"?"results":"paywall"]?.classList.remove("hidden");}
export function showStatus(m,c=""){els.status.textContent=m;els.status.className=c;els.status.classList.remove("hidden");}
export function updateNavigation(i,t,s){els.prev?.classList.toggle("hidden",i===0);els.next?.classList.toggle("hidden",i===t-1);els.submit?.classList.toggle("hidden",s||i!==t-1);els.counter.textContent=`${i+1}/${t}`;}
export function attachAnswerListeners(fn){els.list.onchange=e=>{if(e.target.type==="radio")fn(e.target.name.slice(2),e.target.value);};}
export function updateAuthUI(u){if(u&&els.welcomeUser){els.welcomeUser.textContent=`Welcome, ${u.email.split("@")[0]}`;els.welcomeUser.classList.remove("hidden");}}
