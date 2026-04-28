const MENU_QUERY_PARAM = "menu";
const DEFAULT_MENU_VALUE = "boy-idol";
const CLOUDFLARE_API_BASE_URL = "https://playground-api.for1self.workers.dev";

const MENU_LABELS = {
  "boy-idol": "2020년대 남자아이돌",
  "girl-idol": "2020년대 여자아이돌",
  "1990-male-singer": "1990년대 남자가수",
  "1990-female-singer": "1990년대 여자가수",
};

const rankingTitle = document.getElementById("rankingTitle");
const rankingSummary = document.getElementById("rankingSummary");
const rankingList = document.getElementById("rankingList");
const backToGameLink = document.getElementById("backToGameLink");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getMenuValue() {
  const params = new URLSearchParams(window.location.search);
  return params.get(MENU_QUERY_PARAM) || DEFAULT_MENU_VALUE;
}

function formatServerStoredAt(storedAt) {
  if (!storedAt) {
    return "";
  }

  const normalizedDate = new Date(String(storedAt).replace(" ", "T"));

  if (Number.isNaN(normalizedDate.getTime())) {
    return storedAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(normalizedDate);
}

function renderLoading() {
  rankingList.innerHTML = `
    <div class="ranking-empty">
      랭킹을 불러오는 중입니다.
    </div>
  `;
}

function renderEmpty(message = "아직 집계된 우승 기록이 없습니다.") {
  rankingSummary.textContent = "총 0개의 우승 기록";
  rankingList.innerHTML = `
    <div class="ranking-empty">
      ${escapeHtml(message)}
    </div>
  `;
}

function renderRanking(summary) {
  if (!Array.isArray(summary) || summary.length === 0) {
    renderEmpty();
    return;
  }

  const totalWins = summary.reduce(
    (total, item) => total + Number(item.wins || 0),
    0,
  );
  rankingSummary.textContent = `총 ${totalWins}개의 우승 기록`;
  rankingList.innerHTML = summary
    .map((item, index) => {
      const latestWinAt = formatServerStoredAt(item.latest_win_at);

      return `
        <article class="ranking-card">
          <div class="ranking-card__place">${index + 1}</div>
          ${
            item.image
              ? `<img class="ranking-card__image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.card_name)}" />`
              : '<div class="ranking-card__image ranking-card__image--empty"></div>'
          }
          <div class="ranking-card__content">
            <h2>${escapeHtml(item.card_name)}</h2>
            <p>${escapeHtml(item.description || "")}</p>
            <time datetime="${escapeHtml(item.latest_win_at)}">${escapeHtml(latestWinAt)}</time>
          </div>
          <div class="ranking-card__wins">
            <strong>${escapeHtml(item.wins)}</strong>
            <span>wins</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadRanking() {
  const menuValue = getMenuValue();
  const menuLabel = MENU_LABELS[menuValue] || "선택한 메뉴";
  rankingTitle.textContent = `${menuLabel} 랭킹`;
  backToGameLink.href = `../index.html?${MENU_QUERY_PARAM}=${encodeURIComponent(menuValue)}`;
  renderLoading();

  try {
    const url = new URL("/api/winners/summary", CLOUDFLARE_API_BASE_URL);
    url.searchParams.set("menu", menuValue);

    const response = await window.fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load ranking: ${response.status}`);
    }

    const payload = await response.json();
    renderRanking(payload.summary);
  } catch (error) {
    console.error(error);
    renderEmpty("랭킹을 불러오지 못했습니다.");
  }
}

loadRanking();
