document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const taskCategory = document.getElementById('taskCategory');
    const taskPriority = document.getElementById('taskPriority');
    const taskDueDate = document.getElementById('taskDueDate');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const categoryFilters = document.querySelectorAll('#categoryFilters li');
    const allTasksBtn = document.getElementById('showAll');
    const activeTasksBtn = document.getElementById('showActive');
    const completedTasksBtn = document.getElementById('showCompleted');
    const clearCompletedBtn = document.getElementById('clearCompletedBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const totalTasksCount = document.getElementById('totalTasks');
    const completedTasksCount = document.getElementById('completedTasks');
    const pendingTasksCount = document.getElementById('pendingTasks');

    // State
    let tasks = [];
    let currentFilter = 'all';
    let currentStatus = 'all';
    let draggedItem = null;

    // Set today as default date
    const today = new Date();
    const formattedDate = today.toISOString().substr(0, 10);
    taskDueDate.value = formattedDate;

    // Load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            renderTasks();
            updateStats();
        }
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        updateStats();
    }

    // Create HTML for a task
    function createTaskElement(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        li.classList.add(`priority-${task.priority}`);
        if (task.completed) li.classList.add('completed');
        
        // Format the due date to be more readable
        const dueDate = new Date(task.dueDate);
        const formattedDueDate = dueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Check if task is overdue
        const isOverdue = !task.completed && new Date() > dueDate;
        
        li.innerHTML = `
            <div class="task-check">
                ${task.completed ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-content">
                <div class="task-text">${task.text}</div>
                <div class="task-meta">
                    <span class="task-category">
                        <i class="fas fa-tag"></i> ${task.category}
                    </span>
                    <span class="task-priority">
                        <i class="fas fa-flag"></i> ${task.priority}
                    </span>
                    <span class="task-date ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar"></i> ${formattedDueDate}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-edit"><i class="fas fa-edit"></i></button>
                <button class="task-delete"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        
        // Event listeners
        const checkbox = li.querySelector('.task-check');
        checkbox.addEventListener('click', () => toggleTaskStatus(task.id));
        
        const editBtn = li.querySelector('.task-edit');
        editBtn.addEventListener('click', () => startEditTask(li, task));
        
        const deleteBtn = li.querySelector('.task-delete');
        deleteBtn.addEventListener('click', () => {
            li.classList.add('shake');
            setTimeout(() => {
                deleteTask(task.id);
            }, 500);
        });
        
        // Double click to edit task
        li.querySelector('.task-text').addEventListener('dblclick', () => {
            startEditTask(li, task);
        });
        
        // Drag and drop functionality
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        
        return li;
    }

    // Render all tasks based on filters
    function renderTasks() {
        taskList.innerHTML = '';
        
        const filteredTasks = tasks.filter(task => {
            // Filter by category
            const categoryMatch = currentFilter === 'all' || task.category === currentFilter;
            
            // Filter by status
            const statusMatch = 
                currentStatus === 'all' || 
                (currentStatus === 'active' && !task.completed) || 
                (currentStatus === 'completed' && task.completed);
            
            return categoryMatch && statusMatch;
        });
        
        if (filteredTasks.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.innerHTML = `
                <i class="fas fa-clipboard-list"></i>
                <p>No tasks found</p>
            `;
            taskList.appendChild(emptyMessage);
        } else {
            filteredTasks.forEach(task => {
                taskList.appendChild(createTaskElement(task));
            });
        }
    }

    // Add a new task
    function addTask() {
        const text = taskInput.value.trim();
        if (text === '') {
            shakeElement(taskInput);
            return;
        }
        
        const newTask = {
            id: Date.now().toString(),
            text: text,
            category: taskCategory.value,
            priority: taskPriority.value,
            dueDate: taskDueDate.value,
            completed: false,
            createdAt: new Date()
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        
        // Animation for new task
        setTimeout(() => {
            const newTaskElement = document.querySelector(`[data-id="${newTask.id}"]`);
            if (newTaskElement) {
                newTaskElement.classList.add('highlight-new');
                setTimeout(() => {
                    newTaskElement.classList.remove('highlight-new');
                }, 1000);
            }
        }, 10);
        
        // Clear input
        taskInput.value = '';
        taskInput.focus();
    }

    // Toggle task completed status
    function toggleTaskStatus(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            
            const taskElement = document.querySelector(`[data-id="${id}"]`);
            if (taskElement) {
                if (task.completed) {
                    taskElement.classList.add('task-complete-animation');
                    taskElement.classList.add('completed');
                    setTimeout(() => {
                        taskElement.classList.remove('task-complete-animation');
                    }, 500);
                } else {
                    taskElement.classList.remove('completed');
                }
            }
            
            saveTasks();
            
            // If we're filtering by status, we might need to re-render
            if (currentStatus !== 'all') {
                setTimeout(() => {
                    renderTasks();
                }, 300);
            }
        }
    }

    // Start editing a task
    function startEditTask(li, task) {
        if (li.classList.contains('editing')) return;
        
        li.classList.add('editing');
        const taskText = li.querySelector('.task-text');
        const currentText = taskText.textContent;
        
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = currentText;
        
        taskText.innerHTML = '';
        taskText.appendChild(editInput);
        
        editInput.focus();
        
        // Select all text
        editInput.setSelectionRange(0, editInput.value.length);
        
        const finishEditing = () => {
            const newText = editInput.value.trim();
            if (newText !== '' && newText !== currentText) {
                task.text = newText;
                saveTasks();
            }
            renderTasks();
        };
        
        editInput.addEventListener('blur', finishEditing);
        editInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                renderTasks();
            }
        });
    }

    // Delete a task
    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }

    // Clear completed tasks
    function clearCompletedTasks() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }

    // Clear all tasks
    function clearAllTasks() {
        if (tasks.length === 0) return;
        
        if (confirm('Are you sure you want to delete all tasks?')) {
            tasks = [];
            saveTasks();
            renderTasks();
        }
    }

    // Update statistics
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        totalTasksCount.textContent = total;
        completedTasksCount.textContent = completed;
        pendingTasksCount.textContent = pending;
        
        // Animate stats change
        [totalTasksCount, completedTasksCount, pendingTasksCount].forEach(el => {
            el.classList.add('stats-update');
            setTimeout(() => {
                el.classList.remove('stats-update');
            }, 300);
        });
    }

    // Filter tasks by category
    function filterByCategory(category) {
        currentFilter = category;
        
        // Update active category
        categoryFilters.forEach(item => {
            if (item.dataset.category === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        renderTasks();
    }

    // Filter tasks by status
    function filterByStatus(status) {
        currentStatus = status;
        
        // Update active buttons
        [allTasksBtn, activeTasksBtn, completedTasksBtn].forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (status === 'all') {
            allTasksBtn.classList.add('active');
        } else if (status === 'active') {
            activeTasksBtn.classList.add('active');
        } else if (status === 'completed') {
            completedTasksBtn.classList.add('active');
        }
        
        renderTasks();
    }

    // Shake element animation
    function shakeElement(element) {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 600);
    }

    // Drag and Drop Handlers
    function handleDragStart(e) {
        draggedItem = this;
        setTimeout(() => {
            this.classList.add('dragging');
        }, 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        this.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (draggedItem !== this) {
            // Get the two task ids
            const fromId = draggedItem.dataset.id;
            const toId = this.dataset.id;
            
            // Find their positions in the tasks array
            const fromIndex = tasks.findIndex(t => t.id === fromId);
            const toIndex = tasks.findIndex(t => t.id === toId);
            
            // Reorder the tasks array
            const [movedTask] = tasks.splice(fromIndex, 1);
            tasks.splice(toIndex, 0, movedTask);
            
            saveTasks();
            renderTasks();
        }
        
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    // Event Listeners
    addTaskBtn.addEventListener('click', addTask);
    
    taskInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    categoryFilters.forEach(item => {
        item.addEventListener('click', () => {
            filterByCategory(item.dataset.category);
        });
    });
    
    allTasksBtn.addEventListener('click', () => filterByStatus('all'));
    activeTasksBtn.addEventListener('click', () => filterByStatus('active'));
    completedTasksBtn.addEventListener('click', () => filterByStatus('completed'));
    
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    clearAllBtn.addEventListener('click', clearAllTasks);
    
    // Add a transition effect when changing themes (if browser supports)
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            document.body.classList.add('theme-transition');
            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 1000);
        });
    }
    
    // Initialize
    loadTasks();
    
    // Add some sample tasks if there are none
    if (tasks.length === 0) {
        tasks = [
            {
                id: '1',
                text: 'Welcome to TaskMaster Pro!',
                category: 'personal',
                priority: 'high',
                dueDate: formattedDate,
                completed: false,
                createdAt: new Date()
            },
            {
                id: '2',
                text: 'Try adding a new task',
                category: 'work',
                priority: 'medium',
                dueDate: formattedDate,
                completed: false,
                createdAt: new Date()
            },
            {
                id: '3',
                text: 'Click the checkbox to mark as completed',
                category: 'personal',
                priority: 'low',
                dueDate: formattedDate,
                completed: true,
                createdAt: new Date()
            }
        ];
        saveTasks();
        renderTasks();
    }
}); 