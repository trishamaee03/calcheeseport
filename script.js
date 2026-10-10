(() => {
  "use strict";

  /* =====================================================================
     1) EDIT YOUR INFORMATION HERE
     Leave "" or [] for anything unknown. The chatbot will say the
     information has not been provided instead of making something up.
     ===================================================================== */
  const PROFILE = {
    preferredName: "Trisha",
    nickname: "",
    fullName: "Trisha Mae Enore",
    intro: "She is a BSIT student at Philippine Christian University, College of Informatics. " +
           "She is learning programming and web development step by step. She describes herself as " +
           "impatient, but she enjoys spending time on hobbies like crochet and LEGO.",
    school: "Philippine Christian University",
    college: "College of Informatics",
    course: "Bachelor of Science in Information Technology (BSIT)",
    educationHistory: [
      // { level: "Senior High School", school: "", years: "", note: "With Honors in Grade 12" }
    ],
    favoriteSubjects: [],
    skills: [
      { name: "HTML", level: "Basic" },
      { name: "Java", level: "Basic" },
      { name: "C++", level: "Basic" },
      { name: "C#", level: "Basic" }
    ],
    projects: [
      { name: "Multiplication Table", description: "A small practice project." },
      { name: "Student Form", description: "A small practice project." }
    ],
    achievements: [
      { title: "With Honors", detail: "Grade 12", year: "" },
      { title: "Dean's Lister", detail: "", year: "" }
    ],
    hobbies: ["Crochet", "LEGO"],
    personality: ["Impatient (her own description)"],
    strengths: [],
    improvements: [],
    funFacts: [],
    favorites: [],
    learningGoals: [],
    workExperience: [],
    // RESUME LINK: a file name next to index.html ("resume.pdf") or a full link
    // such as a Google Drive share link ("https://drive.google.com/...").
    resumeFile: "resume.pdf",
    // ---- CONTACTS: type between the quotes. They show on the Contact
    // ---- section AND Cal will share them. Leave "" to hide a field.
    email: "trisha.enore.coi@pcu.edu.ph.com", // e.g. "yourname@gmail.com"
    phone: "",        // e.g. "+63 900 000 0000"
    address: "",      // e.g. "City, Philippines"
    github: "",       // e.g. "https://github.com/yourusername"
    linkedin: "",     // e.g. "https://linkedin.com/in/yourname"
    portfolio: ""
  };

  const BOT_NAME = "Cal";

  /* =====================================================================
     2) ADD YOUR OWN CHATBOT QUESTIONS AND ANSWERS HERE
     "questions" = different ways someone might ask. "answer" = the reply.
     ===================================================================== */
  const CUSTOM_FAQ = [
    // { questions: ["what is her favorite food", "fav food"], answer: "Her favorite food is ..." },
  ];

  /* =====================================================================
     3) CHATBOT ENGINE (runs fully in the browser: no API, no fetch)
     ===================================================================== */
  const $ = (selector) => document.querySelector(selector);

  const fab = $("#chatFab");
  const panel = $("#chatPanel");
  const log = $("#chatLog");
  const form = $("#chatForm");
  const input = $("#chatInput");
  const sendBtn = $("#sendBtn");
  const suggestions = $("#suggestions");
  const toggle = $("#navToggle");
  const menu = $("#navMenu");

  // Spaces in file names are encoded so the link works on Netlify too.
  const resumeUrl = () => /^https?:/i.test(PROFILE.resumeFile) ? PROFILE.resumeFile : encodeURI(PROFILE.resumeFile);
  const has = (v) => Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
  const NA = (what) => "Sorry, " + what + " hasn't been provided yet, so I can't answer that.";

  const SLANG = {
    abt: "about", abut: "about", wat: "what", wut: "what", wht: "what", whts: "what is",
    whats: "what is", wats: "what is", r: "are", u: "you", ur: "your", y: "why",
    hw: "how", hu: "who", wer: "where", wher: "where", whr: "where", cn: "can",
    dont: "do not", doesnt: "does not", shes: "she is", pls: "please", plz: "please",
    thx: "thanks", ty: "thanks", tnx: "thanks", sup: "hello", yo: "hello", hii: "hi",
    hiii: "hi", hey: "hi", heyy: "hi", hola: "hi", sch: "school", uni: "university",
    skils: "skills", skillz: "skills", info: "information", wanna: "want to",
    gonna: "going to", idk: "i do not know", fav: "favorite", favs: "favorites",
    coding: "programming", coder: "programmer", dev: "developer", pcu: "philippine christian university",
    cv: "resume", hobby: "hobbies", lik: "like", liek: "like", luv: "love", enjoi: "enjoy", skul: "school", scool: "school", studdy: "study", tbh: "", lol: "", ppl: "people", rn: "now", yrs: "years"
  };

  function tokens(text) {
    const out = [];
    text.toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9+#\s]/g, " ")
      .split(/\s+/).filter(Boolean)
      .forEach((w) => (w in SLANG ? SLANG[w] : w)
        .split(" ").filter(Boolean).forEach((x) => out.push(x)));
    return out;
  }

  // Damerau-Levenshtein: counts a swapped pair ("porjects") as ONE typo.
  function levenshtein(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }

  // Collapse repeated letters ("skillls" -> "skils") and drop vowels ("prjcts").
  const squash = (w) => w.replace(/(.)\1+/g, "$1");
  const skeleton = (w) => w[0] + w.slice(1).replace(/[aeiou]/g, "");

  // Typo tolerance: exact, prefix/plural, or small edit distance.
  function near(token, key) {
    if (token === key) return true;
    if (key.length < 4 || token.length < 4) return false;
    if (token.startsWith(key) || key.startsWith(token)) {
      return Math.abs(token.length - key.length) <= 3;
    }
    if (levenshtein(token, key) <= (key.length >= 8 ? 2 : 1)) return true;
    const a = squash(token), b = squash(key);
    if (a === b || levenshtein(a, b) <= (key.length >= 8 ? 2 : 1)) return true;
    return key.length >= 6 && token.length >= 4 && skeleton(a) === skeleton(b);
  }
  const hasWord = (toks, key) => toks.some((t) => near(t, key));

  const INTENTS = [
    { id: "greet", once: true, k: ["hi", "hello", "good morning", "good evening", "good afternoon"],
      a: () => "Hi, I'm " + BOT_NAME + "! Ask me about her education, skills, projects, hobbies, or how to contact her." },
    { id: "thanks", once: true, k: ["thanks", "thank you", "appreciate"],
      a: () => "You're welcome! Anything else you'd like to know about her?" },
    { id: "bye", once: true, k: ["bye", "goodbye", "see you"],
      a: () => "Thanks for visiting. Have a great day!" },
    { id: "bot", k: ["are you ai", "are you bot", "are you robot", "who are you", "your name", "who is cal", "are you cal", "how do you work", "chatgpt", "gemini"],
      a: () => "I'm " + BOT_NAME + ", a small assistant that runs entirely in your browser. I don't use ChatGPT, Gemini, or any online AI. I only match your question against the information stored in this page." },
    { id: "who", k: ["who", "introduce", "yourself", "herself", "describe", "overview"], p: ["about her"],
      a: () => {
        const P = PROFILE;
        const nm = P.fullName ? P.fullName + (P.nickname ? " (nickname: " + P.nickname + ")" : "") + ". " : "";
        return nm + (P.intro || "No introduction has been provided yet.");
      } },
    { id: "name", k: ["name", "nickname", "called", "call her"],
      a: () => {
        const P = PROFILE;
        if (!has(P.fullName) && !has(P.preferredName)) return NA("her name");
        return (P.fullName ? "Her full name is " + P.fullName + ". " : "") +
               (P.preferredName ? "She goes by " + P.preferredName + "." : "") +
               (P.nickname ? " Nickname: " + P.nickname + "." : "");
      } },
    { id: "school", k: ["school", "study", "studies", "university", "college", "enrolled", "philippine", "informatics", "attend"],
      a: () => has(PROFILE.school)
        ? "She studies at " + PROFILE.school + (PROFILE.college ? ", " + PROFILE.college : "") +
          (PROFILE.course ? ", taking " + PROFILE.course : "") + "."
        : NA("her school") },
    { id: "course", k: ["course", "degree", "program", "bsit", "major", "taking"],
      a: () => has(PROFILE.course)
        ? "She is taking " + PROFILE.course + (PROFILE.school ? " at " + PROFILE.school : "") + "."
        : NA("her course") },
    { id: "edu", k: ["education", "background", "graduated", "grade", "senior high", "history"],
      a: () => {
        const h = PROFILE.educationHistory.filter((e) => has(e.school) || has(e.level));
        return h.length
          ? "Education: " + h.map((e) => [e.level, e.school, e.years, e.note].filter(has).join(", ")).join("; ") + "."
          : NA("her education history");
      } },
    { id: "subjects", k: ["subject", "subjects", "favorite subject"],
      a: () => has(PROFILE.favoriteSubjects)
        ? "Her favorite subjects: " + PROFILE.favoriteSubjects.join(", ") + "."
        : NA("her favorite subjects") },
    { id: "level", k: ["beginner", "newbie", "expert", "advanced", "level", "experienced", "professional", "how good", "senior", "junior", "pro"],
      a: () => has(PROFILE.skills)
        ? "She describes her skills as: " + PROFILE.skills.map((s) => s.name + " (" + s.level + ")").join(", ") +
          ". She is still learning and improving step by step."
        : NA("her skill level") },
    { id: "skills", k: ["skill", "skills", "language", "languages", "programming", "programmer", "technology", "tech", "stack", "java", "html", "c++", "cpp", "c#", "csharp", "good at", "can do", "she do", "able"],
      a: () => has(PROFILE.skills)
        ? "Her technical skills: " + PROFILE.skills.map((s) => s.name + " (" + s.level + ")").join(", ") + "."
        : NA("her skills") },
    { id: "projects", k: ["project", "projects", "made", "built", "created", "multiplication", "student form", "work samples"],
      a: () => has(PROFILE.projects)
        ? "Projects: " + PROFILE.projects.map((p) => p.name + (p.description ? " (" + p.description + ")" : "")).join(", ") + ". You can open and try them in the Projects section."
        : NA("her projects") },
    { id: "ach", k: ["achievement", "achievements", "award", "awards", "honor", "honors", "dean", "lister", "accomplish", "recognition", "proud"],
      a: () => has(PROFILE.achievements)
        ? "Achievements: " + PROFILE.achievements.map((a) => a.title + (a.detail ? " (" + a.detail + ")" : "") + (a.year ? ", " + a.year : "")).join("; ") + "."
        : NA("her achievements") },
    { id: "hobbies", k: ["hobbies", "interest", "interests", "free time", "like doing", "for fun", "enjoy", "crochet", "lego", "leisure", "like to do", "pastime"],
      a: () => has(PROFILE.hobbies)
        ? "She enjoys " + PROFILE.hobbies.join(" and ") + ". She describes herself as impatient, but she likes spending time on these hobbies."
        : NA("her hobbies") },
    { id: "personality", k: ["personality", "impatient", "patient", "character", "trait", "traits", "kind of person", "type of person", "attitude"],
      a: () => has(PROFILE.personality) ? "Personality: " + PROFILE.personality.join(", ") + "." : NA("her personality") },
    { id: "strengths", k: ["strength", "strengths", "best at"],
      a: () => has(PROFILE.strengths) ? "Her strengths: " + PROFILE.strengths.join(", ") + "." : NA("her strengths") },
    { id: "improve", k: ["weakness", "weaknesses", "improve", "improvement", "flaw", "struggle", "working on"],
      a: () => has(PROFILE.improvements) ? "Areas she is improving: " + PROFILE.improvements.join(", ") + "." : NA("her areas for improvement") },
    { id: "fun", k: ["fun fact", "fun facts", "interesting", "random", "trivia", "unique"],
      a: () => has(PROFILE.funFacts) ? "Fun facts: " + PROFILE.funFacts.join("; ") + "." : NA("fun facts") },
    { id: "fav", k: ["favorite", "favorites", "favourite", "likes", "loves"],
      a: () => has(PROFILE.favorites) ? "Favorites: " + PROFILE.favorites.join("; ") + "." : NA("her favorite things") },
    { id: "goals", k: ["goal", "goals", "learning", "learn", "future", "plans", "dream", "aspire", "aim"],
      a: () => has(PROFILE.learningGoals)
        ? "Current learning goals: " + PROFILE.learningGoals.join("; ") + "."
        : "Specific goals haven't been written down yet, but she describes herself as a learner improving her programming step by step." },
    { id: "work", k: ["experience", "job", "jobs", "employment", "intern", "internship", "worked", "career", "hire", "hiring"],
      a: () => has(PROFILE.workExperience)
        ? "Work experience: " + PROFILE.workExperience.map((w) => [w.role, w.place, w.years, w.note].filter(has).join(", ")).join("; ") + "."
        : "No work experience has been provided yet." },
    { id: "resume", k: ["resume", "curriculum", "pdf", "download resume"],
      a: () => has(PROFILE.resumeFile)
        ? "Here is her resume (PDF): {{resume}}\nYou can also use the Resume button on this page."
        : "Her resume hasn't been provided yet." },
    { id: "email", g: "c", k: ["email", "mail", "gmail", "e-mail"],
      a: () => has(PROFILE.email) ? "Email: " + PROFILE.email : "Her email hasn't been provided yet." },
    { id: "phone", g: "c", k: ["phone", "number", "mobile", "cellphone", "cell", "telephone", "call", "text her"],
      a: () => has(PROFILE.phone) ? "Phone: " + PROFILE.phone : "Her phone number hasn't been provided yet." },
    { id: "github", g: "c", k: ["github", "git hub", "repo", "repository", "repositories", "source code"],
      a: () => has(PROFILE.github) ? "GitHub: " + PROFILE.github : "Her GitHub hasn't been provided yet." },
    { id: "linkedin", g: "c", k: ["linkedin", "linked in"],
      a: () => has(PROFILE.linkedin) ? "LinkedIn: " + PROFILE.linkedin : "Her LinkedIn hasn't been provided yet." },
    { id: "address", g: "c", k: ["address", "located", "live", "lives", "location", "home"],
      a: () => has(PROFILE.address) ? "Address: " + PROFILE.address : "Her address hasn't been provided yet." },
    { id: "contact", g: "c", k: ["contact", "reach", "message", "social", "socials", "touch", "connect"],
      a: () => {
        const P = PROFILE, out = [];
        [["Email", P.email], ["Phone", P.phone], ["Address", P.address],
         ["GitHub", P.github], ["LinkedIn", P.linkedin], ["Portfolio", P.portfolio]]
          .forEach(([k, v]) => { if (has(v)) out.push(k + ": " + v); });
        return out.length
          ? "You can reach her here:\n" + out.join("\n")
          : "Her contact details (email, phone, GitHub, LinkedIn) haven't been provided yet.";
      } }
  ];

  const STOP = new Set(["a", "an", "the", "is", "are", "was", "does", "do", "did", "she", "her", "he", "his", "of", "to", "me", "you", "tell", "what", "about", "can", "i", "it", "in", "on", "and", "or", "for", "please", "know", "this", "that", "with", "any"]);

  function matchFaq(toks) {
    let best = null, bestScore = 0;
    CUSTOM_FAQ.forEach((f) => (f.questions || []).forEach((q) => {
      const qt = tokens(q).filter((w) => !STOP.has(w));
      if (!qt.length) return;
      const score = qt.filter((w) => hasWord(toks, w)).length / qt.length;
      if (score > bestScore) { bestScore = score; best = f; }
    }));
    return bestScore >= 0.7 ? best : null;
  }

  function scoreIntent(it, toks) {
    let s = 0;
    it.k.forEach((k) => {
      const w = k.split(" ");
      if (w.every((x) => hasWord(toks, x))) s += w.length > 1 ? 5 : 4;
    });
    (it.p || []).forEach((k) => {
      if (k.split(" ").every((x) => toks.includes(x))) s += 3;
    });
    return s;
  }

  // Loose, last-resort match for badly misspelled words.
  const TOPIC_WORDS = { skills: "skills", projects: "projects", education: "education", achievements: "achievements", hobbies: "hobbies", contact: "contact details", school: "school", experience: "experience", resume: "resume", personality: "personality" };
  function closestTopic(toks) {
    let best = null, bestD = 99;
    toks.forEach((t) => {
      if (t.length < 4) return;
      Object.keys(TOPIC_WORDS).forEach((k) => {
        const d = levenshtein(squash(t), squash(k));
        if (d < bestD && d <= Math.ceil(k.length / 3)) { bestD = d; best = TOPIC_WORDS[k]; }
      });
    });
    return best;
  }

  function answerQuestion(raw) {
    const toks = tokens(raw);
    if (!toks.length) return "Could you type a question? For example: \"What are her skills?\"";

    const faq = matchFaq(toks);
    if (faq) return faq.answer;

    const scored = INTENTS
      .map((it) => ({ it, s: scoreIntent(it, toks) }))
      .filter((x) => x.s >= 3)
      .sort((a, b) => b.s - a.s);

    if (!scored.length) {
      const guess = closestTopic(toks);
      if (guess) return "I'm not sure I understood. Did you mean to ask about her " + guess + "? Try asking that again, or pick a suggestion below.";
      return "I don't have information about that. I can answer questions about her education, skills, projects, achievements, hobbies, or contact details.";
    }

    let pick = scored[0];
    if (pick.it.once && toks.length > 3) {
      const other = scored.find((x) => !x.it.once);
      if (other) pick = other;
    }
    // Asked for several specific contacts at once ("email and phone")? Answer each.
    if (pick.it.g === "c" && pick.it.id !== "contact") {
      const same = scored.filter((x) => x.it.g === "c" && x.it.id !== "contact" && x.s >= 4);
      if (same.length > 1) return same.map((x) => x.it.a()).join("\n");
    }
    return pick.it.a();
  }

  /* =====================================================================
     4) CHAT INTERFACE
     ===================================================================== */
  const SUGGESTIONS = [
    "Who is she?",
    "What are her skills?",
    "What projects has she made?",
    "What does she like doing?",
    "Is she a beginner?",
    "Where does she study?",
    "How can I contact her?"
  ];

  let busy = false;
  let greeted = false;

  function stamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function addMsg(text, cls) {
    const m = document.createElement("div");
    m.className = "msg " + cls;
    text.split("{{resume}}").forEach((part, i) => {
      if (i > 0) {
        const a = document.createElement("a");
        a.href = resumeUrl();
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = "Open resume";
        m.appendChild(a);
      }
      m.appendChild(document.createTextNode(part));
    });
    if (cls !== "err") {
      const meta = document.createElement("div");
      meta.textContent = (cls === "user" ? "You" : BOT_NAME) + " · " + stamp();
      meta.style.cssText = "font-size:.68rem;opacity:.6;margin-top:4px";
      m.appendChild(meta);
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }

  function botReply(text) {
    busy = true;
    sendBtn.disabled = true;
    const t = document.createElement("div");
    t.className = "msg bot typing";
    t.setAttribute("aria-label", "Typing");
    t.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    setTimeout(() => {
      t.remove();
      addMsg(text, "bot");
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }, 500 + Math.min(text.length * 6, 700));
  }

  function greet() {
    greeted = true;
    botReply("Hi! I'm " + BOT_NAME + ", your guide to this portfolio. I run in your browser and only use the information stored on this page. Ask me about her education, skills, projects, or hobbies.");
  }

  function buildSuggestions() {
    suggestions.replaceChildren();
    SUGGESTIONS.forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", () => send(q));
      suggestions.appendChild(b);
    });
  }

  function send(raw) {
    const text = (raw || "").trim();
    if (!text || busy) return;
    addMsg(text, "user");
    input.value = "";
    input.style.height = "auto";
    botReply(answerQuestion(text));
  }

  function openChat() {
    panel.hidden = false;
    fab.hidden = true;
    fab.setAttribute("aria-expanded", "true");
    if (!greeted) greet();
    input.focus();
  }

  function closeChat() {
    panel.hidden = true;
    fab.hidden = false;
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }

  function resetChat() {
    log.replaceChildren();
    busy = false;
    sendBtn.disabled = false;
    greeted = false;
    greet();
  }

  if (fab && panel && log && form && input && sendBtn && suggestions) {
    buildSuggestions();
    fab.addEventListener("click", openChat);

    const heroAsk = $("#heroAsk");
    if (heroAsk) heroAsk.addEventListener("click", openChat);

    const closeButton = $("#closeChat");
    if (closeButton) closeButton.addEventListener("click", closeChat);

    const newChatButton = $("#newChat");
    if (newChatButton) newChatButton.addEventListener("click", resetChat);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      send(input.value);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        send(input.value);
      }
    });

    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 110) + "px";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) closeChat();
    });
  } else {
    console.error("Chatbot: one or more required HTML elements are missing.");
  }

  /* =====================================================================
     4b) CONTACT SECTION: filled automatically from PROFILE
     ===================================================================== */
  (function fillContacts() {
    const list = $("#contact .contact");
    if (!list) return;
    const rows = [
      ["Email", PROFILE.email, "mailto:" + PROFILE.email],
      ["Phone", PROFILE.phone, "tel:" + PROFILE.phone.replace(/\s+/g, "")],
      ["Address", PROFILE.address, ""],
      ["GitHub", PROFILE.github, PROFILE.github],
      ["LinkedIn", PROFILE.linkedin, PROFILE.linkedin],
      ["Portfolio", PROFILE.portfolio, PROFILE.portfolio]
    ].filter((r) => has(r[1]));
    if (!rows.length) return; // keep your original placeholders until filled
    list.replaceChildren();
    rows.forEach(([label, value, href]) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = label;
      li.appendChild(span);
      if (href) {
        const a = document.createElement("a");
        a.textContent = value;
        a.href = href;
        if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
        li.appendChild(a);
      } else {
        const em = document.createElement("em");
        em.textContent = value;
        li.appendChild(em);
      }
      list.appendChild(li);
    });
  })();

  /* =====================================================================
     4c) RESUME LINKS + PROJECT VIEWER
     ===================================================================== */
  document.querySelectorAll("[data-resume]").forEach((a) => {
    if (has(PROFILE.resumeFile)) {
      a.href = resumeUrl();
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.hidden = true;
    }
  });

  const modal = $("#projModal");
  const frame = $("#projFrame");
  const projTitle = $("#projTitle");

  function openProject(src, title) {
    projTitle.textContent = title || "Project";
    frame.src = src;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }
  function closeProject() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    frame.src = "about:blank";
  }
  document.querySelectorAll("[data-src]").forEach((btn) =>
    btn.addEventListener("click", () => openProject(btn.dataset.src, btn.dataset.title)));
  if (modal) {
    $("#projClose").addEventListener("click", closeProject);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeProject(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeProject();
    });
  }

  /* =====================================================================
     5) EXISTING SITE CODE (unchanged): mobile menu and footer year
     ===================================================================== */
  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const expanded = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(expanded));
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  const year = $("#yr");
  if (year) year.textContent = new Date().getFullYear();
})();
