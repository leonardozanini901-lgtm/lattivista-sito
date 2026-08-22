/* ============================================================
   archivio.js — L'Attivista
   Logica della pagina "Archivio": ricerca per titolo, filtro per
   categoria (tag) e caricamento a blocchi (lazy) degli articoli,
   con animazione di comparsa/scomparsa delle card.

   Richiede che app.js sia caricato PRIMA di questo file nella
   pagina: riusa le funzioni globali escapeHtml() e
   formatDataItaliana() già definite lì, così il markup delle
   card resta identico a quello di index.html.
   ============================================================ */

(function () {
  const ARTICLES_JSON_PATH = "content/articles.json";
  const BATCH_SIZE = 9;          // quante card caricare per volta
  const MIN_SEARCH_CHARS = 4;    // caratteri minimi prima di filtrare per titolo
  const FADE_MS = 320;           // deve combaciare con la transition definita in CSS

  let allArticles = [];
  let filteredArticles = [];
  let renderedCount = 0;
  let sentinelObserver = null;
  let debounceTimer = null;

  document.addEventListener("DOMContentLoaded", initArchivio);

  async function initArchivio() {
    const grid = document.getElementById("archivio-grid");
    if (!grid) return; // non siamo nella pagina archivio, esci

    const searchInput = document.getElementById("archivio-search");
    const tagSelect = document.getElementById("archivio-tag");

    try {
      const res = await fetch(ARTICLES_JSON_PATH);
      if (!res.ok) throw new Error("Impossibile leggere content/articles.json");
      const data = await res.json();

      allArticles = data
        .filter(a => a && a.id && a.title && a.date && !isNaN(new Date(a.date)))
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // dal più recente al più vecchio
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<p class="archivio-empty-msg">Non è stato possibile caricare gli articoli al momento.</p>';
      return;
    }

    populateTagOptions(tagSelect, allArticles);

    filteredArticles = allArticles.slice();
    renderedCount = 0;
    renderNextBatch(grid);

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => applyFilters(grid, searchInput, tagSelect), 150);
      });
    }
    if (tagSelect) {
      tagSelect.addEventListener("change", () => applyFilters(grid, searchInput, tagSelect));
    }
  }

  /* ---------- Popola il menu a tendina con i tag realmente presenti ---------- */
  function populateTagOptions(select, articles) {
    if (!select) return;
    const tags = Array.from(new Set(articles.map(a => a.tag).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "it"));

    tags.forEach(tag => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      select.appendChild(opt);
    });
  }

  /* ---------- Calcola il set filtrato in base a ricerca + tag ---------- */
  function applyFilters(grid, searchInput, tagSelect) {
    const query = (searchInput && searchInput.value ? searchInput.value : "").trim().toLowerCase();
    const tag = tagSelect ? tagSelect.value : "";

    // Il tag, se selezionato, restringe sempre il campo di ricerca.
    let next = allArticles.filter(a => !tag || a.tag === tag);

    // La ricerca per titolo scatta solo da un minimo di caratteri;
    // sotto soglia, mostra tutto il set (eventualmente già filtrato per tag).
    if (query.length >= MIN_SEARCH_CHARS) {
      next = next.filter(a => a.title && a.title.toLowerCase().includes(query));
    }

    swapArticleSet(grid, next);
  }

  /* ---------- Passa dal set attuale al nuovo, con animazione ---------- */
  function swapArticleSet(grid, nextArticles) {
    if (sentinelObserver) {
      sentinelObserver.disconnect();
      sentinelObserver = null;
    }

    const existingCards = Array.from(grid.querySelectorAll(".numero-card, .archivio-empty-msg"));

    if (existingCards.length === 0) {
      filteredArticles = nextArticles;
      renderedCount = 0;
      renderNextBatch(grid);
      return;
    }

    // Fade-out verso il basso di tutte le card correnti...
    existingCards.forEach(card => card.classList.add("card-leaving"));

    // ...poi si ricostruisce la griglia con il nuovo set filtrato.
    setTimeout(() => {
      grid.innerHTML = "";
      filteredArticles = nextArticles;
      renderedCount = 0;
      renderNextBatch(grid);
    }, FADE_MS);
  }

  /* ---------- Caricamento "intelligente" a blocchi (lazy) ---------- */
  function renderNextBatch(grid) {
    const oldSentinel = grid.querySelector(".archivio-sentinel");
    if (oldSentinel) oldSentinel.remove();

    if (filteredArticles.length === 0) {
      const msg = document.createElement("p");
      msg.className = "archivio-empty-msg";
      msg.textContent = "Nessun articolo trovato.";
      grid.appendChild(msg);
      return;
    }

    const nextSlice = filteredArticles.slice(renderedCount, renderedCount + BATCH_SIZE);

    nextSlice.forEach(article => {
      const card = buildArchivioCard(article);
      card.classList.add("card-enter");
      grid.appendChild(card);
      // doppio rAF per essere certi che il browser applichi lo stato
      // "card-enter" prima di rimuoverlo, così la transizione parte.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => card.classList.remove("card-enter"));
      });
    });

    renderedCount += nextSlice.length;

    // Se ci sono altri articoli da mostrare, si aggiunge una "sentinella"
    // in fondo alla griglia: quando entra nel viewport (scroll), si carica
    // il blocco successivo. Le immagini usano loading="lazy" e vengono
    // scaricate dal browser solo quando la card è vicina alla vista.
    if (renderedCount < filteredArticles.length) {
      const sentinel = document.createElement("div");
      sentinel.className = "archivio-sentinel";
      grid.appendChild(sentinel);

      sentinelObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            sentinelObserver.disconnect();
            sentinelObserver = null;
            renderNextBatch(grid);
          }
        });
      }, { rootMargin: "300px" });

      sentinelObserver.observe(sentinel);
    }
  }

  /* ---------- Costruzione della singola card (stesso markup di app.js) ---------- */
  function buildArchivioCard(article) {
    const link = document.createElement("a");
    link.className = "numero-card";
    link.dataset.id = article.id;
    link.href = `articolo.html?id=${encodeURIComponent(article.id)}`;

    const coverLines = Array.isArray(article.cover_lines) ? article.cover_lines : [article.title || ""];
    const coverHtml = coverLines.map(escapeHtml).join("<br>");
    const imgPath = `assets/articles previews/${encodeURIComponent(article.id)}.webp`;
    const dateFormatted = article.date ? formatDataItaliana(article.date) : "";

    link.innerHTML = `
      <div class="numero-img">
        <img src="${imgPath}" alt="${escapeHtml(article.title)}" loading="lazy" decoding="async" onerror="this.style.display='none';">
        <span>${coverHtml}</span>
      </div>
      <div class="numero-body">
        <div class="numero-card-meta">
          <span class="numero-tag">${escapeHtml(article.tag || '')}</span>
          <span class="numero-card-date">${escapeHtml(dateFormatted)}</span>
        </div>
        <h4>${escapeHtml(article.title)}</h4>
        <p>${escapeHtml(article.excerpt || '')}</p>
      </div>
    `;
    return link;
  }
})();
