
export const storage = {
  get: async (key) => {
    const value = sessionStorage.getItem(key);
    if (!value) throw new Error('No data');
    return { value };
  },
  set: async (key, value) => {
    sessionStorage.setItem(key, value);
  },
  delete: async (key) => {
    sessionStorage.removeItem(key);
  }
};
window.storage = storage;
