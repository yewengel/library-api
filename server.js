const dns = require('node:dns');

// Use the DNS server that works with the current network
dns.setServers(['172.20.10.1']);

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const Book = require('./models/Book');
const Author = require('./models/Author');

const app = express();

app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
    dbName: 'library_db'
})
    .then(() => {
        console.log('Connected to MongoDB Atlas - library_db');
    })
    .catch((err) => {
        console.log('MongoDB connection error:', err.message);
    });

// Logger Middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

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
app.get('/api/books', async (req, res) => {
    try {
        const filter = {};

        // Filter by genre
        if (req.query.genre) {
            filter.genre = req.query.genre;
        }

        // Filter by availability
        if (req.query.available !== undefined) {
            if (!['true', 'false'].includes(req.query.available)) {
                return res.status(400).json({
                    error: "Invalid available value. Use true or false"
                });
            }

            filter.available = req.query.available === 'true';
        }

        const books = await Book.find(filter).populate('author');
        return res.status(200).json(books);

    } catch (error) {
        return res.status(500).json({
            error: error.message
        });
    }
});

// ROUTE 2: Get one book by ID
app.get('/api/books/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('author');

        if (!book) {
            return res.status(404).json({
                error: "Book not found"
            });
        }

        return res.status(200).json(book);

    } catch (error) {
        return res.status(400).json({
            error: "Invalid book ID"
        });
    }
});

// ROUTE 3: Create a new book
app.post('/api/books', isLibrarian, async (req, res) => {
    try {
        const { title, author, year, genre, available } = req.body;

        const newBook = await Book.create({
            title,
            author,
            year,
            genre,
            available
        });

        res.location(`/api/books/${newBook._id}`);

        return res.status(201).json(newBook);

    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
});

// ROUTE 4: Update a book
app.put('/api/books/:id', isLibrarian, async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                error: "Provide at least one field to update"
            });
        }

        const updatedBook = await Book.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedBook) {
            return res.status(404).json({
                error: "Book not found"
            });
        }

        return res.status(200).json(updatedBook);

    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
});

// ROUTE 5: Delete a book
app.delete('/api/books/:id', isLibrarian, async (req, res) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(req.params.id);

        if (!deletedBook) {
            return res.status(404).json({
                error: "Book not found"
            });
        }

        return res.status(204).send();

    } catch (error) {
        return res.status(400).json({
            error: "Invalid book ID"
        });
    }
});

// Create a new author
app.post('/api/authors', isLibrarian, async (req, res) => {
    try {
        const author = await Author.create({
            name: req.body.name
        });

        return res.status(201).json(author);
    } catch (error) {
        return res.status(400).json({
            error: error.message
        });
    }
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