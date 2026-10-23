
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Replace these values with your actual Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyAccxK-n6A35vxphELioGZEQqyJwbpBka",
  authDomain: "booknest-c04e0.firebaseapp.com",
  projectId: "booknest-c04e0",
  storageBucket: "booknest-c04e0.firebasestorage.app",
  messagingSenderId: "93506024733",
  appId: "1:93506024733:web:1744cc83fb711117d45df4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const homePage = document.getElementById("homePage");
const addPage = document.getElementById("addPage");
const readerPage = document.getElementById("readerPage");
const bookGrid = document.getElementById("bookGrid");
const bookForm = document.getElementById("bookForm");
const coverInput = document.getElementById("cover");
const coverPreview = document.getElementById("coverPreview");

const DEFAULT_COVER =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
      <rect width="300" height="400" fill="#315c45"/>
      <text x="150" y="185" font-size="80" text-anchor="middle">📚</text>
      <text x="150" y="250" font-size="24" fill="white" text-anchor="middle">My Book</text>
    </svg>
  `);

let books = [];
let currentBook = null;
let currentPage = 0;
let selectedCover = DEFAULT_COVER;

function showPage(page) {
  homePage.hidden = page !== "home";
  addPage.hidden = page !== "add";
  readerPage.hidden = page !== "reader";
}

document.getElementById("homeBtn").addEventListener("click", () => {
  showPage("home");
});

document.getElementById("addBtn").addEventListener("click", () => {
  bookForm.reset();
  selectedCover = DEFAULT_COVER;
  coverPreview.hidden = true;
  showPage("add");
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  showPage("home");
});

// Convert the uploaded image to a small data URL.
// Firestore documents have a maximum size of 1 MiB.
coverInput.addEventListener("change", () => {
  const file = coverInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image.");
    coverInput.value = "";
    return;
  }

  if (file.size > 350 * 1024) {
    alert("Choose a cover image smaller than 350 KB.");
    coverInput.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedCover = reader.result;
    coverPreview.src = selectedCover;
    coverPreview.hidden = false;
  };

  reader.readAsDataURL(file);
});

// Listen for books published by every visitor.
function listenForBooks() {
  const booksQuery = query(
    collection(db, "books"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    booksQuery,
    snapshot => {
      books = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      renderBooks();
    },
    error => {
      console.error("Could not load books:", error);
      alert("Could not load the library. Check your Firebase setup.");
    }
  );
}

// Publish a book to the shared database.
bookForm.addEventListener("submit", async event => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();

  const pages = document.getElementById("pages").value
    .split(/^---PAGE---$/m)
    .map(page => page.trim())
    .filter(Boolean);

  if (!title || !author || pages.length === 0) {
    alert("Please enter a title, author, and at least one page.");
    return;
  }

  if (pages.length > 100) {
    alert("Please limit a book to 100 story pages.");
    return;
  }

  const publishButton = bookForm.querySelector('[type="submit"]');
  publishButton.disabled = true;

  try {
    await addDoc(collection(db, "books"), {
      title,
      author,
      cover: selectedCover,
      pages,
      createdAt: Date.now()
    });

    bookForm.reset();
    selectedCover = DEFAULT_COVER;
    coverPreview.hidden = true;
    showPage("home");

    alert("Your book is now published online!");
  } catch (error) {
    console.error("Publishing failed:", error);
    alert(
      "Publishing failed. Check Authentication, Firestore rules, " +
      "and the browser console. Your book was not published."
    );
  } finally {
    publishButton.disabled = false;
  }
});

// Build the book cards safely.
function renderBooks() {
  bookGrid.replaceChildren();

  const search = document.getElementById("search").value
    .trim()
    .toLowerCase();

  const matchingBooks = books.filter(book =>
    book.title?.toLowerCase().includes(search) ||
    book.author?.toLowerCase().includes(search)
  );

  if (matchingBooks.length === 0) {
    const message = document.createElement("p");
    message.textContent = books.length
      ? "No books match your search."
      : "No published books yet. Be the first to publish!";
    bookGrid.appendChild(message);
    return;
  }

  matchingBooks.forEach(book => {
    const card = document.createElement("article");
    card.className = "book-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");

    const image = document.createElement("img");
    image.src = book.cover || DEFAULT_COVER;
    image.alt = `Cover of ${book.title}`;

    const title = document.createElement("h3");
    title.textContent = book.title;

    const author = document.createElement("p");
    author.textContent = `By ${book.author}`;

    card.append(image, title, author);

    card.addEventListener("click", () => openBook(book));

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openBook(book);
      }
    });

    bookGrid.appendChild(card);
  });
}

document.getElementById("search").addEventListener("input", renderBooks);

function openBook(book) {
  currentBook = book;
  currentPage = 0;
  showPage("reader");
  renderReader();
}

function renderReader() {
  const reader = document.getElementById("reader");
  reader.replaceChildren();

  if (!currentBook) return;

  // The cover is always page 1.
  if (currentPage === 0) {
    const cover = document.createElement("div");
    cover.className = "cover-page";

    const image = document.createElement("img");
    image.src = currentBook.cover || DEFAULT_COVER;
    image.alt = `Cover of ${currentBook.title}`;

    const title = document.createElement("h2");
    title.textContent = currentBook.title;

    const author = document.createElement("p");
    author.className = "cover-author";
    author.textContent = `By ${currentBook.author}`;

    cover.append(image, title, author);
    reader.appendChild(cover);
  } else {
    const heading = document.createElement("h2");
    heading.textContent = currentBook.title;

    const text = document.createElement("p");
    text.textContent = currentBook.pages[currentPage - 1] || "";

    reader.append(heading, text);
  }

  const totalPages = (currentBook.pages || []).length + 1;

  document.getElementById("pageNumber").textContent =
    `Page ${currentPage + 1} of ${totalPages}`;

  document.getElementById("prevBtn").disabled = currentPage === 0;
  document.getElementById("nextBtn").disabled =
    currentPage >= totalPages - 1;
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    renderReader();
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  const totalPages = (currentBook?.pages || []).length + 1;

  if (currentPage < totalPages - 1) {
    currentPage++;
    renderReader();
  }
});

document.getElementById("backHomeBtn").addEventListener("click", () => {
  showPage("home");
});

listenForBooks();
showPage("home");
