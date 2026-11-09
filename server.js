// Import the required packages
const express = require('express');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Create the Express application
const app = express();
const PORT = 3000;

// Allow Express to read JSON request bodies
app.use(express.json());

// Make sure the database folder exists
// (Git does not store this folder, so a fresh clone will not have it)
const dbFolder = path.join(__dirname, 'database');
fs.mkdirSync(dbFolder, { recursive: true });

// Connect to the SQLite database file (created if it does not exist)
const db = new Database(path.join(dbFolder, 'tasks.db'));

// Create the tasks table if it does not already exist
db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

// Folders that visitors may download from. These are the ONLY folders shared.
// If your site uses another folder (such as pages or images), add its name
// to this list. Never add database, node_modules, or '.' (the whole project).
const PUBLIC_FOLDERS = ['css', 'js', 'assets'];
PUBLIC_FOLDERS.forEach((folder) => {
    app.use('/' + folder, express.static(path.join(__dirname, folder)));
});

// Serve the HTML pages in the project root (index.html, about.html, ...).
// /about or /about.html sends about.html, and / sends index.html.
// A page file name may use only letters, numbers, hyphens, and underscores.
app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const match = req.path.match(/^\/([A-Za-z0-9_-]*)(\.html)?$/);
    if (!match) return next();
    const pageFile = path.join(__dirname, (match[1] || 'index') + '.html');
    if (!fs.existsSync(pageFile)) return next();
    res.sendFile(pageFile);
});

// GET: Test that the API is responding
app.get('/api/health', (req, res) => {
    res.json({ message: 'Task API is working!' });
});

// GET: Retrieve all tasks
app.get('/api/tasks', (req, res) => {
    const tasks = db.prepare(
        'SELECT * FROM tasks ORDER BY id DESC'
    ).all();

    // Convert SQLite's 0/1 value into a JavaScript boolean
    const formattedTasks = tasks.map(task => ({
        ...task,
        completed: Boolean(task.completed)
    }));

    res.json(formattedTasks);
});

// POST: Add a new task
app.post('/api/tasks', (req, res) => {
    const { title } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            error: 'A task title is required.'
        });
    }

    if (title.trim().length > 200) {
        return res.status(400).json({
            error: 'A task title must be 200 characters or fewer.'
        });
    }

    const result = db.prepare(
        'INSERT INTO tasks (title) VALUES (?)'
    ).run(title.trim());

    const newTask = db.prepare(
        'SELECT * FROM tasks WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json({
        ...newTask,
        completed: Boolean(newTask.completed)
    });
});

// PUT: Update a task's completion status
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

    const updatedTask = db.prepare(
        'SELECT * FROM tasks WHERE id = ?'
    ).get(id);

    res.json({
        ...updatedTask,
        completed: Boolean(updatedTask.completed)
    });
});

// DELETE: Remove a task
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

// Anything not handled above is a 404 (JSON for /api paths, text for pages)
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found.' });
    }
    res.status(404).send('Page not found.');
});

// Start the server
app.listen(PORT, '0.0.0.0', (error) => {
    if (error) {
        console.error('Could not start the server:', error.message);
        process.exit(1);
    }

    console.log(`Server running on port ${PORT}`);
});