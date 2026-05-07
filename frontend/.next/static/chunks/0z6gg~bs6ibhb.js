(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,41421,e=>{"use strict";var t=e.i(43476),i=e.i(71645),l=e.i(10007),r=e.i(23177),h=e.i(51892),a=e.i(22305),d=e.i(36730),s=e.i(32322),x=e.i(94913);let o={CITY:[22,42],HIGHWAY:[26,52],DELIVERY:[24,44],PATROL:[20,36]};function c({positions:e}){let t=(0,d.useMap)();return(0,i.useEffect)(()=>{if(0===e.length)return;let i=s.default.latLngBounds(e.map(e=>[e.lat,e.lon]));t.fitBounds(i,{padding:[60,60],maxZoom:15})},[]),null}let n={CITY:"🚌 City Bus",HIGHWAY:"🚛 Express Truck",DELIVERY:"🚐 Delivery Van",PATROL:"🚔 Patrol Car"},f={DRIVING:"🟢 Driving",IDLE:"🟡 Idle",STOPPED:"🔴 Stopped"};function g({label:e,value:i,mono:l}){return(0,t.jsxs)("div",{className:"flex justify-between gap-3 text-xs",children:[(0,t.jsx)("span",{className:"text-gray-500",children:e}),(0,t.jsx)("span",{className:`text-gray-200 ${l?"font-mono":""}`,children:i})]})}e.s(["default",0,function({positions:e}){(0,i.useEffect)(()=>{!function(){if("u"<typeof document||document.getElementById("fleet-pulse-style"))return;let e=document.createElement("style");e.id="fleet-pulse-style",e.textContent=`
    @keyframes fleet-pulse {
      0%, 100% { transform: scale(1);   opacity: 0.6; }
      50%       { transform: scale(1.4); opacity: 0.1; }
    }
  `,document.head.appendChild(e)}()},[]);let d=e.length>0?[e[0].lat,e[0].lon]:[-7.265,112.734];return(0,t.jsxs)(l.MapContainer,{center:d,zoom:13,className:"w-full h-full",zoomControl:!1,children:[(0,t.jsx)(r.TileLayer,{attribution:'© <a href="https://carto.com">CARTO</a>',url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}),(0,t.jsx)(c,{positions:e}),e.map(e=>(0,t.jsx)(h.Marker,{position:[e.lat,e.lon],icon:function(e){let t=e.vehicleType??"CITY",[i,l]=o[t]??[22,42],r=function e(t,i,l){let r="MOVING"===i,h="IDLE"===l,a=r&&!h?"#3b82f6":h?"#f59e0b":"#ef4444",d=r&&!h?"#3b82f6":h?"#f59e0b":"#ef4444",s="#0f172a",x="rgba(255,255,255,0.55)",o=r?"0.5":"0.2";switch(t){case"CITY":return`
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="42" viewBox="0 0 22 42">
        <!-- glow -->
        <ellipse cx="11" cy="21" rx="10" ry="20" fill="${d}" opacity="${o}" filter="url(#blur)"/>
        <!-- body -->
        <rect x="2" y="4" width="18" height="34" rx="3" fill="${a}"/>
        <!-- front windshield (top = front) -->
        <rect x="4" y="5" width="14" height="8" rx="2" fill="${x}"/>
        <!-- rear window -->
        <rect x="4" y="30" width="14" height="5" rx="1" fill="${x}" opacity="0.4"/>
        <!-- side windows -->
        <rect x="3" y="15" width="3" height="5" rx="1" fill="${x}" opacity="0.5"/>
        <rect x="16" y="15" width="3" height="5" rx="1" fill="${x}" opacity="0.5"/>
        <rect x="3" y="22" width="3" height="5" rx="1" fill="${x}" opacity="0.5"/>
        <rect x="16" y="22" width="3" height="5" rx="1" fill="${x}" opacity="0.5"/>
        <!-- front bumper / direction -->
        <rect x="4" y="2" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- wheels -->
        <rect x="0" y="6"  width="3" height="7" rx="1" fill="${s}"/>
        <rect x="19" y="6" width="3" height="7" rx="1" fill="${s}"/>
        <rect x="0" y="28" width="3" height="7" rx="1" fill="${s}"/>
        <rect x="19" y="28" width="3" height="7" rx="1" fill="${s}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;case"HIGHWAY":return`
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="52" viewBox="0 0 26 52">
        <!-- glow -->
        <ellipse cx="13" cy="26" rx="12" ry="25" fill="${d}" opacity="${o}" filter="url(#blur)"/>
        <!-- cab (front = top) -->
        <rect x="3" y="3" width="20" height="14" rx="3" fill="${a}"/>
        <!-- windshield -->
        <rect x="5" y="4" width="16" height="8" rx="2" fill="${x}"/>
        <!-- cab-cargo connector -->
        <rect x="4" y="16" width="18" height="3" rx="0" fill="rgba(0,0,0,0.3)"/>
        <!-- cargo box -->
        <rect x="3" y="19" width="20" height="28" rx="2" fill="${a}" opacity="0.85"/>
        <!-- cargo detail lines -->
        <line x1="3" y1="30" x2="23" y2="30" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
        <line x1="3" y1="40" x2="23" y2="40" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
        <!-- front bumper -->
        <rect x="4" y="1" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- headlights -->
        <rect x="4"  y="2" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
        <rect x="17" y="2" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
        <!-- wheels (dual rear) -->
        <rect x="0"  y="5"  width="4" height="8" rx="1" fill="${s}"/>
        <rect x="22" y="5"  width="4" height="8" rx="1" fill="${s}"/>
        <rect x="0"  y="25" width="4" height="8" rx="1" fill="${s}"/>
        <rect x="22" y="25" width="4" height="8" rx="1" fill="${s}"/>
        <rect x="0"  y="37" width="4" height="8" rx="1" fill="${s}"/>
        <rect x="22" y="37" width="4" height="8" rx="1" fill="${s}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;case"DELIVERY":return`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="44" viewBox="0 0 24 44">
        <!-- glow -->
        <ellipse cx="12" cy="22" rx="11" ry="21" fill="${d}" opacity="${o}" filter="url(#blur)"/>
        <!-- front cab (top = front) -->
        <rect x="3" y="3" width="18" height="12" rx="3" fill="${a}"/>
        <!-- windshield -->
        <rect x="5" y="4" width="14" height="7" rx="2" fill="${x}"/>
        <!-- box body -->
        <rect x="2" y="15" width="20" height="26" rx="2" fill="${a}" opacity="0.9"/>
        <!-- rear door split -->
        <line x1="12" y1="15" x2="12" y2="41" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
        <!-- van logo area -->
        <rect x="6" y="22" width="12" height="8" rx="1" fill="rgba(255,255,255,0.15)"/>
        <!-- front bumper -->
        <rect x="4" y="1" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- headlights -->
        <rect x="4"  y="2" width="4" height="2" rx="1" fill="#fde68a" opacity="0.8"/>
        <rect x="16" y="2" width="4" height="2" rx="1" fill="#fde68a" opacity="0.8"/>
        <!-- wheels -->
        <rect x="0"  y="5"  width="3" height="7" rx="1" fill="${s}"/>
        <rect x="21" y="5"  width="3" height="7" rx="1" fill="${s}"/>
        <rect x="0"  y="26" width="3" height="7" rx="1" fill="${s}"/>
        <rect x="21" y="26" width="3" height="7" rx="1" fill="${s}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;case"PATROL":return`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="36" viewBox="0 0 20 36">
        <!-- glow -->
        <ellipse cx="10" cy="18" rx="9" ry="17" fill="${d}" opacity="${o}" filter="url(#blur)"/>
        <!-- body -->
        <rect x="2" y="7" width="16" height="22" rx="4" fill="${a}"/>
        <!-- police stripe -->
        <rect x="2" y="16" width="16" height="4" fill="white" opacity="0.5"/>
        <!-- front windshield -->
        <rect x="4" y="8" width="12" height="7" rx="2" fill="${x}"/>
        <!-- rear window -->
        <rect x="4" y="24" width="12" height="4" rx="1" fill="${x}" opacity="0.4"/>
        <!-- light bar (red + blue) -->
        <rect x="5" y="3" width="10" height="4" rx="2" fill="#1e3a8a"/>
        <rect x="5" y="3" width="5"  height="4" rx="2" fill="#dc2626"/>
        <!-- front bumper -->
        <rect x="3" y="5" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
        <!-- wheels -->
        <rect x="0"  y="8"  width="3" height="6" rx="1" fill="${s}"/>
        <rect x="17" y="8"  width="3" height="6" rx="1" fill="${s}"/>
        <rect x="0"  y="22" width="3" height="6" rx="1" fill="${s}"/>
        <rect x="17" y="22" width="3" height="6" rx="1" fill="${s}"/>
        <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
      </svg>`;default:return e("CITY",i,l)}}(t,e.status,e.driveState??"DRIVING"),h=e.heading??0,a="MOVING"===e.status&&"IDLE"!==e.driveState?`<div style="
        position:absolute;
        width:${i+12}px; height:${l+12}px;
        top:-6px; left:-6px;
        border-radius:50%;
        background:rgba(59,130,246,0.15);
        animation:fleet-pulse 2s ease-in-out infinite;
      "></div>`:"";return s.default.divIcon({html:`
      <div style="position:relative; width:${i}px; height:${l}px;">
        ${a}
        <div style="
          transform: rotate(${h}deg);
          transform-origin: center center;
          width:${i}px; height:${l}px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">${r}</div>
      </div>
    `,className:"",iconSize:[i,l],iconAnchor:[i/2,l/2],popupAnchor:[0,-(l/2)]})}(e),children:(0,t.jsx)(a.Popup,{className:"fleet-popup",children:(0,t.jsxs)("div",{className:"bg-gray-900 text-white rounded-lg text-sm min-w-[180px]",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between px-3 pt-3 pb-2 border-b border-gray-700",children:[(0,t.jsx)("span",{className:"font-bold text-blue-400",children:e.vehicleId}),(0,t.jsx)("span",{className:"text-xs text-gray-400",children:n[e.vehicleType]??e.vehicleType})]}),(0,t.jsxs)("div",{className:"px-3 py-2 space-y-1.5",children:[(0,t.jsx)(g,{label:"State",value:f[e.driveState]??e.driveState}),(0,t.jsx)(g,{label:"Speed",value:`${e.speed.toFixed(1)} km/h`}),(0,t.jsx)(g,{label:"Heading",value:`${e.heading}\xb0`}),(0,t.jsx)(g,{label:"Lat",value:e.lat.toFixed(6),mono:!0}),(0,t.jsx)(g,{label:"Lon",value:e.lon.toFixed(6),mono:!0}),(0,t.jsx)(g,{label:"Updated",value:(0,x.formatDistanceToNow)(new Date(e.updatedAt),{addSuffix:!0})})]})]})})},e.vehicleId))]})}])},58537,e=>{e.n(e.i(41421))}]);