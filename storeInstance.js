// storeInstance.js
// Central singleton store for your app.
// Use this file to import and share the store instance without circular imports.

import { createStore } from './store.js';

export const store = createStore({
  name: 'myproject',            // Exposes `window.myprojectStore` and `myprojectState()`
  enableDevPanel: true,         // Optional: adds bottom-right debug UI
  initialState: {
    theme: 'light',
    user: null,
    draft: {}
  },
  syncStorage: ['theme'],       // Syncs selected keys with localStorage
  storageDriver: localStorage,  // Optional: switch to sessionStorage or custom driver
  storageEncrypt: JSON.stringify,  // Optional: customize encoding
  storageDecrypt: JSON.parse       // Optional: customize decoding
});
