/*
  app.js
  Behavior for the todo page.

  This file is plain JavaScript. The browser runs it because
  index.html ends with <script src="app.js"></script>.
  There is no build step and no framework.

  A todo is a plain object:
    {
      id: "…",
      text: "Buy milk",
      completed: false,
      dueDate: "2026-11-21"   // or null when there is no due date
    }

  dueDate uses the same text an <input type="date"> gives us: "YYYY-MM-DD".
  Todos saved before due dates existed have no dueDate field. Those still load.
*/

// Saved under this name in the browser's localStorage.
// localStorage keeps the list after a refresh, but only in this browser.
const STORAGE_KEY = "todos-v1";

// The list we draw on the page. Filled from localStorage on startup.
let todos = [];

// Which filter button is selected: "all", "active", or "completed".
let currentFilter = "all";

// While a date is being typed, several changes arrive close together
// (month, then day, then year). This timer waits so we paint the finished date.
let dueDatePaintTimer = null;

// Elements from index.html. querySelector finds them by id.
const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const dueDateInput = document.querySelector("#due-date-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const footer = document.querySelector("#todo-footer");
const remainingCount = document.querySelector("#remaining-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const filterButtons = document.querySelectorAll("[data-filter]");

form.addEventListener("submit", onAddTodo);
list.addEventListener("change", onToggleTodo);
list.addEventListener("change", onDueDateChange);
// focusout bubbles, unlike blur, so the list can hear it.
// It runs when the user leaves a row's date field.
list.addEventListener("focusout", onDueDateBlur);
list.addEventListener("click", onDeleteTodo);
list.addEventListener("click", onClearDueDate);
clearCompletedButton.addEventListener("click", onClearCompleted);
filterButtons.forEach(function (button) {
  button.addEventListener("click", onFilterClick);
});

// Read any saved list, then draw it. A refresh comes back through here.
// `function loadTodos` is declared further down. Function declarations can be
// called from above the line where they are written.
loadTodos();
render();

function onAddTodo(event) {
  // A form submit reloads the page by default. We stay on this page instead.
  event.preventDefault();

  const text = input.value.trim();
  if (text === "") {
    return;
  }

  // "" means the user left the date blank. Store that as null.
  todos.push({
    id: createId(),
    text: text,
    completed: false,
    dueDate: normalizeDueDate(dueDateInput.value),
  });

  input.value = "";
  dueDateInput.value = "";
  saveTodos();
  render();
}

function onToggleTodo(event) {
  const checkbox = event.target.closest("[data-action='toggle']");
  if (!checkbox) {
    return;
  }

  const id = checkbox.closest("[data-id]").dataset.id;
  const todo = findTodo(id);
  if (!todo) {
    return;
  }

  // The checkbox has already flipped. Copy that into our list.
  todo.completed = checkbox.checked;
  saveTodos();
  render();
}

function onDueDateChange(event) {
  const dueInput = event.target.closest("[data-action='set-due']");
  if (!dueInput) {
    return;
  }

  // Save the date, but do not rebuild the row. Rebuilding would replace
  // the field and drop the keystrokes that have not been typed yet.
  applyDueDate(dueInput);
  scheduleDueDatePaint(dueInput);
}

function onDueDateBlur(event) {
  const dueInput = event.target.closest("[data-action='set-due']");
  if (!dueInput) {
    return;
  }

  applyDueDate(dueInput);
  // The click that moved focus (Clear date, for example) has to run
  // before this redraw. Otherwise the redraw removes that button first.
  window.setTimeout(render, 0);
}

function applyDueDate(dueInput) {
  const id = dueInput.closest("[data-id]").dataset.id;
  const todo = findTodo(id);
  if (!todo) {
    return;
  }

  // Empty means the calendar field was cleared. A real date is "YYYY-MM-DD".
  todo.dueDate = normalizeDueDate(dueInput.value);
  saveTodos();
}

function scheduleDueDatePaint(dueInput) {
  window.clearTimeout(dueDatePaintTimer);
  dueDatePaintTimer = window.setTimeout(function () {
    dueDatePaintTimer = null;
    // Blur may already have rebuilt the row. The old field is then gone.
    if (!dueInput.isConnected) {
      return;
    }
    paintDueAppearance(dueInput);
  }, 200);
}

// Refresh the friendly date, the Overdue / Due today colors, and the
// Clear date button without touching the date field the user is editing.
function paintDueAppearance(dueInput) {
  const item = dueInput.closest(".todo");
  const todo = findTodo(item.dataset.id);
  if (!todo) {
    return;
  }

  const status = dueStatus(todo);
  item.classList.toggle("is-overdue", status === "overdue");
  item.classList.toggle("is-due-today", status === "today");

  const summary = item.querySelector(".due-line");
  if (!todo.dueDate) {
    if (summary) {
      summary.remove();
    }
  } else if (summary) {
    summary.replaceWith(renderDueSummary(todo, status));
  } else {
    const editor = item.querySelector(".due-editor");
    editor.parentNode.insertBefore(renderDueSummary(todo, status), editor);
  }

  const labelText = item.querySelector(".due-editor-label span");
  if (labelText) {
    labelText.textContent = todo.dueDate ? "Change date" : "Add date";
  }

  let clearButton = item.querySelector("[data-action='clear-due']");
  if (todo.dueDate && !clearButton) {
    clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "clear-date-button";
    clearButton.dataset.action = "clear-due";
    clearButton.textContent = "Clear date";
    clearButton.setAttribute("aria-label", "Clear due date for " + todo.text);
    item.querySelector(".due-editor").appendChild(clearButton);
  }
  if (!todo.dueDate && clearButton) {
    clearButton.remove();
  }
}

function onClearDueDate(event) {
  const button = event.target.closest("[data-action='clear-due']");
  if (!button) {
    return;
  }

  const id = button.closest("[data-id]").dataset.id;
  const todo = findTodo(id);
  if (!todo) {
    return;
  }

  todo.dueDate = null;
  saveTodos();
  render();
}

function onDeleteTodo(event) {
  const button = event.target.closest("[data-action='delete']");
  if (!button) {
    return;
  }

  const id = button.closest("[data-id]").dataset.id;
  todos = todos.filter(function (item) {
    return item.id !== id;
  });
  saveTodos();
  render();
}

function onClearCompleted() {
  todos = todos.filter(function (item) {
    return item.completed === false;
  });
  saveTodos();
  render();
}

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }
    // Ignore rows that are not the shape we save, so a bad edit cannot crash the page.
    // Then fill in dueDate. Old rows have no date, and that is valid.
    todos = parsed.filter(isValidTodo).map(withDueDate);
  } catch (error) {
    console.warn("Could not read saved todos. Starting with an empty list.", error);
    todos = [];
  }
}

