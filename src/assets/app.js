/* 
Purpose of this class : Handle frontend logic for product search and deals
This module manages the product search functionality, including autocomplete suggestions, adding products to a list, and fetching deals.
Dependencies : Axios for API requests, DOM manipulation for UI updates.
Author : Nuthan M
Created Date : 2025-July-03
*/

document.addEventListener("DOMContentLoaded", () => {
  const apiMeta = document.querySelector('meta[name="api-base"]');
  const API_BASE = apiMeta?.content || "/api";

  const productSearch = document.getElementById("product-search");
  const addToListBtn = document.getElementById("add-to-list");
  const autocompleteEl = document.getElementById("autocomplete-results");
  const selectedEl = document.getElementById("selected-products");
  const emptyState = document.getElementById("empty-state");
  const productCountEl = document.getElementById("product-count");
  const getDealsBtn = document.getElementById("get-deals");
  const dealsSection = document.getElementById("deals-results");
  const dealsContainer = document.getElementById("deals-container");
  const moveTop = document.getElementById("move-to-top");

  let productList = [];
  const MAX_PRODUCTS = 2;
  let typingTimer;

  /* ------------------------------ UI Updates ------------------------------ */
  function updateUI() {
    selectedEl.innerHTML =
      productList.length === 0
        ? emptyState.outerHTML
        : productList
            .map(
              (p, i) => `
        <span class="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full inline-flex items-center mr-2">
          ${p.name}
          <button data-index="${i}" class="ml-2 text-indigo-600 hover:text-indigo-900">&times;</button>
        </span>`
            )
            .join("");

    productCountEl.textContent = `(${productList.length}/${MAX_PRODUCTS})`;
    addToListBtn.disabled = productList.length >= MAX_PRODUCTS;
    productSearch.disabled = productList.length >= MAX_PRODUCTS;
    getDealsBtn.disabled = productList.length === 0;

    if (productList.length === 0) dealsSection.classList.add("hidden");
  }

  selectedEl.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      productList.splice(+e.target.dataset.index, 1);
      updateUI();
    }
  });

  /* ------------------------------ Autocomplete ----------------------------- */
  async function fetchAuto(q) {
    try {
      const { data } = await axios.get(`${API_BASE}/autocomplete?query=${encodeURIComponent(q)}`);
      autocompleteEl.innerHTML = data?.length
        ? data
            .map(
              (p) => `
        <div class="px-4 py-2 border-b last:border-b-0 hover:bg-gray-100 cursor-pointer text-sm text-gray-800"
             data-name="${p.name}" data-id="${p.id || ""}">
          ${p.name}
        </div>`
            )
            .join("")
        : `<div class="p-3 text-gray-500 text-center">No products found</div>`;
      autocompleteEl.classList.remove("hidden");
    } catch (err) {
      console.error("Autocomplete error:", err);
    }
  }

  productSearch.addEventListener("input", () => {
    clearTimeout(typingTimer);
    const v = productSearch.value.trim();
    if (v.length > 2) typingTimer = setTimeout(() => fetchAuto(v), 300);
    else autocompleteEl.classList.add("hidden");
  });

  autocompleteEl.addEventListener("click", (e) => {
    const item = e.target.closest("[data-name]");
    if (!item) return;
    productSearch.value = item.dataset.name;
    productSearch.dataset.productId = item.dataset.id;
    autocompleteEl.classList.add("hidden");
  });

  /* ------------------------------- Add List ------------------------------- */
  function addToList() {
    const name = productSearch.value.trim();
    if (!name) return;
    if (productList.length >= MAX_PRODUCTS) {
      showToast(`You can only add up to ${MAX_PRODUCTS} products.`, "error");
      return;
    }
    if (productList.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;

    productList.push({ id: productSearch.dataset.productId, name });
    productSearch.value = "";
    productSearch.dataset.productId = "";
    updateUI();
  }

  addToListBtn.addEventListener("click", addToList);
  productSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addToList();
    }
  });

  /* ------------------------------ Get Deals ------------------------------- */
  async function getDeals() {
    try {
      getDealsBtn.disabled = true;
      getDealsBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Finding Deals...`;

      const resp = await axios
        .post(`${API_BASE}/deals?start=0`, { products: productList })
        .catch((err) => err.response || { data: [] });

      if (!resp?.data?.length) {
        showToast("No deals found for these products.", "error");
        return;
      }

      displayDealsAsCards(resp.data);
      dealsSection.classList.remove("hidden");
      window.scrollTo({ top: dealsSection.offsetTop, behavior: "smooth" });
    } catch (err) {
      console.error("Error:", err);
      showToast("Search is currently unavailable", "error");
    } finally {
      getDealsBtn.disabled = false;
      getDealsBtn.innerHTML = `<i class="fas fa-search-dollar mr-2"></i>Get Product(s) Deals`;
    }
  }
  document.getElementById("get-deals").addEventListener("click", getDeals);

  /* ------------------------------- Helpers -------------------------------- */
  const priceNum = (p) => {
    const n = parseFloat(String(p).replace(/[^0-9.,]/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const formatPrice = (p) => (priceNum(p) ? `$${priceNum(p).toFixed(2)}` : "—");

  function unitPrice(deal) {
    const n = priceNum(deal.price);
    if (!n) return null;
    const t = String(deal.title || "");
    const pack = t.match(/(\d+(?:\.\d+)?)\s*(?:x|\*)\s*(\d+(?:\.\d+)?)\s*(ml|mL|l|L|liters?|litres?)/i);
    let ml = null;
    if (pack) {
      const count = parseFloat(pack[1]);
      const each = parseFloat(pack[2]);
      const unit = String(pack[3]).toLowerCase();
      const eachMl = /l|liters?|litres?/.test(unit) ? each * 1000 : each;
      ml = count * eachMl;
    } else {
      const litre = t.match(/(\d+(?:\.\d+)?)\s*(l|liters?|litres?)/i);
      if (litre) ml = parseFloat(litre[1]) * 1000;
      const solo = t.match(/(\d+(?:\.\d+)?)\s*ml\b/i);
      if (!ml && solo) ml = parseFloat(solo[1]);
    }
    if (!ml) return null;
    const perL = n / (ml / 1000);
    return `$${perL.toFixed(2)}`;
  }

  const cheapestOffer = (deals) =>
    deals.slice().sort((a, b) => (priceNum(a.price) ?? 1e9) - (priceNum(b.price) ?? 1e9))[0];

  const escapeHtml = (str) =>
    String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const initials = (name = "") =>
    name
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  /* ----------------------------- Display Cards ----------------------------- */
  function displayDealsAsCards(groups) {
    dealsContainer.innerHTML = "";

    // Group results by rootName
    const groupedByRoot = groups.reduce((acc, g) => {
      const key = g.rootName || g.product?.name || "Results";
      if (!acc[key]) acc[key] = [];
      acc[key].push(g);
      return acc;
    }, {});

    Object.entries(groupedByRoot).forEach(([rootName, groupList]) => {
      const heading = document.createElement("h2");
      heading.className =
        "text-3xl font-extrabold text-indigo-700 tracking-tight mb-4 border-b border-dashed border-zinc-200 pb-2";
      heading.textContent = rootName;
      dealsContainer.appendChild(heading);

      const grid = document.createElement("div");
      grid.className =
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 content-start";

      groupList.forEach((group) => {
        const best = cheapestOffer(group.deals);
        const bestUnit = best ? unitPrice(best) : null;

        const card = document.createElement("div");
        card.className =
          "rounded-2xl border shadow-sm bg-white p-4 hover:shadow-md transition-shadow";

        card.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div>
              ${
                best
                  ? `
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    <span class="text-lg font-bold text-indigo-800">
                      Cheapest at ${escapeHtml(best.source || "Best store")}
                    </span>
            
                  </div>`
                  : ""
              }
            </div>
            ${
              best?.image
                ? `<img src="${best.image}" alt="${escapeHtml(
                    best.title || ""
                  )}" class="h-12 w-12 rounded-xl object-cover ring-1 ring-black/5" />`
                : ""
            }
          </div>

          <div class="mt-4 space-y-2">
            ${group.deals
              .map((d) => {
                const up = unitPrice(d);
                const isBest =
                  best &&
                  String(priceNum(d.price)) === String(priceNum(best.price)) &&
                  d.source === best.source;

                return `
                <a href="${d.link}" target="_blank" rel="noreferrer"
                   class="group block w-full rounded-xl border ${
                     isBest
                       ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200"
                       : "border-zinc-200 bg-white"
                   } px-3 py-2 hover:shadow-sm transition">
                  <div class="flex items-center gap-3 min-h-[56px]">
                    <div class="flex-none h-7 w-7 overflow-hidden rounded-lg ring-1 ring-black/5 bg-white grid place-items-center text-[10px] text-zinc-600">
                      ${escapeHtml(initials(d.source || "??"))}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-medium text-zinc-900 group-hover:underline max-w-[35ch]">
                        ${escapeHtml(d.title || d.source || "")}
                      </div>
                      <div class="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                        <span class="truncate">${escapeHtml(d.source || "")}</span>
                        ${
                          isBest
                            ? `<span class="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                 ✅ BEST
                               </span>`
                            : ""
                        }
                      </div>
                    </div>
                    <div class="flex-none text-right whitespace-nowrap tabular-nums leading-5">
                      <div class="font-semibold">${formatPrice(d.price)}</div>
                      ${
                        up
                          ? `<div class="text-[11px] text-zinc-500 leading-4">${up}/L</div>`
                          : ""
                      }
                    </div>
                  </div>
                </a>`;
              })
              .join("")}
          </div>`;

        grid.appendChild(card);
      });

      dealsContainer.appendChild(grid);
    });

    dealsSection.classList.remove("hidden");
  }

  /* ---------------------- Load last 2 searches globally ---------------------- */
  async function loadRecentGlobal(limit = 2) {
    try {
      const { data } = await axios.get(`${API_BASE}/deals/recent?limit=${limit}`);
      if (!Array.isArray(data) || data.length === 0) return;

      const recentWrap = document.createElement("div");
      recentWrap.className = "space-y-10 mt-6";

      data.slice(0, limit).forEach((item, i) => {
        const title =
          item.title ||
          (Array.isArray(item.products) && item.products.length
            ? item.products.map((p) => p.name).join(", ")
            : `Recent #${i + 1}`);
        const header = document.createElement("div");
        header.className = "border-b border-dashed border-zinc-200 pb-1";
        header.innerHTML = `<h2 class="text-2xl font-extrabold text-indigo-700 tracking-tight">Recent: ${escapeHtml(
          title
        )}</h2>`;
        recentWrap.appendChild(header);

        const section = document.createElement("div");
        const groups = item.results || item.groups || [];
        if (groups.length) displayDealsAsCards(groups, section);
        recentWrap.appendChild(section);
      });

      dealsContainer.prepend(recentWrap);
      dealsSection.classList.remove("hidden");
    } catch (err) {
      console.warn("Recent load failed:", err.message);
    }
  }

  /* ------------------------------ Toast + Scroll ----------------------------- */
  function showToast(message, type = "error") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `fixed top-5 right-5 z-50 px-4 py-3 rounded shadow-lg ${
      type === "error"
        ? "bg-red-100 border-red-400 text-red-800"
        : "bg-green-100 border-green-400 text-green-800"
    }`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
  }

  updateUI();
  loadRecentGlobal(2);
  window.addEventListener("scroll", () =>
    moveTop.classList.toggle("hidden", window.scrollY < 300)
  );
  moveTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
});
