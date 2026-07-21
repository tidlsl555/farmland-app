/* Leaflet 외부 스크립트가 차단되는 content:// 환경용 내장 지도 엔진 */
(function () {
  if (window.L) return;
  const TILE = 256;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toLatLng = value => Array.isArray(value) ? {lat:Number(value[0]), lng:Number(value[1])} : {lat:Number(value.lat), lng:Number(value.lng)};
  function project(lat, lng, zoom) {
    lat = clamp(Number(lat), -85.05112878, 85.05112878);
    const scale = TILE * Math.pow(2, zoom);
    const x = (Number(lng) + 180) / 360 * scale;
    const sin = Math.sin(lat * Math.PI / 180);
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    return {x, y};
  }
  function unproject(x, y, zoom) {
    const scale = TILE * Math.pow(2, zoom);
    const lng = x / scale * 360 - 180;
    const n = Math.PI - 2 * Math.PI * y / scale;
    const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return {lat, lng};
  }
  class NativeMap {
    constructor(id, options) {
      this._el = typeof id === 'string' ? document.getElementById(id) : id;
      this._options = options || {};
      this._center = {lat:36.62, lng:128.29};
      this._zoom = 12;
      this._events = {};
      this._layers = new Set();
      this._tileLayer = null;
      this._drag = null;
      this._raf = 0;
      this._el.classList.add('leaflet-container', 'native-map-fallback');
      this._el.innerHTML = '';
      this._tilePane = document.createElement('div');
      this._tilePane.className = 'native-tile-pane';
      this._vectorPane = document.createElementNS('http://www.w3.org/2000/svg','svg');
      this._vectorPane.classList.add('native-vector-pane');
      Object.assign(this._vectorPane.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',overflow:'hidden'});
      this._markerPane = document.createElement('div');
      this._markerPane.className = 'native-marker-pane';
      this._controlPane = document.createElement('div');
      this._controlPane.className = 'native-control-pane';
      this._attribution = document.createElement('div');
      this._attribution.className = 'leaflet-control-attribution native-attribution';
      this._el.append(this._tilePane, this._vectorPane, this._markerPane, this._controlPane, this._attribution);
      this._bindInteractions();
    }
    _bindInteractions() {
      const start = e => {
        if (e.button !== undefined && e.button !== 0) return;
        if (e.target.closest('button,.native-map-marker,.native-map-tooltip,.leaflet-control')) return;
        this._drag = {x:e.clientX, y:e.clientY, moved:false};
        try { this._el.setPointerCapture(e.pointerId); } catch (_) {}
      };
      const move = e => {
        if (!this._drag) return;
        const dx = e.clientX - this._drag.x;
        const dy = e.clientY - this._drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) this._drag.moved = true;
        const cp = project(this._center.lat, this._center.lng, this._zoom);
        this._center = unproject(cp.x - dx, cp.y - dy, this._zoom);
        this._drag.x = e.clientX; this._drag.y = e.clientY;
        this._scheduleRender();
      };
      const end = e => {
        if (!this._drag) return;
        const moved = this._drag.moved;
        this._drag = null;
        if (!moved) {
          const rect = this._el.getBoundingClientRect();
          const centerPx = project(this._center.lat, this._center.lng, this._zoom);
          const p = unproject(centerPx.x + (e.clientX - rect.left - rect.width/2), centerPx.y + (e.clientY - rect.top - rect.height/2), this._zoom);
          this._fire('click', {latlng:p, originalEvent:e});
        }
      };
      this._el.addEventListener('pointerdown', start);
      this._el.addEventListener('pointermove', move);
      this._el.addEventListener('pointerup', end);
      this._el.addEventListener('pointercancel', () => { this._drag = null; });
      this._el.addEventListener('wheel', e => {
        e.preventDefault();
        this._zoom = clamp(this._zoom + (e.deltaY < 0 ? 1 : -1), 3, 20);
        this._render();
      }, {passive:false});
      let pinch = null;
      this._el.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
          pinch = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        }
      }, {passive:true});
      this._el.addEventListener('touchmove', e => {
        if (e.touches.length === 2 && pinch) {
          const now = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
          if (now > pinch * 1.3) { this._zoom = clamp(this._zoom + 1,3,20); pinch=now; this._render(); }
          else if (now < pinch / 1.3) { this._zoom = clamp(this._zoom - 1,3,20); pinch=now; this._render(); }
        }
      }, {passive:true});
      this._el.addEventListener('touchend', () => { pinch = null; }, {passive:true});
    }
    _scheduleRender() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); });
    }
    _render() {
      this._renderTiles();
      for (const layer of this._layers) if (layer && typeof layer._render === 'function' && !layer._isTileLayer) layer._render();
    }
    _renderTiles() {
      const layer = this._tileLayer;
      if (!layer) { this._tilePane.innerHTML=''; this._attribution.textContent=''; return; }
      const rect = this._el.getBoundingClientRect();
      const w = Math.max(1, rect.width || this._el.clientWidth || innerWidth);
      const h = Math.max(1, rect.height || this._el.clientHeight || innerHeight);
      const z = Math.round(this._zoom);
      const center = project(this._center.lat, this._center.lng, z);
      const minX = Math.floor((center.x - w/2) / TILE) - 1;
      const maxX = Math.floor((center.x + w/2) / TILE) + 1;
      const minY = Math.floor((center.y - h/2) / TILE) - 1;
      const maxY = Math.floor((center.y + h/2) / TILE) + 1;
      const maxTile = Math.pow(2,z);
      const frag = document.createDocumentFragment();
      for (let ty=minY; ty<=maxY; ty++) {
        if (ty < 0 || ty >= maxTile) continue;
        for (let tx=minX; tx<=maxX; tx++) {
          const wrappedX = ((tx % maxTile) + maxTile) % maxTile;
          const img = document.createElement('img');
          img.className='native-map-tile';
          const sub = ['a','b','c'][Math.abs(tx+ty)%3];
          img.src = layer._url.replace('{s}',sub).replace('{z}',z).replace('{x}',wrappedX).replace('{y}',ty);
          img.style.left = `${tx*TILE - center.x + w/2}px`;
          img.style.top = `${ty*TILE - center.y + h/2}px`;
          img.alt=''; img.draggable=false;
          img.onload = () => { this._el.dataset.tilesLoaded='1'; window.dispatchEvent(new CustomEvent('farmland:tileloaded')); };
          img.onerror = () => { img.style.visibility='hidden'; };
          frag.appendChild(img);
        }
      }
      this._tilePane.replaceChildren(frag);
      this._attribution.innerHTML = layer._options.attribution || '';
    }
    _point(latlng) {
      const rect=this._el.getBoundingClientRect();
      const c=project(this._center.lat,this._center.lng,this._zoom);
      const p=project(latlng.lat,latlng.lng,this._zoom);
      return {x:p.x-c.x+rect.width/2, y:p.y-c.y+rect.height/2};
    }
    setView(center, zoom) { const old=this._zoom; this._center=toLatLng(center); if (Number.isFinite(Number(zoom))) this._zoom=Number(zoom); this._render(); if(old!==this._zoom)this._fire('zoomend',{zoom:this._zoom}); return this; }
    getZoom() { return this._zoom; }
    fitBounds(bounds, options) {
      const pts = bounds && bounds._points ? bounds._points : (Array.isArray(bounds) ? bounds : []);
      if (!pts.length) return this;
      let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
      pts.forEach(v=>{const p=toLatLng(v);minLat=Math.min(minLat,p.lat);maxLat=Math.max(maxLat,p.lat);minLng=Math.min(minLng,p.lng);maxLng=Math.max(maxLng,p.lng);});
      this._center={lat:(minLat+maxLat)/2,lng:(minLng+maxLng)/2};
      const rect=this._el.getBoundingClientRect();
      const padX=((options&&options.paddingTopLeft&&options.paddingTopLeft[0])||30)+((options&&options.paddingBottomRight&&options.paddingBottomRight[0])||30);
      const padY=((options&&options.paddingTopLeft&&options.paddingTopLeft[1])||30)+((options&&options.paddingBottomRight&&options.paddingBottomRight[1])||30);
      let found=3;
      for(let z=3;z<=((options&&options.maxZoom)||18);z++){
        const a=project(maxLat,minLng,z), b=project(minLat,maxLng,z);
        if(Math.abs(b.x-a.x)<=Math.max(80,rect.width-padX)&&Math.abs(b.y-a.y)<=Math.max(80,rect.height-padY)) found=z; else break;
      }
      const old=this._zoom; this._zoom=found; this._render(); if(old!==this._zoom)this._fire('zoomend',{zoom:this._zoom}); return this;
    }
    invalidateSize() { this._render(); return this; }
    whenReady(cb) { setTimeout(()=>cb&&cb(),0); return this; }
    on(name, fn) { (this._events[name] ||= []).push(fn); return this; }
    _fire(name, data) { (this._events[name]||[]).forEach(fn=>{try{fn(data);}catch(e){console.error(e);}}); }
    hasLayer(layer) { return this._layers.has(layer); }
    removeLayer(layer) { if (!layer) return this; this._layers.delete(layer); if(layer===this._tileLayer)this._tileLayer=null; if(layer._remove)layer._remove(); this._render(); return this; }
    _addLayer(layer) { this._layers.add(layer); layer._map=this; if(layer._isTileLayer)this._tileLayer=layer; if(layer._mount)layer._mount(); this._render(); return this; }
    _setZoom(delta) { const old=this._zoom; this._zoom=clamp(this._zoom+delta,3,20); this._render(); if(old!==this._zoom)this._fire('zoomend',{zoom:this._zoom}); }
  }
  class TileLayer {
    constructor(url, options){this._url=url;this._options=options||{};this._isTileLayer=true;}
    addTo(map){map._addLayer(this);return this;}
    _remove(){}
  }
  class NativeMarker {
    constructor(latlng, options){this._latlng=toLatLng(latlng);this._options=options||{};this._icon=this._options.icon||null;this._events={};this._el=null;this._tooltip=null;this._tooltipEl=null;}
    addTo(map){map._addLayer(this);return this;}
    _mount(){ if(this._el)return; this._el=document.createElement('div');this._el.className='native-map-marker';this._el.style.position='absolute';this._el.style.pointerEvents='auto';this._el.addEventListener('click',e=>{e.stopPropagation();(this._events.click||[]).forEach(fn=>fn({target:this,originalEvent:e}));});this._map._markerPane.appendChild(this._el);this._applyIcon();this._ensureTooltip(); }
    _applyIcon(){if(!this._el)return;const i=this._icon||{};this._el.className=`native-map-marker ${i.className||''}`;this._el.innerHTML=i.html||'<div style="width:24px;height:24px;border-radius:50%;background:#28733d;border:2px solid white"></div>';const sz=i.iconSize||[30,40];this._el.style.width=sz[0]+'px';this._el.style.height=sz[1]+'px';}
    _ensureTooltip(){if(!this._map||!this._tooltip)return;if(!this._tooltipEl){this._tooltipEl=document.createElement('div');this._tooltipEl.className=`native-map-tooltip ${this._tooltip.options.className||''}`;this._tooltipEl.style.position='absolute';this._tooltipEl.style.pointerEvents=this._tooltip.options.interactive?'auto':'none';this._tooltipEl.addEventListener('click',e=>e.stopPropagation());this._map._markerPane.appendChild(this._tooltipEl);}this._tooltipEl.innerHTML=this._tooltip.html;}
    _render(){if(!this._map)return;if(!this._el)this._mount();const p=this._map._point(this._latlng);const a=(this._icon&&this._icon.iconAnchor)||[15,38];this._el.style.transform=`translate(${Math.round(p.x-a[0])}px,${Math.round(p.y-a[1])}px)`;this._el.style.display=(p.x<-100||p.y<-100||p.x>this._map._el.clientWidth+100||p.y>this._map._el.clientHeight+100)?'none':'block';if(this._tooltipEl){const off=(this._tooltip.options.offset||[0,0]);this._tooltipEl.style.transform=`translate(${Math.round(p.x+off[0])}px,${Math.round(p.y+off[1])}px) translate(-50%,-100%)`;const minZoom=Number(this._tooltip.options.minZoom||0);this._tooltipEl.style.display=(this._el.style.display==='none'||this._map.getZoom()<minZoom)?'none':'block';}}
    _remove(){this._el?.remove();this._tooltipEl?.remove();this._el=null;this._tooltipEl=null;}
    on(name,fn){(this._events[name]||=[]).push(fn);return this;}
    setLatLng(v){this._latlng=toLatLng(v);this._render();return this;}
    setIcon(icon){this._icon=icon;this._applyIcon();this._render();return this;}
    bindTooltip(html,options){this._tooltip={html,options:options||{},getElement:()=>this._tooltipEl};this._ensureTooltip();this._render();return this;}
    unbindTooltip(){this._tooltip=null;this._tooltipEl?.remove();this._tooltipEl=null;return this;}
    getElement(){return this._el;}
    getTooltip(){return this._tooltip;}
    bindPopup(text){this._popupText=text;return this;}
    openPopup(){if(this._popupText&&this._el){this._el.title=this._popupText;}return this;}
  }
  class CircleMarker extends NativeMarker {
    constructor(latlng,options){super(latlng,options);const o=options||{};const d=(o.radius||7)*2;this._icon={className:'',iconSize:[d,d],iconAnchor:[d/2,d/2],html:`<div style="width:${d}px;height:${d}px;border-radius:50%;border:${o.weight||2}px solid ${o.color||'#2563a8'};background:${o.fillColor||'#fff'};opacity:${o.fillOpacity??1}"></div>`};}
  }
  class NativePolygon {
    constructor(latlngs,options){this._latlngs=latlngs||[];this._options=options||{};this._paths=[];}
    addTo(map){map._addLayer(this);return this;}
    _rings(){return Array.isArray(this._latlngs?.[0]?.[0]?.[0])?this._latlngs.flat(1):this._latlngs;}
    _mount(){if(this._paths.length)return;for(const ring of this._rings()){const path=document.createElementNS('http://www.w3.org/2000/svg','polygon');path.setAttribute('fill',this._options.fillColor||'#22c55e');path.setAttribute('fill-opacity',String(this._options.fillOpacity??0.22));path.setAttribute('stroke',this._options.color||'#15803d');path.setAttribute('stroke-width',String(this._options.weight||2));path.style.pointerEvents='auto';this._map._vectorPane.appendChild(path);this._paths.push(path);}}
    _render(){if(!this._map)return;if(!this._paths.length)this._mount();const rings=this._rings();this._paths.forEach((path,i)=>{const ring=rings[i]||[];path.setAttribute('points',ring.map(v=>{const p=this._map._point(toLatLng(v));return `${p.x},${p.y}`;}).join(' '));});}
    _remove(){this._paths.forEach(p=>p.remove());this._paths=[];}
  }
  const L = {
    map:(id,options)=>new NativeMap(id,options),
    tileLayer:(url,options)=>new TileLayer(url,options),
    marker:(latlng,options)=>new NativeMarker(latlng,options),
    circleMarker:(latlng,options)=>new CircleMarker(latlng,options),
    polygon:(latlngs,options)=>new NativePolygon(latlngs,options),
    divIcon:options=>options||{},
    latLngBounds:points=>({_points:points||[]}),
    control:{zoom:()=>({addTo(map){const box=document.createElement('div');box.className='leaflet-control leaflet-control-zoom native-zoom';const plus=document.createElement('button');plus.type='button';plus.textContent='+';const minus=document.createElement('button');minus.type='button';minus.textContent='−';plus.onclick=e=>{e.stopPropagation();map._setZoom(1);};minus.onclick=e=>{e.stopPropagation();map._setZoom(-1);};box.append(plus,minus);map._controlPane.appendChild(box);return this;}})}
  };
  window.L=L;
  window.__NATIVE_MAP_FALLBACK__=true;
})();
