const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies. Limit the size so a request can't send
// an unexpectedly large amount of data.
app.use(express.json({ limit: '20kb' }));

// Create the database folder if it does not exist.
const dbFolder = path.join(__dirname, 'database');
fs.mkdirSync(dbFolder, { recursive: true });

// Connect to the SQLite database.
const db = new Database(path.join(dbFolder, 'tasks.db'));

// Create the tables used by the task API and custom order form.
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS custom_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        request_type TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// Serve images and other files from the assets folder.
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve the site CSS and JavaScript.
app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'styles.css'));
});

app.get('/site.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'site.js'));
});

// Health check.
app.get('/api/health', (req, res) => {
    res.json({ message: 'Old Curiosity Shop API is working!' });
});

// Get all tasks.
app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare(
        'SELECT * FROM tasks ORDER BY id DESC'
    ).all();

    res.json(tasks.map(task => ({
        ...task,
        completed: Boolean(task.completed)
    })));
});

// Add a task.
app.post('/api/tasks', (req, res) => {
    const { title } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            error: 'A task title is required.'
        });
    }

    if (title.trim().length > 200) {
        return res.status(400).json({
            error: 'Task title must be 200 characters or fewer.'
        });
    }

    const result = db.prepare(
        'INSERT INTO tasks (title) VALUES (?)'
    ).run(title.trim());

    const task = db.prepare(
        'SELECT * FROM tasks WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
        ...task,
        completed: Boolean(task.completed)
    });
});

// Update a task's completion status.
app.put('/api/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const { completed } = req.body || {};

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid task ID.' });
    }

    if (typeof completed !== 'boolean') {
        return res.status(400).json({
            error: 'Completed must be true or false.'
        });
    }

    const result = db.prepare(
        'UPDATE tasks SET completed = ? WHERE id = ?'
    ).run(completed ? 1 : 0, id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Task not found.' });
    }

    const task = db.prepare(
        'SELECT * FROM tasks WHERE id = ?'
    ).get(id);

    res.json({
        ...task,
        completed: Boolean(task.completed)
    });
});

// Delete a task.
app.delete('/api/tasks/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid task ID.' });
    }

    const result = db.prepare(
        'DELETE FROM tasks WHERE id = ?'
    ).run(id);

    if (result.changes === 0) {
        return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ message: 'Task deleted successfully.' });
});

// Save a custom order request from store.html.
app.post('/api/custom-orders', (req, res) => {
    const { name, email, phone, requestType, details } = req.body || {};

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({
            error: 'Enter your name, up to 100 characters.'
        });
    }

    if (
        typeof email !== 'string' ||
        email.trim().length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        return res.status(400).json({
            error: 'Enter a valid email address.'
        });
    }

    const allowedRequestTypes = [
        'Swimming Fish style',
        'Wall sconce',
        'Tree of Life',
        'Custom idea'
    ];

    if (!allowedRequestTypes.includes(requestType)) {
        return res.status(400).json({
            error: 'Choose one of the listed request types.'
        });
    }

    if (
        typeof details !== 'string' ||
        !details.trim() ||
        details.trim().length > 2000
    ) {
        return res.status(400).json({
            error: 'Describe your request, up to 2,000 characters.'
        });
    }

    if (
        phone !== undefined &&
        phone !== '' &&
        (typeof phone !== 'string' || phone.trim().length > 30)
    ) {
        return res.status(400).json({
            error: 'Phone number must be 30 characters or fewer.'
        });
    }

    try {
        db.prepare(`
            INSERT INTO custom_orders
                (customer_name, email, phone, request_type, details)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            name.trim(),
            email.trim(),
            phone && phone.trim() ? phone.trim() : null,
            requestType,
            details.trim()
        );

        res.status(201).json({
            message: 'Your custom order request was received.'
        });
    } catch (error) {
        console.error('Could not save custom order:', error);
        res.status(500).json({
            error: 'The request could not be saved. Please try again.'
        });
    }
});

// Serve only the site's HTML pages.
const pages = {
    '/': 'index.html',
    '/index.html': 'index.html',
    '/gallery.html': 'gallery.html',
    '/store.html': 'store.html',
    '/about.html': 'about.html',
    '/contact.html': 'contact.html'
};

app.get(Object.keys(pages), (req, res, next) => {
    const pagePath = path.join(__dirname, pages[req.path]);

    if (!fs.existsSync(pagePath)) {
        return next();
    }

    res.sendFile(pagePath);
});

// Return a clear response for unknown API routes and pages.
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found.' });
    }

    res.status(404).send('Page not found.');
});

// Handle errors, including invalid JSON and oversized requests.
app.use((error, req, res, next) => {
    console.error('Server error:', error);

    if (res.headersSent) {
        return next(error);
    }

    const status = error.status || 500;

    if (req.path.startsWith('/api/')) {
        return res.status(status).json({
            error: status === 413
                ? 'Request body is too large.'
                : 'The server could not process the request.'
        });
    }

    res.status(status).send('The server could not process the request.');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Project folder: ${__dirname}`);
});