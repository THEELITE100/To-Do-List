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
    const progressBar = document.getElementById('progressBar');
    const themeToggle = document.getElementById('themeToggle');
    const currentYearEl = document.getElementById('currentYear');

    // State
    let tasks = [];
    let currentFilter = 'all';
    let currentStatus = 'all';
    let draggedItem = null;
    
    // Set current year in footer
    currentYearEl.textContent = new Date().getFullYear();

    // Set today as default date
    const today = new Date();
    const formattedDate = today.toISOString().substr(0, 10);
    taskDueDate.value = formattedDate;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // Load tasks from localStorage
    function loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
            
            // Check for tasks due today and overdue
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            const overdueTasks = tasks.filter(task => 
                !task.completed && 
                new Date(task.dueDate) < today // Only if before today, not including today
            );
            
            const dueTodayTasks = tasks.filter(task => 
                !task.completed && 
                new Date(task.dueDate).getDate() === today.getDate() &&
                new Date(task.dueDate).getMonth() === today.getMonth() &&
                new Date(task.dueDate).getFullYear() === today.getFullYear()
            );
            
            if (overdueTasks.length > 0) {
                showOverdueNotification(overdueTasks.length);
            }
            
            if (dueTodayTasks.length > 0) {
                showDueTodayNotification(dueTodayTasks.length);
            }
            
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
        
        // Only add completed class if task is actually completed
        if (task.completed) {
            li.classList.add('completed');
        }
        
        // Format the due date to be more readable
        const dueDate = new Date(task.dueDate);
        const formattedDueDate = dueDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Calculate time difference
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const diffTime = taskDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Determine deadline status
        let deadlineStatus = '';
        let statusClass = '';
        
        if (!task.completed) {
            if (diffDays < 0) {
                // Past due date (only if before today)
                statusClass = 'overdue';
                deadlineStatus = 'OVERDUE';
                li.classList.add('overdue-task');
            } else if (diffDays === 0) {
                // Due today
                statusClass = 'due-today';
                deadlineStatus = 'DUE TODAY';
                li.classList.add('due-today-task');
            } else if (diffDays === 1) {
                // Due tomorrow
                statusClass = 'due-soon';
                deadlineStatus = 'DUE TOMORROW';
                li.classList.add('due-soon-task');
            } else if (diffDays <= 3) {
                // Due in 2-3 days
                statusClass = 'due-soon';
                deadlineStatus = `DUE IN ${diffDays} DAYS`;
                li.classList.add('due-soon-task');
            } else {
                // More than 3 days
                deadlineStatus = `${diffDays} DAYS LEFT`;
            }
        }
    
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
                    <span class="task-date ${statusClass}">
                        <i class="fas fa-calendar"></i> ${formattedDueDate}
                    </span>
                    ${deadlineStatus ? `<span class="deadline-badge ${statusClass}">${deadlineStatus}</span>` : ''}
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
                <span class="empty-hint">Add a new task to get started!</span>
            `;
            taskList.appendChild(emptyMessage);
        } else {
            // Sort tasks by priority and deadline
            const sortedTasks = [...filteredTasks].sort((a, b) => {
                // First sort by completion status
                if (!a.completed && b.completed) return -1;
                if (a.completed && !b.completed) return 1;
                
                if (!a.completed && !b.completed) {
                    // For incomplete tasks, first sort by priority
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                        return priorityOrder[a.priority] - priorityOrder[b.priority];
                    }
                    
                    // Then sort by deadline status
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    
                    const aDate = new Date(a.dueDate);
                    const bDate = new Date(b.dueDate);
                    
                    const aTaskDate = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());
                    const bTaskDate = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
                    
                    const aDiffTime = aTaskDate.getTime() - today.getTime();
                    const bDiffTime = bTaskDate.getTime() - today.getTime();
                    
                    const aDiffDays = Math.ceil(aDiffTime / (1000 * 60 * 60 * 24));
                    const bDiffDays = Math.ceil(bDiffTime / (1000 * 60 * 60 * 24));
                    
                    // Group by urgency categories before sorting by exact date
                    // Order: overdue, due today, due soon (1-3 days), rest
                    if (aDiffDays < 0 && bDiffDays >= 0) return -1; // a is overdue, b is not
                    if (aDiffDays >= 0 && bDiffDays < 0) return 1; // b is overdue, a is not
                    
                    if (aDiffDays === 0 && bDiffDays !== 0) return -1; // a is due today, b is not
                    if (aDiffDays !== 0 && bDiffDays === 0) return 1; // b is due today, a is not
                    
                    if (aDiffDays > 0 && aDiffDays <= 3 && (bDiffDays <= 0 || bDiffDays > 3)) return -1; // a is due soon
                    if (bDiffDays > 0 && bDiffDays <= 3 && (aDiffDays <= 0 || aDiffDays > 3)) return 1; // b is due soon
                    
                    // Finally sort by exact due date
                    return aTaskDate - bTaskDate;
                }
                
                // For completed tasks, sort by completion time (most recent first)
                return new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt);
            });
            
            sortedTasks.forEach(task => {
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
        
        // Add task with animation
        document.querySelector('.task-form').classList.add('task-form-active');
        setTimeout(() => {
            document.querySelector('.task-form').classList.remove('task-form-active');
        }, 300);
        
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
        
        // Clear input with animation
        taskInput.value = '';
        taskInput.classList.add('input-clear');
        setTimeout(() => {
            taskInput.classList.remove('input-clear');
            taskInput.focus();
        }, 300);
    }

    // Toggle task completed status
    function toggleTaskStatus(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            
            // Record completion time
            if (task.completed) {
                task.completedAt = new Date();
            } else {
                delete task.completedAt;
            }
            
            const taskElement = document.querySelector(`[data-id="${id}"]`);
            if (taskElement) {
                const checkmark = taskElement.querySelector('.task-check');
                
                if (task.completed) {
                    taskElement.classList.add('task-complete-animation');
                    taskElement.classList.add('completed');
                    
                    // Remove deadline classes
                    taskElement.classList.remove('overdue-task', 'due-today-task', 'due-soon-task');
                    
                    // Remove deadline badge
                    const deadlineBadge = taskElement.querySelector('.deadline-badge');
                    if (deadlineBadge) {
                        deadlineBadge.textContent = 'COMPLETED';
                        deadlineBadge.className = 'deadline-badge';
                        deadlineBadge.style.backgroundColor = 'var(--success-color)';
                        deadlineBadge.style.color = 'white';
                    }
                    
                    // Reset all task data colors to completed state
                    const taskDate = taskElement.querySelector('.task-date');
                    if (taskDate) {
                        taskDate.className = 'task-date';
                    }
                    
                    // Add checkmark with animation
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-check checkmark-appear';
                    checkmark.appendChild(icon);
                    
                    // Add confetti celebration when completing a task
                    addConfetti(taskElement);
                    
                    setTimeout(() => {
                        taskElement.classList.remove('task-complete-animation');
                        icon.classList.remove('checkmark-appear');
                    }, 600);
                } else {
                    // Remove checkmark with animation
                    const icon = checkmark.querySelector('i');
                    if (icon) {
                        icon.classList.add('checkmark-disappear');
                        setTimeout(() => {
                            checkmark.innerHTML = '';
                        }, 300);
                    }
                    
                    // Re-apply deadline classes and badges
                    const now = new Date();
                    const dueDate = new Date(task.dueDate);
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                    const diffTime = taskDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    // Update deadline badge
                    const deadlineBadge = taskElement.querySelector('.deadline-badge');
                    if (deadlineBadge) {
                        let deadlineStatus = '';
                        let statusClass = '';
                        
                        if (diffDays < 0) {
                            statusClass = 'overdue';
                            deadlineStatus = 'OVERDUE';
                            taskElement.classList.add('overdue-task');
                        } else if (diffDays === 0) {
                            statusClass = 'due-today';
                            deadlineStatus = 'DUE TODAY';
                            taskElement.classList.add('due-today-task');
                        } else if (diffDays === 1) {
                            statusClass = 'due-soon';
                            deadlineStatus = 'DUE TOMORROW';
                            taskElement.classList.add('due-soon-task');
                        } else if (diffDays <= 3) {
                            statusClass = 'due-soon';
                            deadlineStatus = `DUE IN ${diffDays} DAYS`;
                            taskElement.classList.add('due-soon-task');
                        } else {
                            deadlineStatus = `${diffDays} DAYS LEFT`;
                        }
                        
                        deadlineBadge.textContent = deadlineStatus;
                        deadlineBadge.className = 'deadline-badge';
                        if (statusClass) {
                            deadlineBadge.classList.add(statusClass);
                        }
                        deadlineBadge.style.backgroundColor = '';
                        deadlineBadge.style.color = '';
                    }
                    
                    // Update date display
                    const dateDisplay = taskElement.querySelector('.task-date');
                    if (dateDisplay) {
                        dateDisplay.classList.remove('overdue', 'due-today', 'due-soon');
                        if (diffDays < 0) {
                            dateDisplay.classList.add('overdue');
                        } else if (diffDays === 0) {
                            dateDisplay.classList.add('due-today');
                        } else if (diffDays <= 3) {
                            dateDisplay.classList.add('due-soon');
                        }
                    }
                    
                    taskElement.classList.add('task-uncomplete-animation');
                    taskElement.classList.remove('completed');
                    setTimeout(() => {
                        taskElement.classList.remove('task-uncomplete-animation');
                    }, 600);
                }
            }
            
            saveTasks();
            
            // If we're filtering by status, we might need to re-render
            if (currentStatus !== 'all') {
                setTimeout(() => {
                    renderTasks();
                }, 600);
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
        editInput.className = 'edit-input edit-appear';
        editInput.value = currentText;
        
        taskText.innerHTML = '';
        taskText.appendChild(editInput);
        
        editInput.focus();
        
        // Select all text
        editInput.setSelectionRange(0, editInput.value.length);
        
        const finishEditing = () => {
            const newText = editInput.value.trim();
            editInput.classList.remove('edit-appear');
            editInput.classList.add('edit-disappear');
            
            setTimeout(() => {
                if (newText !== '' && newText !== currentText) {
                    task.text = newText;
                    saveTasks();
                }
                renderTasks();
            }, 300);
        };
        
        editInput.addEventListener('blur', finishEditing);
        editInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                editInput.classList.remove('edit-appear');
                editInput.classList.add('edit-disappear');
                setTimeout(() => {
                    renderTasks();
                }, 300);
            }
        });
    }

    // Delete a task
    function deleteTask(id) {
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (taskElement) {
            taskElement.classList.add('task-delete-animation');
            setTimeout(() => {
                tasks = tasks.filter(task => task.id !== id);
                saveTasks();
                renderTasks();
            }, 500);
        }
    }

    // Clear completed tasks
    function clearCompletedTasks() {
        const completedElements = document.querySelectorAll('.task-list li.completed');
        
        // If no completed tasks, shake the button
        if (completedElements.length === 0) {
            shakeElement(clearCompletedBtn);
            return;
        }
        
        // Add delete animation to all completed tasks
        completedElements.forEach(el => {
            el.classList.add('task-delete-animation');
        });
        
        // Remove after animation completes
        setTimeout(() => {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
            renderTasks();
        }, 500);
    }

    // Clear all tasks
    function clearAllTasks() {
        if (tasks.length === 0) {
            shakeElement(clearAllBtn);
            return;
        }
        
        if (confirm('Are you sure you want to delete all tasks?')) {
            const allElements = document.querySelectorAll('.task-list li');
            
            // Add delete animation to all tasks
            allElements.forEach(el => {
                el.classList.add('task-delete-animation');
            });
            
            // Remove after animation completes
            setTimeout(() => {
                tasks = [];
                saveTasks();
                renderTasks();
            }, 500);
        }
    }

    // Update statistics
    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(task => task.completed).length;
        const pending = total - completed;
        
        // Update progress bar
        if (total > 0) {
            const percent = Math.round((completed / total) * 100);
            progressBar.style.width = `${percent}%`;
            
            // Change color based on progress
            if (percent < 30) {
                progressBar.style.background = 'linear-gradient(to right, var(--danger-color), var(--warning-color))';
            } else if (percent < 70) {
                progressBar.style.background = 'linear-gradient(to right, var(--warning-color), var(--primary-light))';
            } else {
                progressBar.style.background = 'linear-gradient(to right, var(--primary-light), var(--success-color))';
            }
        } else {
            progressBar.style.width = '0%';
        }
        
        // Animate number changes
        animateCounter(totalTasksCount, totalTasksCount.textContent, total);
        animateCounter(completedTasksCount, completedTasksCount.textContent, completed);
        animateCounter(pendingTasksCount, pendingTasksCount.textContent, pending);
    }
    
    // Animate counter function
    function animateCounter(element, oldValue, newValue) {
        oldValue = parseInt(oldValue) || 0;
        
        if (oldValue !== newValue) {
            element.classList.add('stats-update');
            setTimeout(() => {
                element.textContent = newValue;
                element.classList.remove('stats-update');
            }, 300);
        } else {
            element.textContent = newValue;
        }
    }

    // Filter tasks by category
    function filterByCategory(category) {
        if (currentFilter === category) return;
        
        currentFilter = category;
        
        // Update active category with animation
        categoryFilters.forEach(item => {
            if (item.dataset.category === category) {
                item.classList.add('category-active');
                item.classList.add('active');
                setTimeout(() => {
                    item.classList.remove('category-active');
                }, 500);
            } else {
                item.classList.remove('active');
            }
        });
        
        // Animate task container
        document.querySelector('.task-container').classList.add('container-change');
        setTimeout(() => {
            renderTasks();
            document.querySelector('.task-container').classList.remove('container-change');
        }, 300);
    }

    // Filter tasks by status
    function filterByStatus(status) {
        if (currentStatus === status) return;
        
        currentStatus = status;
        
        // Update active buttons with animation
        [allTasksBtn, activeTasksBtn, completedTasksBtn].forEach(btn => {
            btn.classList.remove('active');
        });
        
        let activeBtn;
        if (status === 'all') {
            activeBtn = allTasksBtn;
        } else if (status === 'active') {
            activeBtn = activeTasksBtn;
        } else if (status === 'completed') {
            activeBtn = completedTasksBtn;
        }
        
        activeBtn.classList.add('active');
        activeBtn.classList.add('status-active');
        setTimeout(() => {
            activeBtn.classList.remove('status-active');
        }, 500);
        
        // Animate task container
        document.querySelector('.task-container').classList.add('container-change');
        setTimeout(() => {
            renderTasks();
            document.querySelector('.task-container').classList.remove('container-change');
        }, 300);
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

    // Toggle theme
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        themeToggle.classList.toggle('dark');
        
        // Update icon
        if (document.body.classList.contains('dark-mode')) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
        
        // Add some confetti for fun when toggling theme
        addConfetti(themeToggle);
    }

    // Add magical confetti effect when completing a task
    function addConfetti(targetElement) {
        // Get the position of the task element
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            // Position confetti around the task
            const randomOffsetX = (Math.random() - 0.5) * 100;
            const randomOffsetY = (Math.random() - 0.5) * 50;
            
            confetti.style.left = `${centerX + randomOffsetX}px`;
            confetti.style.top = `${centerY + randomOffsetY}px`;
            confetti.style.backgroundColor = getRandomColor();
            confetti.style.width = `${5 + Math.random() * 8}px`;
            confetti.style.height = `${5 + Math.random() * 8}px`;
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }
    
    function getRandomColor() {
        const colors = [
            '#a29bfe', '#6c5ce7', '#fd79a8', '#00b894', 
            '#fdcb6e', '#e84393', '#55efc4', '#ff7675'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Show a notification for overdue tasks
    function showOverdueNotification(count) {
        const notification = document.createElement('div');
        notification.className = 'overdue-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>You have ${count} overdue task${count > 1 ? 's' : ''}!</span>
            <button class="close-notification"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // Add animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Add event listener to close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    // Show notification for tasks due today
    function showDueTodayNotification(count) {
        const notification = document.createElement('div');
        notification.className = 'overdue-notification due-today-notification';
        notification.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>You have ${count} task${count > 1 ? 's' : ''} due today!</span>
            <button class="close-notification"><i class="fas fa-times"></i></button>
        `;
        
        document.body.appendChild(notification);
        
        // Add animation after a short delay
        setTimeout(() => {
            notification.classList.add('show');
        }, 300); // Show after overdue notification
        
        // Add event listener to close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5500);
    }

    // Add a function to update task status every minute
    function startTaskStatusUpdater() {
        // Initial update
        updateAllTaskStatuses();
        
        // Update every minute
        setInterval(updateAllTaskStatuses, 60000);
    }
    
    // Update status of all visible tasks
    function updateAllTaskStatuses() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        document.querySelectorAll('.task-list li').forEach(taskElement => {
            const taskId = taskElement.dataset.id;
            const task = tasks.find(t => t.id === taskId);
            
            if (task && !task.completed) {
                const dueDate = new Date(task.dueDate);
                const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                const diffTime = taskDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Clear all status classes
                taskElement.classList.remove('overdue-task', 'due-today-task', 'due-soon-task');
                
                // Re-add appropriate class
                if (diffDays < 0) {
                    taskElement.classList.add('overdue-task');
                } else if (diffDays === 0) {
                    taskElement.classList.add('due-today-task');
                } else if (diffDays <= 3) {
                    taskElement.classList.add('due-soon-task');
                }
                
                // Update the deadline badge
                const deadlineBadge = taskElement.querySelector('.deadline-badge');
                if (deadlineBadge) {
                    deadlineBadge.classList.remove('overdue', 'due-today', 'due-soon');
                    
                    let deadlineStatus = '';
                    let statusClass = '';
                    
                    if (diffDays < 0) {
                        statusClass = 'overdue';
                        deadlineStatus = 'OVERDUE';
                    } else if (diffDays === 0) {
                        statusClass = 'due-today';
                        deadlineStatus = 'DUE TODAY';
                    } else if (diffDays === 1) {
                        statusClass = 'due-soon';
                        deadlineStatus = 'DUE TOMORROW';
                    } else if (diffDays <= 3) {
                        statusClass = 'due-soon';
                        deadlineStatus = `DUE IN ${diffDays} DAYS`;
                    } else {
                        deadlineStatus = `${diffDays} DAYS LEFT`;
                    }
                    
                    deadlineBadge.textContent = deadlineStatus;
                    if (statusClass) {
                        deadlineBadge.classList.add(statusClass);
                    }
                }
                
                // Update the date display
                const dateDisplay = taskElement.querySelector('.task-date');
                if (dateDisplay) {
                    dateDisplay.classList.remove('overdue', 'due-today', 'due-soon');
                    if (diffDays < 0) {
                        dateDisplay.classList.add('overdue');
                    } else if (diffDays === 0) {
                        dateDisplay.classList.add('due-today');
                    } else if (diffDays <= 3) {
                        dateDisplay.classList.add('due-soon');
                    }
                }
            }
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
    
    // Add animation on task options focus
    [taskCategory, taskPriority, taskDueDate].forEach(element => {
        element.addEventListener('focus', () => {
            element.classList.add('input-focus');
        });
        
        element.addEventListener('blur', () => {
            element.classList.remove('input-focus');
        });
    });
    
    // Add transition effect when changing themes (if browser supports)
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            document.body.classList.add('theme-transition');
            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 1000);
        });
    }
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Animate the app container on load
    setTimeout(() => {
        document.querySelector('.app-container').classList.add('app-loaded');
    }, 100);
    
    // Initialize
    loadTasks();
    startTaskStatusUpdater();
});