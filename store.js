// store.js – simple, project-agnostic reactive state manager
//
// 📦 Example usage:
//
// import { createStore } from './store.js';
//
// const store = createStore({
//   initialState: {
//     context: null,
//     tripId: null
//   },
//   enableDevPanel: true,
//   globalExpose: {
//     windowKey: 'myAppStore',
//     exposeStateFn: 'logMyAppState'
//   }
// });
//
// store.dispatch('set-context', { id: 'abc', type: 'place' });
//
// const snapshot = store.getState();
//
// store.subscribe(({ type, payload }) => {
//   console.log('🔔 Update:', type, payload);
// });
//
// window.myAppStore.getState();
// window.logMyAppState();


/**
 * Creates a reactive store with optional dev panel and global exposure.
 *
 * @param {Object} options - Configuration options
 * @param {Object} [options.initialState={}] - Base state object to initialize
 * @param {boolean} [options.enableDevPanel=false] - Show in-browser debug panel
 * @param {Object} [options.globalExpose] - Global bindings (optional)
 * @param {string} [options.globalExpose.windowKey] - Window object key for global access
 * @param {string} [options.globalExpose.exposeStateFn] - Window function name to log state
 * @returns {object} - The store instance
 */
export const createStore = ({
  initialState = {},
  enableDevPanel = false,
  globalExpose = null
} = {}) => {
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
          // Generic setter fallback: set-[key]
          if (action.startsWith('set-')) {
            const key = action.replace(/^set-/, '');
            state[key] = payload;
            listeners.forEach(fn => fn({ type: `${key}-updated`, payload }));
          } else {
            console.warn(`⚠️ Unknown action "${action}"`);
          }
      }
    }
  };

  if (globalExpose?.windowKey) {
    window[globalExpose.windowKey] = store;
    if (globalExpose.exposeStateFn) {
      window[globalExpose.exposeStateFn] = () =>
        console.log(`🧠 ${globalExpose.windowKey} Snapshot:`, store.getState());
    }
    console.log(`✅ Store exposed globally as window.${globalExpose.windowKey}`);
  }

  if (enableDevPanel) {
    const panel = document.createElement('div');
    panel.style = 'position:fixed;bottom:0;right:0;width:300px;z-index:9999;background:#fff;border:1px solid #ccc;padding:3px;font:12px monospace;overflow:hidden';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <strong>🧠 Store Debug</strong>
        <button id="toggleStorePanel" style="font-size:11px">Hide</button>
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

    let visible = true;
    document.getElementById('toggleStorePanel').onclick = () => {
      visible = !visible;
      dump.style.display = visible ? 'block' : 'none';
      controls.style.display = visible ? 'block' : 'none';
      document.getElementById('toggleStorePanel').textContent = visible ? 'Hide' : 'Show';
    };

    update();
  }

  return store;
};
