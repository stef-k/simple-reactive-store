# simple-reactive-store

🚀 A lightweight, reactive JavaScript store — no frameworks, no fuss.

## Features

- ✅ `createStore({ initialState })`
- ✅ `dispatch(type, payload)`
- ✅ `subscribe(fn)` to react to changes
- ✅ Optional dev panel + global exposure
- ✅ ESM-first: works in browser and Node

## Usage

```js
import { createStore } from './store.js';

const store = createStore({
  initialState: { context: null },
  enableDevPanel: true,
  globalExpose: {
    windowKey: 'myStore',
    exposeStateFn: 'logStore'
  }
});

store.dispatch('set-context', { type: 'place', id: 'abc' });

store.subscribe(({ type, payload }) => {
  console.log('Update:', type, payload);
});
