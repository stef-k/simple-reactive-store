# 🧠 simple-reactive-store

A lightweight, framework-free reactive state manager for modern web apps.
No Redux, no boilerplate, no frameworks — just a powerful state core with time-travel, DOM binding, and full debug panel.

---

## ✅ Features

- `createStore({ initialState })` — any shape, deep or flat
- `dispatch(type, payload)` — immutable, event-style updates
- `subscribe(fn)` — fine-grained state listeners
- `watch(key, fn)` — reactive by-key subscriptions
- `watchPath(path, fn)` — deep path watching (`foo.bar.baz`)
- `computed(key, fn)` — define derived state values
- `bind(key, selector)` — one-way binding to textContent
- `autoBind()` — auto-wires `[data-model]` and `[data-bind]`
- `link(store, key)` / `linkTwoWay()` — inter-store reactive sync
- `syncStorage` — persist keys to localStorage/sessionStorage
- ⏮️ `undo()` / ⏭️ `redo()` / `jumpTo(index)` — built-in history navigation
- 🧪 Dev panel with time-travel UI and dropdown history

---

## 📦 Installation

```bash
npm install simple-reactive-store
# or just copy store.js and storeInstance.js into your project
```

---

## 🛠️ Basic Usage

### 1. Create your store

```js
// storeInstance.js
import { createStore } from './store.js';

export const store = createStore({
  name: 'myApp',
  initialState: {
    theme: 'light',
    user: null,
    draft: {}
  },
  enableDevPanel: true,
  syncStorage: ['theme']
});
```

### 2. Use anywhere

```js
// someFeature.js
import { store } from './storeInstance.js';

store.dispatch('set-user', { name: 'Alice' });

store.watch('user', user => {
  console.log('New user:', user);
});
```

---

## 🔁 Time Travel & Undo/Redo

If `enableDevPanel: true`, the store will:

- Track every meaningful state change
- Expose:
  - `store.undo()` / `store.redo()`
  - `store.jumpTo(index)`
- Show a timeline dropdown for direct history navigation
- Prevents duplicate state entries

---

## 🔗 Linking Stores

```js
storeA.link(storeB, 'user'); // one-way

storeA.linkTwoWay(storeB, 'theme'); // bidirectional
```

Supports optional transform and reverseTransform functions.

---

## 📦 Persistence

Specify keys to sync automatically:

```js
createStore({
  syncStorage: ['theme', 'draft'],
  storageDriver: sessionStorage, // or localStorage
  storageEncrypt: JSON.stringify,
  storageDecrypt: JSON.parse
});
```

Works with `data-model` elements or via direct dispatch.

---

## ⚙️ DOM Binding

Supports `data-model` for input ↔ state sync, and `data-bind` for display.

### Markup

```html
<input data-model="theme" />
<span data-bind="theme"></span>
```

### Activation

```js
store.autoBind(); // once at startup
```

Supports formatting via `data-format="uppercase"`, `percent`, `iso-date`, etc.

---

## 🧪 Dev Tools

If `enableDevPanel: true`:

- 🧠 Floating inspector with toggle, refresh, and state dump
- ⏮️ Undo / ⏭️ Redo
- 🔍 History dropdown for jumping between snapshots
- ⌨️ Keyboard support: `Ctrl+Z` (undo), `Ctrl+Shift+Z` (redo)
- `window.myAppStore` and `window.myAppState()` for live debugging

---

## 🌍 Global Exposure

If `name: 'myApp'` is passed:

- `window.myAppStore` — full access
- `myAppState()` — logs a state snapshot to console

---

## 📁 Suggested File Structure

```bash
src/
├── store.js              ← reusable store logic
├── storeInstance.js      ← app-specific setup
├── components/
│   ├── trip.js
│   ├── segmentHandlers.js
│   └── ...
```

---

## ✅ License

MIT — no dependencies, no lock-in, usable in any frontend stack.
Perfect for progressive enhancement, micro frontends, and modern plain-JS apps.
