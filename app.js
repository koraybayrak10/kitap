// 1️⃣ DATA
const books = [
  { id: 1, title: "Suç ve Ceza", price: 120 },
  { id: 2, title: "1984", price: 90 },
  { id: 3, title: "Kürk Mantolu Madonna", price: 75 },
  { id: 4, title: "Simyacı", price: 65 }
];

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

// 2️⃣ DOM ELEMENTLERİ
const bookList = document.getElementById("book-list");
const favList = document.getElementById("favorites");

// 3️⃣ YARDIMCI FONKSİYONLAR
function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function getBookById(id) {
  return books.find(b => b.id === id);
}

// 4️⃣ FAVORİ TOGGLE
function toggleFavorite(bookId) {
  const book = getBookById(bookId);
  const exists = favorites.find(f => f.id === bookId);

  if (exists) {
    favorites = favorites.filter(f => f.id !== bookId);
  } else {
    favorites.push(book);
  }

  saveFavorites();
  renderBooks();
  renderFavorites();
}

// 5️⃣ RENDER FONKSİYONLARI
function renderBooks() {
  bookList.innerHTML = "";

  books.forEach(book => {
    const isFav = favorites.some(f => f.id === book.id);

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${book.title}</h3>
      <p>${book.price} ₺</p>
      <button class="fav" onclick="toggleFavorite(${book.id})">
        ${isFav ? "❌ Favoriden Kaldır" : "⭐ Favoriye Ekle"}
      </button>
    `;

    bookList.appendChild(div);
  });
}

function renderFavorites() {
  favList.innerHTML = "";

  if (favorites.length === 0) {
    favList.innerHTML = "<p>Favori kitap yok</p>";
    return;
  }

  favorites.forEach(book => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h4>${book.title}</h4>
      <p>${book.price} ₺</p>
      <button onclick="toggleFavorite(${book.id})">
        ❌ Kaldır
      </button>
    `;
    favList.appendChild(div);
  });
}

// 6️⃣ İLK ÇALIŞTIRMA
renderBooks();
renderFavorites();
