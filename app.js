const books = [
  { id: 1, title: "Suç ve Ceza", price: 120 },
  { id: 2, title: "1984", price: 90 },
  { id: 3, title: "Kürk Mantolu Madonna", price: 75 },
  { id: 4, title: "Simyacı", price: 65 }
];

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

const bookList = document.getElementById("book-list");
const favList = document.getElementById("favorites");

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function toggleFavorite(book) {
  const exists = favorites.find(b => b.id === book.id);

  if (exists) {
    favorites = favorites.filter(b => b.id !== book.id);
  } else {
    favorites.push(book);
  }

  saveFavorites();
  renderFavorites();
}

function renderBooks() {
  bookList.innerHTML = "";
  books.forEach(book => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${book.title}</h3>
      <p>${book.price} ₺</p>
      <button class="fav" onclick='toggleFavorite(${JSON.stringify(book)})'>
        ⭐ Favoriye Ekle
      </button>
    `;
    bookList.appendChild(div);
  });
}

function renderFavorites() {
  favList.innerHTML = "";
  favorites.forEach(book => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h4>${book.title}</h4>
      <p>${book.price} ₺</p>
    `;
    favList.appendChild(div);
  });
}

renderBooks();
renderFavorites();