function saveTodos() {
  // Store only the fields we use, not anything extra that might be on the object.
  const toSave = todos.map(function (item) {
    return {
      id: item.id,
      text: item.text,
      completed: item.completed,
      dueDate: item.dueDate,
    };
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    // Private browsing can refuse storage. The list still works until the tab closes.
    console.warn("Could not save todos in this browser.", error);
  }
}

function isValidTodo(item) {
  // dueDate is optional on purpose. A todo saved by an older version
  // of this app has id, text, and completed, and nothing else.
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    typeof item.completed === "boolean"
  );
}

function withDueDate(item) {
  return {
    id: item.id,
    text: item.text,
    completed: item.completed,
    dueDate: normalizeDueDate(item.dueDate),
  };
}

// Keep a date only when it is a real calendar day in "YYYY-MM-DD" form.
// Anything else (missing, blank, or not a real day) becomes null.
function normalizeDueDate(value) {
  if (typeof value !== "string" || value === "") {
    return null;
  }
  if (!parseIsoDate(value)) {
    return null;
  }
  return value;
}

// Turn "2026-11-21" into a local date at midnight.
// new Date("2026-11-21") is midnight in UTC, which can fall on the
// previous evening in the US, so we build the date from the parts instead.
function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  // JavaScript rolls an impossible day forward (Feb 31 becomes March).
  // If the parts changed, this was not a real calendar day.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function onFilterClick(event) {
  currentFilter = event.currentTarget.dataset.filter;
  render();
}

// The footer count uses every todo. The list itself uses this filtered copy.
function visibleTodos() {
  if (currentFilter === "active") {
    return todos.filter(function (item) {
      return item.completed === false;
    });
  }
  if (currentFilter === "completed") {
    return todos.filter(function (item) {
      return item.completed === true;
    });
  }
  return todos;
}

