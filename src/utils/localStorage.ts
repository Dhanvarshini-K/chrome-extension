export const setStorage = async (data: Record<string, any>): Promise<void> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};


export const getStorage = async (keys: string[]): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
};

export const removeFromStorage = (keys: string[] | string): Promise<void> => {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => resolve());
  });
};
