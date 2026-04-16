const screen = document.getElementById("screen");
const subtitle = document.getElementById("subtitle");

const ASSET_VERSION = "20260414-1";

function assetUrl(fileName) {
  return `https://www.cbti-test.com/${fileName}?v=${ASSET_VERSION}`;
}

const state = {
  route: null,
  questionList: [],
  currentIndex: 0,
  answers: [],
  dimensionScores: {},
  dimensionLevels: {},
  resultPersona: null
};

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scoreToLevel(score) {
  if (score <= 2) return "L";
  if (score <= 6) return "M";
  return "H";
}

function buildDimensionLevels() {
  const result = {};
  for (const [dimension, score] of Object.entries(state.dimensionScores)) {
    result[dimension] = scoreToLevel(score);
  }
  state.dimensionLevels = result;
}

function getCandidatePersonas() {
  if (state.route === "A") {
    return CBTI_DATA.personas.filter((p) => p.routes.includes("A") && p.id !== 27);
  }
  if (state.route === "B") {
    return CBTI_DATA.personas.filter((p) => p.routes.includes("B") && p.id !== 27);
  }
  if (state.route === "C") {
    return CBTI_DATA.personas.filter((p) => p.routes.includes("C") && p.id !== 27);
  }
  return [];
}

function calculatePersona() {
  buildDimensionLevels();

  const candidates = getCandidatePersonas();

  let bestPersona = null;
  let bestScore = -1;

  candidates.forEach((persona) => {
    let matchScore = 0;

    for (const [dimension, personaLevel] of Object.entries(persona.profile)) {
      const userLevel = state.dimensionLevels[dimension];
      if (!userLevel) continue;

      if (userLevel === personaLevel) {
        matchScore += 2;
      } else if (
        (userLevel === "L" && personaLevel === "M") ||
        (userLevel === "M" && personaLevel === "L") ||
        (userLevel === "M" && personaLevel === "H") ||
        (userLevel === "H" && personaLevel === "M")
      ) {
        matchScore += 1;
      }
    }

    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestPersona = persona;
    }
  });

  state.resultPersona = bestPersona;
}

function buildQuestionList(route) {
  const allQuestions = CBTI_DATA.questions.filter((q) =>
    q.routes.includes(route)
  );

  const randomQuestions = allQuestions.filter((q) => q.fixed === "random");
  const penultimateQuestion = allQuestions.find((q) => q.fixed === "penultimate");

  const shuffledRandomQuestions = shuffleArray(randomQuestions);

  if (penultimateQuestion) {
    return [...shuffledRandomQuestions, penultimateQuestion];
  }

  return shuffledRandomQuestions;
}

function renderHome() {
  if (subtitle) subtitle.style.display = "block";

  screen.innerHTML = `
    <button id="startBtn">哦好，我这就开始测试</button>
  `;

  document.getElementById("startBtn").addEventListener("click", () => {
    renderFirstQuestion();
  });
}

function renderFirstQuestion() {
  if (subtitle) subtitle.style.display = "none";
  const q = CBTI_DATA.firstQuestion;

  const optionsHtml = q.options
    .map(
      (option) => `
        <button class="option-btn" data-route="${option.route}">
          ${option.key}. ${option.text}
        </button>
      `
    )
    .join("");

  screen.innerHTML = `
    <div class="question-block">
      <div class="progress">第 1 题</div>
      <h2 class="question-title">${q.text}</h2>

      <div class="image-choice">
        <img src="${assetUrl(q.leftImage)}" alt="左图" class="route-image" />
        <img src="${assetUrl(q.rightImage)}" alt="右图" class="route-image" />
      </div>

      <div class="options">${optionsHtml}</div>
    </div>
  `;

  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.route;
      state.route = route;

      if (route === "D") {
        renderDirectResult27();
        return;
      }

      state.questionList = buildQuestionList(route);
      state.currentIndex = 0;
      state.answers = [];
      state.dimensionScores = {};
      state.dimensionLevels = {};
      state.resultPersona = null;

      renderScoredQuestion();
    });
  });
}