// Rebuild the list from the `todos` array. The page is a view of that array.
function render() {
  const remaining = todos.filter(function (item) {
    return item.completed === false;
  }).length;

  // Clear the old rows, then add one <li> per todo.
  // User text is set with textContent later, never dropped into HTML.
  const visible = visibleTodos();
  list.innerHTML = "";

  visible.forEach(function (todo) {
    list.appendChild(renderTodo(todo));
  });

  const isEmpty = visible.length === 0;
  emptyState.textContent = emptyMessage();
  emptyState.classList.toggle("is-hidden", !isEmpty);
  list.classList.toggle("is-hidden", isEmpty);
  // The footer stays available while any todo exists, even if a filter hides them.
  footer.classList.toggle("is-hidden", todos.length === 0);

  remainingCount.textContent = remainingLabel(remaining);
  clearCompletedButton.disabled = remaining === todos.length;

  filterButtons.forEach(function (button) {
    const selected = button.dataset.filter === currentFilter;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function emptyMessage() {
  if (todos.length === 0) {
    return "Nothing here yet. Add a task above.";
  }
  if (currentFilter === "active") {
    return "No active tasks.";
  }
  if (currentFilter === "completed") {
    return "No completed tasks.";
  }
  return "Nothing here yet. Add a task above.";
}

function renderTodo(todo) {
  // "overdue" and "today" are only for work that is still open.
  // A completed todo keeps its date, but it is no longer flagged.
  const status = dueStatus(todo);

  const item = document.createElement("li");
  item.className = "todo";
  if (todo.completed) {
    item.classList.add("is-done");
  }
  if (status === "overdue") {
    item.classList.add("is-overdue");
  }
  if (status === "today") {
    item.classList.add("is-due-today");
  }
  item.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute("aria-label", todo.completed ? "Mark as not done" : "Mark as done");

  const body = document.createElement("div");
  body.className = "todo-body";

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;
  body.appendChild(text);

  if (todo.dueDate) {
    body.appendChild(renderDueSummary(todo, status));
  }

  // The date field on the row is how a date is changed after the todo exists.
  body.appendChild(renderDueEditor(todo));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-button";
  removeButton.dataset.action = "delete";
  removeButton.textContent = "Delete";
  removeButton.setAttribute("aria-label", "Delete " + todo.text);

  item.appendChild(checkbox);
  item.appendChild(body);
  item.appendChild(removeButton);
  return item;
}

// The friendly line under the todo text, plus an Overdue or Due today label.
// The label is text, not color alone, so the status is still clear without color.
function renderDueSummary(todo, status) {
  const line = document.createElement("p");
  line.className = "due-line";

  const dateText = document.createElement("span");
  dateText.className = "due-date";
  dateText.textContent = "Due " + formatDueDate(todo.dueDate);
  line.appendChild(dateText);

  if (status === "overdue" || status === "today") {
    const flag = document.createElement("span");
    flag.className = "due-flag " + (status === "overdue" ? "is-overdue" : "is-today");
    flag.textContent = status === "overdue" ? "Overdue" : "Due today";
    line.appendChild(flag);
  }

  return line;
}

// A small date field under the task. "Add date" when there is none yet,
// "Change date" when there is. Clear date is a button because the
// browser's own clear control on a date input is easy to miss.
function renderDueEditor(todo) {
  const editor = document.createElement("div");
  editor.className = "due-editor";

  const label = document.createElement("label");
  label.className = "due-editor-label";

  const labelText = document.createElement("span");
  labelText.textContent = todo.dueDate ? "Change date" : "Add date";

  const dueInput = document.createElement("input");
  dueInput.type = "date";
  dueInput.dataset.action = "set-due";
  dueInput.value = todo.dueDate || "";
  dueInput.setAttribute("aria-label", "Due date for " + todo.text);

  label.appendChild(labelText);
  label.appendChild(dueInput);
  editor.appendChild(label);

  if (todo.dueDate) {
    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "clear-date-button";
    clearButton.dataset.action = "clear-due";
    clearButton.textContent = "Clear date";
    clearButton.setAttribute("aria-label", "Clear due date for " + todo.text);
    editor.appendChild(clearButton);
  }

  return editor;
}

// "overdue" when the date is before today, "today" when it is today,
// "upcoming" when it is later, and "none" when there is no date or the
// todo is already completed.
function dueStatus(todo) {
  if (!todo.dueDate || todo.completed) {
    return "none";
  }

  const due = parseIsoDate(todo.dueDate);
  if (!due) {
    return "none";
  }

  const today = startOfToday().getTime();
  if (due.getTime() < today) {
    return "overdue";
  }
  if (due.getTime() === today) {
    return "today";
  }
  return "upcoming";
}

// Midnight this morning, in the browser's local timezone.
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// "2026-11-21" becomes something like "Sat, Nov 21, 2026".
function formatDueDate(isoDate) {
  const date = parseIsoDate(isoDate);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findTodo(id) {
  for (let i = 0; i < todos.length; i++) {
    if (todos[i].id === id) {
      return todos[i];
    }
  }
  return null;
}

function remainingLabel(count) {
  if (count === 1) {
    return "1 item left";
  }
  return count + " items left";
}

function createId() {
  // randomUUID is built into current browsers. The fallback covers older ones.
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return String(Date.now());
}
