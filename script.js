
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
      <text x="150" y="185" font-size="80"
        text-anchor="middle">📚</text>
      <text x="150" y="250" font-size="24" fill="white"
        text-anchor="middle">My Book</text>
    </svg>
  `);

let books = [];
let currentBook = null;
let currentPage = 0;
let selectedCover = DEFAULT_COVER;

// Load books saved in this browser
try {
    books = JSON.parse(localStorage.getItem("booknest-books")) || [];
} catch {
    books = [];
}

// Navigation
function showPage(page) {
    homePage.hidden = page !== "home";
    addPage.hidden = page !== "add";
    readerPage.hidden = page !== "reader";
}

document.getElementById("homeBtn").addEventListener("click", () => {
    showPage("home");
    renderBooks();
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

// Preview uploaded cover
coverInput.addEventListener("change", () => {
    const file = coverInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please choose an image.");
        coverInput.value = "";
        return;
    }

    // Keep the image small enough for browser storage
    if (file.size > 700 * 1024) {
        alert("Please choose an image smaller than 700 KB.");
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

// Publish a book
bookForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();

    const pageTexts = document.getElementById("pages").value
        .split(/^---PAGE---$/m)
        .map(page => page.trim())
        .filter(page => page.length > 0);

    if (!title || !author || pageTexts.length === 0) {
        alert("Please complete the title, author, and book pages.");
        return;
    }

    const book = {
        id: Date.now().toString(),
        title,
        author,
        cover: selectedCover,
        pages: pageTexts
    };

    books.unshift(book);

    try {
        localStorage.setItem("booknest-books", JSON.stringify(books));
    } catch {
        books.shift();
        alert("Browser storage is full. Try a smaller cover image.");
        return;
    }

    bookForm.reset();
    selectedCover = DEFAULT_COVER;
    coverPreview.hidden = true;

    showPage("home");
    renderBooks();
    alert("Your book has been published!");
});

// Display the published books
function renderBooks() {
    bookGrid.replaceChildren();

    const query = document.getElementById("search").value
        .trim()
        .toLowerCase();

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );

    if (filteredBooks.length === 0) {
        const message = document.createElement("p");
        message.textContent = books.length
            ? "No books match your search."
            : "No books yet. Press ＋ Add a book to publish the first one!";
        bookGrid.appendChild(message);
        return;
    }

    filteredBooks.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute("aria-label", `Read ${book.title}`);

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

// Open the book. Page 1 is always the cover.
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
        text.textContent = currentBook.pages[currentPage - 1];

        reader.append(heading, text);
    }

    document.getElementById("pageNumber").textContent =
        `Page ${currentPage + 1} of ${currentBook.pages.length + 1}`;

    document.getElementById("prevBtn").disabled = currentPage === 0;

    document.getElementById("nextBtn").disabled =
        currentPage >= currentBook.pages.length;
}

// Previous page
document.getElementById("prevBtn").addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        renderReader();
    }
});

// Next page
document.getElementById("nextBtn").addEventListener("click", () => {
    if (currentBook && currentPage < currentBook.pages.length) {
        currentPage++;
        renderReader();
    }
});

// Return to the library
document.getElementById("backHomeBtn").addEventListener("click", () => {
    showPage("home");
    renderBooks();
});

// Start the website
renderBooks();
showPage("home");
