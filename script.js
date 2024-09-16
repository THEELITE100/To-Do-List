document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    function createTaskItem(taskText) {
        const li = document.createElement('li');
        li.innerHTML = `
            ${taskText}
            <button class="remove-btn">Remove</button>
        `;
        const removeBtn = li.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => {
            taskList.removeChild(li);
        });
        return li;
    }
    addTaskBtn.addEventListener('click', () => {
        const taskText = taskInput.value.trim();
        if (taskText !== '') {
            const taskItem = createTaskItem(taskText);
            taskList.appendChild(taskItem);
            taskInput.value = '';
        }
    });
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTaskBtn.click();
        }
    });
});