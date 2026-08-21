/* ============================================================
   app.js — L'Attivista
   Script unico usato sia da index.html (carosello "Ultimi Numeri"
   + pulsante torna-su) sia da articolo.html (pagina del singolo
   articolo).
   ============================================================ */

const ARTICLES_JSON_PATH = "content/articles.json";
const MIN_SLOTS = 3; // numero di posti fissi nella griglia "Ultimi Numeri"

document.addEventListener("DOMContentLoaded", () => {
  initBackToTop();
  initNumeriCarousel();
  initArticoloPage();
});

/* ---------- Caricamento indice condiviso degli articoli ---------- */

async function loadArticles() {
  const res = await fetch(ARTICLES_JSON_PATH);
  if (!res.ok) {
    throw new Error("Impossibile leggere content/articles.json");
  }
  const data = await res.json();

  // Filtra eventuali voci senza data valida, poi ordina dal più
  // recente al più vecchio.
  return data
    .filter(a => a && a.date && !isNaN(new Date(a.date)))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ---------- Caricamento dinamico del singolo articolo ---------- */

async function loadSingleArticleContent(id) {
  // Cerca il file con nome corrispondente all'ID dentro la cartella content/
  const res = await fetch(`content/${encodeURIComponent(id)}.json`);
  if (!res.ok) {
    throw new Error(`Impossibile trovare il file per l'articolo ID: ${id}`);
  }
  return await res.json();
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

/* ---------- Sezione "Gli ultimi numeri" & Hero (index.html) ---------- */

async function initNumeriCarousel() {
  const grid = document.getElementById("numeri-grid");
  const heroContainer = document.getElementById("hero-latest-numero");

  if (!grid && !heroContainer) return; // non siamo nella homepage, esci

  let articles = [];
  try {
    articles = await loadArticles();
  } catch (err) {
    console.error(err);
    if (grid) grid.innerHTML = '<p class="numeri-error">Non è stato possibile caricare gli articoli al momento.</p>';
    return;
  }

  // Inserisce l'articolo più recente e la sua data nella Hero
  if (heroContainer && articles.length > 0) {
    heroContainer.innerHTML = "";
    heroContainer.appendChild(buildNumeroCard(articles[0]));

    const dateEl = document.getElementById("hero-latest-date");
    if (dateEl && articles[0].date) {
      dateEl.textContent = formatDataItaliana(articles[0].date);
    }
  }

  if (!grid) return;

  grid.innerHTML = "";

  if (articles.length > MIN_SLOTS) {
    grid.classList.add("is-carousel");
    articles.forEach(article => grid.appendChild(buildNumeroCard(article)));
  } else {
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
  
  // Percorso corretto dell'immagine
  const imgPath = `assets/articles previews/${encodeURIComponent(article.id)}.webp`;

  // Formattazione della data
  const dateFormatted = article.date ? formatDataItaliana(article.date) : '';

  link.innerHTML = `
    <div class="numero-img">
      <img src="${imgPath}" alt="${escapeHtml(article.title)}" loading="lazy" onerror="this.style.display='none';">
      <span>${coverHtml}</span>
    </div>
    <div class="numero-body">
      <div class="numero-card-meta">
        <span class="numero-tag">${escapeHtml(article.tag || '')}</span>
        <span class="numero-card-date">${escapeHtml(dateFormatted)}</span>
      </div>
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

  if (!id) {
    if (titoloEl) titoloEl.textContent = "Articolo non specificato";
    if (bodyEl) bodyEl.innerHTML = '<p><a href="index.html#numeri">Torna agli articoli →</a></p>';
    return;
  }

  let indexArticles = [];
  try {
    // 1. Carica le informazioni generali dall'indice
    indexArticles = await loadArticles();
  } catch (err) {
    console.error(err);
    if (titoloEl) titoloEl.textContent = "Errore di caricamento";
    if (bodyEl) bodyEl.innerHTML = "<p>Non è stato possibile caricare l'indice degli articoli.</p>";
    return;
  }

  const meta = indexArticles.find(a => a.id === id);

  if (!meta) {
    if (titoloEl) titoloEl.textContent = "Articolo non trovato";
    if (kickerEl) kickerEl.textContent = "— 404";
    if (dekEl) dekEl.textContent = "";
    if (dataEl) dataEl.textContent = "";
    if (bodyEl) bodyEl.innerHTML = '<p>L\'articolo che cerchi non esiste o è stato rimosso. <a href="index.html#numeri">Torna agli articoli →</a></p>';
    return;
  }

  // Popola l'intestazione subito con i metadati leggeri
  document.title = `${meta.title} — L'Attivista`;
  if (kickerEl) kickerEl.textContent = `— ${meta.tag}`;
  if (titoloEl) titoloEl.textContent = meta.title;
  if (dekEl) dekEl.textContent = meta.excerpt || "";
  if (dataEl) dataEl.textContent = formatDataItaliana(meta.date);

  // 2. Carica in modo asincrono solo il file specifico con il corpo dell'articolo (content/<id>.json)
  try {
    const articleData = await loadSingleArticleContent(id);
    
    if (bodyEl) {
      bodyEl.innerHTML = "";
      
      // Supporta sia l'array di paragrafi "body": ["...", "..."] 
      // sia una stringa HTML diretta "content": "<p>..."
      if (Array.isArray(articleData.body)) {
        articleData.body.forEach(paragrafo => {
          const p = document.createElement("p");
          p.textContent = paragrafo;
          bodyEl.appendChild(p);
        });
      } else if (articleData.content) {
        bodyEl.innerHTML = articleData.content;
      }
    }
  } catch (err) {
    console.error(err);
    if (bodyEl) bodyEl.innerHTML = "<p>Impossibile caricare il testo completo dell'articolo.</p>";
  }
}

/* ---------- Pulsante "torna in cima" (index.html) ---------- */

function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  const SOGLIA_SCROLL = 420;

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