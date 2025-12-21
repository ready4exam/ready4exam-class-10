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
   MOTIVATIONAL FEEDBACK LOGIC
----------------------------------- */
function getMotivationalFeedback(score, total) {
    const p = (score / total) * 100;
    if (p === 100) return "🌟 Perfect Score! Your brain is a library of knowledge!";
    if (p >= 80) return "🚀 Amazing! You've mastered almost every challenge here.";
    if (p >= 50) return "📈 Great Effort! Your brain is growing stronger with every answer.";
    return "💡 Every expert started as a beginner. Keep exploring and you'll get there!";
}

/* -----------------------------------
   OPTION HTML GENERATOR
----------------------------------- */
function generateOptionHtml(q, opt, selected, submitted, labelText) {
    const text = labelText || q.options[opt] || "";
    const isSel = selected === opt;
    const isCorrect = submitted && q.correct_answer === opt;
    const isWrong = submitted && isSel && !isCorrect;
    
    const borderCls = isCorrect ? "border-green-600 bg-green-50 shadow-green-100" : 
                      isWrong ? "border-red-600 bg-red-50 shadow-red-100" : 
                      selected === opt ? "border-blue-500 bg-blue-50 shadow-blue-100" : 
                      "border-gray-100 bg-white hover:border-blue-300";

    return `
        <label class="block cursor-pointer group">
            <input type="radio" name="q-${q.id}" value="${opt}" class="hidden" ${isSel ? "checked" : ""} ${submitted ? 'disabled' : ''}>
            <div class="flex items-start p-4 border-2 rounded-xl transition-all ${borderCls}">
                <span class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 font-bold mr-4 group-hover:bg-blue-100">${opt}</span>
                <span class="font-medium pt-1 text-gray-800 leading-snug">${cleanKatexMarkers(text)}</span>
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

    if (type.includes("ar") || type.includes("assertion")) {
        const assertion = q.text.replace(/Assertion\s*\(A\)\s*:/gi, "").trim();
        els.list.innerHTML = `
            <div class="space-y-6 text-left animate-fadeIn">
                <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}. Assertion (A): ${assertion}</div>
                <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600 shadow-sm">
                    <span class="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 block">Reason (R)</span>
                    <div class="text-lg font-bold text-gray-800">${q.scenario_reason}</div>
                </div>
                <div class="text-sm font-black text-gray-900 italic px-2">Choose the best path for this logic puzzle:</div>
                <div class="grid gap-3">
                    ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted, AR_LABELS[o])).join("")}
                </div>
            </div>`;
        return;
    }

    if (type.includes("case")) {
        els.list.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left animate-fadeIn">
                <div class="flex flex-col space-y-6 order-first md:order-1">
                    <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}: ${q.text}</div>
                    <div class="p-6 bg-yellow-50 rounded-2xl border border-yellow-100 shadow-inner block md:hidden">
                        <h3 class="font-black mb-3 text-yellow-700 uppercase text-[10px] tracking-widest border-b border-yellow-200 pb-2">💡 Explorer Clue</h3>
                        <p class="text-yellow-900 leading-relaxed font-medium italic break-words">${q.scenario_reason}</p>
                    </div>
                    <div class="grid gap-3">
                        ${['A','B','C','D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}
                    </div>
                </div>
                <div class="hidden md:block p-6 bg-yellow-50 rounded-2xl border border-yellow-100 shadow-inner h-fit order-2">
                    <h3 class="font-black mb-3 text-yellow-700 uppercase text-xs tracking-widest border-b border-yellow-200 pb-2">💡 Explorer Clue</h3>
                    <p class="text-yellow-900 leading-relaxed font-medium italic break-words">${q.scenario_reason}</p>
                </div>
            </div>`;
        return;
    }

    els.list.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-6 text-left animate-fadeIn">
            <div class="text-xl font-extrabold text-gray-900 leading-snug">Q${idx}: ${cleanKatexMarkers(q.text)}</div>
            <div class="grid gap-3">${['A','B','C', 'D'].map(o => generateOptionHtml(q, o, selected, submitted)).join("")}</div>
        </div>`;
}

/* -----------------------------------
   RESULTS & COGNITIVE ANALYSIS
----------------------------------- */
export function renderResults(stats, diff) {
    initializeElements();
    showView("results-screen");

    if (els.scoreBox) {
        const motivation = getMotivationalFeedback(stats.correct, stats.total);
        els.scoreBox.innerHTML = `
            <div class="text-4xl md:text-5xl font-black text-blue-900 mb-2">${stats.correct} / ${stats.total}</div>
            <div class="text-sm md:text-lg text-gray-500 font-bold italic leading-relaxed break-words max-w-sm mx-auto px-4">${motivation}</div>
        `;
    }

    const analysisBtn = document.getElementById('btn-show-analysis');
    if (analysisBtn) {
        analysisBtn.onclick = () => {
            const getScore = (type) => (stats[type].c / (stats[type].t || 1));
            
            const categories = [
                { 
                    name: "The Recall Engine (Memory)", 
                    score: getScore('mcq'), 
                    high: "🏆 **Master Architect:** You have built a library of facts! Your ability to remember details is a massive strength.",
                    low: "🌱 **Builder in Progress:** Your brain is still organizing these facts. Re-reading them like a story will help them 'stick'."
                },
                { 
                    name: "The Logic Linker (Reasoning)", 
                    score: getScore('ar'), 
                    high: "🧠 **Strategy Star:** You don't just know 'what,' you know 'why.' You can see how ideas connect!",
                    low: "🔍 **Detective Trainee:** You're learning to spot clues! Ask 'Why?' after you read to turn facts into logic."
                },
                { 
                    name: "The Problem Solver (Application)", 
                    score: getScore('case'), 
                    high: "🔬 **Real-World Hero:** You can take lessons and use them in real life. That's how great inventors think!",
                    low: "🚀 **Ready for Launch:** You know the rules; now we're practicing how to use them. Every attempt makes you sharper."
                }
            ];

            els.analysisContent.innerHTML = `
                <div class="space-y-5">
                    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-3xl text-white shadow-lg">
                        <p class="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Growth Mindset</p>
                        <p class="text-sm font-medium italic">"Every hard question makes your brain stronger. You aren't 'wrong'—you're just learning!"</p>
                    </div>
                    <div class="grid gap-4">
                        ${categories.map(cat => {
                            const isGood = cat.score >= 0.7;
                            return `
                            <div class="p-5 rounded-3xl border-2 ${isGood ? 'border-green-100 bg-green-50/30' : 'border-amber-100 bg-amber-50/30'}">
                                <div class="flex justify-between items-end mb-2">
                                    <h4 class="font-black text-slate-800 text-sm tracking-tight">${cat.name}</h4>
                                    <span class="text-xs font-bold ${isGood ? 'text-green-600' : 'text-amber-600'}">${Math.round(cat.score * 100)}%</span>
                                </div>
                                <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-3">
                                    <div class="h-full ${isGood ? 'bg-green-500' : 'bg-amber-500'}" style="width: ${cat.score * 100}%"></div>
                                </div>
                                <p class="text-xs text-slate-600 leading-relaxed">${isGood ? cat.high : cat.low}</p>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            els.analysisModal?.classList.remove('hidden');
        };
    }
}

/* -----------------------------------
   MISTAKE REVIEW SECTION
----------------------------------- */
export function renderAllQuestionsForReview(qs, ua) {
    initializeElements();
    if (!els.reviewContainer) return;
    
    els.reviewContainer.classList.remove("hidden");
    els.reviewContainer.innerHTML = `
        <div class="mb-10 text-center px-4">
            <h3 class="text-3xl font-black text-slate-900 mb-2">The Learning Map</h3>
            <p class="text-slate-500 font-medium">Comparing ideas with facts is how experts are made!</p>
        </div>
        ${qs.map((q, i) => {
            const userAns = ua[q.id];
            const correctAns = q.correct_answer;
            const isCorrect = userAns === correctAns;
            const isAR = q.question_type.toLowerCase().includes('ar');
            const getAnsText = (key) => isAR ? AR_LABELS[key] : q.options[key];

            return `
            <div class="p-6 bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm mb-8 relative">
                <div class="absolute top-0 right-0 bg-${isCorrect ? 'green-500' : 'amber-400'} text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase">
                    ${isCorrect ? 'Mastered' : 'Growing'}
                </div>
                
                <div class="flex gap-4 mb-6">
                    <span class="flex-shrink-0 w-10 h-10 rounded-2xl ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center font-black text-lg">
                        ${i + 1}
                    </span>
                    <p class="font-bold text-slate-800 text-lg pt-1">${cleanKatexMarkers(q.text.replace(/Assertion \(A\):/gi, "A:"))}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-12">
                    <div class="p-4 rounded-2xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/50' : 'border-slate-100 bg-slate-50'}">
                        <p class="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-tighter">Your Thought</p>
                        <p class="text-sm font-bold text-slate-700">${userAns ? `(${userAns}) ${cleanKatexMarkers(getAnsText(userAns))}` : "Skipped"}</p>
                    </div>

                    <div class="p-4 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50">
                        <p class="text-[10px] uppercase font-black text-indigo-500 mb-2 tracking-tighter">The Golden Key</p>
                        <p class="text-sm font-bold text-indigo-900">(${correctAns}) ${cleanKatexMarkers(getAnsText(correctAns))}</p>
                    </div>
                </div>
            </div>`;
        }).join("")}
    `;
    els.reviewContainer.scrollIntoView({ behavior: "smooth" });
}

/* -----------------------------------
   UTILITY UI UPDATES (STAY UNTOUCHED)
----------------------------------- */
export function hideStatus() { initializeElements(); if (els.status) els.status.classList.add("hidden"); }
export function updateHeader(t, d) { initializeElements(); if (els.header) els.header.textContent = t; if (els.diff) els.diff.textContent = `Difficulty: ${d}`; }
export function showView(v) { initializeElements(); [els.quiz, els.results, els.paywall].forEach(x => x?.classList.add("hidden")); if (v === "quiz-content") els.quiz?.classList.remove("hidden"); if (v === "results-screen") els.results?.classList.remove("hidden"); if (v === "paywall-screen") els.paywall?.classList.remove("hidden"); }
export function showStatus(msg, cls = "text-blue-600") { initializeElements(); if (els.status) { els.status.textContent = msg; els.status.className = `p-4 font-bold ${cls}`; els.status.classList.remove("hidden"); } }
export function updateNavigation(i, t, s) { initializeElements(); els.prev?.classList.toggle("hidden", i === 0); els.next?.classList.toggle("hidden", i === t - 1); els.submit?.classList.toggle("hidden", s || i !== t - 1); if (els.counter) els.counter.textContent = `${String(i + 1).padStart(2, "0")} / ${t}`; }
export function attachAnswerListeners(fn) { initializeElements(); if (els.list) { els.list.onchange = e => { if (e.target.type === "radio") fn(e.target.name.substring(2), e.target.value); }; } }
export function updateAuthUI(user) { initializeElements(); if (els.welcomeUser && user) { els.welcomeUser.textContent = `Welcome, ${user.email.split('@')[0]}`; els.welcomeUser.classList.remove("hidden"); } }
