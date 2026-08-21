/* ============================================================
   app.js — L'Attivista
   Script unico usato sia da index.html (carosello "Ultimi Numeri"
   + pulsante torna-su) sia da articolo.html (pagina del singolo
   articolo). Ogni funzione controlla da sola se gli elementi che
   le servono sono presenti in pagina, quindi puoi includere
   questo stesso file ovunque senza effetti collaterali.

   Per aggiungere un nuovo articolo: apri content/articles.json
   e aggiungi un nuovo oggetto nell'elenco (copia uno esistente
   come modello). Non serve toccare questo file.
   ============================================================ */

const ARTICLES_JSON_PATH = "content/articles.json";
const MIN_SLOTS = 3; // numero di posti fissi nella griglia "Ultimi Numeri"

document.addEventListener("DOMContentLoaded", () => {
  initBackToTop();
  initNumeriCarousel();
  initArticoloPage();
});

/* ---------- Caricamento condiviso degli articoli ---------- */

async function loadArticles() {
  const res = await fetch(ARTICLES_JSON_PATH);
  if (!res.ok) {
    throw new Error("Impossibile leggere content/articles.json");
  }
  const data = await res.json();

  // Filtra eventuali voci senza data valida, poi ordina dal più
  // recente al più vecchio: è sempre la data a decidere l'ordine,
  // indipendentemente da come sono elencati nel file JSON.
  return data
    .filter(a => a && a.date && !isNaN(new Date(a.date)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatDataItaliana(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

/* ---------- Sezione "Gli ultimi numeri" (index.html) ---------- */

async function initNumeriCarousel() {
  const grid = document.getElementById("numeri-grid");
  if (!grid) return; // non siamo nella homepage, esci

  let articles = [];
  try {
    articles = await loadArticles();
  } catch (err) {
    console.error(err);
    grid.innerHTML = '<p class="numeri-error">Non è stato possibile caricare gli articoli al momento.</p>';
    return;
  }

  grid.innerHTML = "";

  if (articles.length > MIN_SLOTS) {
    // Più di 3 articoli: scroll orizzontale con tutti gli articoli
    grid.classList.add("is-carousel");
    articles.forEach(article => grid.appendChild(buildNumeroCard(article)));
  } else {
    // 3 o meno: griglia fissa, eventuali posti restano vuoti
    grid.classList.remove("is-carousel");
    articles.forEach(article => grid.appendChild(buildNumeroCard(article)));
    const postiVuoti = MIN_SLOTS - articles.length;
    for (let i = 0; i < postiVuoti; i++) {
      grid.appendChild(buildEmptyCard());
    }
  }
}

function buildNumeroCard(article) {
  const link = document.createElement("a");
  link.className = "numero-card";
  link.href = `articolo.html?id=${encodeURIComponent(article.id)}`;

  const coverLines = Array.isArray(article.cover_lines) ? article.cover_lines : [article.title || ""];
  const coverHtml = coverLines.map(escapeHtml).join("<br>");

  link.innerHTML = `
    <div class="numero-img"><span>${coverHtml}</span></div>
    <div class="numero-body">
      <div class="numero-tag">${escapeHtml(article.tag)}</div>
      <h4>${escapeHtml(article.title)}</h4>
      <p>${escapeHtml(article.excerpt)}</p>
    </div>
  `;
  return link;
}

function buildEmptyCard() {
  const div = document.createElement("div");
  div.className = "numero-card is-empty";
  div.innerHTML = `
    <div class="numero-img"><span>In arrivo</span></div>
    <div class="numero-body">
      <div class="numero-tag">—</div>
      <h4>Prossimo numero</h4>
      <p>Il prossimo articolo sarà pubblicato presto.</p>
    </div>
  `;
  return div;
}

/* ---------- Pagina del singolo articolo (articolo.html) ---------- */

async function initArticoloPage() {
  const container = document.getElementById("articolo-container");
  if (!container) return; // non siamo nella pagina articolo, esci

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const titoloEl = document.getElementById("articolo-titolo");
  const kickerEl = document.getElementById("articolo-kicker");
  const dekEl = document.getElementById("articolo-dek");
  const dataEl = document.getElementById("articolo-data");
  const bodyEl = document.getElementById("articolo-body");

  let articles = [];
  try {
    articles = await loadArticles();
  } catch (err) {
    console.error(err);
    if (titoloEl) titoloEl.textContent = "Errore di caricamento";
    if (bodyEl) bodyEl.innerHTML = "<p>Non è stato possibile caricare l'articolo. Riprova più tardi.</p>";
    return;
  }

  const article = articles.find(a => a.id === id);

  if (!article) {
    if (titoloEl) titoloEl.textContent = "Articolo non trovato";
    if (kickerEl) kickerEl.textContent = "— 404";
    if (dekEl) dekEl.textContent = "";
    if (dataEl) dataEl.textContent = "";
    if (bodyEl) bodyEl.innerHTML = '<p>L\'articolo che cerchi non esiste o è stato rimosso. <a href="index.html#numeri">Torna agli articoli →</a></p>';
    return;
  }

  document.title = `${article.title} — L'Attivista`;
  if (kickerEl) kickerEl.textContent = `— ${article.tag}`;
  if (titoloEl) titoloEl.textContent = article.title;
  if (dekEl) dekEl.textContent = article.excerpt || "";
  if (dataEl) dataEl.textContent = formatDataItaliana(article.date);

  if (bodyEl) {
    bodyEl.innerHTML = "";
    (article.body || []).forEach(paragrafo => {
      const p = document.createElement("p");
      p.textContent = paragrafo;
      bodyEl.appendChild(p);
    });
  }
}

/* ---------- Pulsante "torna in cima" (index.html) ---------- */

function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  const SOGLIA_SCROLL = 420; // px scesi prima che il pulsante compaia

  const aggiornaVisibilita = () => {
    if (window.scrollY > SOGLIA_SCROLL) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  };

  window.addEventListener("scroll", aggiornaVisibilita, { passive: true });
  aggiornaVisibilita();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
