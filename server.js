const express = require('express');
const app = express();

app.use(express.json());

// Logger Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// In-memory database
let books = [
    {
        id: 1,
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt",
        year: 1999,
        genre: "Technology",
        available: true
    },
    {
        id: 2,
        title: "Clean Code",
        author: "Robert Martin",
        year: 2008,
        genre: "Technology",
        available: true
    },
    {
        id: 3,
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        year: 1937,
        genre: "Fantasy",
        available: false
    }
];

let nextId = 4;

// Authentication Middleware
function isLibrarian(req, res, next) {
    if (!req.query.role) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    if (req.query.role !== "librarian") {
        return res.status(403).json({
            error: "Access denied. Librarian only"
        });
    }

    next();
}

// ROUTE 1: Get all books
app.get('/api/books', (req, res) => {
    let result = [...books];

    if (req.query.genre) {
        result = result.filter(
            book => book.genre.toLowerCase() ===
                req.query.genre.toLowerCase()
        );
    }

    if (req.query.available !== undefined) {
        if (!['true', 'false'].includes(req.query.available)) {
            return res.status(400).json({
                error: "Invalid available value. Use true or false"
            });
        }

        const available = req.query.available === 'true';

        result = result.filter(
            book => book.available === available
        );
    }

    return res.status(200).json(result);
});

// ROUTE 2: Get a book by ID
app.get('/api/books/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Invalid book ID"
        });
    }

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            error: "Book not found"
        });
    }

    return res.status(200).json(book);
});

// ROUTE 3: Create a book
app.post('/api/books', isLibrarian, (req, res) => {
    const { title, author, year, genre } = req.body;

    if (
        typeof title !== 'string' || !title.trim() ||
        typeof author !== 'string' || !author.trim() ||
        year === undefined || year === null || year === '' ||
        typeof genre !== 'string' || !genre.trim()
    ) {
        return res.status(400).json({
            error: "Missing required fields"
        });
    }

    const numericYear = Number(year);

    if (
        !Number.isInteger(numericYear) ||
        numericYear < 0 ||
        numericYear > new Date().getFullYear()
    ) {
        return res.status(400).json({
            error: "Invalid year"
        });
    }

    const newBook = {
        id: nextId++,
        title: title.trim(),
        author: author.trim(),
        year: numericYear,
        genre: genre.trim(),
        available: true
    };

    books.push(newBook);
    res.location(`/api/books/${newBook.id}`);

    return res.status(201).json(newBook);
});

// ROUTE 4: Update a book
app.put('/api/books/:id', isLibrarian, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Invalid book ID"
        });
    }

    const book = books.find(book => book.id === id);

    if (!book) {
        return res.status(404).json({
            error: "Book not found"
        });
    }

    const { title, author, year, genre, available } = req.body;

    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({
            error: "Provide at least one field to update"
        });
    }

    if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: "Invalid title" });
        }
        book.title = title.trim();
    }

    if (author !== undefined) {
        if (typeof author !== 'string' || !author.trim()) {
            return res.status(400).json({ error: "Invalid author" });
        }
        book.author = author.trim();
    }

    if (year !== undefined) {
        const numericYear = Number(year);

        if (
            year === '' ||
            !Number.isInteger(numericYear) ||
            numericYear < 0 ||
            numericYear > new Date().getFullYear()
        ) {
            return res.status(400).json({ error: "Invalid year" });
        }

        book.year = numericYear;
    }

    if (genre !== undefined) {
        if (typeof genre !== 'string' || !genre.trim()) {
            return res.status(400).json({ error: "Invalid genre" });
        }
        book.genre = genre.trim();
    }

    if (available !== undefined) {
        if (typeof available !== 'boolean') {
            return res.status(400).json({
                error: "Invalid available value"
            });
        }
        book.available = available;
    }

    return res.status(200).json(book);
});

// ROUTE 5: Delete a book
app.delete('/api/books/:id', isLibrarian, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Invalid book ID"
        });
    }

    const index = books.findIndex(book => book.id === id);

    if (index === -1) {
        return res.status(404).json({
            error: "Book not found"
        });
    }

    books.splice(index, 1);

    return res.status(204).send();
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.url}`
    });
});

// Start Server
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Library API running on http://localhost:${PORT}`);
});
