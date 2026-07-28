/** Shared runtime helpers for the Travel Companion. */
window.IVTC = window.IVTC || {};
window.IVTC.runtime = Object.freeze({
  root: document.documentElement.dataset.root || '.',
  resolve(path) { return `${this.root}${path}`; },
  async json(name) {
    const response = await fetch(this.resolve(`/data/${name}`));
    if (!response.ok) throw new Error(`Unable to load ${name}: ${response.status}`);
    return response.json();
  },
  emit(name, detail = {}) { document.dispatchEvent(new CustomEvent(`ivtc:${name}`, { detail })); }
});
