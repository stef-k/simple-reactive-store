// store.js – universal reactive state manager (project-agnostic)

// 📦 Example usage:
//
// import { createStore } from './store.js';
//
// const store = createStore({
//   name: 'myApp',
//   initialState: {
//     context: null,
//     tripId: null
//   },
//   enableDevPanel: true
// });
//
// store.dispatch('set-context', {
//   type: 'place',
//   id: 'abc123',
//   action: 'edit',
//   meta: { name: 'My Place' }
// });
//
// const state = store.getState();
//
// store.subscribe(({ type, payload }) => {
//   console.log('🔔 Store update:', type, payload);
// });
//
// window.myAppStore.getState();  // via global
// window.myAppState();           // logs state snapshot

/**
 * Creates a reactive store with optional dev panel and global exposure.
 *
 * @param {string|Object} config - Name string or configuration object.
 * @param {string} [config.name] - Optional name to derive window globals (`nameStore`, `nameState`).
 * @param {Object} [config.initialState={}] - Base state object to initialize.
 * @param {boolean} [config.enableDevPanel=false] - Show debug panel UI.
 * @param {Object} [config.globalExpose] - Optional custom global bindings.
 * @param {string} [config.globalExpose.windowKey] - Window object key for global access.
 * @param {string} [config.globalExpose.exposeStateFn] - Function to log state.
 * @returns {object} - The store instance.
 */
export const createStore = (config = {}) => {
  const options = typeof config === 'string' ? { name: config } : config;

  const {
    name,
    initialState = {},
    enableDevPanel = false,
    globalExpose = name
      ? { windowKey: `${name}Store`, exposeStateFn: `${name}State` }
      : null
  } = options;

  const state = structuredClone(initialState);
  const listeners = new Set();

  const store = {
    getState: () => ({ ...state }),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispatch: (action, payload) => {
      switch (action) {
        case 'set-context':
          state.context = payload;
          listeners.forEach(fn => fn({ type: 'context-changed', payload }));
          break;

        case 'clear-context':
          state.context = null;
          listeners.forEach(fn => fn({ type: 'context-cleared' }));
          break;

        default:
          if (action.startsWith('set-')) {
            const key = action.replace(/^set-/, '');
            state[key] = payload;
            listeners.forEach(fn => fn({ type: `${key}-updated`, payload }));
          } else {
            console.warn(`⚠️ Unknown action "${action}"`);
          }
      }

      if (typeof window.__storeDebugUpdate === 'function') {
        window.__storeDebugUpdate();
      }
    }
  };

  if (globalExpose?.windowKey) {
    window[globalExpose.windowKey] = store;
    if (globalExpose.exposeStateFn) {
      window[globalExpose.exposeStateFn] = () =>
        console.log(`🧐 ${globalExpose.windowKey} Snapshot:`, store.getState());
    }
  }

  if (enableDevPanel) {
    const panel = document.createElement('div');
    panel.style = 'position:fixed;bottom:0;right:0;width:auto;max-width:500px;min-width:150px;z-index:9999;background:#fff;border:1px solid #ccc;padding:3px;font:12px monospace;overflow:hidden';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>🧠 Store Debug</strong>
        <button id="toggleStorePanel" style="font-size:11px">Show</button>
      </div>
      <div id="storeControls">
        <button id="refreshStore">Refresh</button>
        <button id="clearLog">Clear</button>
      </div>
      <div id="storeDump" style="margin-top:5px;white-space:pre;max-height:130px;overflow:auto;border-top:1px solid #ddd;padding-top:4px"></div>
    `;
    document.body.appendChild(panel);

    const dump = document.getElementById('storeDump');
    const controls = document.getElementById('storeControls');

    const update = () => {
      dump.textContent = JSON.stringify(store.getState(), null, 2);
    };

    document.getElementById('refreshStore').onclick = update;
    document.getElementById('clearLog').onclick = () => dump.textContent = '';

    let visible = false;
    const toggleBtn = document.getElementById('toggleStorePanel');
    dump.style.display = 'none';
    controls.style.display = 'none';
    toggleBtn.textContent = 'Show';

    toggleBtn.onclick = () => {
      visible = !visible;
      dump.style.display = visible ? 'block' : 'none';
      controls.style.display = visible ? 'block' : 'none';
      toggleBtn.textContent = visible ? 'Hide' : 'Show';
    };

    window.__storeDebugUpdate = update;
    update();
  }

  return store;
};
