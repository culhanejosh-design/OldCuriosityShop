
document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const taskMessage = document.getElementById('task-message');

    // Only run Task Tracker code on pages that have it
    if (!taskForm || !taskInput || !taskList) {
        return;
    }

    function showMessage(message) {
        if (taskMessage) {
            taskMessage.textContent = message;
        }
    }

    async function apiRequest(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed.');
        }

        return data;
    }

    // Load tasks from SQLite through the API
    async function loadTasks() {
        try {
            const tasks = await apiRequest('/api/tasks');

            taskList.innerHTML = '';

            if (tasks.length === 0) {
                const empty = document.createElement('li');
                empty.textContent = 'No tasks yet.';
                taskList.appendChild(empty);
                return;
            }

            tasks.forEach(task => {
                const li = document.createElement('li');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = task.completed;

                const title = document.createElement('span');
                title.textContent = ' ' + task.title + ' ';
                title.style.textDecoration = task.completed
                    ? 'line-through'
                    : 'none';

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.type = 'button';

                // Update task
                checkbox.addEventListener('change', async () => {
                    try {
                        await apiRequest(`/api/tasks/${task.id}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                completed: checkbox.checked
                            })
                        });

                        showMessage('Task updated.');
                        await loadTasks();
                    } catch (error) {
                        showMessage(error.message);
                        await loadTasks();
                    }
                });

                // Delete task
                deleteButton.addEventListener('click', async () => {
                    try {
                        await apiRequest(`/api/tasks/${task.id}`, {
                            method: 'DELETE'
                        });

                        showMessage('Task deleted.');
                        await loadTasks();
                    } catch (error) {
                        showMessage(error.message);
                    }
                });

                li.appendChild(checkbox);
                li.appendChild(title);
                li.appendChild(deleteButton);

                taskList.appendChild(li);
            });

        } catch (error) {
            showMessage('Could not load tasks: ' + error.message);
        }
    }

    // Add a new task without refreshing the page
    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = taskInput.value.trim();

        if (!title) {
            showMessage('Please enter a task.');
            return;
        }

        const submitButton = taskForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            await apiRequest('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });

            taskInput.value = '';
            showMessage('Task added successfully.');
            await loadTasks();

        } catch (error) {
            showMessage('Could not add task: ' + error.message);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });

    // Load existing tasks when the page opens
    loadTasks();
});

db.exec(`
    CREATE TABLE IF NOT EXISTS custom_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        request_type TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);