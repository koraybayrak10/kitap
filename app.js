// --- STORAGE KEYS (DB yok, localStorage var) ---
const LS_FAV = "kitap:favorites:v1";
const LS_CART = "kitap:cart:v1";

// --- STATE ---
let results = [];                 // arama sonuçları
let favorites = loadJson(LS_FAV, []); // [{id, title, authors, thumbnail, priceTry}]
let cart = loadJson(LS_CART, []);     // [{id, qty, priceTry, title, authors, thumbnail}]

// --- DOM ---
const qEl = document.getElementById("q");
const btnSearch = document.getElementById("btnSearch");
const bookList = document.getElementById("bookList");
const favList = document.getElementById("favList");
const cartList = document.getElementById("cartList");
const favCount = document.getElementById("favCount");
const cartCount = document.getElementById("cartCount");
const resultInfo = document.getElementById("resultInfo");
const sortEl = document.getElementById("sort");

const btnClearFav = document.getElementById("btnClearFav");
const btnClearCart = document.getElementById("btnClearCart");
const btnCheckout = document.getElementById("btnCheckout");

const subTotalEl = document.getElementById("subTotal");
const shippingEl = document.getElementById("shipping");
const totalEl = document.getElementById("total");

const toastEl = document.getElementById("toast");

// --- HELPERS ---
function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function moneyTRY(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v);
}
function clampText(s, max = 120) {
  if (!s) return "";
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  window.clearTimeout(toastEl._t);
  toastEl._t = window.setTimeout(() => toastEl.classList.remove("show"), 1400);
}
function isFaved(id) {
  return favorites.some((x) => x.id === id);
}
function findCartItem(id) {
  return cart.find((x) => x.id === id);
}
function randomPriceTRY() {
  // Google Books her zaman fiyat vermez, demo için TR fiyatı üretiyoruz.
  // (İstersen saleInfo.listPrice varsa onu kullanırız.)
  const base = 90 + Math.random() * 420;
  return Math.round(base * 10) / 10;
}

// --- API (Google Books) ---
// Docs: volumes list endpoint: GET https://www.googleapis.com/books/v1/volumes?q=... :contentReference[oaicite:1]{index=1}
async function searchBooks(query) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=18`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("API hata: " + res.status);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((it) => normalizeVolume(it));
}

function normalizeVolume(it) {
  const v = it.volumeInfo || {};
  const sale = it.saleInfo || {};
  const img = (v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail)) || "";
  const title = v.title || "Başlıksız";
  const authors = Array.isArray(v.authors) ? v.authors.join(", ") : "Bilinmiyor";
  const description = v.description || "";

  // Fiyat: varsa Google'ın verdiğini kullan, yoksa demo fiyat
  let priceTry = null;
  if (sale.listPrice && typeof sale.listPrice.amount === "number") {
    // currency farklı olabilir; yine de TRY'ye çevirmek için kur gerekirdi.
    // DB yok & hız: demo olarak TL etiketine basıyoruz.
    priceTry = Math.round(sale.listPrice.amount * 10) / 10;
  } else {
    priceTry = randomPriceTRY();
  }

  return {
    id: it.id,
    title,
    authors,
    description: clampText(description, 140),
    thumbnail: img,
    priceTry,
    infoLink: v.infoLink || "",
  };
}

// --- FAVORITES (toggle = ekle/çıkar) ---
function toggleFavorite(book) {
  const exists = isFaved(book.id);
  if (exists) {
    favorites = favorites.filter((x) => x.id !== book.id); // ✅ favoriden kaldırma
    toast("Favoriden kaldırıldı");
  } else {
    favorites = [{ ...book }, ...favorites];
    toast("Favorilere eklendi");
  }
  saveJson(LS_FAV, favorites);
  renderFavorites();
  renderBooks(); // kalpleri güncelle
  updateBadges();
}

// --- CART ---
function addToCart(book) {
  const item = findCartItem(book.id);
  if (item) item.qty += 1;
  else cart.push({ id: book.id, qty: 1, priceTry: book.priceTry, title: book.title, authors: book.authors, thumbnail: book.thumbnail });
  saveJson(LS_CART, cart);
  renderCart();
  updateBadges();
  toast("Sepete eklendi");
}

function incQty(id) {
  const item = findCartItem(id);
  if (!item) return;
  item.qty += 1;
  saveJson(LS_CART, cart);
  renderCart();
  updateBadges();
}
function decQty(id) {
  const item = findCartItem(id);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) cart = cart.filter((x) => x.id !== id);
  saveJson(LS_CART, cart);
  renderCart();
  updateBadges();
}
function removeFromCart(id) {
  cart = cart.filter((x) => x.id !== id);
  saveJson(LS_CART, cart);
  renderCart();
  updateBadges();
  toast("Sepetten kaldırıldı");
}

// --- RENDER ---
function renderBooks() {
  const sorted = [...results];
  const mode = sortEl.value;

  if (mode === "title") sorted.sort((a, b) => a.title.localeCompare(b.title, "tr"));
  if (mode === "price") sorted.sort((a, b) => (a.priceTry ?? 0) - (b.priceTry ?? 0));

  bookList.innerHTML = sorted
    .map((b) => {
      const faved = isFaved(b.id);
      return `
        <div class="card">
          <div class="cover">
            ${b.thumbnail ? `<img src="${b.thumbnail}" alt="">` : `📘`}
          </div>
          <div class="meta">
            <div>
              <div class="name">${escapeHtml(b.title)}</div>
              <div class="author">${escapeHtml(b.authors)}</div>
            </div>
            <div class="desc">${escapeHtml(b.description)}</div>
            <div class="bottom">
              <div class="price">${moneyTRY(b.priceTry)}</div>
              <div class="rowBtns">
                <button class="iconBtn ${faved ? "faved" : ""}" data-fav="${b.id}" title="Favori">
                  ${faved ? "💖" : "🤍"}
                </button>
                <button class="iconBtn" data-cart="${b.id}" title="Sepete ekle">🧺</button>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // event binding
  bookList.querySelectorAll("[data-fav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fav");
      const book = results.find((x) => x.id === id);
      if (book) toggleFavorite(book);
    });
  });
  bookList.querySelectorAll("[data-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-cart");
      const book = results.find((x) => x.id === id);
      if (book) addToCart(book);
    });
  });
}

