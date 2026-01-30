const taskInput = document.getElementById("taskInput");
const dateInput = document.getElementById("dateInput");
const taskList = document.getElementById("taskList");
const totalCount = document.getElementById("totalCount");
const doneCount = document.getElementById("doneCount");
const searchInput = document.getElementById("searchInput");
const darkToggle = document.getElementById("darkToggle");

let tasks = [];
let draggedIndex = null;
let lastDeleted = null;

/* ================= THEME ================= */
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    darkToggle.innerHTML = `<i class="fa-solid fa-sun"></i>`;
}

/* ================= LOAD ================= */
window.onload = () => {
    tasks = JSON.parse(localStorage.getItem("tasks")) || [
        { id: Date.now(), text: "Welcome to TaskPro 👋", done: false, date: "" },
        { id: Date.now() + 1, text: "Drag or swipe tasks", done: false, date: "" }
    ];
    renderTasks();
};

/* ================= ADD ================= */
function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    tasks.push({
        id: Date.now(),
        text,
        done: false,
        date: dateInput.value
    });

    taskInput.value = "";
    dateInput.value = "";
    saveTasks();
    renderTasks();
}

taskInput.addEventListener("keydown", e => {
    if (e.key === "Enter") addTask();
});

/* ================= PIN (FIXED) ================= */
function pinTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return;

    const task = tasks.splice(index, 1)[0];
    tasks.unshift(task);

    saveTasks();
    renderTasks();
}

/* ================= RENDER ================= */
function renderTasks() {
    taskList.innerHTML = "";
    const today = new Date().toISOString().split("T")[0];

    tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.draggable = true;

        if (task.date && task.date < today && !task.done) {
            li.classList.add("overdue");
        }

        if (tasks[0].id === task.id) {
            li.classList.add("pinned");
        }

        const span = document.createElement("span");
        span.textContent = task.text;
        if (task.done) span.classList.add("completed");

        span.onclick = () => {
            task.done = !task.done;
            saveTasks();
            renderTasks();
        };

        const date = document.createElement("div");
        date.className = "date";
        date.textContent = task.date ? "📅 " + task.date : "";

        const btns = document.createElement("div");
        btns.className = "task-btns";
        btns.innerHTML = `
            <i class="fa-solid fa-thumbtack"></i>
            <i class="fa-solid fa-pen"></i>
            <i class="fa-solid fa-check check"></i>
            <i class="fa-solid fa-trash delete"></i>
        `;

        btns.children[0].onclick = () => pinTask(task.id);
        btns.children[1].onclick = () => editTask(li, span, task);
        btns.children[2].onclick = () => span.click();
        btns.children[3].onclick = () => deleteTask(index);

        /* DRAG */
        li.addEventListener("dragstart", () => draggedIndex = index);
        li.addEventListener("dragover", e => e.preventDefault());
        li.addEventListener("drop", () => {
            const t = tasks.splice(draggedIndex, 1)[0];
            tasks.splice(index, 0, t);
            saveTasks();
            renderTasks();
        });

        /* SWIPE */
        let startX = 0;
        li.addEventListener("touchstart", e => startX = e.touches[0].clientX);
        li.addEventListener("touchend", e => {
            const diff = e.changedTouches[0].clientX - startX;
            if (diff > 80) span.click();
            if (diff < -80) deleteTask(index);
        });

        li.append(span, date, btns);
        taskList.appendChild(li);
    });

    updateStats();
}

/* ================= EDIT ================= */
function editTask(li, span, task) {
    const input = document.createElement("input");
    input.value = task.text;
    input.className = "edit-input";

    li.replaceChild(input, span);
    input.focus();

    input.addEventListener("keydown", e => {
        if (e.key === "Enter") {
            task.text = input.value.trim() || task.text;
            saveTasks();
            renderTasks();
        }
        if (e.key === "Escape") renderTasks();
    });

    input.onblur = () => {
        task.text = input.value.trim() || task.text;
        saveTasks();
        renderTasks();
    };
}

/* ================= DELETE + UNDO ================= */
function deleteTask(index) {
    lastDeleted = { task: tasks[index], index };
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
    showUndo();
}

function showUndo() {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `Task deleted <button>UNDO</button>`;
    document.body.appendChild(toast);

    toast.querySelector("button").onclick = () => {
        tasks.splice(lastDeleted.index, 0, lastDeleted.task);
        saveTasks();
        renderTasks();
        toast.remove();
    };

    setTimeout(() => toast.remove(), 4000);
}

/* ================= STATS ================= */
function updateStats() {
    totalCount.textContent = tasks.length;
    const done = tasks.filter(t => t.done).length;
    doneCount.textContent = done;

    const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    document.getElementById("progressText").textContent = percent + "%";
    document.getElementById("progress").style.strokeDashoffset =
        188 - (188 * percent) / 100;
}

/* ================= STORAGE ================= */
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

/* ================= SEARCH ================= */
searchInput.oninput = () => {
    const q = searchInput.value.toLowerCase();
    [...taskList.children].forEach(li => {
        li.style.display = li.innerText.toLowerCase().includes(q) ? "" : "none";
    });
};

/* ================= EXPORT ================= */
function exportCSV() {
    let csv = "Task,Status,Due Date\n";
    tasks.forEach(t => {
        csv += `"${t.text}",${t.done ? "Done" : "Pending"},${t.date || ""}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tasks.csv";
    a.click();
}

function exportPDF() {
    const win = window.open("");
    win.document.write("<h2>TaskPro</h2><ul>");
    tasks.forEach(t => {
        win.document.write(`<li>${t.text} - ${t.done ? "Done" : "Pending"}</li>`);
    });
    win.document.write("</ul>");
    win.print();
}

/* ================= DARK MODE ================= */
darkToggle.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
        "theme",
        document.body.classList.contains("dark") ? "dark" : "light"
    );
};
