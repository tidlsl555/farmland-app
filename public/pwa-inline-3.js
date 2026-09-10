(() => {
  'use strict';
  const STORAGE_KEY = 'farmland_map_manager_v3_excel';
  const DB_NAME = 'farmland_manager_pwa';
  const DB_VERSION = 1;
  const STORE_NAME = 'backups';
  const BACKUP_KEY = 'latest';
  let deferredInstallPrompt = null;
  let lastBackupJson = '';

  const byId = id => document.getElementById(id);
  const setText = (id, text) => { const el = byId(id); if (el) el.textContent = text; };

  function openDb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB 미지원'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, {keyPath:'key'});
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB 열기 실패'));
    });
  }

  async function writeBackup(data, reason='자동저장') {
    try {
      const json = JSON.stringify(data);
      if (!json || json === lastBackupJson) return;
      lastBackupJson = json;
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({key:BACKUP_KEY, savedAt:new Date().toISOString(), reason, json});
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      refreshBackupStatus();
    } catch (error) {
      setText('idbRestoreState', '이중백업 사용 불가');
      console.warn('PWA backup failed', error);
    }
  }

  async function readBackup() {
    const db = await openDb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(BACKUP_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return row;
  }

  async function refreshBackupStatus() {
    try {
      const row = await readBackup();
      if (!row) return setText('idbRestoreState', '아직 복구본 없음');
      const when = new Intl.DateTimeFormat('ko-KR', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(row.savedAt));
      setText('idbRestoreState', `${when} · 장치 복구본 있음`);
    } catch (_) {
      setText('idbRestoreState', '장치 복구본 확인 불가');
    }
  }

  async function restoreBackup() {
    try {
      const row = await readBackup();
      if (!row) return alert('장치 이중백업 복구본이 없습니다.');
      const parsed = JSON.parse(row.json);
      if (!parsed || !Array.isArray(parsed.parcels) || !Array.isArray(parsed.taskTypes)) throw new Error('복구본 형식 오류');
      if (!confirm(`장치 복구본(${new Date(row.savedAt).toLocaleString('ko-KR')})으로 되돌릴까요?\n현재 데이터는 덮어씁니다.`)) return;
      localStorage.setItem(STORAGE_KEY, row.json);
      location.reload();
    } catch (error) {
      alert(`복구하지 못했습니다: ${error.message || error}`);
    }
  }

  async function requestPersistentStorage() {
    if (!navigator.storage?.persist) return;
    try {
      const persisted = await navigator.storage.persisted();
      if (!persisted) await navigator.storage.persist();
    } catch (_) {}
  }

  function updateNetworkState() {
    const online = navigator.onLine !== false;
    setText('pwaNetworkState', online ? '온라인 · 지도 갱신 가능' : '오프라인 · 저장된 앱 기능 사용');
  }

  function updateInstallState() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone) setText('installPwaState', '설치됨 · 독립 실행 중');
    else if (deferredInstallPrompt) setText('installPwaState', '지금 홈 화면에 설치');
    else if (!/^https?:$/.test(location.protocol)) setText('installPwaState', 'HTTPS 배포 후 설치 가능');
    else setText('installPwaState', '브라우저 메뉴의 앱 설치 사용');
  }

  async function installPwa() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone) return alert('이미 설치형 앱으로 실행 중입니다.');
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateInstallState();
      return;
    }
    if (!/^https?:$/.test(location.protocol)) {
      alert('PWA 설치는 이 폴더를 HTTPS 서버에 올린 뒤 가능합니다. ZIP 안의 설치 안내를 따라 배포하세요.');
      return;
    }
    alert('Chrome 또는 삼성 인터넷 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택하세요.');
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    try {
      let updateReloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateReloaded) return;
        updateReloaded = true;
        location.reload();
      });
      const registration = await navigator.serviceWorker.register('./sw.js', {scope:'./'});
      registration.update().catch(() => {});
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            setText('pwaNetworkState', '새 버전 적용 중…');
          }
        });
      });
    } catch (error) {
      console.warn('service worker registration failed', error);
    }
  }

  globalThis.farmlandPwaBackup = writeBackup;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallState();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallState();
  });
  window.addEventListener('online', updateNetworkState);
  window.addEventListener('offline', updateNetworkState);

  byId('installPwaBtn')?.addEventListener('click', installPwa);
  byId('idbRestoreBtn')?.addEventListener('click', restoreBackup);

  requestPersistentStorage();
  registerServiceWorker();
  updateNetworkState();
  updateInstallState();
  refreshBackupStatus();

  // 앱의 localStorage 상태를 장치 DB에 주기적으로 이중화합니다.
  const mirrorCurrentState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.parcels)) writeBackup(parsed, '주기적 이중백업');
    } catch (_) {}
  };
  setTimeout(mirrorCurrentState, 1200);
  setInterval(mirrorCurrentState, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') mirrorCurrentState(); });
})();
