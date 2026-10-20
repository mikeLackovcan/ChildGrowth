import storage from '@react-native-async-storage/async-storage';

// Keep the internal Quest Hero prefix so existing Quest Champ installations migrate safely.
// Prefix every local key so accounts and child progress never cross projects.
const prefix = 'quest-hero-dab6b:';

const projectStorage = {
  getItem: (key: string) => storage.getItem(prefix + key),
  setItem: (key: string, value: string) => storage.setItem(prefix + key, value),
  removeItem: (key: string) => storage.removeItem(prefix + key),
  clear: async () => {
    const keys = (await storage.getAllKeys()).filter(key => key.startsWith(prefix));
    if (keys.length > 0) await storage.multiRemove(keys);
  },
};

export default projectStorage;