function renderScoredQuestion() {
  if (subtitle) subtitle.style.display = "none";
  const q = state.questionList[state.currentIndex];

  const shuffledOptions = shuffleArray(q.options).map((option, index) => ({
    ...option,
    key: ["A", "B", "C", "D"][index]
  }));

  const optionsHtml = shuffledOptions
    .map(
      (option) => `
        <button class="option-btn" data-score="${option.score}">
          ${option.key}. ${option.text}
        </button>
      `
    )
    .join("");

  screen.innerHTML = `
    <div class="question-block">
      <div class="progress">第 ${state.currentIndex + 2} 题</div>
      <h2 class="question-title">${q.text}</h2>
      <div class="options">${optionsHtml}</div>
    </div>
  `;

  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const score = Number(btn.dataset.score);

      state.answers.push({
        questionId: q.id,
        dimension: q.dimension,
        score
      });

      if (!state.dimensionScores[q.dimension]) {
        state.dimensionScores[q.dimension] = 0;
      }
      state.dimensionScores[q.dimension] += score;

      state.currentIndex += 1;

      if (state.currentIndex < state.questionList.length) {
        renderScoredQuestion();
      } else {
        renderAfterScoredQuestions();
      }
    });
  });
}

function renderAfterScoredQuestions() {
  calculatePersona();
  renderEasterQuestion();
}

function renderEasterQuestion() {
  if (subtitle) subtitle.style.display = "none";
  const persona = state.resultPersona;

  if (!persona || !persona.easter) {
    renderResultPage();
    return;
  }

  const optionsHtml = persona.easter.options
    .map(
      (text, index) => `
        <button class="option-btn easter-btn" data-index="${index}">
          ${String.fromCharCode(65 + index)}. ${text}
        </button>
      `
    )
    .join("");

  screen.innerHTML = `
    <div class="question-block">
      <div class="progress">第 ${state.questionList.length + 2} 题</div>
      <h2 class="question-title">${persona.easter.question}</h2>
      <div class="options">${optionsHtml}</div>
    </div>
  `;

  document.querySelectorAll(".easter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      renderResultPage();
    });
  });
}

function renderResultPage() {
  if (subtitle) subtitle.style.display = "none";
  const persona = state.resultPersona;

  if (!persona) {
    screen.innerHTML = `
      <p>未匹配到人格。</p>
      <button id="restartBtn">返回首页</button>
    `;

    document.getElementById("restartBtn").addEventListener("click", () => {
      resetState();
      renderHome();
    });
    return;
  }

  const imageHtml = persona.resultImage
    ? `<img src="${assetUrl(persona.resultImage)}" alt="${persona.name}" class="result-image" />`
    : "";

  const coreHtml = persona.coreText
    ? `<p class="core-text">${persona.coreText}</p>`
    : "";

  const textHtml = persona.resultText
    ? `<p class="result-text">${persona.resultText}</p>`
    : "";

  const retryHintHtml = persona.id === 27
    ? `<p class="retry-hint">确认你的左手已经断了吗？请按下面的按钮↓</p>`
    : "";

  screen.innerHTML = `
    ${imageHtml}
    ${coreHtml}
    ${textHtml}
    ${retryHintHtml}
    <button id="restartBtn">滚回去再测一遍</button>
  `;

  document.getElementById("restartBtn").addEventListener("click", () => {
    resetState();
    renderHome();
  });
}

function renderDirectResult27() {
  if (subtitle) subtitle.style.display = "none";
  const persona27 = CBTI_DATA.personas.find((p) => p.id === 27);
  state.resultPersona = persona27;
  renderResultPage();
}

function resetState() {
  state.route = null;
  state.questionList = [];
  state.currentIndex = 0;
  state.answers = [];
  state.dimensionScores = {};
  state.dimensionLevels = {};
  state.resultPersona = null;
}

function renderResultById(personaId) {
  if (subtitle) subtitle.style.display = "none";

  const persona = CBTI_DATA.personas.find((p) => p.id === personaId);

  if (!persona) {
    renderHome();
    return;
  }

  state.resultPersona = persona;
  renderResultPage();
}

function initApp() {
  const params = new URLSearchParams(window.location.search);
  const resultId = Number(params.get("result"));

  if (resultId) {
    renderResultById(resultId);
  } else {
    renderHome();
  }
}

initApp();