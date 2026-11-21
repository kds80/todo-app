# Todo app

A small todo list you can run in any modern browser. It is built with plain HTML, CSS, and JavaScript. There is no install step and no build step, so the same files can be opened on your computer and, later, hosted on GitHub Pages.

## What it does

- Add a todo
- Optionally give a todo a due date, then change or clear that date later
- Mark a todo done or not done
- Delete a todo
- Filter the list: All, Active, or Completed
- Show how many items are still left
- Clear every completed item at once
- Keep the list in this browser with `localStorage`, so it is still there after a refresh

## Due dates

The date field next to "What needs doing?" is optional. Leave it blank to add a task with no deadline.

- A dated task shows the date in a readable form, such as "Sat, Nov 21, 2026".
- A task that is not done, and whose date is before today, is marked **Overdue**.
- A task that is not done, and whose date is today, is marked **Due today**.
- Finishing a task removes those marks. The date stays, so you can still see when it was due.
- On the task itself, use **Add date** or **Change date** to pick a different day, or **Clear date** to remove it.
- The date is saved with the rest of the list. Tasks saved before this feature have no date, and they still load.

The list is stored only in the browser that created it. It is not sent to a server. Opening the file directly and opening it from a local web server are treated as different sites, so each one has its own saved list.

## Run it locally

You do not need Node, npm, or a web server.

**Open the file**

1. Download this repository, or clone it (see below).
2. Open `index.html` in your browser. Double-click the file, or right-click it and choose Open With, then your browser.

**Clone, then open**

```bash
git clone https://github.com/kds80/todo-app.git
cd todo-app
```

Then open `index.html` the same way.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page structure: the heading, the form, the list, and the filter bar. |
| `styles.css` | How the page looks, including the layout on a narrow screen. |
| `app.js` | How the page behaves: adding, completing, deleting, filtering, due dates, and saving. |
| `README.md` | This guide. |

## Hosting later

The stylesheet and script use relative paths (`styles.css` and `app.js`). That means the folder can be published with GitHub Pages without a build command. After you merge this to `main`, Pages can serve `index.html` as the site.
