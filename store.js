// store.js – universal reactive state manager (project-agnostic, upgraded)

/**
 * Universal state management module for reactive web apps.
 *
 * Features:
 * - Centralized immutable state
 * - Subscriptions and event-driven updates
 * - Auto DOM binding via data-model/data-bind
 * - Computed properties
 * - Local/session storage persistence
 * - Inter-store links and two-way sync
 * - Dev debug panel and global exposure
 */

/**
 * Creates a reactive store with fine-grained subscriptions, DOM binding,
 * computed values, event helpers, inter-store links, and optional dev tools.
 *
 * @param {string|Object} config - Configuration object or name string.
 * @param {string} [config.name] - Used to expose globals as `nameStore`.
 * @param {Object} [config.initialState={}] - Base state object.
 * @param {boolean} [config.enableDevPanel=false] - Show debug panel.
 * @returns {object} - Store instance API.
 */
export const createStore = (config = {}) => {
  const opts = typeof config === 'string' ? { name: config } : config;
  const { name, initialState = {}, enableDevPanel = false, syncStorage = false, storageDriver = localStorage, storageEncrypt = JSON.stringify, storageDecrypt = JSON.parse } = opts;

  // Load from localStorage if enabled
  const localKeys = syncStorage === true ? Object.keys(initialState) : Array.isArray(syncStorage) ? syncStorage : [];
  const state = structuredClone(initialState);

  /**
  * Safely retrieves a nested property from an object using dot notation.
  * @param {object} obj - The object to traverse.
  * @param {string} path - Dot-separated key path.
  * @returns {*} - The nested value or undefined.
  */
  const getAtPath = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);
  /**
   * Sets a nested property on an object, creating missing structure as needed.
   * @param {object} obj - The target object.
   * @param {string} path - Dot-separated key path.
   * @param {*} val - Value to set.
   */
  const setAtPath = (obj, path, val) => {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = val;
  };

  for (const path of localKeys) {
    const stored = storageDriver.getItem(path);
    if (stored !== null) {
      try {
        setAtPath(state, path, storageDecrypt(stored));
      } catch {
        setAtPath(state, path, stored); // fallback
      }
    }
  }

  /**
  * Subscribers for all store events. Functions here receive { type, payload }.
  */
  const listeners = new Set();
  /**
  * Registered computed properties, evaluated on demand.
  */
  const computedFns = new Map();
  /**
  * DOM element bindings keyed by state key, used for reactive rendering.
  */
  const bindings = new Map();
  /**
  * Global watchers invoked on every dispatch with (nextState, prevState).
  */
  const watchAllFns = new Set();

  /**
  * Triggers all relevant listeners and watchers for a given state change.
  * @param {string} type - The action/event type.
  * @param {*} payload - The associated payload.
  */
  const notify = (type, payload) => {
    const prevState = structuredClone(state);
    listeners.forEach(fn => fn({ type, payload }));
    watchAllFns.forEach(fn => fn(state, prevState));
    if (typeof window.__storeDebugUpdate === 'function') window.__storeDebugUpdate();
  };

  const store = {
    __syncKeys: localKeys,
    /**
     * Returns a deep copy of the current store state.
     * @returns {Object} - The current state snapshot.
     */
    getState: () => structuredClone(state),

    /**
     * Modifies the state or triggers a custom event.
     * Supports 'set-key' for mutation and emits changes to listeners.
     * @param {string} type - The action type (e.g. 'set-theme').
     * @param {*} payload - The new value or event data.
     */
    dispatch: (type, payload) => {
      if (typeof type === 'string') {
        const [verb, key] = type.split('-');
        if (verb === 'set' && key && key.length) {
          state[key] = payload;
          updateBindings(key);

          for (const path of store.__syncKeys) {
            const base = path.split('.')[0];
            if (key === base || key === path) {
              try {
                const val = getAtPath(state, path);
                storageDriver.setItem(path, storageEncrypt(val));
              } catch {
                // optional: log or ignore silently
              }
            }
          }
        }
      }

      notify(type, payload);
    },

    /**
     * Registers a listener for all dispatches.
     * @param {Function} fn - Function receiving { type, payload }.
     * @returns {Function} - Unsubscribe function.
     */
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /**
     * Watches a single top-level key for changes (shallow or deep).
     * @param {string} key - State key to observe.
     * @param {Function} fn - Callback with the new value.
     */
    watch: (key, fn) => {
      let prev = structuredClone(state[key]);
      return store.subscribe(() => {
        const next = state[key];
        const changed = typeof next === 'object' && next !== null
          ? JSON.stringify(next) !== JSON.stringify(prev)
          : next !== prev;
        if (changed) {
          prev = structuredClone(next);
          fn(next);
        }
      });
    },

    /**
     * Watches all state changes and receives full state snapshots.
     * @param {Function} fn - Callback with (nextState, prevState).
     */
    watchAll: (fn) => {
      watchAllFns.add(fn);
      return () => watchAllFns.delete(fn);
    },

    /**
     * Responds only to specific action types.
     * @param {string} type - The action type to listen for.
     * @param {Function} fn - Callback receiving the payload.
     */
    when: (type, fn) => {
      return store.subscribe(({ type: t, payload }) => {
        if (t === type) fn(payload);
      });
    },

    /**
     * Responds once to a specific action type, then unsubscribes.
     * @param {string} type - The action type.
     * @param {Function} fn - Callback function.
     */
    once: (type, fn) => {
      const off = store.when(type, (payload) => {
        fn(payload);
        off();
      });
    },

    /**
     * Shortcut to dispatch a named event.
     * @param {string} type - Event type.
     * @param {*} payload - Event data.
     */
    emit: (type, payload) => store.dispatch(type, payload),

    /**
     * Defines a computed property that derives from state.
     * @param {string} key - Name of the computed property.
     * @param {Function} fn - Function that computes a value from state.
     */
    computed: (key, fn) => {
      computedFns.set(key, fn);
    },

    /**
     * Gets a state value or computed value if defined.
     * @param {string} key - The key or computed name.
     * @returns {*} - The value.
     */
    get: (key) => {
      if (computedFns.has(key)) {
        return computedFns.get(key)(state);
      }
      return state[key];
    },

    /**
     * Binds a state key to DOM elements matching selector.
     * @param {string} key - State key to bind.
     * @param {string} selector - DOM selector.
     */
    bind: (key, selector) => {
      if (!bindings.has(key)) bindings.set(key, new Set());
      document.querySelectorAll(selector).forEach(el => {
        bindings.get(key).add(el);
        renderBoundValue(el, key);
      });
    },

    /**
     * Automatically binds elements with `data-model` and `data-bind` attributes.
     * Also syncs with localStorage if specified via `data-sync`.
     */
    autoBind: () => {
      const allModels = new Set();

      document.querySelectorAll('[data-model]').forEach(el => {
        const path = el.dataset.model;
        if (!path) return;

        store.bind(path, `[data-model="${path}"]`);
        allModels.add(path);

        if (el.dataset.modelBound) return;
        el.dataset.modelBound = 'true';

        const eventType = el.tagName === 'SELECT' || el.tagName === 'INPUT' ? 'input' : 'change';

        el.addEventListener(eventType, () => {
          const value = el.value;
          const prevVal = getAtPath(state, path);
          if (prevVal !== value) {
            setAtPath(state, path, value);
            store.dispatch(`set-${path}`, value, { skipHistory: true });

            if (el.dataset.sync === 'localStorage') {
              storageDriver.setItem(path, value);
            }
          }
        });

        // Load initial value from localStorage
        if (el.dataset.sync === 'localStorage') {
          const saved = storageDriver.getItem(path);
          if (saved !== null) {
            store.dispatch(`set-${path}`, saved);
            el.value = saved;
          }
          store.watchPath(path, val => storageDriver.setItem(path, val));
        }
      });

      document.querySelectorAll('[data-bind]').forEach(el => {
        const path = el.dataset.bind;
        if (!path || allModels.has(path)) return;
        store.bind(path, `[data-bind="${path}"]`);
      });
    },

    /**
     * One-way reactive link from another store's key.
     * @param {object} otherStore - External store.
     * @param {string} key - Key in the other store.
     * @param {Function} [transformFn] - Optional transform.
     */
    link: (otherStore, key, transformFn) => {
      otherStore.watch(key, (val) => {
        const newVal = typeof transformFn === 'function' ? transformFn(val) : val;
        store.dispatch(`set-${key}`, newVal);
      });
    },

    /**
     * Two-way sync between this store and another store.
     * @param {object} otherStore - External store.
     * @param {string} key - Shared key.
     * @param {Function} [transformFn] - Forward transform.
     * @param {Function} [reverseFn] - Reverse transform.
     */
    linkTwoWay: (otherStore, key, transformFn, reverseFn) => {
      let locked = false;

      const updateFromOther = (val) => {
        if (locked) return;
        locked = true;
        const newVal = typeof transformFn === 'function' ? transformFn(val) : val;
        store.dispatch(`set-${key}`, newVal);
        locked = false;
      };

      const updateFromThis = (val) => {
        if (locked) return;
        locked = true;
        const newVal = typeof reverseFn === 'function' ? reverseFn(val) : val;
        otherStore.dispatch(`set-${key}`, newVal);
        locked = false;
      };

      otherStore.watch(key, updateFromOther);
      store.watch(key, updateFromThis);
    },

    /**
     * Performs scoped DOM binding for a specific container.
     * Useful for dynamically inserted components.
     * @param {Element} container - DOM element to scan for bindings.
     */
    bindAll: (container) => {
      const scoped = (selector) => container.querySelectorAll(selector);
      const allModels = new Set();

      scoped('[data-model]').forEach(el => {
        const path = el.dataset.model;
        if (!path) return;

        store.bind(path, `[data-model="${path}"]`);
        allModels.add(path);

        if (el.dataset.modelBound) return;
        el.dataset.modelBound = 'true';

        const eventType = el.tagName === 'SELECT' || el.tagName === 'INPUT' ? 'input' : 'change';

        el.addEventListener(eventType, () => {
          const value = el.value;
          const prevVal = getAtPath(state, path);
          if (prevVal !== value) {
            setAtPath(state, path, value);
            store.dispatch(`set-${path}`, value);
            if (el.dataset.sync === 'localStorage') {
              storageDriver.setItem(path, value);
            }
          }
        });

        if (el.dataset.sync === 'localStorage') {
          const saved = storageDriver.getItem(path);
          if (saved !== null) {
            store.dispatch(`set-${path}`, saved);
            el.value = saved;
          }
          store.watchPath(path, val => storageDriver.setItem(path, val));
        }
      });

      scoped('[data-bind]').forEach(el => {
        const path = el.dataset.bind;
        if (!path || allModels.has(path)) return;
        store.bind(path, `[data-bind="${path}"]`);
      });
    },

    /**
     * Links a nested path from another store to a flat key in this one.
     * @param {object} otherStore - Source store.
     * @param {string} fromPath - Dot path in source state.
     * @param {string} toKey - Key in this store to receive the value.
     * @param {Function} [transformFn] - Optional value transformer.
     */
    linkPath: (otherStore, fromPath, toKey, transformFn) => {
      otherStore.watchAll((next) => {
        const val = getAtPath(next, fromPath);
        if (val !== undefined) {
          const mapped = transformFn ? transformFn(val) : val;
          store.dispatch(`set-${toKey}`, mapped);
        }
      });
    },

    /**
     * Watches changes at a nested path in the state.
     * @param {string} path - Dot-separated key path.
     * @param {Function} fn - Callback with new value.
     */
    watchPath: (path, fn) => {
      let prev = structuredClone(getAtPath(state, path));
      return store.subscribe(() => {
        const next = getAtPath(state, path);
        const changed = typeof next === 'object' && next !== null
          ? JSON.stringify(next) !== JSON.stringify(prev)
          : next !== prev;
        if (changed) {
          prev = structuredClone(next);
          fn(next);
        }
      });
    }
  };

  /**
   * Renders a single DOM element's textContent based on store value and format.
   * Supports formatting (uppercase, currency, etc.) and prefix/suffix.
   * @param {HTMLElement} el - The element to update.
   * @param {string} key - Store key to render.
   */
  const renderBoundValue = (el, key) => {
    let val = state[key] ?? '';

    if (el.dataset.format === 'uppercase') val = String(val).toUpperCase();
    else if (el.dataset.format === 'lowercase') val = String(val).toLowerCase();
    else if (el.dataset.format === 'currency') val = `$${parseFloat(val).toFixed(2)}`;
    else if (el.dataset.format === 'percent') val = `${parseFloat(val) * 100}%`;
    else if (el.dataset.format === 'iso-date') val = new Date(val).toISOString();

    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';

    el.textContent = `${prefix}${val}${suffix}`;
  };

  /**
   * Updates all bound elements for a specific key.
   * @param {string} key - Store key whose bound DOM elements should update.
   */
  const updateBindings = (key) => {
    const elements = bindings.get(key);
    if (!elements) return;
    elements.forEach(el => renderBoundValue(el, key));
  };

  /**
   * Exposes the store globally as `window.{name}Store` and logs via `{name}State()`.
   */
  if (name) {
    window[`${name}Store`] = store;
    window[`${name}State`] = () => console.log(`🧠 ${name}Store snapshot`, store.getState());
  }

  /** @type {Object[]} */
  const __history = [structuredClone(state)];
  let __historyIndex = 0;

  /**
   * Saves a new snapshot in history, pruning forward stack.
   * Called internally after successful state-changing dispatch.
   */
  const pushHistory = () => {
    const snapshot = structuredClone(state);
    __history.splice(__historyIndex + 1);
    __history.push(snapshot);
    __historyIndex++;
  };

  /**
   * Replaces internal state with a past snapshot.
   * Triggers reactive updates.
   * @param {number} index - Index in the history stack.
   */
  const applyHistory = (index) => {
    if (index < 0 || index >= __history.length) return;
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, structuredClone(__history[index]));
    listeners.forEach(fn => fn({ type: 'history-jump', payload: state }));
    watchAllFns.forEach(fn => fn(state, state));
    if (typeof window.__storeDebugUpdate === 'function') window.__storeDebugUpdate();
  };

  /**
   * Undo the last state mutation, if available.
   * @returns {boolean} Whether undo was performed.
   */
  store.undo = () => {
    if (__historyIndex <= 0) return false;
    __historyIndex--;
    applyHistory(__historyIndex);
    return true;
  };

  /**
   * Redo a previously undone mutation, if available.
   * @returns {boolean} Whether redo was performed.
   */
  store.redo = () => {
    if (__historyIndex >= __history.length - 1) return false;
    __historyIndex++;
    applyHistory(__historyIndex);
    return true;
  };

  /** Dev helper: expose full history array */
  store.__getHistory = () => structuredClone(__history);

  /**
   * Jump to history index
   * @param {number} index
   */
  store.jumpTo = (index) => {
    if (typeof index === 'number' && index >= 0 && index < __history.length) {
      applyHistory(index);
      __historyIndex = index;
    }
  };
  pushHistory();

  // Hook into dispatch: push to history only if state mutated, with option to skip history pushes
  const originalDispatch = store.dispatch.bind(store);
  let refreshHistoryDropdown;
  store.dispatch = (type, payload, options = {}) => {
    const prev = structuredClone(state);
    originalDispatch(type, payload);

    const changed = JSON.stringify(prev) !== JSON.stringify(state);
    if (changed && !options.skipHistory) {
      pushHistory();
      if (typeof refreshHistoryDropdown === 'function') refreshHistoryDropdown();
    }
  };

  if (enableDevPanel && typeof window !== 'undefined') {
    const panel = document.createElement('div');
    panel.style = `
      position:fixed;bottom:14px;right:0;z-index:9999;
      font:12px monospace;max-width:600px;
      background:#fff;border:1px solid #ccc;box-shadow:0 0 4px rgba(0,0,0,.25);
      height:20px;
    `;
    panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;padding:4px 6px;background:#f5f5f5">
      <strong>🧠 Store </strong>
      <select class="form-select form-select-sm ms-auto" id="wfHistoryJump" style="width: auto;">
        <option value="0">State #0</option>
      </select>
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-sm btn-outline-secondary" id="wfUndo">◀</button>
        <button class="btn btn-sm btn-outline-secondary" id="wfRedo">▶</button>
        <button class="btn btn-sm btn-outline-secondary" id="wfToggleStore">Show</button>
      </div>
    </div>
    <div id="wfStoreControls" style="padding:4px 6px;display:flex;gap:4px">
      <button class="btn btn-sm btn-outline-primary" id="wfStoreRefresh">Refresh</button>
      <button class="btn btn-sm btn-outline-danger"  id="wfStoreClear">Clear</button>
    </div>
    <pre id="wfStoreDump" style="margin:0;padding:6px 6px 8px;height:140px;overflow:auto;display:none;"></pre>`;

    document.body.appendChild(panel);

    const $dump = document.getElementById('wfStoreDump');
    const $toggle = document.getElementById('wfToggleStore');
    const $refresh = document.getElementById('wfStoreRefresh');
    const $clear = document.getElementById('wfStoreClear');
    const $jump = document.getElementById('wfHistoryJump');
    refreshHistoryDropdown = () => {
      $jump.innerHTML = '';
      store.__getHistory().forEach((_, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `State #${i}`;
        if (i === __historyIndex) opt.selected = true;
        $jump.appendChild(opt);
      });
    };

    $jump.onchange = () => {
      const index = parseInt($jump.value);
      store.jumpTo(index);
      refreshHistoryDropdown();
    };
    let visible = false;

    const repaint = () => {
      $dump.textContent = JSON.stringify(store.getState(), null, 2);
    };
    window.__storeDebugUpdate = repaint;

    $refresh.onclick = repaint;
    $clear.onclick = () => {
      // Clear local/session storage if used
      for (const key of store.__syncKeys) {
        try {
          storageDriver.removeItem(key);
        } catch { }
      }

      // Reset state to initial snapshot
      Object.keys(state).forEach(k => delete state[k]);
      Object.assign(state, structuredClone(initialState));

      // Clear and reinit history
      __history.length = 0;
      __history.push(structuredClone(state));
      __historyIndex = 0;

      // Update all bound UI elements
      for (const key of Object.keys(state)) {
        updateBindings(key);
      }

      notify('devpanel-clear', structuredClone(state));
      repaint();
      refreshHistoryDropdown?.();
    };
    $toggle.onclick = () => {
      visible = !visible;
      panel.style.height = visible ? 'auto' : '20px';
      $dump.style.display = visible ? 'block' : 'none';
      $toggle.textContent = visible ? 'Hide' : 'Show';
    };

    const $undo = document.getElementById('wfUndo');
    const $redo = document.getElementById('wfRedo');
    if ($undo) $undo.onclick = () => store.undo();
    if ($redo) $redo.onclick = () => store.redo();

    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlKey && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) store.redo();
        else store.undo();
        e.preventDefault();
      }
    });

    repaint();
  }

  return store;
};
