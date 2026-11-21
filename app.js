/*
  app.js
  Behavior for the todo page.

  This file is plain JavaScript. The browser runs it because
  index.html ends with <script src="app.js"></script>.
  There is no build step and no framework.

  A todo is a plain object with three fields:
    { id: "…", text: "Buy milk", completed: false }
*/

// The list we draw on the page. It starts empty.
let todos = [];

// Which filter button is selected: "all", "active", or "completed".
let currentFilter = "all";

// Elements from index.html. querySelector finds them by id.
const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const footer = document.querySelector("#todo-footer");
const remainingCount = document.querySelector("#remaining-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const filterButtons = document.querySelectorAll("[data-filter]");

form.addEventListener("submit", onAddTodo);
list.addEventListener("change", onToggleTodo);
list.addEventListener("click", onDeleteTodo);
clearCompletedButton.addEventListener("click", onClearCompleted);
filterButtons.forEach(function (button) {
  button.addEventListener("click", onFilterClick);
});

// Draw the empty list once, so the footer stays hidden until the first todo.
render();

function onAddTodo(event) {
  // A form submit reloads the page by default. We stay on this page instead.
  event.preventDefault();

  const text = input.value.trim();
  if (text === "") {
    return;
  }

  todos.push({
    id: createId(),
    text: text,
    completed: false,
  });

  input.value = "";
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
  render();
}

function onClearCompleted() {
  todos = todos.filter(function (item) {
    return item.completed === false;
  });
  render();
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
  const item = document.createElement("li");
  item.className = todo.completed ? "todo is-done" : "todo";
  item.dataset.id = todo.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.dataset.action = "toggle";
  checkbox.setAttribute("aria-label", todo.completed ? "Mark as not done" : "Mark as done");

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "delete-button";
  removeButton.dataset.action = "delete";
  removeButton.textContent = "Delete";
  removeButton.setAttribute("aria-label", "Delete " + todo.text);

  item.appendChild(checkbox);
  item.appendChild(text);
  item.appendChild(removeButton);
  return item;
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
