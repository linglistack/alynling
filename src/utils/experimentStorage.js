// Utility for storing and managing experiments
// Using IndexedDB for better synchronization and larger storage capacity

const DB_NAME = 'alynling_experiments';
const DB_VERSION = 1;
const STORE_NAME = 'experiments';

// Initialize IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[ExperimentStorage] Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('status', 'status', { unique: false });
      }
    };
  });
};

// Generate unique ID for experiment
const generateId = () => {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Save experiment to IndexedDB
export const saveExperiment = async (experimentData) => {
  try {
    const db = await initDB();
    
    const experiment = {
      id: generateId(),
      name: experimentData.name || 'Untitled Experiment',
      type: 'Geo',
      outcome: experimentData.outcome || 'N/A',
      lastProcessed: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      startDate: experimentData.startDate || 'N/A',
      endDate: experimentData.endDate || 'N/A',
      status: experimentData.status || 'Markets Ready',
      statusType: experimentData.statusType || 'success',
      createdAt: Date.now(),
      
      // Store API and analysis info
      marketCombo: experimentData.marketCombo,
      analysisParams: experimentData.analysisParams,
      processedData: experimentData.processedData,
      geoDataReadResponse: experimentData.geoDataReadResponse,
      experimentCells: experimentData.experimentCells,
      userConfig: experimentData.userConfig
    };

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = objectStore.add(experiment);
      request.onsuccess = () => resolve(experiment);
      request.onerror = () => reject(request.error);
    });

    console.log('[ExperimentStorage] Experiment saved successfully:', experiment.id);
    return experiment;
  } catch (error) {
    console.error('[ExperimentStorage] Failed to save experiment:', error);
    throw error;
  }
};

// Load all experiments from IndexedDB
export const loadExperiments = async () => {
  try {
    const db = await initDB();
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const experiments = await new Promise((resolve, reject) => {
      const request = objectStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('[ExperimentStorage] Loaded experiments:', experiments.length);
    return experiments;
  } catch (error) {
    console.error('[ExperimentStorage] Failed to load experiments:', error);
    return [];
  }
};

// Load single experiment by ID
export const loadExperiment = async (id) => {
  try {
    const db = await initDB();
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    const experiment = await new Promise((resolve, reject) => {
      const request = objectStore.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log('[ExperimentStorage] Loaded experiment:', id);
    return experiment;
  } catch (error) {
    console.error('[ExperimentStorage] Failed to load experiment:', error);
    return null;
  }
};

// Update experiment
export const updateExperiment = async (id, updates) => {
  try {
    const db = await initDB();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    // Get existing experiment
    const existing = await new Promise((resolve, reject) => {
      const request = objectStore.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!existing) {
      throw new Error('Experiment not found');
    }

    // Update experiment
    const updated = { ...existing, ...updates, id }; // Preserve ID
    
    await new Promise((resolve, reject) => {
      const request = objectStore.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });

    console.log('[ExperimentStorage] Experiment updated:', id);
    return updated;
  } catch (error) {
    console.error('[ExperimentStorage] Failed to update experiment:', error);
    throw error;
  }
};

// Delete experiment
export const deleteExperiment = async (id) => {
  try {
    const db = await initDB();
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    
    await new Promise((resolve, reject) => {
      const request = objectStore.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[ExperimentStorage] Experiment deleted:', id);
  } catch (error) {
    console.error('[ExperimentStorage] Failed to delete experiment:', error);
    throw error;
  }
};

