(() => {
  'use strict';

  // content:// 미리보기에서 localStorage가 차단되어도 앱이 중단되지 않도록 메모리 저장소로 대체합니다.
  const memoryStorage = Object.create(null);
  const safeStorage = {
    getItem(key) {
      try { return window.localStorage.getItem(key); }
      catch (_) { return Object.prototype.hasOwnProperty.call(memoryStorage, key) ? memoryStorage[key] : null; }
    },
    setItem(key, value) {
      const text = String(value);
      memoryStorage[key] = text;
      try { window.localStorage.setItem(key, text); } catch (_) {}
      if (key === 'farmland_map_manager_v3_excel') {
        queueMicrotask(() => { try { globalThis.farmlandServerSave?.('상태 변경'); } catch (_) {} });
      }
    },
    removeItem(key) {
      delete memoryStorage[key];
      try { window.localStorage.removeItem(key); } catch (_) {}
    }
  };

  const SNAPSHOT_KEY = 'farmland_map_manager_snapshots_v1';
  const SNAPSHOT_LIMIT = 6;
  let lastSnapshotAt = 0;
  let persistentStorageAvailable = false;
  try {
    const testKey='__farmland_storage_test__';
    window.localStorage.setItem(testKey,'1');
    persistentStorageAvailable = window.localStorage.getItem(testKey)==='1';
    window.localStorage.removeItem(testKey);
  } catch (_) { persistentStorageAvailable = false; }

  function readSnapshots() {
    try {
      const parsed=JSON.parse(safeStorage.getItem(SNAPSHOT_KEY)||'[]');
      return Array.isArray(parsed)?parsed:[];
    } catch (_) { return []; }
  }
  function writeSnapshot(data, reason='자동저장', force=false) {
    const now=Date.now();
    if (!force && now-lastSnapshotAt < 30000) return;
    lastSnapshotAt=now;
    try {
      const snapshots=readSnapshots();
      snapshots.unshift({createdAt:new Date(now).toISOString(),reason,data:JSON.stringify(data)});
      safeStorage.setItem(SNAPSHOT_KEY,JSON.stringify(snapshots.slice(0,SNAPSHOT_LIMIT)));
    } catch (_) {}
  }
  function latestValidSnapshot() {
    for (const snap of readSnapshots()) {
      try {
        const parsed=JSON.parse(snap.data);
        if (parsed && Array.isArray(parsed.parcels) && Array.isArray(parsed.taskTypes)) return {snap,data:parsed};
      } catch (_) {}
    }
    return null;
  }

  const STORAGE_KEY = 'farmland_map_manager_v3_excel';
  const LEGACY_STORAGE_KEY = 'farmland_map_manager_v2';
  const SEED_VERSION = '2026-07-20-task-menu-clean-2';
  const APP_BUILD = '2026-07-20-pwa-production-1';
  const appRuntimeErrors = [];
  window.addEventListener('error', e => { appRuntimeErrors.push(String(e.message||'알 수 없는 오류')); setTimeout(()=>showAppError(appRuntimeErrors.at(-1)),0); });
  window.addEventListener('unhandledrejection', e => { appRuntimeErrors.push(String(e.reason?.message||e.reason||'비동기 오류')); setTimeout(()=>showAppError(appRuntimeErrors.at(-1)),0); });
  const seededParcels = [{"id":"excel-e072fff38c9f","number":"1","name":"금남정자 왼","address":"금남리 160","area":"761","owner":"이승우","course":"금남","variety":"미소진품","navName":"금남정자 왼","navUrl":"https://naver.me/Gi0pH74o","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7743bf4076b6","number":"2","name":"정자왼왼","address":"금남리 124","area":"1527","owner":"이승우","course":"금남","variety":"미소진품","navName":"정자왼왼","navUrl":"https://naver.me/GRDofnwg","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-eec2b9aade3b","number":"3","name":"금남리 축사 앞","address":"읍부리 346-2","area":"1125","owner":"조규판","course":"금남","variety":"미소진품","navName":"금남리 축사 앞","navUrl":"https://naver.me/FetXes5l","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-e7ce3169d655","number":"4","name":"무이리 축사위","address":"무이리 389-2","area":"2049","owner":"김영기","course":"금남","variety":"미소진품","navName":"무이리 축사위","navUrl":"https://naver.me/xM5jbZuo","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-0a42febb9bdc","number":"5","name":"무이리가는 길","address":"무이리 360-1","area":"2526","owner":"설동하님","course":"금남","variety":"미소진품","navName":"무이리가는 길","navUrl":"https://naver.me/FuNzWKmy","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-c4bd5315dd53","number":"5","name":"무이리가는 길","address":"무이리 360-2","area":"","owner":"설동하님","course":"금남","variety":"","navName":"무이리가는 길","navUrl":"https://naver.me/FuNzWKmy","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-355c982778b8","number":"6","name":"냇가 옆 논 위","address":"무이리 354-1","area":"797","owner":"설동하님","course":"금남","variety":"미소진품","navName":"냇가 옆 논 위","navUrl":"https://naver.me/5zU5v6dK","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-25490bdf738b","number":"7","name":"냇가 옆","address":"무이리 355","area":"1758","owner":"설동하님","course":"금남","variety":"미소진품","navName":"냇가 옆","navUrl":"https://naver.me/x2Yj2qZH","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-280a3c90388a","number":"7","name":"냇가 옆","address":"무이리 356","area":"","owner":"설동하님","course":"금남","variety":"","navName":"냇가 옆","navUrl":"https://naver.me/x2Yj2qZH","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-65a0166373d5","number":"8","name":"5거리 1","address":"금남리 10","area":"3762","owner":"설동하님","course":"금남","variety":"미소진품","navName":"5거리 1","navUrl":"https://naver.me/GXFA07eA","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-cfd41739bde1","number":"9","name":"삼거리 옆","address":"왕태리 169","area":"1125","owner":"무이리우사","course":"금남","variety":"미소진품","navName":"삼거리 옆","navUrl":"https://naver.me/GhwbPH7G","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7211ec801355","number":"10","name":"병민 하우스 뒤","address":"금남리 172","area":"2041","owner":"설동하님","course":"금남","variety":"미소진품","navName":"병민 하우스 뒤","navUrl":"https://naver.me/xy7TuC9a","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-8ea74e882cad","number":"11","name":"병민 하우스 뒤","address":"금남리 171","area":"1725","owner":"자 경","course":"금남","variety":"미소진품","navName":"병민 하우스 뒤","navUrl":"https://naver.me/xG0Ib4LR","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7c9ac896e271","number":"12","name":"치내","address":"읍부리 43","area":"5968","owner":"자 경","course":"금남","variety":"미소진품","navName":"치내","navUrl":"https://naver.me/5g4F3k2u","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-5b46fd6daf47","number":"13","name":"치내 강건너","address":"산택리 229-1","area":"2686","owner":"김수용","course":"금남","variety":"미소진품","navName":"치내 강건너","navUrl":"https://naver.me/Ffse0DPp","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-ac5d504afebe","number":"14","name":"큰도로 옆","address":"무지리 271-7","area":"1386","owner":"김수용","course":"금남산택","variety":"백옥찰벼","navName":"큰도로 옆","navUrl":"https://naver.me/GB3F0xCO","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-8760f7685128","number":"15","name":"큰도로 옆","address":"무지리 271-8","area":"735","owner":"김수용","course":"금남산택","variety":"백옥찰벼","navName":"큰도로 옆","navUrl":"https://naver.me/5t7Jh9T9","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-a7f19f3d64c2","number":"16","name":"산택동네","address":"산택리 39-2","area":"813","owner":"김수용","course":"금남산택","variety":"백옥찰벼","navName":"산택동네","navUrl":"https://naver.me/GkIRpj2A","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-5c2a0b5b015c","number":"17","name":"월오리동네 뒤","address":"월오리 1035","area":"1909","owner":"김수용","course":"","variety":"","navName":"월오리동네 뒤","navUrl":"https://naver.me/xAfF3Dkk","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-dd02f8ec6238","number":"18","name":"월오리동네 뒤","address":"월오리 1039","area":"2598","owner":"김수용","course":"","variety":"","navName":"월오리동네 뒤","navUrl":"https://naver.me/FSvwQcFM","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-2ddd1391343b","number":"19","name":"월오리동네 뒤","address":"월오리 1039-1","area":"1748","owner":"김수용","course":"","variety":"","navName":"월오리동네 뒤","navUrl":"https://naver.me/xAfF3DdY","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-4c52ebd13da2","number":"20","name":"월오리동네 뒤","address":"월오리 1043","area":"1449","owner":"김수용","course":"","variety":"","navName":"월오리동네 뒤","navUrl":"https://naver.me/FLEyDwDx","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-8a6322cc25a7","number":"21","name":"금 남","address":"읍부리 100-1","area":"2539","owner":"김수용","course":"금남","variety":"","navName":"금 남","navUrl":"https://naver.me/FCZALJvj","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-cfa7c934a00b","number":"22","name":"오리장뒷편","address":"덕계리 331-1","area":"3213","owner":"자 경","course":"","variety":"","navName":"오리장뒷편","navUrl":"https://naver.me/GB3F0dn8","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-2aa6a16fceb0","number":"23","name":"모노골","address":"월오리 834-1","area":"2747","owner":"자 경","course":"","variety":"","navName":"모노골","navUrl":"https://naver.me/FtoTYWRh","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-007c2b0383e5","number":"24","name":"모노골","address":"월오리 832-1","area":"1921","owner":"자 경","course":"","variety":"","navName":"모노골","navUrl":"https://naver.me/FtoTYWRh","lat":null,"lng":null,"memo":"✔","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-cc661bfaccc7","number":"25","name":"돼지집","address":"월오리 506-2","area":"3574","owner":"자 경","course":"","variety":"","navName":"돼지집","navUrl":"https://naver.me/xJcitQCG","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-fedfcd4c82b8","number":"26","name":"장평고개","address":"월오리 680","area":"1957","owner":"자 경","course":"장평","variety":"","navName":"장평고개","navUrl":"https://naver.me/GrgmM1CZ","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-f65941cfcf05","number":"27","name":"장평","address":"월오리 370-1","area":"3052","owner":"자 경","course":"장평","variety":"","navName":"장평","navUrl":"https://naver.me/FaefZTRd","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-c5c21ff88de2","number":"28","name":"적지1","address":"월오리 769","area":"2295","owner":"자 경","course":"적지","variety":"","navName":"적지1","navUrl":"https://naver.me/xPY8QR0i","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-3845858f0a64","number":"28","name":"적지1","address":"월오리 769-1","area":"5437","owner":"자 경","course":"적지","variety":"","navName":"적지1","navUrl":"https://naver.me/xPY8QR0i","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-9d4ddfb04953","number":"29","name":"적지2","address":"월오리 769-2","area":"2847","owner":"월오리","course":"적지","variety":"","navName":"적지2","navUrl":"https://naver.me/FHOl7DOQ","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-2ade16a641f9","number":"30","name":"적지3","address":"월오리 770-4","area":"2277","owner":"자 경","course":"적지","variety":"진상미","navName":"적지3","navUrl":"https://naver.me/5Gcpzv42","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-d83921e86dfd","number":"30","name":"적지3","address":"월오리 770-5","area":"777","owner":"자 경","course":"적지","variety":"진상미","navName":"적지3","navUrl":"https://naver.me/5Gcpzv42","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-6e9d21f06e37","number":"31","name":"적지4","address":"월오리 770-2","area":"1365","owner":"자 경","course":"적지","variety":"","navName":"적지4","navUrl":"https://naver.me/GzdE2wC4","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-ced8d57c512d","number":"31","name":"적지4","address":"월오리 770-3","area":"3149","owner":"자 경","course":"적지","variety":"","navName":"적지4","navUrl":"https://naver.me/GzdE2wC4","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-a969f80aaa56","number":"32","name":"달문에","address":"월오리 787","area":"3583","owner":"자경","course":"","variety":"","navName":"달문에","navUrl":"https://naver.me/Fka7PsFm","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-4414709be421","number":"32","name":"달문에","address":"월오리 787-1","area":"3804","owner":"자경","course":"","variety":"","navName":"달문에","navUrl":"https://naver.me/xaT5CUSU","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-afcb82e27a17","number":"32","name":"달문에","address":"월오리 787-2","area":"1182","owner":"자경","course":"","variety":"","navName":"달문에","navUrl":"https://naver.me/xaT5CUSU","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-da2d31e17a91","number":"33","name":"월오동네앞","address":"월오리 552","area":"2822","owner":"자경","course":"","variety":"","navName":"월오동네앞","navUrl":"https://naver.me/FyA2KRSq","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-b8256b64ebec","number":"34","name":"상위 산","address":"위만리 182","area":"3593","owner":"자경","course":"","variety":"","navName":"상위 산","navUrl":"https://naver.me/5l276aqv","lat":null,"lng":null,"memo":"✔","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-5525ce456c3e","number":"35","name":"객들 육모장1","address":"월오리 729","area":"1667","owner":"자경","course":"육묘장","variety":"","navName":"객들 육모장1","navUrl":"https://naver.me/GrgmMUD5","lat":null,"lng":null,"memo":"✔","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-cb451408aeba","number":"36","name":"송암동네뒤","address":"송암리 225","area":"4631","owner":"자경","course":"육묘장","variety":"","navName":"송암동네뒤","navUrl":"https://naver.me/xoGHLOGX","lat":null,"lng":null,"memo":"✔","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7b7c368f857f","number":"37","name":"공디기","address":"월오리 601","area":"3622","owner":"자경","course":"","variety":"","navName":"공디기","navUrl":"https://naver.me/5c8hDC30","lat":null,"lng":null,"memo":"✔","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-5b70227f6370","number":"38","name":"모노골","address":"월오리 897","area":"2635","owner":"엄창용","course":"","variety":"","navName":"모노골","navUrl":"https://naver.me/5FDmlK88","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7c557f023972","number":"39","name":"철길넘어(객들)","address":"월오리 1000-6","area":"1227","owner":"엄재빈","course":"철길건너","variety":"미소진품","navName":"철길넘어(객들)","navUrl":"https://naver.me/5YoFvG0C","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-ee7a3b179055","number":"39","name":"철길넘어(객들)","address":"월오리 1000-7","area":"2096","owner":"엄재빈","course":"철길건너","variety":"미소진품","navName":"철길넘어(객들)","navUrl":"https://naver.me/5YoFvG0C","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-843ff171411a","number":"40","name":"객들 비포장","address":"월오리 528-1","area":"2670","owner":"김용중","course":"철길객들","variety":"","navName":"객들 비포장","navUrl":"https://naver.me/5UVEdBJW","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-e536f274a6ed","number":"41","name":"안객들","address":"월오리 993-5","area":"3831","owner":"안태식","course":"철길객들","variety":"","navName":"안객들","navUrl":"https://naver.me/GLh8uIZV","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7fb79051e754","number":"42","name":"달문에고개","address":"월오리 869","area":"2875","owner":"엄길용","course":"","variety":"백옥찰벼","navName":"달문에고개","navUrl":"https://naver.me/xdMpVC9r","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-893be117db44","number":"43","name":"달문에고개","address":"월오리 871","area":"3139","owner":"녹문택","course":"","variety":"백옥찰벼","navName":"달문에고개","navUrl":"https://naver.me/GdTy62j6","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-ca9725867e51","number":"44","name":"달계","address":"덕계리 249-1","area":"2386","owner":"엄용흡(점촌)","course":"","variety":"","navName":"달계","navUrl":"https://naver.me/52aRMFQ1","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-2ad8c64e82e2","number":"44","name":"달계","address":"덕계리 249-2","area":"1364","owner":"엄용흡(점촌)","course":"","variety":"","navName":"달계","navUrl":"https://naver.me/52aRMFQ1","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-d272fc313a41","number":"45","name":"방터 월오다리","address":"월오리 145-11","area":"4101","owner":"엄정부","course":"","variety":"","navName":"방터 월오다리","navUrl":"https://naver.me/FetXeots","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-7123543c8fbf","number":"46","name":"객들 육모장2","address":"월오리 765","area":"1773","owner":"엄정부","course":"육묘장","variety":"","navName":"객들 육모장2","navUrl":"https://naver.me/xeFAU0U1","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-470c3555150e","number":"47","name":"형천입구","address":"형천리 493","area":"1334","owner":"문종","course":"","variety":"","navName":"형천입구","navUrl":"https://naver.me/GwfpDLFg","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-4586f0dc917b","number":"48","name":"상위 전봇대","address":"위만리 268","area":"1419","owner":"문종","course":"","variety":"","navName":"상위 전봇대","navUrl":"https://naver.me/F1arL5bW","lat":null,"lng":null,"memo":"✔","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-ee91cc031b99","number":"49","name":"의산학교","address":"위만리 62","area":"3318","owner":"이홍배","course":"","variety":"","navName":"의산학교","navUrl":"https://naver.me/FetXewa5","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-e4c351b3e5c2","number":"50","name":"감실","address":"우본리 53","area":"3094","owner":"엄길용","course":"감실코스","variety":"백옥찰벼","navName":"감실","navUrl":"https://naver.me/GXFA0x32","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-258f41a588a4","number":"51","name":"감실","address":"우본리 82","area":"2241","owner":"엄길용","course":"감실코스","variety":"백옥찰벼","navName":"감실","navUrl":"https://naver.me/5K6b8vGM","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-8c61f2c0b310","number":"52","name":"감실","address":"우본리 83","area":"1180","owner":"엄길용","course":"감실코스","variety":"백옥찰벼","navName":"감실","navUrl":"https://naver.me/x4lFaRe0","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-fb943cc113e5","number":"53","name":"감실","address":"우본리 93-3","area":"456","owner":"엄길용","course":"감실코스","variety":"백옥찰벼","navName":"감실","navUrl":"https://naver.me/FNt7ukbJ","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-cebfb10d6ba5","number":"54","name":"감실","address":"우본리 10","area":"3448","owner":"엄수경","course":"감실코스","variety":"","navName":"감실","navUrl":"https://naver.me/FM9cwqpp","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-dfc9781f8369","number":"55","name":"웃그렁","address":"형천리 502-1","area":"1764","owner":"엄수경","course":"","variety":"","navName":"웃그렁","navUrl":"https://naver.me/FBMeQMCp","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-b333b6d7b0b6","number":"56","name":"객들 큰집","address":"월오리 641","area":"3124","owner":"엄수경","course":"철길객들","variety":"","navName":"객들 큰집","navUrl":"https://naver.me/FUihGiTl","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-e3fb1367d35d","number":"57","name":"웃그렁","address":"형천리 505","area":"2786","owner":"엄정부","course":"","variety":"","navName":"웃그렁","navUrl":"https://naver.me/551rn1Kp","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-0815a7517d93","number":"58","name":"모노골(덕계)1","address":"덕계리 704","area":"2307","owner":"엄태흡","course":"","variety":"","navName":"모노골(덕계)1","navUrl":"https://naver.me/5UVEdVSL","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-853dbeef1563","number":"59","name":"모노골(덕계)2","address":"덕계리 706","area":"1058","owner":"박석순","course":"","variety":"","navName":"모노골(덕계)2","navUrl":"https://naver.me/xONxvNho","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-eb8bf49ca24e","number":"59","name":"모노골(덕계)2","address":"덕계리 702","area":"4182","owner":"박석순","course":"","variety":"","navName":"모노골(덕계)2","navUrl":"https://naver.me/xONxvNho","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-f6892a6ac242","number":"60","name":"모노골(덕계)3","address":"덕계리 725","area":"1579","owner":"엄정부","course":"","variety":"","navName":"모노골(덕계)3","navUrl":"https://naver.me/FEgUrgdY","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-65647a7ca1a1","number":"61","name":"분토동네앞","address":"송암리 88-1","area":"1296","owner":"엄재구(문중)","course":"분토","variety":"","navName":"분토동네앞","navUrl":"https://naver.me/FvTEWTGW","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-dde8be64d053","number":"62","name":"방간고개 육모장뒤","address":"송암리 219-1","area":"2010","owner":"채순자","course":"육묘장","variety":"백옥찰벼","navName":"방간고개 육모장뒤","navUrl":"https://naver.me/Fri7v0wG","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-f8ffc520bcf7","number":"63","name":"동네앞","address":"송암리 30","area":"2300","owner":"엄도영","course":"","variety":"","navName":"동네앞","navUrl":"https://naver.me/Gqf819hg","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-4534fcf96a94","number":"64","name":"모산","address":"월오리 308","area":"3185","owner":"이복희","course":"장평","variety":"","navName":"모산","navUrl":"https://naver.me/xM5jbne7","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-b190f5feb70f","number":"65","name":"집뒤","address":"덕계리 276-1","area":"2657","owner":"이복희","course":"","variety":"","navName":"집뒤","navUrl":"https://naver.me/GNJWBREt","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-3c4d07290579","number":"66","name":"육묘장아래","address":"송암리 85-1","area":"2326","owner":"김영옥","course":"","variety":"백옥찰벼","navName":"육묘장아래","navUrl":"https://naver.me/5GcpzGe8","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-f88171ba8d68","number":"66","name":"육묘장아래","address":"송암리 78","area":"2588","owner":"김영옥","course":"","variety":"백옥찰벼","navName":"육묘장아래","navUrl":"https://naver.me/5GcpzGe8","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-2e677bec3252","number":"67","name":"우사아래","address":"송암리 87","area":"1020","owner":"김영옥","course":"육묘장","variety":"미소진품","navName":"우사아래","navUrl":"https://naver.me/FsoRhRQ3","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-12de1ed65082","number":"67","name":"우사아래","address":"송암리 87-1","area":"1347","owner":"김영옥","course":"육묘장","variety":"미소진품","navName":"우사아래","navUrl":"https://naver.me/FsoRhRQ3","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-58bd7b3dacd3","number":"68","name":"장평동네앞","address":"월오리 523-2","area":"1465","owner":"경암아지매","course":"장평","variety":"","navName":"장평동네앞","navUrl":"https://naver.me/FuNzWz2p","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"},{"id":"excel-65cb22e9665a","number":"69","name":"태익","address":"덕계리 195","area":"4172","owner":"양승대","course":"","variety":"","navName":"태익","navUrl":"","lat":null,"lng":null,"memo":"","works":{},"source":"경작지.xlsx","createdAt":"2026-07-17T00:00:00.000Z","updatedAt":"2026-07-17T00:00:00.000Z"}];
  const uid = () => (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
    ? globalThis.crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  const TASK_COLOR_PALETTE = ['#28733d','#2563a8','#d68b12','#b83b36','#7c3aed','#0891b2','#be185d','#4b5563','#65a30d','#ea580c'];
  const defaultTasks = [
    { id: uid(), name: '논삶기', detailEnabled: true, color: TASK_COLOR_PALETTE[0] },
    { id: uid(), name: '모내기', detailEnabled: true, color: TASK_COLOR_PALETTE[1] },
    { id: uid(), name: '물관리', detailEnabled: true, color: TASK_COLOR_PALETTE[2] },
    { id: uid(), name: '비료', detailEnabled: true, color: TASK_COLOR_PALETTE[3] },
    { id: uid(), name: '제초', detailEnabled: true, color: TASK_COLOR_PALETTE[4] },
    { id: uid(), name: '골뱅이 투입', detailEnabled: true, color: TASK_COLOR_PALETTE[5] },
    { id: uid(), name: '병해충 방제', detailEnabled: true, color: TASK_COLOR_PALETTE[6] },
    { id: uid(), name: '수확', detailEnabled: true, color: TASK_COLOR_PALETTE[7] }
  ];

  function validHexColor(value) { return /^#[0-9a-f]{6}$/i.test(String(value || '')); }
  function normalizeTaskColors(tasks) {
    (Array.isArray(tasks) ? tasks : []).forEach((task, index) => {
      if (!validHexColor(task.color)) task.color = TASK_COLOR_PALETTE[index % TASK_COLOR_PALETTE.length];
    });
    return tasks;
  }
  function taskColor(task) { return validHexColor(task?.color) ? task.color : '#28733d'; }
  function taskContrast(taskOrColor) {
    const hex = typeof taskOrColor === 'string' ? taskOrColor : taskColor(taskOrColor);
    const value = hex.replace('#','');
    const r = parseInt(value.slice(0,2),16), g = parseInt(value.slice(2,4),16), b = parseInt(value.slice(4,6),16);
    return ((r*299 + g*587 + b*114) / 1000) > 155 ? '#172017' : '#ffffff';
  }

  const FALLBACK_VILLAGE_CENTERS = {
    '금남리': [36.5978, 128.2789],
    '읍부리': [36.6077, 128.2773],
    '무이리': [36.5907, 128.2891],
    '왕태리': [36.5930, 128.2690],
    '산택리': [36.6001, 128.2951],
    '무지리': [36.6072, 128.3168],
    '월오리': [36.6225, 128.3090],
    '덕계리': [36.6450, 128.3170],
    '송암리': [36.6305, 128.2960],
    '위만리': [36.6375, 128.3008],
    '형천리': [36.6450, 128.2848],
    '우본리': [36.6250, 128.2785]
  };

  let state = loadState();
  globalThis.farmlandAppBridge = {
    getState: () => structuredClone(state),
    applyRemoteState(remoteState) {
      if (!remoteState || !Array.isArray(remoteState.parcels) || !Array.isArray(remoteState.taskTypes)) return;
      state = structuredClone(remoteState);
      assignEmbeddedMapLocations(state);
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
      updateRecoveryStatus();
    }
  };
  let selectedParcelId = null;
  let addMode = false;
  let placeModeParcelId = null;
  let pendingLatLng = null;
  let selectedWaterHours = 48;
  let waterPinSelectedId = null;
  let pestDashboardTaskId = 'all';
  let pestDashboardStatus = 'all';
  const markers = new Map();
  const boundaryLayers = new Map();

  const map = L.map('map', { zoomControl: false, preferCanvas: true }).setView([36.6205, 128.2975], 12);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  const MAP_TYPE_KEY = 'farmland_map_type_v1';
  const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    updateWhenIdle: false,
    keepBuffer: 4,
    attribution: '&copy; OpenStreetMap contributors'
  });
  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxNativeZoom: 19,
    maxZoom: 20,
    updateWhenIdle: false,
    keepBuffer: 4,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
  });
  let currentMapType = (() => {
    try { return safeStorage.getItem(MAP_TYPE_KEY) === 'satellite' ? 'satellite' : 'street'; }
    catch (_) { return 'street'; }
  })();
  (currentMapType === 'satellite' ? satelliteLayer : streetLayer).addTo(map);

  function syncMapTypeButton() {
    const btn = document.getElementById('mapTypeBtn');
    const label = document.getElementById('mapTypeLabel');
    const icon = document.getElementById('mapTypeIcon');
    if (!btn || !label || !icon) return;
    const satelliteOn = currentMapType === 'satellite';
    btn.classList.toggle('satellite-on', satelliteOn);
    btn.setAttribute('aria-pressed', satelliteOn ? 'true' : 'false');
    btn.title = satelliteOn ? '일반지도로 변경' : '위성지도로 변경';
    label.textContent = satelliteOn ? '일반' : '위성';
    icon.textContent = satelliteOn ? '▤' : '▧';
  }

  function setMapType(type) {
    const next = type === 'satellite' ? 'satellite' : 'street';
    if (map.hasLayer(streetLayer)) map.removeLayer(streetLayer);
    if (map.hasLayer(satelliteLayer)) map.removeLayer(satelliteLayer);
    (next === 'satellite' ? satelliteLayer : streetLayer).addTo(map);
    currentMapType = next;
    try { safeStorage.setItem(MAP_TYPE_KEY, currentMapType); } catch (_) {}
    syncMapTypeButton();
    setTimeout(refreshMapSize, 40);
  }

  function toggleMapType() {
    setMapType(currentMapType === 'satellite' ? 'street' : 'satellite');
  }

  // 모바일 브라우저의 주소창 높이 변화와 content:// 미리보기 크기 계산 오류를 보정합니다.
  let mapResizeTimer = null;
  function refreshMapSize() {
    clearTimeout(mapResizeTimer);
    mapResizeTimer = setTimeout(() => map.invalidateSize({ pan: false, debounceMoveend: true }), 30);
  }
  [80, 250, 700, 1500].forEach(ms => setTimeout(refreshMapSize, ms));
  window.addEventListener('load', refreshMapSize, { passive: true });
  window.addEventListener('resize', refreshMapSize, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(refreshMapSize, 250), { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', refreshMapSize, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMapSize(); });
  if (window.ResizeObserver) new ResizeObserver(refreshMapSize).observe(document.getElementById('map'));
  map.whenReady(refreshMapSize);

  const els = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
  syncMapTypeButton();

  function canonicalLotAddress(value) {
    const raw = String(value || '').replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
    const match = raw.match(/([가-힣]+리)\s*(\d+(?:-\d+)?)/);
    return match ? `${match[1]}${match[2]}` : raw.replace(/\s+/g, '');
  }
  function parcelKey(p) {
    return `${String(p.number || '').trim()}|${canonicalLotAddress(p.address)}`;
  }
  function hasLocation(p) {
    if (p?.lat === null || p?.lat === undefined || p?.lat === '' ||
        p?.lng === null || p?.lng === undefined || p?.lng === '') return false;
    const lat = Number(p.lat), lng = Number(p.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) &&
      Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
      !(lat === 0 && lng === 0);
  }

  function isVerifiedLocation(p) {
    if (!hasLocation(p)) return false;
    const source = String(p.locationSource || '');
    if (source === 'manual' || source === 'excel') return true;
    if (source === 'naver-auto') return Number(p.locationConfidence || 100) >= 90;
    if (source === 'address-auto') {
      return Number(p.locationConfidence || 0) >= 88 && String(p.locationMatchLevel || '') === 'parcel';
    }
    return false;
  }

  function isApproximateLocation(p) {
    return hasLocation(p) && !isVerifiedLocation(p);
  }

  function locationVerificationTargets() {
    return state.parcels.filter(p => !isVerifiedLocation(p));
  }

  const RI_ADMIN = {
    '금남리':'경상북도 예천군 용궁면', '읍부리':'경상북도 예천군 용궁면',
    '무이리':'경상북도 예천군 용궁면', '무지리':'경상북도 예천군 용궁면',
    '산택리':'경상북도 예천군 용궁면', '월오리':'경상북도 예천군 용궁면',
    '송암리':'경상북도 예천군 용궁면', '덕계리':'경상북도 예천군 용궁면',
    '왕태리':'경상북도 문경시 영순면',
    '위만리':'경상북도 문경시 산양면', '형천리':'경상북도 문경시 산양면',
    '우본리':'경상북도 문경시 산양면'
  };
  let autoLocateRunning = false;
  let autoLocateAbort = false;

  function normalizedParcelAddress(parcel) {
    let address = String(parcel?.address || '').trim().replace(/\s+/g, ' ');
    address = address.replace(/^월오리리\s+/, '월오리 ').replace(/^우분리\s+/, '우본리 ');
    const ri = address.split(' ')[0] || '';
    const prefix = RI_ADMIN[ri] || '';
    return prefix ? `${prefix} ${address}` : address;
  }

  function locationSourceLabel(source) {
    if (source === 'naver-auto') return '네이버 위치 링크 자동';
    if (source === 'address-auto') return '지번 주소 자동검증';
    if (source === 'address-candidate') return '주소 후보 · 확인 필요';
    if (source === 'manual') return '지도 터치 수동';
    if (source === 'excel') return '엑셀 좌표';
    return source ? String(source) : '좌표 등록';
  }

  function validKoreaCoordinate(lat, lng) {
    lat = Number(lat); lng = Number(lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 32 && lat <= 40 && lng >= 123 && lng <= 133;
  }


  function validFarmAreaCoordinate(lat, lng) {
    lat = Number(lat); lng = Number(lng);
    return validKoreaCoordinate(lat, lng) && lat >= 36.45 && lat <= 36.78 && lng >= 128.12 && lng <= 128.48;
  }

  function lotParts(value) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    const m = text.match(/([가-힣]+리)\s*(\d+)(?:-(\d+))?/);
    return m ? {ri:m[1], main:m[2], sub:m[3] || ''} : {ri:'', main:'', sub:''};
  }

  function normalizedMatchText(value) {
    return String(value || '').toLowerCase().replace(/[\s,._()\[\]{}]/g, '');
  }

  function evaluateAddressMatch(parcel, resolvedText) {
    const expected = lotParts(parcel?.address);
    const target = normalizedMatchText(resolvedText);
    let confidence = 0;
    if (expected.ri && target.includes(normalizedMatchText(expected.ri))) confidence += 45;
    if (expected.main && new RegExp(`(?:^|[^0-9])${expected.main}(?:[^0-9]|$)`).test(String(resolvedText || ''))) confidence += 35;
    if (expected.sub) {
      if (new RegExp(`${expected.main}\\s*[-–]\\s*${expected.sub}`).test(String(resolvedText || ''))) confidence += 15;
    } else confidence += 10;
    const admin = RI_ADMIN[expected.ri] || '';
    const adminTokens = admin.split(/\s+/).filter(Boolean).slice(-2);
    if (adminTokens.some(token => target.includes(normalizedMatchText(token)))) confidence += 10;
    confidence = Math.min(100, confidence);
    return {
      confidence,
      level: confidence >= 88 ? 'parcel' : confidence >= 55 ? 'village' : 'weak'
    };
  }

  function webMercatorToWgs84(x, y) {
    x = Number(x); y = Number(y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const lng = x / 20037508.34 * 180;
    let lat = y / 20037508.34 * 180;
    lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
    return validKoreaCoordinate(lat, lng) ? {lat, lng} : null;
  }

  function decodeDeep(value) {
    let text = String(value ?? '').replace(/&amp;/g, '&').replace(/\\u0026/gi, '&').replace(/\\\//g, '/');
    for (let i=0; i<6; i++) {
      try {
        const next = decodeURIComponent(text);
        if (next === text) break;
        text = next;
      } catch (_) { break; }
    }
    return text;
  }

  function parseCoordinates(raw) {
    const inputs = [];
    if (raw === null || raw === undefined) return null;
    inputs.push(typeof raw === 'string' ? raw : JSON.stringify(raw));
    if (typeof raw === 'object') {
      const walk = (obj, depth=0) => {
        if (!obj || depth > 5) return;
        if (Array.isArray(obj)) return obj.forEach(v => walk(v, depth+1));
        if (typeof obj !== 'object') return;
        const lat = obj.lat ?? obj.latitude ?? obj.y;
        const lng = obj.lng ?? obj.lon ?? obj.longitude ?? obj.x;
        if (validKoreaCoordinate(lat,lng)) inputs.unshift(`lat=${lat}&lng=${lng}`);
        Object.values(obj).forEach(v => {
          if (typeof v === 'string') inputs.push(v);
          else walk(v, depth+1);
        });
      };
      walk(raw);
    }
    for (const original of inputs) {
      const text = decodeDeep(original);
      const patterns = [
        /(?:[?&#,;]|\b)(?:lat|latitude|y)\s*[=:]\s*['"]?(-?\d{2}\.\d+)[^\n]{0,260}?(?:[?&#,;]|\b)(?:lng|lon|longitude|x)\s*[=:]\s*['"]?(-?\d{3}\.\d+)/i,
        /(?:[?&#,;]|\b)(?:lng|lon|longitude|x)\s*[=:]\s*['"]?(-?\d{3}\.\d+)[^\n]{0,260}?(?:[?&#,;]|\b)(?:lat|latitude|y)\s*[=:]\s*['"]?(-?\d{2}\.\d+)/i,
        /[?&#]c=(-?\d{3}\.\d+),(-?\d{2}\.\d+)/i,
        /(?:center|coordinate|location)[=:]\s*['"]?(-?\d{3}\.\d+)[,~%2C\s]+(-?\d{2}\.\d+)/i,
        /"(?:longitude|lng|x)"\s*:\s*"?(-?\d{3}\.\d+)"?[^\n]{0,160}?"(?:latitude|lat|y)"\s*:\s*"?(-?\d{2}\.\d+)"?/i,
        /"(?:latitude|lat|y)"\s*:\s*"?(-?\d{2}\.\d+)"?[^\n]{0,160}?"(?:longitude|lng|x)"\s*:\s*"?(-?\d{3}\.\d+)"?/i
      ];
      for (let i=0; i<patterns.length; i++) {
        const m = text.match(patterns[i]);
        if (!m) continue;
        let lat, lng;
        if ([1,4,5].includes(i)) { lng = Number(m[1]); lat = Number(m[2]); }
        else { lat = Number(m[1]); lng = Number(m[2]); }
        if (validKoreaCoordinate(lat,lng)) return {lat,lng};
      }

      const scaled = text.match(/(?:"?mapx"?\s*[:=]\s*"?)(\d{9,11})[\s\S]{0,180}?(?:"?mapy"?\s*[:=]\s*"?)(\d{8,10})/i);
      if (scaled) {
        const lng = Number(scaled[1]) / 10000000;
        const lat = Number(scaled[2]) / 10000000;
        if (validKoreaCoordinate(lat, lng)) return {lat, lng};
      }
      const scaledReverse = text.match(/(?:"?mapy"?\s*[:=]\s*"?)(\d{8,10})[\s\S]{0,180}?(?:"?mapx"?\s*[:=]\s*"?)(\d{9,11})/i);
      if (scaledReverse) {
        const lat = Number(scaledReverse[1]) / 10000000;
        const lng = Number(scaledReverse[2]) / 10000000;
        if (validKoreaCoordinate(lat, lng)) return {lat, lng};
      }
      const mercatorC = text.match(/[?&#]c=(-?\d{6,9}(?:\.\d+)?),(-?\d{6,9}(?:\.\d+)?)/i);
      if (mercatorC) {
        const converted = webMercatorToWgs84(mercatorC[1], mercatorC[2]);
        if (converted) return converted;
      }
      const mercatorXY = text.match(/(?:"?(?:x|mapX)"?\s*[:=]\s*"?)(-?\d{6,9}(?:\.\d+)?)[\s\S]{0,140}?(?:"?(?:y|mapY)"?\s*[:=]\s*"?)(-?\d{6,9}(?:\.\d+)?)/i);
      if (mercatorXY) {
        const converted = webMercatorToWgs84(mercatorXY[1], mercatorXY[2]);
        if (converted) return converted;
      }

      const pairs = [...text.matchAll(/(?<!\d)((?:12[3-9]|13[0-3])\.\d{4,})\s*[,;~%2C\s]+((?:3[2-9]|40)\.\d{4,})(?!\d)/g)];
      for (const m of pairs) {
        const lng=Number(m[1]), lat=Number(m[2]);
        if (validKoreaCoordinate(lat,lng)) return {lat,lng};
      }
      const reversePairs = [...text.matchAll(/(?<!\d)((?:3[2-9]|40)\.\d{4,})\s*[,;~%2C\s]+((?:12[3-9]|13[0-3])\.\d{4,})(?!\d)/g)];
      for (const m of reversePairs) {
        const lat=Number(m[1]), lng=Number(m[2]);
        if (validKoreaCoordinate(lat,lng)) return {lat,lng};
      }
    }
    return null;
  }

  async function fetchWithTimeout(url, options={}, timeout=13000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, {...options, signal:controller.signal, cache:'no-store'});
    } finally { clearTimeout(timer); }
  }

  async function readEndpoint(url, type='text', timeout=7000) {
    const response = await fetchWithTimeout(url, {headers:{'Accept':'application/json,text/plain,text/html,*/*'}}, timeout);
    if (!response.ok && response.type !== 'opaque') throw new Error(`HTTP ${response.status}`);
    if (type === 'json') {
      const obj = await response.json();
      return {raw:obj, text:JSON.stringify(obj), finalUrl:response.url || ''};
    }
    const text = await response.text();
    return {raw:text, text, finalUrl:response.url || ''};
  }

  async function resolveNaverCoordinates(shortUrl) {
    if (!shortUrl) return null;
    try {
      const direct = await fetchWithTimeout(shortUrl, {mode:'no-cors', redirect:'follow'}, 3500);
      const coord = parseCoordinates(direct.url || '');
      if (coord && validFarmAreaCoordinate(coord.lat,coord.lng)) {
        return {...coord, source:'naver-auto', locationConfidence:100, locationMatchLevel:'naver-link', resolvedUrl:direct.url};
      }
    } catch (_) {}

    const encoded = encodeURIComponent(shortUrl);
    const fastEndpoints = [
      [`https://r.jina.ai/https://${shortUrl.replace(/^https?:\/\//,'')}`, 'text'],
      [`https://r.jina.ai/http://${shortUrl.replace(/^https?:\/\//,'')}`, 'text'],
      [`https://api.allorigins.win/raw?url=${encoded}`, 'text']
    ];
    const results = await Promise.allSettled(fastEndpoints.map(([url,type]) => readEndpoint(url,type,7000)));
    for (const settled of results) {
      if (settled.status !== 'fulfilled') continue;
      const result = settled.value;
      const combined = `${result.finalUrl}\n${result.text}`;
      const coord = parseCoordinates(result.raw) || parseCoordinates(combined);
      if (coord && validFarmAreaCoordinate(coord.lat,coord.lng)) {
        return {...coord, source:'naver-auto', locationConfidence:100, locationMatchLevel:'naver-link', resolvedUrl:result.finalUrl || shortUrl};
      }
      const urls = decodeDeep(result.text).match(/https?:\/\/[^\s"'<>]+/g) || [];
      for (const candidate of urls.slice(0,10)) {
        const parsed = parseCoordinates(candidate);
        if (parsed && validFarmAreaCoordinate(parsed.lat,parsed.lng)) {
          return {...parsed, source:'naver-auto', locationConfidence:100, locationMatchLevel:'naver-link', resolvedUrl:candidate};
        }
      }
    }

    // 빠른 경로가 실패한 링크만 짧은 확장 서비스로 한 번 더 확인합니다.
    for (const [url,type] of [
      [`https://unshorten.me/json/${encoded}`, 'json'],
      [`https://api.codetabs.com/v1/proxy?quest=${encoded}`, 'text']
    ]) {
      try {
        const result = await readEndpoint(url,type,5000);
        const coord = parseCoordinates(result.raw) || parseCoordinates(`${result.finalUrl}\n${result.text}`);
        if (coord && validFarmAreaCoordinate(coord.lat,coord.lng)) {
          return {...coord, source:'naver-auto', locationConfidence:100, locationMatchLevel:'naver-link', resolvedUrl:result.finalUrl || shortUrl};
        }
      } catch (_) {}
    }
    return null;
  }

  async function searchNaverAddress(parcel) {
    const query = normalizedParcelAddress(parcel);
    if (!query) return null;
    const endpoint = `https://map.naver.com/p/api/search/allSearch?query=${encodeURIComponent(query)}&type=all&searchCoord=128.30%3B36.60&boundary=`;
    const proxy = `https://r.jina.ai/https://map.naver.com/p/api/search/allSearch?query=${encodeURIComponent(query)}%26type=all%26searchCoord=128.30%253B36.60%26boundary=`;
    for (const url of [endpoint, proxy]) {
      try {
        const response = await fetchWithTimeout(url, {headers:{'Accept':'application/json,text/plain,text/html,*/*'}}, 7500);
        if (!response.ok && response.type !== 'opaque') continue;
        const raw = await response.text();
        const coord = parseCoordinates(`${response.url || ''}\n${raw}`);
        const match = evaluateAddressMatch(parcel, raw);
        if (coord && validFarmAreaCoordinate(coord.lat,coord.lng) && match.level === 'parcel') {
          return {...coord, source:'address-auto', locationConfidence:Math.max(90,match.confidence), locationMatchLevel:'parcel', resolvedAddress:query};
        }
      } catch (_) {}
    }
    return null;
  }

  async function geocodeAddress(parcel) {
    const query = normalizedParcelAddress(parcel);
    if (!query) return null;

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=kr&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`;
    try {
      const response = await fetchWithTimeout(nominatimUrl, {headers:{'Accept':'application/json','Accept-Language':'ko'}}, 9000);
      if (response.ok) {
        const data = await response.json();
        for (const item of Array.isArray(data) ? data : []) {
          const match = evaluateAddressMatch(parcel, item.display_name || '');
          if (validFarmAreaCoordinate(item.lat,item.lon) && match.level === 'parcel') {
            return {lat:Number(item.lat), lng:Number(item.lon), source:'address-auto', locationConfidence:match.confidence, locationMatchLevel:'parcel', resolvedAddress:item.display_name || query};
          }
        }
      }
    } catch (_) {}

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=ko`;
    try {
      const response = await fetchWithTimeout(photonUrl, {headers:{'Accept':'application/json'}}, 9000);
      if (response.ok) {
        const data = await response.json();
        for (const feature of Array.isArray(data?.features) ? data.features : []) {
          const coords = feature?.geometry?.coordinates || [];
          const props = feature?.properties || {};
          const resolved = Object.values(props).filter(v => typeof v === 'string' || typeof v === 'number').join(' ');
          const match = evaluateAddressMatch(parcel, resolved);
          if (validFarmAreaCoordinate(coords[1],coords[0]) && match.level === 'parcel') {
            return {lat:Number(coords[1]), lng:Number(coords[0]), source:'address-auto', locationConfidence:match.confidence, locationMatchLevel:'parcel', resolvedAddress:resolved || query};
          }
        }
      }
    } catch (_) {}

    return await searchNaverAddress(parcel);
  }

  function showGeoStatus(show=true) {
    els.geoStatus.classList.toggle('show', show);
  }
  function updateGeoStatus(current,total,placed,failed,message='') {
    const pct = total ? Math.round((current/total)*100) : 0;
    els.geoProgressBar.style.width = `${pct}%`;
    els.geoProgressCount.textContent = `${current} / ${total}`;
    els.geoProgressResult.textContent = `정확 ${placed} · 보류 ${failed}`;
    if (message) els.geoStatusText.textContent = message;
  }
  function persistStateQuietly(reason='자동저장') {
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    writeSnapshot(state, reason);
  }
  function applyResolvedLocation(parcels, result) {
    const stamp = nowIso();
    parcels.forEach(p => {
      if (isVerifiedLocation(p)) return;
      p.lat = Number(result.lat);
      p.lng = Number(result.lng);
      p.locationSource = result.source || 'naver-auto';
      p.locationConfidence = Number(result.locationConfidence || (result.source === 'naver-auto' ? 100 : 0));
      p.locationMatchLevel = result.locationMatchLevel || (result.source === 'naver-auto' ? 'naver-link' : 'parcel');
      p.locationResolvedUrl = result.resolvedUrl || p.locationResolvedUrl || '';
      p.locationResolvedAddress = result.resolvedAddress || normalizedParcelAddress(p);
      p.locationVerifiedAt = stamp;
      p.updatedAt = stamp;
    });
  }

  async function runWithConcurrency(items, limit, worker) {
    let cursor = 0;
    const count = Math.max(1, Math.min(limit, items.length || 1));
    const runners = Array.from({length: count}, async () => {
      while (!autoLocateAbort) {
        const index = cursor++;
        if (index >= items.length) return;
        await worker(items[index], index);
      }
    });
    await Promise.all(runners);
  }

  async function autoLocateParcels({automatic=false}={}) {
    if (autoLocateRunning) return;
    const pending = locationVerificationTargets();
    if (!pending.length) {
      if (!automatic) alert('모든 경작지가 정확 좌표로 검증되어 있습니다.');
      return;
    }

    autoLocateRunning = true;
    autoLocateAbort = false;
    showGeoStatus(true);
    els.geoStatusTitle.textContent = '정확 좌표 자동검증 중';
    els.geoStatusText.textContent = '네이버 위치 링크를 먼저 확인하고, 실패한 지번만 주소로 확인합니다.';
    els.geoCancelBtn.textContent = '중지';
    els.autoLocateBtn.disabled = true;

    const groups = [];
    const grouped = new Map();
    pending.forEach(p => {
      const key = normalizedParcelAddress(p).replace(/\s+/g, ' ').trim();
      if (!grouped.has(key)) { grouped.set(key, []); groups.push(grouped.get(key)); }
      grouped.get(key).push(p);
    });

    const finished = new Set();
    let verifiedNow = 0, failed = 0, completed = 0;
    const groupId = group => normalizedParcelAddress(group[0]).replace(/\s+/g,' ').trim();
    const quietSave = reason => {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (completed % 10 === 0 || completed === groups.length) writeSnapshot(state, reason, true);
    };
    const finishGroup = (group, result) => {
      const key = groupId(group);
      if (finished.has(key)) return;
      finished.add(key);
      const stamp = nowIso();
      group.forEach(p => {
        p.locationLastTriedAt = stamp;
        p.locationAttempts = Number(p.locationAttempts || 0) + 1;
      });
      if (result && validFarmAreaCoordinate(result.lat,result.lng)) {
        applyResolvedLocation(group,result);
        verifiedNow += group.length;
      } else failed += group.length;
      completed++;
      quietSave('정확 좌표 자동검증');
      renderMarkers();
      renderSummary();
      scheduleDiagnostics();
      updateGeoStatus(completed,groups.length,verifiedNow,failed,`${normalizedParcelAddress(group[0])} 확인 완료`);
    };

    updateGeoStatus(0, groups.length, 0, 0, `정확 좌표 목표 ${Math.ceil(state.parcels.length * 0.86)}곳`);

    // 1차: 네이버 링크는 두 개씩 병렬 확인해 전체 대기시간을 줄입니다.
    const navGroups = groups.filter(group => Boolean(group[0].navUrl));
    await runWithConcurrency(navGroups, 2, async group => {
      if (autoLocateAbort) return;
      let result = null;
      try { result = await resolveNaverCoordinates(group[0].navUrl); } catch (_) {}
      if (result) finishGroup(group,result);
    });

    // 2차: 링크로 확인되지 않은 지번만 공개 주소검색을 순차 실행합니다.
    const unresolved = groups.filter(group => !finished.has(groupId(group)));
    for (const group of unresolved) {
      if (autoLocateAbort) break;
      let result = null;
      try { result = await geocodeAddress(group[0]); } catch (_) {}
      finishGroup(group,result);
      if (!autoLocateAbort) await new Promise(resolve => setTimeout(resolve, 1050));
    }

    autoLocateRunning = false;
    els.autoLocateBtn.disabled = false;
    const remaining = locationVerificationTargets().length;
    const exact = state.parcels.length - remaining;
    renderAll();
    renderDiagnostics(false);

    if (autoLocateAbort) els.geoStatusTitle.textContent = '정확 좌표 검증 중지';
    else if (remaining) els.geoStatusTitle.textContent = `정확 ${exact}/${state.parcels.length} · 추가 검증 필요 ${remaining}`;
    else els.geoStatusTitle.textContent = '전체 경작지 정확 좌표 검증 완료';
    updateGeoStatus(completed,groups.length,verifiedNow,remaining,`현재 점수 ${calculateQualityScore().score}/100 · 정확좌표 ${exact}/${state.parcels.length}`);
    els.geoCancelBtn.textContent = '닫기';
    try { safeStorage.setItem('farmland_exact_verify_last_v2',new Date().toISOString()); } catch (_) {}
    if (automatic && calculateQualityScore().score >= 95) setTimeout(() => { if (!autoLocateRunning) showGeoStatus(false); },3500);
  }

  function mergeDuplicateWork(targetWork, incomingWork) {
    if (!incomingWork) return targetWork || { done:false, date:null, note:'' };
    if (!targetWork) return structuredClone(incomingWork);
    const targetDate = targetWork.date ? new Date(targetWork.date).getTime() : 0;
    const incomingDate = incomingWork.date ? new Date(incomingWork.date).getTime() : 0;
    const newer = incomingDate >= targetDate ? incomingWork : targetWork;
    return {
      done: Boolean(targetWork.done || incomingWork.done),
      date: (targetWork.done || incomingWork.done) ? (newer.date || targetWork.date || incomingWork.date || null) : null,
      note: newer.note || targetWork.note || incomingWork.note || ''
    };
  }

  function addressVillage(parcel) {
    const match = String(parcel?.address || '').match(/([가-힣]+리)\s*\d/);
    return match ? match[1] : '';
  }

  function parcelLotNumber(parcel) {
    const match = String(parcel?.address || '').match(/\s(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function fallbackCenterForParcel(parcel) {
    const village = addressVillage(parcel);
    if (village === '월오리') {
      const lot = parcelLotNumber(parcel);
      if (lot < 200) return [36.6292, 128.3230];
      if (lot < 450) return [36.6210, 128.3160];
      if (lot < 650) return [36.6225, 128.3095];
      if (lot < 850) return [36.6252, 128.3065];
      if (lot < 1050) return [36.6200, 128.3020];
      return [36.6164, 128.3040];
    }
    if (village === '덕계리') {
      const lot = parcelLotNumber(parcel);
      return lot >= 650 ? [36.6405, 128.3120] : [36.6460, 128.3180];
    }
    if (village === '송암리') {
      const lot = parcelLotNumber(parcel);
      return lot < 150 ? [36.6320, 128.2980] : [36.6290, 128.2925];
    }
    if (village === '우본리') {
      const lot = parcelLotNumber(parcel);
      return lot < 150 ? [36.6265, 128.2805] : [36.6220, 128.2755];
    }
    return FALLBACK_VILLAGE_CENTERS[village] || [36.6205, 128.2975];
  }

  function assignEmbeddedMapLocations(target) {
    if (!target || !Array.isArray(target.parcels)) return target;
    target.parcels.forEach(parcel => {
      if (hasLocation(parcel) && !isVerifiedLocation(parcel)) {
        parcel.lat = null;
        parcel.lng = null;
        parcel.locationSource = '';
        parcel.locationConfidence = null;
        parcel.locationMatchLevel = '';
        parcel.locationResolvedAddress = '';
      }
    });
    return target;
    /* Legacy approximate placement is intentionally disabled.
    const groups = new Map();
    target.parcels.forEach(parcel => {
      if (hasLocation(parcel)) return;
      const village = addressVillage(parcel) || '기타';
      if (!groups.has(village)) groups.set(village, []);
      groups.get(village).push(parcel);
    });
    groups.forEach(group => {
      group.sort((a,b) => String(a.number).localeCompare(String(b.number), 'ko', {numeric:true}) || String(a.address).localeCompare(String(b.address),'ko'));
      group.forEach((parcel, index) => {
        const [baseLat, baseLng] = fallbackCenterForParcel(parcel);
        const columns = group.length > 18 ? 7 : group.length > 8 ? 5 : 3;
        const row = Math.floor(index / columns);
        const col = index % columns;
        const rowCount = Math.ceil(group.length / columns);
        const latOffset = (row - (rowCount - 1) / 2) * 0.00085;
        const lngOffset = (col - (columns - 1) / 2) * 0.00105;
        parcel.lat = Number((baseLat + latOffset).toFixed(6));
        parcel.lng = Number((baseLng + lngOffset).toFixed(6));
        parcel.locationSource = 'embedded-village';
        parcel.locationResolvedAddress = parcel.address;
        parcel.updatedAt = parcel.updatedAt || nowIso();
      });
    });
    return target; */
  }

  function deduplicateParcels(target) {
    if (!target || !Array.isArray(target.parcels)) return target;
    const kept = [];
    const byKey = new Map();
    const idMap = new Map();
    target.parcels.forEach(parcel => {
      const key = parcelKey(parcel);
      const current = byKey.get(key);
      if (!current) {
        parcel.works = parcel.works || {};
        byKey.set(key, parcel);
        kept.push(parcel);
        idMap.set(parcel.id, parcel.id);
        return;
      }
      idMap.set(parcel.id, current.id);
      ['number','name','address','area','owner','course','variety','navName','navUrl','memo','source'].forEach(field => {
        if (!current[field] && parcel[field]) current[field] = parcel[field];
      });
      if (!hasLocation(current) && hasLocation(parcel)) {
        current.lat = parcel.lat;
        current.lng = parcel.lng;
        current.locationSource = parcel.locationSource || current.locationSource;
      }
      current.works = current.works || {};
      Object.entries(parcel.works || {}).forEach(([taskId, work]) => {
        current.works[taskId] = mergeDuplicateWork(current.works[taskId], work);
      });
    });
    target.parcels = kept;
    (target.logs || []).forEach(log => { if (idMap.has(log.parcelId)) log.parcelId = idMap.get(log.parcelId); });
    (target.waterSessions || []).forEach(session => { if (idMap.has(session.parcelId)) session.parcelId = idMap.get(session.parcelId); });
    return target;
  }

  function mergeSeedParcels(target) {
    const byKey = new Map(target.parcels.map(p => [parcelKey(p), p]));
    seededParcels.forEach(seed => {
      const current = byKey.get(parcelKey(seed));
      if (!current) {
        target.parcels.push(structuredClone(seed));
        return;
      }
      // 엑셀 원본의 링크·지번 정보는 보완하되 사용자가 입력한 작업/좌표는 유지합니다.
      ['number','name','address','area','owner','course','variety','navName','navUrl','source'].forEach(key => {
        if (!current[key] && seed[key]) current[key] = seed[key];
      });
      if (!current.works) current.works = {};
    });
    target.seedVersion = SEED_VERSION;
    return target;
  }
  function loadState() {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY) || safeStorage.getItem(LEGACY_STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved && Array.isArray(saved.parcels) && Array.isArray(saved.taskTypes)) {
        saved.logs = Array.isArray(saved.logs) ? saved.logs : [];
        saved.waterSessions = Array.isArray(saved.waterSessions) ? saved.waterSessions : [];
        saved.settings = saved.settings && typeof saved.settings === 'object' ? saved.settings : {};
        saved.settings.quickWorkEnabled = Boolean(saved.settings.quickWorkEnabled);
        saved.settings.quickTaskId = saved.settings.quickTaskId || saved.taskTypes[0]?.id || null;
        normalizeTaskColors(saved.taskTypes);
        deduplicateParcels(saved);
        if (saved.seedVersion !== SEED_VERSION) mergeSeedParcels(saved);
        deduplicateParcels(saved);
        assignEmbeddedMapLocations(saved);
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        return saved;
      }
    } catch (e) { console.warn(e); }
    const recovered = latestValidSnapshot();
    if (recovered) {
      const restored=recovered.data;
      restored.logs=Array.isArray(restored.logs)?restored.logs:[];
      restored.waterSessions=Array.isArray(restored.waterSessions)?restored.waterSessions:[];
      restored.settings=restored.settings&&typeof restored.settings==='object'?restored.settings:{};
      normalizeTaskColors(restored.taskTypes);
      deduplicateParcels(restored); assignEmbeddedMapLocations(restored);
      safeStorage.setItem(STORAGE_KEY,JSON.stringify(restored));
      return restored;
    }
    const initial = { parcels: structuredClone(seededParcels), taskTypes: defaultTasks, logs: [], waterSessions: [], settings: { quickWorkEnabled:false, quickTaskId: defaultTasks[0]?.id || null }, seedVersion: SEED_VERSION };
    assignEmbeddedMapLocations(initial);
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  function saveState(reason='자동저장') {
    assignEmbeddedMapLocations(state);
    state.pwaUpdatedAt = new Date().toISOString();
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    writeSnapshot(state, reason);
    try { globalThis.farmlandPwaBackup?.(state, reason); } catch (_) {}
    try { globalThis.farmlandServerSave?.(reason); } catch (_) {}
    renderAll();
    updateRecoveryStatus();
  }

  function nowIso() { return new Date().toISOString(); }
  function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  }
  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
  }
  function getParcel(id) { return state.parcels.find(p => p.id === id); }
  function getTask(id) { return state.taskTypes.find(t => t.id === id); }
  function getWork(parcel, taskId) {
    parcel.works = parcel.works || {};
    parcel.works[taskId] = parcel.works[taskId] || { done: false, date: null, note: '' };
    return parcel.works[taskId];
  }

  let initialMapBoundsApplied = false;
  function fitMapToParcelsOnce() {
    if (initialMapBoundsApplied) return;
    const points = state.parcels.filter(hasLocation).map(p => [Number(p.lat), Number(p.lng)]);
    if (!points.length) return;
    initialMapBoundsApplied = true;
    setTimeout(() => {
      try { map.fitBounds(L.latLngBounds(points), { paddingTopLeft:[35,90], paddingBottomRight:[125,120], maxZoom:14 }); }
      catch (_) {}
    }, 250);
  }

  function renderAll() {
    renderMarkers();
    renderSummary();
    renderParcelList();
    if (selectedParcelId && getParcel(selectedParcelId)) renderDrawer();
    renderTaskManager();
    renderQuickWork();
    renderDashboard();
    fitMapToParcelsOnce();
    scheduleDiagnostics();
  }

  function renderMarkers() {
    const located = state.parcels.filter(isVerifiedLocation);
    const validIds = new Set(located.map(p => p.id));
    for (const [id, marker] of markers.entries()) {
      if (!validIds.has(id)) { map.removeLayer(marker); markers.delete(id); }
    }
    for (const [id, layer] of boundaryLayers.entries()) {
      const parcel = state.parcels.find(p => p.id === id);
      if (!parcel?.geometry) { map.removeLayer(layer); boundaryLayers.delete(id); }
    }

    const settings = ensureQuickSettings();
    const activeTask = settings.quickWorkEnabled ? getTask(settings.quickTaskId) : null;
    located.forEach(parcel => {
      if (parcel.geometry && !boundaryLayers.has(parcel.id) && typeof L.polygon === 'function') {
        const geometry = parcel.geometry;
        const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
        const latlngs = polygons.map(poly => poly.map(ring => ring.map(([lng,lat]) => [lat,lng])));
        const layer = L.polygon(latlngs, { color:'#15803d', weight:2, fillColor:'#22c55e', fillOpacity:0.22 }).addTo(map);
        boundaryLayers.set(parcel.id, layer);
      }
      let marker = markers.get(parcel.id);
      const sourceClass = ['naver-auto','address-auto','manual','embedded-village'].includes(parcel.locationSource) ? parcel.locationSource : '';
      const activeWork = activeTask ? getWork(parcel, activeTask.id) : null;
      const waterRunning = state.waterSessions.some(s => s.parcelId === parcel.id && s.status === 'running');
      const waterMode = isWaterTask(activeTask);
      const markerActive = waterMode ? (waterRunning || waterPinSelectedId === parcel.id) : Boolean(activeWork?.done);
      const markerColor = activeTask ? (markerActive ? taskColor(activeTask) : '#6b7280') : '';
      const markerContrast = activeTask ? taskContrast(markerColor) : '#ffffff';
      const statusClass = activeTask && !markerActive ? 'task-pending' : '';
      const pinIcon = L.divIcon({
        className: 'farm-pin-wrap',
        html: `<div class="farm-pin ${sourceClass} ${statusClass} ${waterRunning?'water-running':''}" ${markerColor ? `style="--pin-color:${markerColor}"` : ''}><span style="color:${markerContrast}">${escapeHtml(parcel.number || '')}</span></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 38],
        tooltipAnchor: [0, -33]
      });
      if (!marker) {
        marker = L.marker([parcel.lat, parcel.lng], { title: parcel.name || parcel.address, icon: pinIcon });
        marker.addTo(map);
        markers.set(parcel.id, marker);
      } else {
        marker.setLatLng([parcel.lat, parcel.lng]);
        marker.setIcon(pinIcon);
      }

      // 농지당 하나의 번호 핀만 표시합니다. 기존 영구 라벨은 생성하지 않습니다.
      // 상세 정보와 작업 상태는 핀을 눌렀을 때 상세창/완료 알림으로 확인합니다.
      if (typeof marker.unbindTooltip === 'function') marker.unbindTooltip();

      // Android 로컬 HTML에서도 넓어진 번호 핀 전체를 누르면 체크되도록 직접 연결합니다.
      requestAnimationFrame(() => {
        const tap = ev => {
          ev.preventDefault();
          ev.stopPropagation();
          handleParcelMarkerTap(parcel.id);
        };
        const iconEl = marker.getElement();
        if (iconEl) {
          iconEl.onpointerup = tap;
          iconEl.onclick = null;
          const taskState = activeTask ? `${activeTask.name} ${activeWork.done ? '완료' : '미완료'}` : '농지 상세';
          iconEl.title = `${parcel.number}. ${parcel.name || parcel.address} · ${taskState}`;
          iconEl.setAttribute('aria-label', iconEl.title);
          iconEl.setAttribute('role', 'button');
        }
      });
    });
  }

  function renderSummary() {
    const settings = ensureQuickSettings();
    const selectedTask = getTask(settings.quickTaskId) || state.taskTypes[0] || null;
    const quickEnabled = Boolean(settings.quickWorkEnabled && selectedTask);
    const selectedDone = selectedTask ? state.parcels.filter(p => getWork(p, selectedTask.id).done).length : 0;
    const activeWater = state.waterSessions.filter(s => s.status === 'running').length;
    const located = state.parcels.filter(hasLocation).length;
    const verified = state.parcels.filter(isVerifiedLocation).length;
    const approximate = state.parcels.filter(isApproximateLocation).length;
    const pendingCount = state.parcels.length - located;
    els.summaryChips.innerHTML = `
      <span class="chip">농지 <strong>${state.parcels.length}</strong></span>
      <span class="chip">물관리중 <strong>${activeWater}</strong></span>
      <span class="chip">${quickEnabled ? escapeHtml(selectedTask.name) : '빠른작업'} <strong>${quickEnabled ? `${selectedDone}/${state.parcels.length}` : 'OFF'}</strong></span>
      <span class="chip">정확좌표 <strong>${verified}/${state.parcels.length}</strong></span>`;
    els.unlocatedBadge.textContent = pendingCount;
    els.unlocatedBadge.style.display = 'none';
    els.pendingMenuCount.textContent = `${pendingCount}곳`;
    if (els.locationMenuSummary) els.locationMenuSummary.textContent = `정확 ${verified} · 미지정 ${pendingCount}`;
    if (els.autoLocateMenuState) {
      const target = Math.ceil(state.parcels.length * 0.86);
      els.autoLocateMenuState.textContent = verified >= target ? `목표 달성 · 정확 ${verified}/${state.parcels.length}` : `정확 ${verified}/${state.parcels.length} · 95점 목표 ${target}곳`;
    }
  }

  function renderParcelList() {
    if (!state.parcels.length) {
      els.parcelList.innerHTML = '<div class="empty">등록된 농지가 없습니다.<br>우측 ‘농지추가’ 후 지도 위치를 터치하세요.</div>';
      return;
    }
    els.parcelList.innerHTML = state.parcels
      .slice().sort((a,b) => String(a.number).localeCompare(String(b.number), 'ko', {numeric:true}) || String(a.address).localeCompare(String(b.address),'ko'))
      .map(p => `<div class="menu-item parcel-list-item">
        <span class="parcel-no">${escapeHtml(p.number)}</span>
        <button style="border:0;background:transparent;text-align:left;min-width:0;padding:0" data-open-parcel="${p.id}">
          <b>${escapeHtml(p.name || '농지 ' + p.number)}</b>
          <small>${escapeHtml(p.address)}</small>
          <span class="location-state ${isVerifiedLocation(p)?'':'pending'}">${isVerifiedLocation(p)?'● 정확 좌표':'● 위치 지정 필요'}</span>
        </button>
        <span>${hasLocation(p) ? '보기' : '미지정'}</span>
      </div>`).join('');
    els.parcelList.querySelectorAll('[data-open-parcel]').forEach(btn => btn.addEventListener('click', () => {
      closeMenu();
      const id = btn.dataset.openParcel;
      const p = getParcel(id);
      if (p && hasLocation(p)) map.setView([Number(p.lat),Number(p.lng)], Math.max(map.getZoom(),16));
      openParcel(id);
    }));
    els.parcelList.querySelectorAll('[data-place-parcel]').forEach(btn => btn.addEventListener('click', e => {
      e.stopPropagation();
      startPlaceMode(btn.dataset.placeParcel);
    }));
  }

  function openParcel(id, tab='basic') {
    selectedParcelId = id;
    renderDrawer();
    setTab(tab);
    els.parcelDrawer.classList.add('open');
  }

  function closeDrawer() { els.parcelDrawer.classList.remove('open'); }

  function setTab(tab) {
    document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tabpane').forEach(pane => pane.classList.toggle('active', pane.id === `tab-${tab}`));
  }

  function renderDrawer() {
    const p = getParcel(selectedParcelId);
    if (!p) return;
    els.drawerTitle.textContent = `${p.number}. ${p.name || '이름 없음'}`;
    els.drawerSubtitle.textContent = p.address || '';

    const latText = hasLocation(p) ? Number(p.lat).toFixed(6) : '미지정';
    const lngText = hasLocation(p) ? Number(p.lng).toFixed(6) : '미지정';
    els['tab-basic'].innerHTML = `
      <div class="info-grid">
        ${infoCard('농지 번호', p.number)}
        ${infoCard('넓이', p.area ? `${p.area}㎡` : '-')}
        ${infoCard('지주', p.owner || '-')}
        ${infoCard('코스', p.course || '-')}
        ${infoCard('품종', p.variety || '-')}
        ${infoCard('지도 상태', hasLocation(p) ? '표시됨' : '위치 지정 필요')}
        ${infoCard('위치 근거', hasLocation(p) ? locationSourceLabel(p.locationSource) : '-')}
        ${infoCard('위도', latText)}
        ${infoCard('경도', lngText)}
        ${infoCard('주소', p.address || '-', true)}
        ${infoCard('전체 주소', normalizedParcelAddress(p) || '-', true)}
        ${infoCard('비고', p.memo || '-', true)}
      </div>
      <div class="nav-actions">
        ${p.navUrl ? '<button class="nav-btn naver" id="naverNavBtn">네이버 내비</button>' : ''}
        ${hasLocation(p) ? '<button class="nav-btn" id="kakaoNavBtn">카카오 내비</button>' : ''}
        <button class="nav-btn place ${(!p.navUrl || !hasLocation(p)) ? 'wide' : ''}" id="setLocationBtn">${hasLocation(p)?'지도 위치 수정':'지도 위치 지정'}</button>
      </div>`;
    const naverBtn = document.getElementById('naverNavBtn');
    if (naverBtn) naverBtn.onclick = () => window.open(p.navUrl, '_blank');
    const kakaoBtn = document.getElementById('kakaoNavBtn');
    if (kakaoBtn) kakaoBtn.onclick = () => {
      const name = encodeURIComponent(p.navName || p.name || p.address || `농지 ${p.number}`);
      window.open(`https://map.kakao.com/link/to/${name},${p.lat},${p.lng}`, '_blank');
    };
    document.getElementById('setLocationBtn').onclick = () => startPlaceMode(p.id);

    renderWorksTab(p);
    renderWaterTab(p);
    renderLogsTab(p);
  }

  function infoCard(label, value, full=false) {
    return `<div class="info-card ${full?'full':''}"><label>${escapeHtml(label)}</label><b>${escapeHtml(value)}</b></div>`;
  }

  function renderWorksTab(p) {
    if (!state.taskTypes.length) {
      els['tab-works'].innerHTML = '<div class="empty">작업관리에서 작업 항목을 추가하세요.</div>';
      return;
    }
    els['tab-works'].innerHTML = `<div class="section-title"><h3>농지별 작업 체크</h3><small>터치한 날짜 자동 저장</small></div>
      <div class="work-list">${state.taskTypes.map(task => {
        const work = getWork(p, task.id);
        return `<div class="work-row">
          <div class="work-main">
            <div><div class="work-name-line"><i class="task-color-dot" style="--task-color:${taskColor(task)}"></i><div class="work-name">${escapeHtml(task.name)}</div></div><span class="work-date">${work.done ? formatDate(work.date) : '미완료'}</span></div>
            <button class="toggle-btn ${work.done?'on':''}" data-toggle-work="${task.id}">${work.done?'완료':'미완료'}</button>
          </div>
          ${task.detailEnabled ? `<div class="work-detail ${work.done || work.note ? 'show':''}" data-work-detail="${task.id}">
            <textarea data-work-note="${task.id}" placeholder="작업 세부 내용·비고">${escapeHtml(work.note || '')}</textarea>
            <div class="work-detail-actions"><button class="small-btn" data-save-note="${task.id}">비고 저장</button></div>
          </div>` : ''}
        </div>`;
      }).join('')}</div>`;

    els['tab-works'].querySelectorAll('[data-toggle-work]').forEach(btn => btn.addEventListener('click', () => toggleWork(p.id, btn.dataset.toggleWork)));
    els['tab-works'].querySelectorAll('[data-save-note]').forEach(btn => btn.addEventListener('click', () => {
      const taskId = btn.dataset.saveNote;
      const work = getWork(p, taskId);
      const input = els['tab-works'].querySelector(`[data-work-note="${taskId}"]`);
      work.note = input.value.trim();
      state.logs.push({ id: uid(), type:'work-note', parcelId:p.id, taskId, date:nowIso(), note:work.note });
      saveState();
    }));
  }

  function toggleWork(parcelId, taskId) {
    const p = getParcel(parcelId); const task = getTask(taskId); if (!p || !task) return;
    const work = getWork(p, taskId);
    work.done = !work.done;
    work.date = work.done ? nowIso() : null;
    state.logs.push({ id: uid(), type: work.done ? 'work-complete' : 'work-cancel', parcelId, taskId, date: nowIso(), note: work.note || '' });
    saveState();
  }

  function renderWaterTab(p) {
    const sessions = state.waterSessions.filter(s => s.parcelId === p.id).sort((a,b) => new Date(b.startAt)-new Date(a.startAt));
    const running = sessions.find(s => s.status === 'running');
    els['tab-water'].innerHTML = `
      <div class="section-title"><h3>물관리 전용 상세창</h3><small>주소 정보와 별도 기록</small></div>
      <div class="water-actions">
        <button class="water-preset ${selectedWaterHours===48?'selected':''}" data-water-hours="48">48시간</button>
        <button class="water-preset ${selectedWaterHours===72?'selected':''}" data-water-hours="72">72시간</button>
        <button class="water-preset ${selectedWaterHours==='custom'?'selected':''}" data-water-hours="custom">직접입력</button>
      </div>
      <div class="field" id="customHoursField" style="display:${selectedWaterHours==='custom'?'block':'none'};margin-bottom:10px"><label>시간 입력</label><input type="number" min="1" max="720" id="customHoursInput" value="24" /></div>
      <div class="water-card">
        <div class="water-status"><strong>${running?'물관리 진행 중':'대기 중'}</strong><span>${running?formatDate(running.startAt):'시작 기록 없음'}</span></div>
        <div class="countdown" id="waterCountdown">${running?'계산 중':'00:00:00'}</div>
        <div class="progress"><div id="waterProgress"></div></div>
        <div class="water-buttons">
          <button class="water-start" id="startWaterBtn" ${running?'disabled':''}>카운터 시작</button>
          <button class="water-stop" id="stopWaterBtn" ${running?'':'disabled'}>종료·자동기록</button>
        </div>
      </div>
      <div class="section-title" style="margin-top:14px"><h3>물관리 기록</h3><small>${sessions.length}건</small></div>
      <div>${sessions.length ? sessions.map(renderWaterLog).join('') : '<div class="empty">물관리 기록이 없습니다.</div>'}</div>`;

    els['tab-water'].querySelectorAll('[data-water-hours]').forEach(btn => btn.addEventListener('click', () => {
      selectedWaterHours = btn.dataset.waterHours === 'custom' ? 'custom' : Number(btn.dataset.waterHours);
      renderWaterTab(p);
    }));
    document.getElementById('startWaterBtn').onclick = () => startWater(p.id);
    document.getElementById('stopWaterBtn').onclick = () => stopWater(p.id, 'stopped');
    updateWaterCountdown(p.id);
  }

  function renderWaterLog(s) {
    const end = s.endAt ? formatDate(s.endAt) : '진행 중';
    return `<div class="log-row"><strong><span class="badge water">물관리</span>${s.hours}시간 ${s.status==='running'?'진행 중':'종료'}</strong><p>시작 ${formatDate(s.startAt)}<br>종료 ${end}${s.note?'<br>'+escapeHtml(s.note):''}</p></div>`;
  }

  function startWater(parcelId) {
    if (state.waterSessions.some(s => s.parcelId === parcelId && s.status === 'running')) return;
    let hours = selectedWaterHours;
    if (hours === 'custom') {
      const input = document.getElementById('customHoursInput');
      hours = Number(input?.value || 0);
      if (!hours || hours < 1) { alert('1시간 이상 입력하세요.'); return; }
    }
    const startAt = nowIso();
    const plannedEndAt = new Date(Date.now() + hours * 3600000).toISOString();
    const session = { id: uid(), parcelId, hours, startAt, plannedEndAt, endAt:null, status:'running', note:'' };
    state.waterSessions.push(session);
    state.logs.push({ id: uid(), type:'water-start', parcelId, date:startAt, hours, note:`${hours}시간 카운터 시작` });
    saveState();
  }

  function stopWater(parcelId, status='stopped') {
    const session = state.waterSessions.find(s => s.parcelId === parcelId && s.status === 'running');
    if (!session) return;
    session.endAt = nowIso();
    session.status = status;
    state.logs.push({ id: uid(), type:'water-end', parcelId, date:session.endAt, hours:session.hours, note:`물관리 ${status==='completed'?'자동 완료':'수동 종료'}` });
    saveState();
  }

  function updateWaterCountdown(parcelId) {
    const countEl = document.getElementById('waterCountdown');
    const progressEl = document.getElementById('waterProgress');
    if (!countEl || !progressEl) return;
    const session = state.waterSessions.find(s => s.parcelId === parcelId && s.status === 'running');
    if (!session) return;
    const tick = () => {
      const current = state.waterSessions.find(s => s.id === session.id && s.status === 'running');
      if (!current) return;
      const start = new Date(current.startAt).getTime();
      const end = new Date(current.plannedEndAt).getTime();
      const remain = Math.max(0, end - Date.now());
      const elapsedPct = Math.min(100, Math.max(0, ((Date.now()-start)/(end-start))*100));
      countEl.textContent = msToClock(remain);
      progressEl.style.width = `${elapsedPct}%`;
      if (remain <= 0) {
        stopWater(parcelId, 'completed');
        return;
      }
      setTimeout(tick, 1000);
    };
    tick();
  }

  function msToClock(ms) {
    let sec = Math.floor(ms/1000);
    const h = Math.floor(sec/3600); sec %= 3600;
    const m = Math.floor(sec/60); const s = sec%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function renderLogsTab(p) {
    const logs = state.logs.filter(l => l.parcelId === p.id).sort((a,b)=>new Date(b.date)-new Date(a.date));
    els['tab-logs'].innerHTML = `<div class="section-title"><h3>자동 기록</h3><small>${logs.length}건</small></div>${logs.length ? logs.map(log => renderLog(log)).join('') : '<div class="empty">기록이 없습니다.</div>'}`;
  }

  function renderLog(log) {
    const task = log.taskId ? getTask(log.taskId) : null;
    const labels = {
      'work-complete':'작업 완료', 'work-cancel':'완료 취소', 'work-reset':'작업 초기화', 'work-note':'비고 수정',
      'water-start':'물관리 시작', 'water-end':'물관리 종료'
    };
    const isWater = log.type.startsWith('water');
    const taskStyle = task ? `style="background:${taskColor(task)}22;color:${taskColor(task)}"` : '';
    return `<div class="log-row"><strong><span class="badge ${isWater?'water':''}" ${taskStyle}>${escapeHtml(labels[log.type] || log.type)}</span>${escapeHtml(task?.name || (isWater?'물관리':'기록'))}</strong><p>${formatDate(log.date)}${log.note?'<br>'+escapeHtml(log.note):''}</p></div>`;
  }

  let quickToastTimer = null;
  let quickPaletteOpen = false;
  let lastQuickAction = null;
  let parcelCheckFilter = 'pending';
  let parcelCheckSearchText = '';
  function ensureQuickSettings() {
    state.settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
    if (!('quickWorkEnabled' in state.settings)) state.settings.quickWorkEnabled = false;
    if (!state.settings.quickTaskId || !getTask(state.settings.quickTaskId)) state.settings.quickTaskId = state.taskTypes[0]?.id || null;
    const validIds = new Set(state.taskTypes.map(task => task.id));
    state.settings.quickRecentTaskIds = Array.isArray(state.settings.quickRecentTaskIds)
      ? state.settings.quickRecentTaskIds.filter(id => validIds.has(id)).slice(0, 8)
      : [];
    if (state.settings.quickTaskId && !state.settings.quickRecentTaskIds.includes(state.settings.quickTaskId)) {
      state.settings.quickRecentTaskIds.unshift(state.settings.quickTaskId);
      state.settings.quickRecentTaskIds = state.settings.quickRecentTaskIds.slice(0, 8);
    }
    if (!state.settings.quickTaskId) state.settings.quickWorkEnabled = false;
    return state.settings;
  }

  function showQuickToast(title, text, already=false, canUndo=false) {
    els.quickWorkToastTitle.textContent = title;
    els.quickWorkToastText.textContent = text;
    els.quickWorkToast.querySelector('.check').textContent = already ? 'i' : '✓';
    els.quickWorkToast.classList.toggle('can-undo', Boolean(canUndo));
    els.quickWorkToast.classList.add('show');
    clearTimeout(quickToastTimer);
    quickToastTimer = setTimeout(() => els.quickWorkToast.classList.remove('show'), 2600);
  }

  function quickTaskOrder() {
    const settings = ensureQuickSettings();
    const recent = settings.quickRecentTaskIds.map(getTask).filter(Boolean);
    const recentIds = new Set(recent.map(task => task.id));
    return [...recent, ...state.taskTypes.filter(task => !recentIds.has(task.id))];
  }

  function rememberQuickTask(taskId) {
    const settings = ensureQuickSettings();
    settings.quickRecentTaskIds = [taskId, ...settings.quickRecentTaskIds.filter(id => id !== taskId)].slice(0, 8);
  }

  function isWaterTask(task) {
    return Boolean(task && /물관리/.test(String(task.name || '')));
  }

  function openWaterForParcel(parcelId) {
    const id = parcelId || selectedParcelId || state.parcels[0]?.id;
    if (!id) return;
    openParcel(id, 'water');
  }

  function renderQuickWork() {
    const settings = ensureQuickSettings();
    const selectedTask = getTask(settings.quickTaskId);
    const enabled = Boolean(settings.quickWorkEnabled && selectedTask);
    const selectedColor = selectedTask ? taskColor(selectedTask) : '#28733d';
    const selectedContrast = taskContrast(selectedColor);

    els.quickWorkBtn.classList.toggle('quick-on', enabled);
    els.quickWorkBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    els.quickWorkBtn.style.background = enabled ? selectedColor : '';
    els.quickWorkBtn.style.color = enabled ? selectedContrast : '';
    els.quickWorkLabel.textContent = enabled ? selectedTask.name : '빠른시작';
    els.quickWorkBtn.title = enabled
      ? `${selectedTask.name} 사용 중 · 누르면 작업 목록`
      : '마지막 작업으로 빠른 체크 즉시 시작';

    const waterTaskSelected = isWaterTask(selectedTask);
    const showExtraBox = Boolean(enabled && waterTaskSelected);
    document.body.classList.toggle('quick-work-active', showExtraBox);
    document.body.classList.toggle('water-task-active', showExtraBox);
    els.quickSwitchDock.classList.toggle('show', showExtraBox);
    els.quickSwitchDock.style.setProperty('--quick-color', selectedColor);
    els.quickSwitchDock.style.setProperty('--quick-contrast', selectedContrast);
    els.quickWorkToast.classList.toggle('dock-up', showExtraBox);
    els.quickCurrentTaskName.textContent = selectedTask?.name || '작업 선택';
    els.quickTaskPalette.classList.toggle('show', showExtraBox && quickPaletteOpen);

    const recentIds = new Set(settings.quickRecentTaskIds.slice(0, 4));
    const orderedTasks = quickTaskOrder();
    els.quickTaskPalette.innerHTML = state.taskTypes.length
      ? `<div class="quick-palette-head"><b>작업을 누르면 즉시 변경</b><span>색상은 작업관리에서 변경</span></div><div class="quick-palette-grid">${orderedTasks.map(task => {
          const selected = task.id === settings.quickTaskId;
          return `<button type="button" class="quick-palette-task ${selected?'selected':''} ${recentIds.has(task.id)?'recent':''}" style="--task-color:${taskColor(task)};--task-contrast:${taskContrast(task)}" data-quick-select="${task.id}" title="${escapeHtml(task.name)}">${escapeHtml(task.name)}</button>`;
        }).join('')}</div>`
      : '<div class="empty">작업관리에서 작업 항목을 먼저 추가하세요.</div>';
    els.quickTaskPalette.querySelectorAll('[data-quick-select]').forEach(btn => btn.addEventListener('click', () => {
      selectQuickTask(btn.dataset.quickSelect, {enable:true, closePalette:true, notify:true});
    }));

    const locatedCount = state.parcels.filter(hasLocation).length;
    const unlocatedCount = state.parcels.length - locatedCount;
    els.quickWorkStatus.innerHTML = enabled
      ? `<b><i class="task-color-dot" style="--task-color:${selectedColor};display:inline-block;margin-right:7px"></i>현재 ON · ${escapeHtml(selectedTask.name)}</b><span>선택 작업 ${escapeHtml(selectedTask.name)} · 완료 ${state.parcels.filter(p=>getWork(p, selectedTask.id).done).length}/${state.parcels.length}. 하단 ‘농지’ 버튼에서도 체크할 수 있습니다.</span>`
      : `<b>현재 OFF</b><span>작업명을 누르면 별도 확인 없이 즉시 켜집니다.</span>`;
    els.quickTaskList.innerHTML = '';
    if (enabled && waterTaskSelected && !els.parcelDrawer.classList.contains('open')) {
      queueMicrotask(() => openWaterForParcel(selectedParcelId));
    }
  }

  function selectQuickTask(taskId, options={}) {
    const task = getTask(taskId);
    if (!task) return;
    const settings = ensureQuickSettings();
    const changed = settings.quickTaskId !== taskId || !settings.quickWorkEnabled;
    settings.quickTaskId = taskId;
    if (options.enable !== false) settings.quickWorkEnabled = true;
    rememberQuickTask(taskId);
    const waterSelected = isWaterTask(task);
    if (!waterSelected) waterPinSelectedId = null;
    if (settings.quickWorkEnabled) {
      exitAddMode();
      exitPlaceMode();
      if (!waterSelected) closeDrawer();
    }
    if (options.closePalette !== false) quickPaletteOpen = false;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
    if (settings.quickWorkEnabled && waterSelected) {
      closeModal('quickWorkModalWrap');
      openWaterForParcel(selectedParcelId);
    }
    if (options.notify && changed) showQuickToast('빠른 작업 변경', `${task.name} · 지도 표식을 한 번 터치하면 완료`);
  }

  function cycleQuickTask(direction) {
    if (!state.taskTypes.length) {
      alert('빠른 메뉴에서 작업 항목을 먼저 추가하세요.');
      return;
    }
    const settings = ensureQuickSettings();
    const tasks = state.taskTypes;
    let index = tasks.findIndex(task => task.id === settings.quickTaskId);
    if (index < 0) index = 0;
    const nextIndex = (index + direction + tasks.length) % tasks.length;
    selectQuickTask(tasks[nextIndex].id, {enable:true, closePalette:true, notify:true});
  }

  function toggleQuickPalette(force) {
    const settings = ensureQuickSettings();
    if (!settings.quickWorkEnabled) return;
    quickPaletteOpen = typeof force === 'boolean' ? force : !quickPaletteOpen;
    renderQuickWork();
  }

  function setQuickWorkEnabled(enabled) {
    const settings = ensureQuickSettings();
    if (enabled && !state.taskTypes.length) {
      alert('작업관리에서 작업 항목을 먼저 추가하세요.');
      closeModal('quickWorkModalWrap');
      renderQuickWork();
      openModal('quickWorkModalWrap');
      return;
    }
    if (enabled && !getTask(settings.quickTaskId)) settings.quickTaskId = state.taskTypes[0]?.id || null;
    settings.quickWorkEnabled = Boolean(enabled && settings.quickTaskId);
    quickPaletteOpen = false;
    if (settings.quickWorkEnabled) {
      rememberQuickTask(settings.quickTaskId);
      exitAddMode();
      exitPlaceMode();
      closeDrawer();
    }
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
    if (settings.quickWorkEnabled && isWaterTask(getTask(settings.quickTaskId))) openWaterForParcel(selectedParcelId);
  }

  function completeQuickWorkForParcel(parcelId, source='지도 빠른 작업 체크') {
    const settings = ensureQuickSettings();
    const task = getTask(settings.quickTaskId);
    const parcel = getParcel(parcelId);
    if (!settings.quickWorkEnabled || !task || !parcel) return {ok:false, reason:'inactive'};
    const work = getWork(parcel, task.id);
    if (work.done) return {ok:false, reason:'done', parcel, task, work};
    const completedAt = nowIso();
    work.done = true;
    work.date = completedAt;
    const log={ id: uid(), type:'work-complete', parcelId:parcel.id, taskId:task.id, date:completedAt, note:source };
    state.logs.push(log);
    lastQuickAction={parcelId:parcel.id,taskId:task.id,completedAt,logId:log.id};
    persistStateQuietly('빠른작업 완료');
    renderAll();
    try { if (navigator.vibrate) navigator.vibrate(35); } catch (_) {}
    return {ok:true, parcel, task, work, completedAt};
  }

  function resetQuickWorkForParcel(parcelId, source='지도 숫자 다시 누름 · 작업 상태 초기화') {
    const settings = ensureQuickSettings();
    const task = getTask(settings.quickTaskId);
    const parcel = getParcel(parcelId);
    if (!settings.quickWorkEnabled || !task || !parcel) return {ok:false};
    const work = getWork(parcel, task.id);
    if (!work.done) return {ok:false, parcel, task};
    work.done = false;
    work.date = null;
    state.logs.push({ id:uid(), type:'work-reset', parcelId:parcel.id, taskId:task.id, date:nowIso(), note:source });
    lastQuickAction = null;
    persistStateQuietly('빠른작업 상태 초기화');
    renderAll();
    try { if (navigator.vibrate) navigator.vibrate([25,35,25]); } catch (_) {}
    return {ok:true, parcel, task};
  }

  function handleParcelMarkerTap(parcelId) {
    const settings = ensureQuickSettings();
    const task = getTask(settings.quickTaskId);
    if (!settings.quickWorkEnabled || !task) {
      openParcel(parcelId);
      return;
    }
    const parcel = getParcel(parcelId);
    if (!parcel) return;
    if (isWaterTask(task)) {
      if (waterPinSelectedId === parcelId) {
        waterPinSelectedId = null;
        closeDrawer();
        renderMarkers();
        showQuickToast('물관리 선택 초기화', `${parcel.number}. ${parcel.name || parcel.address}`);
        return;
      }
      waterPinSelectedId = parcelId;
      openWaterForParcel(parcelId);
      renderMarkers();
      return;
    }
    const currentWork = getWork(parcel, task.id);
    if (currentWork.done) {
      const reset = resetQuickWorkForParcel(parcelId);
      if (reset.ok) showQuickToast('작업 상태 초기화', `${parcel.number}. ${parcel.name || parcel.address} · ${task.name}`);
      return;
    }
    const result = completeQuickWorkForParcel(parcelId, '지도 빠른 작업 체크');
    if (result.reason === 'done') {
      showQuickToast('이미 완료된 작업', `${parcel.number}. ${parcel.name || parcel.address} · ${task.name} · ${formatDate(result.work.date)}`, true);
      return;
    }
    if (result.ok) showQuickToast('작업 완료', `${parcel.number}. ${parcel.name || parcel.address} · ${task.name} · ${formatDate(result.completedAt)}`, false, true);
  }

  function renderQuickParcelChecklist() {
    const settings = ensureQuickSettings();
    const task = getTask(settings.quickTaskId);
    if (!task) {
      els.parcelCheckWarning.textContent = '먼저 빠른작업에서 작업을 선택하세요.';
      els.parcelCheckSummary.innerHTML = '';
      els.parcelCheckList.innerHTML = '<div class="empty">선택된 작업이 없습니다.</div>';
      return;
    }
    const locatedCount = state.parcels.filter(hasLocation).length;
    const unlocatedCount = state.parcels.length - locatedCount;
    const entries = state.parcels.map(parcel => ({parcel, work:getWork(parcel, task.id), located:hasLocation(parcel)}));
    const doneCount = entries.filter(x => x.work.done).length;
    const pendingCount = entries.length - doneCount;
    els.parcelCheckWarning.innerHTML = unlocatedCount
      ? `지도 위치가 없는 농지가 <b>${unlocatedCount}곳</b>입니다. 이 목록에서는 위치가 없어도 <b>ON</b> 버튼으로 바로 체크할 수 있습니다.`
      : '모든 농지가 지도에 표시되어 있습니다. 지도 표식 또는 아래 목록에서 체크할 수 있습니다.';
    els.parcelCheckSummary.innerHTML = `<div class="stat"><b>${entries.length}</b><span>전체</span></div><div class="stat"><b>${doneCount}</b><span>작업된 곳</span></div><div class="stat"><b>${pendingCount}</b><span>안된 곳</span></div>`;
    els.parcelCheckStatusFilter.value = parcelCheckFilter;
    els.parcelCheckSearch.value = parcelCheckSearchText;

    let filtered = entries.slice();
    if (parcelCheckFilter === 'pending') filtered = filtered.filter(x => !x.work.done);
    if (parcelCheckFilter === 'done') filtered = filtered.filter(x => x.work.done);
    if (parcelCheckFilter === 'unlocated') filtered = filtered.filter(x => !x.located);
    const q = parcelCheckSearchText.trim().toLowerCase();
    if (q) filtered = filtered.filter(x => [x.parcel.number,x.parcel.name,x.parcel.address,x.parcel.course].some(v => String(v||'').toLowerCase().includes(q)));
    filtered.sort((a,b) => {
      if (a.work.done !== b.work.done) return a.work.done ? 1 : -1;
      return String(a.parcel.number).localeCompare(String(b.parcel.number),'ko',{numeric:true});
    });

    const color = taskColor(task);
    const contrast = taskContrast(task);
    els.parcelCheckList.style.setProperty('--quick-color', color);
    els.parcelCheckList.style.setProperty('--quick-contrast', contrast);
    els.parcelCheckList.innerHTML = filtered.length ? filtered.map(({parcel,work,located}) => `<div class="parcel-check-row ${work.done?'done':''}">
      <div><strong>${escapeHtml(parcel.number)}. ${escapeHtml(parcel.name || parcel.address)}</strong><p>${escapeHtml(parcel.address)} · ${located?'지도표시':'위치 미지정'}${work.date?'<br>'+formatDate(work.date):''}${work.note?'<br>비고 '+escapeHtml(work.note):''}</p></div>
      <button class="parcel-check-toggle" type="button" data-parcel-check="${parcel.id}" ${work.done?'disabled':''}>${work.done?'ON':'ON 체크'}</button>
    </div>`).join('') : '<div class="empty">조건에 맞는 경작지가 없습니다.</div>';
    els.parcelCheckList.querySelectorAll('[data-parcel-check]').forEach(btn => btn.onclick = () => {
      const result = completeQuickWorkForParcel(btn.dataset.parcelCheck, '경작지 목록 빠른 체크');
      if (result.ok) {
        showQuickToast('작업 완료', `${result.parcel.number}. ${result.parcel.name || result.parcel.address} · ${result.task.name}`);
        renderQuickParcelChecklist();
      }
    });
  }

  function openQuickParcelChecklist() {
    const settings = ensureQuickSettings();
    if (!settings.quickWorkEnabled || !getTask(settings.quickTaskId)) {
      alert('먼저 빠른작업을 켜고 작업을 선택하세요.');
      return;
    }
    quickPaletteOpen = false;
    renderQuickWork();
    renderQuickParcelChecklist();
    openModal('quickParcelModalWrap');
  }

  function renderTaskManager() {
    if (els.quickTaskSettingsHost && els.taskManagerList.parentElement !== els.quickTaskSettingsHost) {
      els.quickTaskSettingsHost.appendChild(els.taskManagerList);
    }
    const quickSettings = ensureQuickSettings();
    els.taskManagerList.innerHTML = state.taskTypes.length ? state.taskTypes.map(t => `<div class="task-manager-row ${t.id===quickSettings.quickTaskId?'selected':''}">
      <input type="radio" name="managedQuickTask" data-managed-quick-task="${t.id}" ${t.id===quickSettings.quickTaskId?'checked':''} title="빠른 작업 선택" />
      <label class="task-color-picker" title="${escapeHtml(t.name)} 표시 색상"><input type="color" data-task-color="${t.id}" value="${taskColor(t)}" /></label>
      <input type="text" data-task-name="${t.id}" value="${escapeHtml(t.name)}" maxlength="40" />
      <label class="detail-switch"><input type="checkbox" data-task-detail="${t.id}" ${t.detailEnabled?'checked':''}/> 상세 ON</label>
      <button class="delete-task" data-delete-task="${t.id}" title="삭제">×</button>
    </div>`).join('') : '<div class="empty">작업 항목이 없습니다.</div>';

    els.taskManagerList.querySelectorAll('[data-managed-quick-task]').forEach(input => input.addEventListener('change', () => {
      selectQuickTask(input.dataset.managedQuickTask, {enable:true, closePalette:true, notify:true});
      closeModal('quickWorkModalWrap');
    }));

    els.taskManagerList.querySelectorAll('[data-task-color]').forEach(input => input.addEventListener('input', () => {
      const task = getTask(input.dataset.taskColor); if (!task) return;
      task.color = input.value;
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderMarkers();
      renderQuickWork();
    }));
    els.taskManagerList.querySelectorAll('[data-task-name]').forEach(input => input.addEventListener('change', () => {
      const task = getTask(input.dataset.taskName); if (!task) return;
      task.name = input.value.trim() || task.name; saveState();
    }));
    els.taskManagerList.querySelectorAll('[data-task-detail]').forEach(input => input.addEventListener('change', () => {
      const task = getTask(input.dataset.taskDetail); if (!task) return;
      task.detailEnabled = input.checked; saveState();
    }));
    els.taskManagerList.querySelectorAll('[data-delete-task]').forEach(btn => btn.addEventListener('click', () => {
      const task = getTask(btn.dataset.deleteTask); if (!task) return;
      if (!confirm(`‘${task.name}’ 작업을 삭제할까요? 기존 기록은 대시보드에 남습니다.`)) return;
      state.taskTypes = state.taskTypes.filter(t => t.id !== task.id);
      ensureQuickSettings();
      if (state.settings.quickTaskId === task.id) {
        state.settings.quickTaskId = state.taskTypes[0]?.id || null;
        state.settings.quickWorkEnabled = false;
      }
      saveState();
    }));
  }

  function addQuickTaskType() {
    const name = String(els.quickNewTaskName?.value || '').trim();
    if (!name) return;
    if (state.taskTypes.length >= 50) { alert('작업 항목은 최대 50개까지 추가할 수 있습니다.'); return; }
    const newTask = { id: uid(), name, detailEnabled: true, color: TASK_COLOR_PALETTE[state.taskTypes.length % TASK_COLOR_PALETTE.length] };
    state.taskTypes.push(newTask);
    els.quickNewTaskName.value = '';
    selectQuickTask(newTask.id, {enable:true, closePalette:true, notify:true});
  }

  function getDashboardTask() {
    const settings = ensureQuickSettings();
    const valid = getTask(pestDashboardTaskId);
    if (valid) return valid;
    const quick = getTask(settings.quickTaskId);
    pestDashboardTaskId = quick?.id || state.taskTypes[0]?.id || null;
    return getTask(pestDashboardTaskId);
  }

  function renderPestDashboardPanel() {
    if (!state.taskTypes.length) {
      els.pestTaskFilter.innerHTML = '<option>작업 없음</option>';
      els.pestDashboardStats.innerHTML = '<div class="stat"><b>0</b><span>전체 농지</span></div><div class="stat"><b>0</b><span>작업된 곳</span></div><div class="stat"><b>0</b><span>안된 곳</span></div>';
      els.pestDashboardList.innerHTML = '<div class="empty">작업관리에서 작업을 추가하세요.</div>';
      return;
    }
    const task = getDashboardTask();
    if (!task) return;
    els.pestTaskFilter.innerHTML = state.taskTypes.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    els.pestTaskFilter.value = task.id;
    els.pestStatusFilter.value = pestDashboardStatus;
    const entries = state.parcels.map(parcel => ({ parcel, work:getWork(parcel, task.id) }));
    let filtered = entries.slice();
    if (pestDashboardStatus === 'pending') filtered = filtered.filter(x => !x.work.done);
    if (pestDashboardStatus === 'done') filtered = filtered.filter(x => x.work.done);
    filtered.sort((a,b) => {
      if (a.work.done !== b.work.done) return a.work.done ? 1 : -1;
      return String(a.parcel.number).localeCompare(String(b.parcel.number),'ko',{numeric:true});
    });
    const doneCount = entries.filter(x => x.work.done).length;
    const pendingCount = entries.length - doneCount;
    els.pestDashboardStats.innerHTML = `<div class="stat"><b>${entries.length}</b><span>전체 농지</span></div><div class="stat"><b>${doneCount}</b><span>작업된 곳</span></div><div class="stat"><b>${pendingCount}</b><span>안된 곳</span></div>`;
    const color = taskColor(task);
    els.pestDashboardList.innerHTML = filtered.length ? filtered.map(({parcel,work}) => `
      <div class="dashboard-card">
        <div class="dashboard-card-head">
          <div><strong>${escapeHtml(parcel.number)}. ${escapeHtml(parcel.name || parcel.address)}</strong><p>${escapeHtml(parcel.address)} · ${escapeHtml(task.name)}</p></div>
          <button class="dashboard-toggle-btn ${work.done?'on':''}" style="--task-color:${color}" type="button" data-dashboard-toggle="${parcel.id}">${work.done?'ON':'OFF'}</button>
        </div>
        <div class="dashboard-pair">
          <div class="mini"><b>${work.done?'작업됨':'안됨'}</b><span>상태</span></div>
          <div class="mini"><b>${work.date ? escapeHtml(formatDate(work.date)) : '-'}</b><span>날짜</span></div>
        </div>
        <div class="dashboard-note-row">
          <input type="text" data-dashboard-note="${parcel.id}" value="${escapeHtml(work.note || '')}" placeholder="비고 입력" />
          <button type="button" data-dashboard-save-note="${parcel.id}">비고 저장</button>
        </div>
      </div>`).join('') : '<div class="empty">조건에 맞는 농지가 없습니다.</div>';
    els.pestDashboardList.querySelectorAll('[data-dashboard-toggle]').forEach(btn => btn.onclick = () => toggleWork(btn.dataset.dashboardToggle, task.id));
    els.pestDashboardList.querySelectorAll('[data-dashboard-save-note]').forEach(btn => btn.onclick = () => {
      const parcel = getParcel(btn.dataset.dashboardSaveNote);
      if (!parcel) return;
      const input = els.pestDashboardList.querySelector(`[data-dashboard-note="${parcel.id}"]`);
      const work = getWork(parcel, task.id);
      work.note = input?.value.trim() || '';
      state.logs.push({ id:uid(), type:'work-note', parcelId:parcel.id, taskId:task.id, date:nowIso(), note:work.note });
      saveState();
      showQuickToast('비고 저장', `${parcel.number}. ${parcel.name || parcel.address} · ${task.name}`);
    });
  }

  function renderDashboard() {
    renderPestDashboardPanel();
  }

  function openParcelModal(parcel=null, latlng=null) {
    els.parcelForm.reset();
    els.parcelId.value = parcel?.id || '';
    els.parcelModalTitle.textContent = parcel ? '농지 정보 수정' : '농지 추가';
    els.parcelNumber.value = parcel?.number || String(state.parcels.length + 1);
    els.parcelName.value = parcel?.name || '';
    els.parcelAddress.value = parcel?.address || '';
    els.parcelArea.value = parcel?.area || '';
    els.parcelOwner.value = parcel?.owner || '';
    els.parcelCourse.value = parcel?.course || '';
    els.parcelVariety.value = parcel?.variety || '';
    els.parcelNavName.value = parcel?.navName || '';
    els.parcelLat.value = parcel?.lat ?? latlng?.lat ?? '';
    els.parcelLng.value = parcel?.lng ?? latlng?.lng ?? '';
    els.parcelMemo.value = parcel?.memo || '';
    els.parcelModalWrap.classList.add('show');
  }

  function saveParcelFromForm(event) {
    event.preventDefault();
    const id = els.parcelId.value || uid();
    const existing = getParcel(id);
    const latRaw = els.parcelLat.value.trim();
    const lngRaw = els.parcelLng.value.trim();
    const data = {
      id,
      number: els.parcelNumber.value.trim(),
      name: els.parcelName.value.trim(),
      address: els.parcelAddress.value.trim(),
      area: els.parcelArea.value.trim(),
      owner: els.parcelOwner.value.trim(),
      course: els.parcelCourse.value.trim(),
      variety: els.parcelVariety.value.trim(),
      navName: els.parcelNavName.value.trim(),
      navUrl: existing?.navUrl || '',
      lat: latRaw === '' ? null : Number(latRaw),
      lng: lngRaw === '' ? null : Number(lngRaw),
      memo: els.parcelMemo.value.trim(),
      works: existing?.works || {},
      source: existing?.source || '직접 추가',
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso()
    };
    if (!data.number || !data.address || ((latRaw || lngRaw) && !hasLocation(data))) {
      alert('농지 번호, 주소, 지도 위치를 확인하세요.'); return;
    }
    if (existing) Object.assign(existing, data); else state.parcels.push(data);
    selectedParcelId = id;
    closeModal('parcelModalWrap');
    exitAddMode();
    saveState();
    openParcel(id);
  }

  function deleteSelectedParcel() {
    const p = getParcel(selectedParcelId); if (!p) return;
    if (!confirm(`${p.number}. ${p.name || p.address} 농지를 삭제할까요?\n작업·물관리 기록도 함께 삭제됩니다.`)) return;
    state.parcels = state.parcels.filter(x => x.id !== p.id);
    state.logs = state.logs.filter(x => x.parcelId !== p.id);
    state.waterSessions = state.waterSessions.filter(x => x.parcelId !== p.id);
    selectedParcelId = null;
    closeDrawer(); saveState();
  }

  function enterAddMode() {
    quickPaletteOpen = false;
    exitPlaceMode();
    ensureQuickSettings();
    state.settings.quickWorkEnabled = false;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderQuickWork();
    addMode = true; pendingLatLng = null;
    els.addParcelBtn.classList.add('active'); els.addModeBanner.classList.add('show');
    closeDrawer(); closeMenu();
  }
  function exitAddMode() {
    addMode = false; pendingLatLng = null;
    els.addParcelBtn.classList.remove('active'); els.addModeBanner.classList.remove('show');
  }

  function unlocatedParcels() {
    return state.parcels.filter(p => !hasLocation(p))
      .sort((a,b)=>String(a.number).localeCompare(String(b.number),'ko',{numeric:true}) || String(a.address).localeCompare(String(b.address),'ko'));
  }
  function updatePlaceBanner() {
    if (!placeModeParcelId) return;
    const p = getParcel(placeModeParcelId);
    const remaining = unlocatedParcels().length;
    if (!p) return exitPlaceMode();
    els.addModeBanner.textContent = `${p.number}. ${p.name || p.address} 위치를 지도에서 터치하세요 · 미지정 ${remaining}곳`;
  }
  function startPlaceMode(parcelId=null) {
    quickPaletteOpen = false;
    ensureQuickSettings();
    state.settings.quickWorkEnabled = false;
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderQuickWork();
    const target = parcelId ? getParcel(parcelId) : unlocatedParcels()[0];
    if (!target) { alert('위치가 지정되지 않은 농지가 없습니다.'); return; }
    addMode = false;
    placeModeParcelId = target.id;
    els.addParcelBtn.classList.remove('active');
    els.placeParcelBtn.classList.add('active');
    els.addModeBanner.classList.add('show');
    updatePlaceBanner();
    closeDrawer();
    closeMenu();
    if (target.navUrl) window.open(target.navUrl, '_blank');
  }
  function exitPlaceMode() {
    placeModeParcelId = null;
    els.placeParcelBtn.classList.remove('active');
    if (!addMode) els.addModeBanner.classList.remove('show');
  }
  function assignPlaceLocation(latlng) {
    const p = getParcel(placeModeParcelId);
    if (!p) return exitPlaceMode();
    p.lat = Number(latlng.lat);
    p.lng = Number(latlng.lng);
    p.locationSource = 'manual';
    p.locationResolvedAddress = normalizedParcelAddress(p);
    p.updatedAt = nowIso();
    const placedId = p.id;
    placeModeParcelId = null;
    saveState();
    map.setView([p.lat,p.lng], Math.max(map.getZoom(),16));
    const next = unlocatedParcels()[0];
    if (next) {
      placeModeParcelId = next.id;
      els.placeParcelBtn.classList.add('active');
      els.addModeBanner.classList.add('show');
      updatePlaceBanner();
      if (next.navUrl) window.open(next.navUrl, '_blank');
    } else {
      exitPlaceMode();
      openParcel(placedId);
      alert('모든 농지의 지도 위치 지정이 완료되었습니다.');
    }
  }

  function openMenu() { els.sideMenu.classList.add('open'); els.scrim.classList.add('show'); }
  function closeMenu() { els.sideMenu.classList.remove('open'); els.scrim.classList.remove('show'); }
  function openModal(id) { document.getElementById(id).classList.add('show'); }
  function closeModal(id) { document.getElementById(id).classList.remove('show'); }

  function locateUser() {
    if (!navigator.geolocation) { alert('이 기기는 현재 위치 기능을 지원하지 않습니다.'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      map.setView(ll, 17);
      L.circleMarker(ll, { radius:7, weight:3, color:'#2563a8', fillColor:'#fff', fillOpacity:1 }).addTo(map).bindPopup('현재 위치').openPopup();
    }, () => alert('현재 위치 권한을 허용해 주세요.'), { enableHighAccuracy:true, timeout:10000 });
  }

  function cellText(v) {
    return v === null || v === undefined ? '' : String(v).trim();
  }
  function numberOrNull(v) {
    const text = String(v ?? '').replace(/,/g,'').trim();
    if (!text) return null;
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }
  function fieldFrom(row, aliases) {
    for (const key of aliases) {
      if (Object.prototype.hasOwnProperty.call(row,key) && cellText(row[key])) return row[key];
    }
    return '';
  }
  function normalizeImportedParcel(p, index) {
    const lat = numberOrNull(p.lat);
    const lng = numberOrNull(p.lng);
    return {
      id: p.id || uid(),
      number: cellText(p.number) || String(state.parcels.length + index + 1),
      name: cellText(p.name),
      address: cellText(p.address),
      area: cellText(p.area).replace(/,/g,'').replace(/㎡/g,'').trim(),
      owner: cellText(p.owner),
      course: cellText(p.course),
      variety: cellText(p.variety),
      navName: cellText(p.navName || p.name || p.address),
      navUrl: cellText(p.navUrl),
      lat, lng,
      locationSource: (lat !== null && lng !== null) ? 'excel' : '',
      memo: cellText(p.memo),
      works: {},
      source: cellText(p.source) || '엑셀 가져오기',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
  }
  function parseOriginalExcel(workbook) {
    const landSheet = workbook.Sheets['경작지 확인'];
    const routeSheet = workbook.Sheets['물보는 순서'];
    if (!landSheet || !routeSheet) return null;
    const lands = XLSX.utils.sheet_to_json(landSheet, {header:1, defval:''});
    const routes = XLSX.utils.sheet_to_json(routeSheet, {header:1, defval:''});
    const landHeader = lands.findIndex(r => r.some(v=>cellText(v)==='순번') && r.some(v=>cellText(v)==='지주'));
    const routeHeader = routes.findIndex(r => r.some(v=>cellText(v)==='순번') && r.some(v=>cellText(v)==='지명'));
    if (landHeader < 0 || routeHeader < 0) return null;
    const a = lands.slice(landHeader+1).filter(r=>cellText(r[0]) || cellText(r[3]) || cellText(r[4]));
    const b = routes.slice(routeHeader+1).filter(r=>cellText(r[0]) || cellText(r[1]) || cellText(r[2]));
    const count = Math.max(a.length,b.length);
    const result = [];
    for (let i=0;i<count;i++) {
      const x=a[i]||[], y=b[i]||[];
      const address = cellText(y[2]) || cellText(x[10]) || `${cellText(x[3])} ${cellText(x[4])}`.trim();
      if (!address) continue;
      result.push(normalizeImportedParcel({
        number: x[0] || y[0],
        owner: x[1],
        name: y[1] || x[2],
        address,
        area: x[5],
        variety: x[7] || y[4],
        memo: [cellText(x[8]),cellText(y[3])].filter(Boolean).join(' / '),
        navUrl: y[5],
        course: y[6],
        source: '경작지.xlsx'
      },i));
    }
    return result;
  }
  function parseStandardExcel(workbook) {
    const sheetName = workbook.SheetNames.includes('농지목록') ? '농지목록' : workbook.SheetNames[0];
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1, defval:''});
    const headerIndex = matrix.findIndex(r => r.some(v=>['농지번호','번호','순번','number'].includes(cellText(v))) &&
      r.some(v=>['주소','지번','소재지','address'].includes(cellText(v))));
    if (headerIndex < 0) return [];
    const headers = matrix[headerIndex].map(cellText);
    const rows = matrix.slice(headerIndex+1).filter(r=>r.some(v=>cellText(v))).map(r => {
      const obj = {};
      headers.forEach((h,i)=>{ if (h) obj[h] = r[i] ?? ''; });
      return obj;
    });
    return rows.map((row,i)=>normalizeImportedParcel({
      id: fieldFrom(row,['ID','id']),
      number: fieldFrom(row,['농지번호','번호','순번','number']),
      name: fieldFrom(row,['농지명','지명','이름','name']),
      address: fieldFrom(row,['주소','지번','소재지','address']),
      area: fieldFrom(row,['넓이㎡','면적㎡','면적','넓이','area']),
      owner: fieldFrom(row,['지주','소유자','owner']),
      course: fieldFrom(row,['코스','course']),
      variety: fieldFrom(row,['품종','variety']),
      navName: fieldFrom(row,['내비검색명','내비명','navName']),
      navUrl: fieldFrom(row,['내비링크','네비','내비URL','navUrl']),
      lat: fieldFrom(row,['위도','lat','latitude']),
      lng: fieldFrom(row,['경도','lng','longitude']),
      memo: fieldFrom(row,['비고','메모','memo']),
      source: '엑셀 가져오기'
    },i)).filter(p=>p.address || (hasLocation(p) && p.name));
  }
  function mergeImportedParcels(imported) {
    let added=0, updated=0, located=0;
    imported.forEach(incoming => {
      const existing = state.parcels.find(p=>parcelKey(p)===parcelKey(incoming)) ||
        state.parcels.find(p=>String(p.address||'').replace(/\s+/g,'')===String(incoming.address||'').replace(/\s+/g,''));
      if (existing) {
        const keepWorks = existing.works || {};
        const keepLat = hasLocation(existing) && !hasLocation(incoming);
        Object.assign(existing, incoming, {
          id: existing.id,
          works: keepWorks,
          lat: keepLat ? existing.lat : incoming.lat,
          lng: keepLat ? existing.lng : incoming.lng,
          locationSource: keepLat ? existing.locationSource : (hasLocation(incoming) ? (incoming.locationSource || 'excel') : existing.locationSource),
          createdAt: existing.createdAt || incoming.createdAt,
          updatedAt: nowIso()
        });
        updated++;
      } else {
        state.parcels.push(incoming);
        added++;
      }
      if (hasLocation(incoming)) located++;
    });
    state.seedVersion = SEED_VERSION;
    deduplicateParcels(state);
    saveState();
    return {added,updated,located};
  }
  function importExcel(file) {
    if (!globalThis.XLSX) { alert('엑셀 기능을 불러오지 못했습니다. 인터넷 연결 후 다시 열어 주세요.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, {type:'array'});
        const imported = parseOriginalExcel(workbook) || parseStandardExcel(workbook);
        if (!imported.length) throw new Error('농지 데이터 없음');
        const result = mergeImportedParcels(imported);
        closeMenu();
        alert(`엑셀 불러오기 완료\n새 농지 ${result.added}곳 · 갱신 ${result.updated}곳 · 좌표 포함 ${result.located}곳\n중복 농지는 자동으로 합쳐집니다.`);
      } catch(e) {
        console.error(e);
        alert('엑셀에서 농지 데이터를 읽지 못했습니다. 농지목록 또는 기존 경작지 양식을 확인하세요.');
      }
    };
    reader.readAsArrayBuffer(file);
  }
  function exportExcel() {
    const sorted = state.parcels.slice().sort((a,b)=>String(a.number).localeCompare(String(b.number),'ko',{numeric:true}) || String(a.address).localeCompare(String(b.address),'ko'));
    const parcelRows = [['ID','농지번호','농지명','주소','넓이㎡','지주','코스','품종','내비검색명','내비링크','위도','경도','위치상태','비고']];
    sorted.forEach(p=>parcelRows.push([
      p.id,p.number,p.name,p.address,p.area,p.owner,p.course,p.variety||'',p.navName||'',p.navUrl||'',
      hasLocation(p)?Number(p.lat):'',hasLocation(p)?Number(p.lng):'',hasLocation(p)?'지도표시':'미지정',p.memo||''
    ]));
    const logRows = [['기록일시','농지번호','농지명','주소','기록구분','작업명','내용']];
    state.logs.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(log=>{
      const p=getParcel(log.parcelId)||{}, t=log.taskId?getTask(log.taskId):null;
      logRows.push([formatDate(log.date),p.number||'',p.name||'',p.address||'',log.type,t?.name||'',log.note||'']);
    });
    const waterRows = [['농지번호','농지명','시작','예정종료','실제종료','설정시간','상태']];
    state.waterSessions.forEach(s=>{
      const p=getParcel(s.parcelId)||{};
      waterRows.push([p.number||'',p.name||'',formatDate(s.startAt),formatDate(s.plannedEndAt),formatDate(s.endAt),s.hours||'',s.status||'']);
    });
    if (!globalThis.XLSX) { exportSpreadsheetXmlFallback(parcelRows,logRows,waterRows); showQuickToast('엑셀 호환 저장','인터넷 없이 열 수 있는 .xls 파일로 저장했습니다.'); return; }
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(parcelRows);
    const ws2 = XLSX.utils.aoa_to_sheet(logRows);
    const ws3 = XLSX.utils.aoa_to_sheet(waterRows);
    ws1['!cols'] = [18,9,18,20,10,13,12,12,18,26,12,12,11,28].map(w=>({wch:w}));
    ws2['!cols'] = [20,9,18,20,14,16,35].map(w=>({wch:w}));
    ws3['!cols'] = [9,18,20,20,20,10,12].map(w=>({wch:w}));
    XLSX.utils.book_append_sheet(wb,ws1,'농지목록');
    XLSX.utils.book_append_sheet(wb,ws2,'작업기록');
    XLSX.utils.book_append_sheet(wb,ws3,'물관리');
    XLSX.writeFile(wb,`농지관리_${dateStamp()}.xlsx`);
  }

  function exportJson() {
    downloadFile(`농지관리_백업_${dateStamp()}.json`, JSON.stringify(state,null,2), 'application/json');
  }
  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.parcels) || !Array.isArray(data.taskTypes)) throw new Error('형식 오류');
        normalizeTaskColors(data.taskTypes);
        state = { parcels:data.parcels, taskTypes:data.taskTypes, logs:Array.isArray(data.logs)?data.logs:[], waterSessions:Array.isArray(data.waterSessions)?data.waterSessions:[], settings:data.settings && typeof data.settings==='object' ? data.settings : {quickWorkEnabled:false, quickTaskId:data.taskTypes[0]?.id || null}, seedVersion:data.seedVersion || SEED_VERSION };
        deduplicateParcels(state);
        assignEmbeddedMapLocations(state);
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        selectedParcelId = null; closeDrawer(); renderAll(); alert('백업 데이터를 불러왔습니다.');
      } catch(e) { alert('올바른 농지관리 JSON 백업 파일이 아닙니다.'); }
    };
    reader.readAsText(file);
  }
  function exportCsv() {
    const rows = [['기록일시','농지번호','농지명','주소','기록구분','작업명','내용']];
    state.logs.slice().sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(log => {
      const p = getParcel(log.parcelId) || {};
      const t = log.taskId ? getTask(log.taskId) : null;
      rows.push([formatDate(log.date),p.number||'',p.name||'',p.address||'',log.type,t?.name||'',log.note||'']);
    });
    const csv = '\uFEFF' + rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadFile(`농지작업기록_${dateStamp()}.csv`, csv, 'text/csv;charset=utf-8');
  }
  function downloadFile(name, content, type) {
    const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function dateStamp() { return new Date().toISOString().slice(0,10).replaceAll('-',''); }

  function showAppError(message) {
    if (!els?.appErrorBanner) return;
    els.appErrorText.textContent = `일부 기능 오류: ${String(message||'알 수 없는 오류').slice(0,120)}`;
    els.appErrorBanner.classList.add('show');
  }
  function repairApp() {
    try {
      deduplicateParcels(state);
      normalizeTaskColors(state.taskTypes);
      assignEmbeddedMapLocations(state);
      state.logs=(state.logs||[]).filter(l=>l&&l.parcelId&&l.type&&l.date);
      state.waterSessions=(state.waterSessions||[]).filter(s=>s&&s.parcelId&&s.startAt);
      safeStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      writeSnapshot(state,'자가 복구 완료',true);
      appRuntimeErrors.length=0;
      els.appErrorBanner.classList.remove('show');
      renderAll();
      showQuickToast('복구 완료','데이터와 지도 표식을 다시 구성했습니다.');
    } catch (e) { showAppError(e.message); }
  }

  function updateRecoveryStatus() {
    if (!els?.snapshotStatus) return;
    const latest=readSnapshots()[0];
    els.snapshotStatus.textContent=latest?`${formatDate(latest.createdAt)} · ${latest.reason}`:'복구본 없음';
    els.storageStatus.textContent=persistentStorageAvailable?'기기 저장소 사용 중':'임시 저장 · 백업 권장';
    els.storageStatus.classList.toggle('temporary',!persistentStorageAvailable);
  }
  function restoreLatestSnapshot() {
    const latest=latestValidSnapshot();
    if (!latest) { alert('복원할 자동복구본이 없습니다.'); return; }
    if (!confirm(`${formatDate(latest.snap.createdAt)} 복구본으로 되돌릴까요?\n현재 상태는 복구본으로 한 번 더 저장됩니다.`)) return;
    writeSnapshot(state,'복원 전 상태',true);
    state=latest.data;
    state.logs=Array.isArray(state.logs)?state.logs:[];
    state.waterSessions=Array.isArray(state.waterSessions)?state.waterSessions:[];
    state.settings=state.settings&&typeof state.settings==='object'?state.settings:{};
    normalizeTaskColors(state.taskTypes); deduplicateParcels(state); assignEmbeddedMapLocations(state);
    safeStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    selectedParcelId=null; closeDrawer(); renderAll(); closeMenu();
    showQuickToast('자동복구 완료',formatDate(latest.snap.createdAt));
  }

  let diagnosticsTimer=null;
  function calculateQualityScore() {
    const checks=[];
    const add=(name,max,earned,detail='')=>{
      earned=Math.max(0,Math.min(max,Number(earned)||0));
      checks.push({name,points:max,earned,ok:earned>=max,detail});
    };
    const total=Math.max(1,state.parcels.length);
    const located=state.parcels.filter(hasLocation).length;
    const verified=state.parcels.filter(isVerifiedLocation).length;
    const approximate=state.parcels.filter(isApproximateLocation).length;
    const exactPoints=Math.round(35*(verified/total));
    add('농지 데이터',10,state.parcels.length>=81?10:Math.round(10*state.parcels.length/81),`${state.parcels.length}곳`);
    add('정확 위치',35,exactPoints,`정확 ${verified}/${state.parcels.length} · 근사 ${approximate}`);
    add('지도 표식',10,markers.size===located?10:Math.round(10*markers.size/Math.max(1,located)),`${markers.size}/${located}`);
    add('빠른작업',10,state.taskTypes.length>0 && Boolean(ensureQuickSettings().quickTaskId)?10:0,`${state.taskTypes.length}개`);
    add('작업 기록',8,Array.isArray(state.logs)?8:0);
    add('물관리',8,Array.isArray(state.waterSessions)?8:0);
    add('저장 시스템',5,5,'자동저장·백업 가능');
    add('자동 복구',8,readSnapshots().length>0?8:0,`${readSnapshots().length}개`);
    add('오류 상태',6,appRuntimeErrors.length===0?6:0,`${appRuntimeErrors.length}건`);
    const score=checks.reduce((sum,c)=>sum+c.earned,0);
    return {score,checks,verified,approximate};
  }
  function renderDiagnostics(showResult=false) {
    if (!els?.qualityScore) return;
    const result=calculateQualityScore();
    els.qualityScore.textContent=`${result.score}점`;
    els.qualityMeterBar.style.width=`${result.score}%`;
    const failed=result.checks.filter(c=>!c.ok);
    els.qualityDetail.textContent=`정확좌표 ${result.verified}/${state.parcels.length} · 95점 목표 ${Math.ceil(state.parcels.length*0.86)}곳 · 근사 ${result.approximate}`;
    updateRecoveryStatus();
    if (showResult) alert(`앱 자가진단 ${result.score}/100\n정확 좌표 ${Math.ceil(state.parcels.length*0.86)}곳 이상이 확인되어야 95점 이상입니다.\n${result.checks.map(c=>`${c.ok?'✓':'△'} ${c.name}: ${c.earned}/${c.points} ${c.detail}`).join('\n')}`);
    return result;
  }
  function scheduleDiagnostics() {
    clearTimeout(diagnosticsTimer);
    diagnosticsTimer=setTimeout(()=>renderDiagnostics(false),180);
  }

  function undoLastQuickAction() {
    const action=lastQuickAction;
    if (!action) return;
    const parcel=getParcel(action.parcelId), task=getTask(action.taskId);
    if (!parcel||!task) return;
    const work=getWork(parcel,task.id);
    if (!work.done || work.date!==action.completedAt) { lastQuickAction=null; return; }
    work.done=false; work.date=null;
    state.logs.push({id:uid(),type:'work-cancel',parcelId:parcel.id,taskId:task.id,date:nowIso(),note:'빠른작업 되돌리기'});
    lastQuickAction=null;
    persistStateQuietly('빠른작업 되돌리기'); renderAll();
    showQuickToast('작업 취소',`${parcel.number}. ${parcel.name||parcel.address} · ${task.name}`);
  }

  function updateMapConnectionBadge() {
    if (!els?.mapConnectionBadge) return;
    const loaded=document.getElementById('map')?.dataset.tilesLoaded==='1';
    els.mapConnectionBadge.textContent=loaded?'배경지도 연결됨':'배경지도 없음 · 경작지 표식은 사용 가능';
    els.mapConnectionBadge.classList.add('show');
    setTimeout(()=>{ if(loaded) els.mapConnectionBadge.classList.remove('show'); },1800);
  }
  window.addEventListener('farmland:tileloaded',updateMapConnectionBadge);
  setTimeout(updateMapConnectionBadge,2500);

  function exportSpreadsheetXmlFallback(parcelRows,logRows,waterRows) {
    const xmlEscape=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const sheet=(name,rows)=>`<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.map(r=>`<Row>${r.map(c=>`<Cell><Data ss:Type="String">${xmlEscape(c)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet>`;
    const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheet('농지목록',parcelRows)}${sheet('작업기록',logRows)}${sheet('물관리',waterRows)}</Workbook>`;
    downloadFile(`농지관리_${dateStamp()}.xls`,xml,'application/vnd.ms-excel');
  }

  map.on('click', e => {
    if (placeModeParcelId) {
      assignPlaceLocation(e.latlng);
      return;
    }
    if (!addMode) return;
    pendingLatLng = e.latlng;
    openParcelModal(null, e.latlng);
  });

  els.quickUndoBtn.onclick = undoLastQuickAction;
  els.appRepairBtn.onclick = repairApp;
  els.runDiagnosticsBtn.onclick = () => renderDiagnostics(true);
  els.restoreSnapshotBtn.onclick = restoreLatestSnapshot;
  els.menuBtn.onclick = openMenu;
  els.scrim.onclick = closeMenu;
  els.mapTypeBtn.onclick = toggleMapType;
  els.quickWorkBtn.onclick = () => {
    const settings = ensureQuickSettings();
    if (!settings.quickWorkEnabled) {
      if (!state.taskTypes.length) { renderQuickWork(); openModal('quickWorkModalWrap'); return; }
      setQuickWorkEnabled(true);
      const task = getTask(state.settings.quickTaskId);
      if (task) showQuickToast('빠른 작업 시작', `${task.name} · 지도 표식을 누르면 완료`);
      return;
    }
    const task = getTask(settings.quickTaskId);
    renderQuickWork();
    openModal('quickWorkModalWrap');
    if (isWaterTask(task)) openWaterForParcel(selectedParcelId);
  };
  els.quickSwitchOffBtn.onclick = () => setQuickWorkEnabled(false);
  els.quickPrevBtn.onclick = () => cycleQuickTask(-1);
  els.quickNextBtn.onclick = () => cycleQuickTask(1);
  els.quickCurrentBtn.onclick = () => toggleQuickPalette();
  els.quickListBtn.onclick = openQuickParcelChecklist;
  els.quickWorkOnBtn.onclick = () => { setQuickWorkEnabled(true); closeModal('quickWorkModalWrap'); };
  els.quickWorkOffBtn.onclick = () => { setQuickWorkEnabled(false); closeModal('quickWorkModalWrap'); };
  els.addParcelBtn.onclick = () => addMode ? exitAddMode() : enterAddMode();
  els.placeParcelBtn.onclick = () => {};
  els.locateBtn.onclick = locateUser;
  els.closeDrawerBtn.onclick = closeDrawer;
  els.editParcelBtn.onclick = () => { const p = getParcel(selectedParcelId); if (p) openParcelModal(p); };
  els.deleteParcelBtn.onclick = deleteSelectedParcel;
  els.parcelForm.addEventListener('submit', saveParcelFromForm);
  els.dashboardBtn.onclick = () => { pestDashboardTaskId = ensureQuickSettings().quickTaskId || state.taskTypes[0]?.id || null; renderDashboard(); openModal('dashboardModalWrap'); };
  els.waterQuickBtn.onclick = () => {
    if (!state.parcels.length) { alert('먼저 농지를 추가하세요.'); return; }
    const id = selectedParcelId || state.parcels[0].id;
    openParcel(id,'water');
  };
  els.quickAddTaskBtn.onclick = addQuickTaskType;
  els.quickNewTaskName.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); addQuickTaskType(); } });
  els.pestTaskFilter.onchange = () => { pestDashboardTaskId = els.pestTaskFilter.value; selectQuickTask(pestDashboardTaskId, {enable:state.settings.quickWorkEnabled, closePalette:true, notify:false}); renderDashboard(); };
  els.pestStatusFilter.onchange = () => { pestDashboardStatus = els.pestStatusFilter.value; renderDashboard(); };
  els.parcelCheckStatusFilter.onchange = () => { parcelCheckFilter = els.parcelCheckStatusFilter.value; renderQuickParcelChecklist(); };
  els.parcelCheckSearch.oninput = () => { parcelCheckSearchText = els.parcelCheckSearch.value; renderQuickParcelChecklist(); };
  els.importExcelBtn.onclick = () => els.importExcelFile.click();
  els.importExcelFile.onchange = () => { if (els.importExcelFile.files[0]) importExcel(els.importExcelFile.files[0]); els.importExcelFile.value=''; };
  els.exportExcelBtn.onclick = exportExcel;
  els.autoLocateBtn.onclick = () => autoLocateParcels({automatic:false});
  els.geoCancelBtn.onclick = () => {
    if (autoLocateRunning) {
      autoLocateAbort = true;
      els.geoStatusTitle.textContent = '중지 처리 중';
    } else showGeoStatus(false);
  };
  els.placePendingMenuBtn.onclick = () => {};
  els.exportJsonBtn.onclick = exportJson;
  els.importJsonBtn.onclick = () => els.importFile.click();
  els.importFile.onchange = () => { if (els.importFile.files[0]) importJson(els.importFile.files[0]); els.importFile.value=''; };
  els.exportCsvBtn.onclick = exportCsv;

  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.close)));
  document.querySelectorAll('.modal-wrap').forEach(wrap => wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(wrap.id); }));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.tab)));

  // 진행 중 물관리 세션은 앱을 다시 열어도 남은 시간을 이어서 계산합니다.
  setInterval(() => {
    const expired = state.waterSessions.filter(s => s.status==='running' && new Date(s.plannedEndAt).getTime() <= Date.now());
    if (expired.length) {
      expired.forEach(s => {
        s.status='completed'; s.endAt=s.plannedEndAt;
        state.logs.push({ id:uid(), type:'water-end', parcelId:s.parcelId, date:s.endAt, hours:s.hours, note:'물관리 자동 완료' });
      });
      saveState();
    }
  }, 30000);

  writeSnapshot(state,'초기 정상 상태',true);
  renderAll();
  updateRecoveryStatus();
  setTimeout(()=>renderDiagnostics(false),400);
  // 근사 좌표가 남아 있으면 앱을 열 때 백그라운드 자동검증을 한 번 시도합니다.
  setTimeout(() => {
    const score = calculateQualityScore().score;
    let last = 0;
    try { last = new Date(safeStorage.getItem('farmland_exact_verify_last_v2') || 0).getTime(); } catch (_) {}
    const retryDue = !last || Date.now() - last > 6 * 60 * 60 * 1000;
    if (false && score < 95 && retryDue && navigator.onLine !== false && locationVerificationTargets().length) {
      autoLocateParcels({automatic:true});
    }
  }, 1400);
})();
