# 🧠 simple-reactive-store

A lightweight, framework-free reactive state manager.
Ideal for small apps, modular tools, and browser-based UIs — no Redux, no boilerplate.

---

## ✅ Features

- `createStore({ initialState })` — start with any state shape
- `dispatch(type, payload)` — trigger updates
- `subscribe(fn)` — react to state changes
- Auto-refreshing in-browser debug panel
- Optional global exposure (`window.myStore`)
- ESM-first (works in browser or Node via bundlers)

---

## 📦 Installation

```bash
npm install simple-reactive-store
# or just copy store.js and storeInstance.js into your project
```

---

## 🛠️ Basic Usage

Create your store instance:

```js
// storeInstance.js
import { createStore } from './store.js';

export const store = createStore({
  name: 'myApp',
  initialState: {
    context: null,
    user: null
  },
  enableDevPanel: true
});
```

Use it anywhere:

```js
// someFeature.js
import { store } from './storeInstance.js';

store.dispatch('set-context', {
  type: 'region',
  id: 'abc123',
  meta: { name: 'Berlin' }
});

store.subscribe(({ type, payload }) => {
  console.log('Update:', type, payload);
});
```

---

## 🧪 Dev Tools

If `enableDevPanel: true` is passed:

- Shows a floating panel on the page
- Allows toggling, refreshing, and inspecting state
- Registers globally:
  - `window.myAppStore.getState()`
  - `window.myAppState()` logs the full state

---

## 🌍 Global Exposure

If you pass just a `name`:

```js
createStore({ name: 'myApp' });
```

It auto-creates:

- `window.myAppStore` → access the store
- `window.myAppState()` → logs a snapshot

---

## 💡 Dispatch Rules

You can handle specific or generic actions:

```js
store.dispatch('set-user', { name: 'Alice' });
// auto-mapped to state.user = { name: 'Alice' }
// emits event: { type: 'user-updated', payload }
```

Or explicitly support known cases:

```js
store.dispatch('clear-context');
// handled in switch-case as a known action
```

---

## 📁 Suggested File Structure

```
src/
├── store.js              ← the generic store logic
├── storeInstance.js      ← your app-specific store setup
├── ...
```

---

## ✅ License

MIT — see the LICENSE file for details.
No framework dependencies, zero runtime overhead.