function renderFavorites() {
  if (!favorites.length) {
    favList.innerHTML = `<div class="muted">Henüz favori yok.</div>`;
    return;
  }
  favList.innerHTML = favorites
    .map((b) => `
      <div class="miniItem">
        <div class="miniCover">${b.thumbnail ? `<img src="${b.thumbnail}" alt="">` : ""}</div>
        <div class="miniMeta">
          <div class="t">${escapeHtml(b.title)}</div>
          <div class="a">${escapeHtml(b.authors)}</div>
        </div>
        <div class="miniRight">
          <button class="iconBtn faved" data-unfav="${b.id}" title="Favoriden kaldır">💖</button>
          <button class="iconBtn" data-favcart="${b.id}" title="Sepete ekle">🧺</button>
        </div>
      </div>
    `)
    .join("");

  favList.querySelectorAll("[data-unfav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-unfav");
      const book = favorites.find((x) => x.id === id);
      if (book) toggleFavorite(book); // ✅ aynı toggle ile çıkar
    });
  });
  favList.querySelectorAll("[data-favcart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-favcart");
      const book = favorites.find((x) => x.id === id);
      if (book) addToCart(book);
    });
  });
}

function renderCart() {
  if (!cart.length) {
    cartList.innerHTML = `<div class="muted">Sepet boş.</div>`;
    updateTotals();
    return;
  }

  cartList.innerHTML = cart
    .map((c) => `
      <div class="miniItem">
        <div class="miniCover">${c.thumbnail ? `<img src="${c.thumbnail}" alt="">` : ""}</div>
        <div class="miniMeta">
          <div class="t">${escapeHtml(c.title)}</div>
          <div class="a">${escapeHtml(c.authors)}</div>
        </div>
        <div class="miniRight">
          <div><strong>${moneyTRY(c.priceTry)}</strong></div>
          <div class="qty">
            <button data-dec="${c.id}">−</button>
            <span>${c.qty}</span>
            <button data-inc="${c.id}">+</button>
          </div>
          <button class="iconBtn" data-rm="${c.id}" title="Sepetten kaldır">🗑️</button>
        </div>
      </div>
    `)
    .join("");

  cartList.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => incQty(b.getAttribute("data-inc"))));
  cartList.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => decQty(b.getAttribute("data-dec"))));
  cartList.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => removeFromCart(b.getAttribute("data-rm"))));

  updateTotals();
}

function updateTotals() {
  const sub = cart.reduce((acc, x) => acc + (Number(x.priceTry || 0) * Number(x.qty || 0)), 0);
  const shipping = sub > 0 ? (sub >= 600 ? 0 : 39.9) : 0;
  const total = sub + shipping;

  subTotalEl.textContent = moneyTRY(sub);
  shippingEl.textContent = moneyTRY(shipping);
  totalEl.textContent = moneyTRY(total);
}

function updateBadges() {
  favCount.textContent = String(favorites.length);
  cartCount.textContent = String(cart.reduce((a, x) => a + x.qty, 0));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// --- EVENTS ---
btnSearch.addEventListener("click", doSearch);
qEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});
sortEl.addEventListener("change", () => renderBooks());

btnClearFav.addEventListener("click", () => {
  favorites = [];
  saveJson(LS_FAV, favorites);
  renderFavorites();
  renderBooks();
  updateBadges();
  toast("Favoriler temizlendi");
});

btnClearCart.addEventListener("click", () => {
  cart = [];
  saveJson(LS_CART, cart);
  renderCart();
  updateBadges();
  toast("Sepet temizlendi");
});

btnCheckout.addEventListener("click", () => {
  if (!cart.length) return toast("Sepet boş 🙂");
  cart = [];
  saveJson(LS_CART, cart);
  renderCart();
  updateBadges();
  toast("Satın alma tamamlandı 🎉");
});

async function doSearch() {
  const query = qEl.value.trim();
  if (!query) return toast("Bir arama yaz 🙂");

  resultInfo.textContent = "Aranıyor…";
  bookList.innerHTML = "";

  try {
    results = await searchBooks(query);
    if (!results.length) {
      resultInfo.textContent = "Sonuç yok. Farklı bir arama dene.";
    } else {
      resultInfo.textContent = `${results.length} sonuç gösteriliyor.`;
    }
    renderBooks();
  } catch (e) {
    console.error(e);
    resultInfo.textContent = "Arama başarısız. İnternet / CORS kontrol et.";
    toast("API hata");
  }
}

// --- INIT ---
renderFavorites();
renderCart();
updateBadges();

// ilk açılışta örnek arama
qEl.value = "Clean Code";
doSearch();
