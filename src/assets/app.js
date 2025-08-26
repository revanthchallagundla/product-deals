/*
Purpose of this class : Handle frontend logic for product search and deals
This module manages the product search functionality, including autocomplete suggestions, adding products to a list, and fetching deals.
Dependencies : Axios for API requests, DOM manipulation for UI updates.
Author : Nuthan M
Created Date : 2025-July-03
*/

document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = document.querySelector('meta[name="api-base"]').content;
  const productSearch = document.getElementById("product-search");
  const addToListBtn = document.getElementById("add-to-list");
  const autocompleteEl = document.getElementById("autocomplete-results");
  const selectedEl = document.getElementById("selected-products");
  const emptyState = document.getElementById("empty-state");
  const productCountEl = document.getElementById("product-count");
  const getDealsBtn = document.getElementById("get-deals");
  const dealsSection = document.getElementById("deals-results");
  const dealsContainer = document.getElementById("deals-container");
  const recentEl = document.getElementById("recent-searches");
  const clearHistory = document.getElementById("clear-history");
  const moveTop = document.getElementById("move-to-top");
  // const featuredDealsSection = document.getElementById("featured-deals");
  // Import configuration constants
  // These constants are used to define allowed sources, featured product limits.
  // const {
  //   ALLOWED_SOURCES,
  //   FEATURED_LIMIT,
  //   MAXIMUM_PRODUCTS_PERDAY_USER_ANONYMOUS,
  //   MAXIMUM_PRODUCTS_PERDAY_USER_AUTHENTICATED,
  // } = require("../utils/config.js").default;

  let productList = [];
  const MAX_PRODUCTS = 2; // Maximum products for anonymous users
  let typingTimer;

  /** Renders the “chips” and UI state */
  function updateUI() {
    // Chips
    selectedEl.innerHTML =
      productList.length === 0
        ? emptyState.outerHTML
        : productList
            .map(
              (p, i) => `
        <span class="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full inline-flex items-center mr-2">
          ${p.name}
          <button data-index="${i}" class="ml-2 text-indigo-600 hover:text-indigo-900">&times;</button>
        </span>
      `
            )
            .join("");

    // Count + button states
    productCountEl.textContent = `(${productList.length}/${MAX_PRODUCTS})`;
    const full = productList.length >= MAX_PRODUCTS;
    addToListBtn.disabled = full;
    productSearch.disabled = full;
    getDealsBtn.disabled = productList.length === 0;

    // Toggling deals and feature deals section
    if (productList.length === 0) {
      dealsSection.classList.add("hidden");
      //featuredDealsSection.classList.remove("hidden");
    }
  }

  // Remove chip
  selectedEl.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") {
      productList.splice(+e.target.dataset.index, 1);
      updateUI();
    }
  });

  // Autocomplete fetch
  async function fetchAuto(q) {
    try {
      const { data } = await axios.get(
        `${API_BASE}/autocomplete?query=${encodeURIComponent(q)}`
      );
      if (!data || !data.length) {
        autocompleteEl.innerHTML = `<div class="p-3 text-gray-500 text-center">No products found</div>`;
      } else {
        autocompleteEl.innerHTML = data
          .map(
            (p, i) => `
      <div class="px-4 py-2 text-left border-b last:border-b-0 hover:bg-gray-100 cursor-pointer text-sm text-gray-800"
           data-name="${p.name}" data-id="${p.id || ""}">
        ${p.name}
      </div>
    `
          )
          .join("");
      }
      autocompleteEl.classList.remove("hidden");
    } catch {}
  }

  productSearch.addEventListener("input", () => {
    clearTimeout(typingTimer);
    const v = productSearch.value.trim();
    if (v.length > 2) {
      typingTimer = setTimeout(() => fetchAuto(v), 300);
    } else {
      autocompleteEl.classList.add("hidden");
    }
  });

  // Pick from autocomplete
  autocompleteEl.addEventListener("click", (e) => {
    const item = e.target.closest("[data-name]");
    if (!item) return;
    productSearch.value = item.dataset.name;
    productSearch.dataset.productId = item.dataset.id;
    autocompleteEl.classList.add("hidden");
  });

  // Add to list
  function addToList() {
    const name = productSearch.value.trim();
    if (!name) return;
    if (productList.length >= MAX_PRODUCTS) {
      showToast(`You can only add up to ${MAX_PRODUCTS} products.`, "error");
      return;
    }
    if (productList.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      return;
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

  // Get Deals
  async function getDeals() {
    try {
      getDealsBtn.disabled = true;
      getDealsBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Finding Deals...`;
      const resp = await axios.post(`${API_BASE}/deals?start=0`, {
        products: productList,
      });
      displayDealsGrouped(resp.data);
      // featuredDealsSection.classList.add("hidden");
      dealsSection.classList.remove("hidden");

      // Adding the recent searches in the section
      saveRecent();

      window.scrollTo({ top: dealsSection.offsetTop, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Failed to fetch deals.");
    } finally {
      getDealsBtn.disabled = false;
      getDealsBtn.innerHTML = `<i class="fas fa-search-dollar mr-2"></i>Get Product(s) Deals`;
    }
  }
  document.getElementById("get-deals").addEventListener("click", getDeals);

  // Pagination: Load More
  dealsContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-load-more");
    if (!btn) return;
    const productName = btn.dataset.product;
    let start = parseInt(btn.dataset.start || "10", 10);
    try {
      const resp = await axios.post(`${API_BASE}/deals?start=${start}`, {
        products: [{ name: productName }],
      });
      const html = resp.data[0]?.deals
        .map(
          (d) => `
        <a href="${d.link}" target="_blank" class="border rounded-lg overflow-hidden hover:shadow-lg transition">
          <img src="${d.image}" class="w-full h-40 object-contain bg-gray-100" />
          <div class="p-4">
            <div class="text-indigo-600 font-bold">${d.price}</div>
            <div class="text-sm text-gray-500">${d.source}</div>
          </div>
        </a>
      `
        )
        .join("");
      // insert before button
      btn.insertAdjacentHTML(
        "beforebegin",
        `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${html}</div>`
      );
      btn.dataset.start = start + (resp.data[0]?.deals.length || 0);
      if ((resp.data[0]?.deals.length || 0) < 10) btn.remove();
    } catch {
      alert("Failed to load more");
    }
  });

  // Recent searches & clear
  function loadRecent() {
    const arr = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const secRecent = document.getElementById("sec-recent-searches");

    if (!arr || arr.length === 0) {
      secRecent.classList.add("hidden");
      return;
    }

    const html = arr
      .map(
        (p, i) => `
      <div class="p-3 border rounded relative">
        <button data-index="${i}" class="absolute top-2 right-2 text-gray-400 hover:text-red-500">
          <i class="fas fa-times-circle"></i>
        </button>
        <div class="font-medium mb-2">${p.name}</div>
        <button data-name="${p.name}" class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs find-deals">
          Find Deals
        </button>
      </div>
    `
      )
      .join("");

    document.getElementById("recent-searches").innerHTML = html;
    secRecent.classList.remove("hidden");
  }

  clearHistory.addEventListener("click", () => {
    localStorage.removeItem("recentSearches");
    loadRecent();
  });

  recentEl.addEventListener("click", (e) => {
    if (e.target.matches("[data-index]")) {
      const idx = +e.target.dataset.index;
      const arr = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      arr.splice(idx, 1);
      localStorage.setItem("recentSearches", JSON.stringify(arr));
      loadRecent();
    }
    if (e.target.matches(".find-deals")) {
      const name = e.target.dataset.name;
      productSearch.value = name;
      addToList();
    }
  });

  // Save in recent after a successful search
  function saveRecent() {
    let arr = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    productList.forEach((p) => {
      if (!arr.some((x) => x.name === p.name)) arr.unshift(p);
    });
    arr = arr.slice(0, 10);
    localStorage.setItem("recentSearches", JSON.stringify(arr));
    loadRecent();
  }

  // Extracted utility functions for display logic
  function normalizeTitleQuantity(title) {
    const match = title.match(
      /(\d+(\.\d+)?)(\s*)(ml|l|g|kg|pieces|pcs|dozen|each)/i
    );
    if (!match) {
      if (/each/i.test(title)) return { qty: 1, unit: "piece" };
      return { qty: "unknown", unit: "unit" };
    }

    let qty = parseFloat(match[1]);
    let unit = match[4].toLowerCase();

    if (unit === "ml") {
      qty = qty / 1000;
      unit = "L";
    } else if (unit === "g") {
      qty = qty / 1000;
      unit = "kg";
    } else if (unit === "pcs" || unit === "piece") {
      unit = "pieces";
    } else if (unit === "dozen") {
      qty = qty * 12;
      unit = "pieces";
    }

    return { qty: qty.toFixed(2), unit };
  }

  function extractNormalizedName(title) {
    return title
      .replace(/(Coles|Woolworths|Amazon|Fresh|Organic|Supermarkets)/gi, "")
      .trim()
      .split(" ")
      .slice(0, 3)
      .join(" ");
  }

  function groupByNormalizedTitle(deals) {
    const map = {};
    deals.forEach((deal) => {
      const { qty, unit } = normalizeTitleQuantity(deal.title);
      const name = extractNormalizedName(deal.title);
      const key = `${name} – ${qty} ${unit}`;
      if (!map[key]) map[key] = [];
      map[key].push(deal);
    });
    return map;
  }

  function findBestValues(deals) {
    const minPrice = Math.min(
      ...deals.map((d) => parseFloat(d.price.replace(/[^0-9.]/g, "")))
    );

    return deals.filter(
      (d) => parseFloat(d.price.replace(/[^0-9.]/g, "")) === minPrice
    );
  }

  // Replacement displayDeals used in getDeals
  function displayDealsGrouped(dealsData) {
    const dealsContainer = document.getElementById("deals-container");
    dealsContainer.innerHTML = "";
    let isFirst = true;

    const wrapper = document.createElement("div");
    wrapper.className = "space-y-6";

    dealsData.forEach((productData) => {
      const grouped = groupByNormalizedTitle(productData.deals);

      if (!isFirst) {
        const productHeader = document.createElement("div");
        productHeader.className =
          "border-b-2 border-dashed border-gray-300 my-6 pb-4";

        productHeader.innerHTML = `
  <h3 class="text-xl font-bold text-gray-800 mb-2">
    Search: <span class="text-indigo-600">${productData.product.name}</span>
  </h3>
`;

        wrapper.appendChild(productHeader);
      }
      isFirst = false;

      Object.entries(grouped).forEach(([groupKey, deals]) => {
        const section = document.createElement("div");
        section.className =
          "product-deals border rounded shadow-sm bg-white p-4";

        section.setAttribute(
          "data-product",
          productData.product.name.toLowerCase()
        );

        const best = findBestValues(deals);

        if (deals.length > 1) {
          section.innerHTML = `
          <h4 class="text-lg font-semibold mb-2">${groupKey}</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">


            ${deals
              .map(
                (deal) => `
              <div class="border rounded-lg p-3 flex gap-4 items-center ${
                deal === best
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }">
                <div class="w-24 h-24 bg-white flex items-center justify-center border rounded">
                  <img src="${deal.image || "./assets/placeholder.png"}" alt="${
                  deal.title
                }" class="max-h-full max-w-full object-contain">
                </div>
                <div class="flex-1">
                  <div class="font-semibold">${deal.source}</div>
                  <div class="text-sm text-gray-500">${deal.title}</div>
                  ${
                    deals.includes(deal)
                      ? '<div class="text-xs font-bold text-green-600 mt-1">✅ BEST VALUE</div>'
                      : ""
                  }
                  <div class="mt-2 flex justify-between items-center">
                    <div class="text-indigo-600 font-bold">${deal.price}</div>
                    <button class="bg-indigo-600 text-white text-sm px-3 py-1 rounded add-to-cart-btn" data-deal='${JSON.stringify(
                      deal
                    )}'>Add to Comparison</button>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `;
        } else {
          const deal = deals[0];
          section.innerHTML = `
          <h4 class="text-lg font-semibold mb-2">${groupKey}</h4>
          <div class="flex gap-4 border p-4 rounded bg-yellow-50 border-yellow-300 items-center">
            <div class="w-24 h-24 bg-white flex items-center justify-center rounded border">
              <img src="${deal.image || "./assets/placeholder.png"}" alt="${
            deal.title
          }" class="max-h-full max-w-full object-contain">
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-800">${deal.source}</div>
              <div class="text-sm text-gray-600">${deal.title}</div>
              <div class="text-xs text-yellow-700 mt-1">No other sources available for comparison.</div>
              <div class="mt-2 flex justify-between items-center">
                <div class="font-bold text-indigo-600 text-lg">${
                  deal.price
                }</div>
                <button class="bg-indigo-600 text-white px-3 py-1 rounded add-to-cart-btn" data-deal='${JSON.stringify(
                  deal
                )}'>Add to Comparison</button>
              </div>
            </div>
          </div>
        `;
        }

        wrapper.appendChild(section);
      });
    });

    dealsContainer.appendChild(wrapper);
    document.getElementById("deals-results").classList.remove("hidden");
  }

  /** --- GROUPING AND BEST VALUE LOGIC --- **/

  function normalizeTitleQuantity(title) {
    const match = title.match(
      /(\d+(\.\d+)?)(\s*)(ml|l|g|kg|pieces|pcs|dozen|each)/i
    );
    if (!match) {
      if (/each/i.test(title)) return { qty: 1, unit: "piece" };
      return { qty: "unknown", unit: "unit" };
    }

    let qty = parseFloat(match[1]);
    let unit = match[4].toLowerCase();

    if (unit === "ml") {
      qty = qty / 1000;
      unit = "L";
    } else if (unit === "g") {
      qty = qty / 1000;
      unit = "kg";
    } else if (unit === "pcs" || unit === "piece") {
      unit = "pieces";
    } else if (unit === "dozen") {
      qty = qty * 12;
      unit = "pieces";
    }

    return { qty: qty.toFixed(2), unit };
  }

  function extractNormalizedName(title) {
    return title
      .replace(/(Coles|Woolworths|Amazon|Fresh|Organic|Supermarkets)/gi, "")
      .trim()
      .split(" ")
      .slice(0, 3)
      .join(" ");
  }

  function groupByNormalizedTitle(deals) {
    const map = {};
    deals.forEach((deal) => {
      const { qty, unit } = normalizeTitleQuantity(deal.title);
      const name = extractNormalizedName(deal.title);
      const key = `${name} – ${qty} ${unit}`;
      if (!map[key]) map[key] = [];
      map[key].push(deal);
    });
    return map;
  }

  function findBestValue(deals) {
    return deals.reduce(
      (a, b) =>
        parseFloat(a.price.replace(/[^0-9.]/g, "")) <
        parseFloat(b.price.replace(/[^0-9.]/g, ""))
          ? a
          : b,
      deals[0]
    );
  }

  function displayDealsGrouped(dealsData) {
    const dealsContainer = document.getElementById("deals-container");
    dealsContainer.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";

    dealsData.forEach((productData) => {
      const grouped = groupByNormalizedTitle(productData.deals);

      Object.entries(grouped).forEach(([groupKey, deals]) => {
        const section = document.createElement("div");
        section.className =
          "product-deals p-4 border rounded shadow-sm bg-white";
        section.setAttribute(
          "data-product",
          productData.product.name.toLowerCase()
        );

        const best = findBestValue(deals);

        if (deals.length > 1) {
          section.innerHTML = `
          <h4 class="text-lg font-semibold mb-2">${groupKey}</h4>
          <div class="space-y-4">
            ${deals
              .map(
                (deal) => `
              <div class="border rounded-lg p-3 flex gap-4 items-center ${
                deal === best
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }">
                <div class="w-24 h-24 bg-white flex items-center justify-center border rounded">
                  <img src="${deal.image || "./assets/placeholder.png"}" alt="${
                  deal.title
                }" class="max-h-full max-w-full object-contain">
                </div>
                <div class="flex-1">
                  <div class="font-semibold">${deal.source}</div>
                  <div class="text-sm text-gray-500">${deal.title}</div>
                  ${
                    deal === best
                      ? '<div class="text-xs font-bold text-green-600 mt-1">✅ BEST VALUE</div>'
                      : ""
                  }
                  <div class="mt-2 flex justify-between items-center">
                    <div class="text-indigo-600 font-bold">${deal.price}</div>
                    <button class="bg-indigo-600 text-white text-sm px-3 py-1 rounded add-to-cart-btn" data-deal='${JSON.stringify(
                      deal
                    )}'>Add to Comparison</button>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `;
        } else {
          const deal = deals[0];
          section.innerHTML = `
          <h4 class="text-lg font-semibold mb-2">${groupKey}</h4>
          <div class="flex gap-4 border p-4 rounded bg-yellow-50 border-yellow-300 items-center">
            <div class="w-24 h-24 bg-white flex items-center justify-center rounded border">
              <img src="${deal.image || "./assets/placeholder.png"}" alt="${
            deal.title
          }" class="max-h-full max-w-full object-contain">
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-800">${deal.source}</div>
              <div class="text-sm text-gray-600">${deal.title}</div>
              <div class="text-xs text-yellow-700 mt-1">No other sources available for comparison.</div>
              <div class="mt-2 flex justify-between items-center">
                <div class="font-bold text-indigo-600 text-lg">${
                  deal.price
                }</div>
                <button class="bg-indigo-600 text-white px-3 py-1 rounded add-to-cart-btn" data-deal='${JSON.stringify(
                  deal
                )}'>Add to Comparison</button>
              </div>
            </div>
          </div>
        `;
        }

        wrapper.appendChild(section);
      });
    });

    dealsContainer.appendChild(wrapper);
    document.getElementById("deals-results").classList.remove("hidden");
  }

  // Initialize full UI
  updateUI();
  loadRecent();
  // loadFeaturedDeals();

  // Move to top
  window.addEventListener("scroll", () => {
    moveTop.classList.toggle("hidden", window.scrollY < 300);
  });

  moveTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  function showToast(message, type = "error") {
    const toast = document.getElementById("toast");
    toast.textContent = message;

    toast.className =
      "fixed top-5 right-5 z-50 px-4 py-3 rounded shadow-lg transition-opacity duration-300";

    if (type === "error") {
      toast.classList.add("bg-red-100", "border-red-400", "text-red-800");
    } else if (type === "success") {
      toast.classList.add("bg-green-100", "border-green-400", "text-green-800");
    } else {
      toast.classList.add("bg-gray-100", "border-gray-400", "text-gray-800");
    }

    toast.classList.remove("hidden");
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  }
});
