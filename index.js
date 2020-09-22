export default function DataStore() {
	this.changeListeners = [];
	this.data = {};

	this.db = null;
}

DataStore.prototype.init = function() {
	let request = indexedDB.open('db');

	request.onerror = function(event) {
		console.log('error: ');
	};

	request.onsuccess = function(event) {
		this.db = request.result;
		console.log('success: ' + this.db);
	};

	request.onupgradeneeded = function(event) {
		this.db = event.target.result;
		console.log('upgrade: ' + this.db);
		let objectStore = this.db.createObjectStore('store');
	};

	return new Promise((resolve, reject) => {
		(function waitForDB() {
			if (this.db) {
				console.log('db ready');
				return resolve();
			}
			setTimeout(() => {
				waitForDB();
			}, 30);
		})();
	});
};

DataStore.prototype.subscribe = function(callback, key = '') {
	if (!this.changeListeners.find(listener => listener.key === key))
		this.changeListeners.push({ key: key, callbacks: [] });
	this.changeListeners.find(listener => listener.key === key).callbacks.push(callback);

  return () => {
    this.unsubscribe(key, callback);
  }
};

DataStore.prototype.unsubscribe = function(key, remove) {
	let changeListener = this.changeListeners.find(listener => listener.key === key);
	if (changeListener) {
		changeListener.callbacks = changeListener.callbacks.filter(callback => callback != remove);
	}
};

DataStore.prototype.set = function(key, value, save = false, store = 'store') {
	this.data[key] = value;

  if (save) {
    let objectStore = this.db.transaction(store, 'readwrite').objectStore(store);
    objectStore.put(value, key);
  }

  let changeListener = this.changeListeners.find(listener => listener.key === key);
	if (changeListener) {
		changeListener.callbacks.forEach(callback => callback(value, key));
	}

  let keylessListener = this.changeListeners.find(listener => listener.key === '');
  if (keylessListener) {
    keylessListener.callbacks.forEach(callback => callback(value, key));
  }
};

DataStore.prototype.get = function(key) {
	return this.data[key];
};

DataStore.prototype.save = function(store = 'store') {
  let objectStore = this.db.transaction(store, 'readwrite').objectStore(store);
	for (let [key, value] of Object.entries(this.data)) {
		console.log(`save: ${key}: ${value}`);
    objectStore.put(value, key);
	}
};

DataStore.prototype.load = function(store = 'store') {
	let objectStore = this.db.transaction(store).objectStore(store);
	objectStore.openCursor().onsuccess = function(event) {
		let cursor = event.target.result;
		if (cursor) {
			this.data[cursor.key] = cursor.value;
			cursor.continue();
		} else {
			console.log('Got all data', this.data);
		}
	};
};
