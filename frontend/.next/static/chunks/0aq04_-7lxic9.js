(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,18043,i=>{"use strict";var e=i.i(43476),t=i.i(71645),r=i.i(10007),l=i.i(23177),h=i.i(51892),c=i.i(22305),o=i.i(36730),s=i.i(32322);function n({position:i,heading:e}){let r=(0,o.useMap)();return(0,t.useEffect)(()=>{i&&r.setView(i,r.getZoom(),{animate:!0})},[i,r]),null}i.s(["default",0,function({gps:i}){var t;let o,a=i?[i.lat,i.lon]:null;return(0,e.jsxs)(r.MapContainer,{center:a??[42.3368,-71.0579],zoom:17,style:{width:"100%",height:"100%"},zoomControl:!1,attributionControl:!1,children:[(0,e.jsx)(l.TileLayer,{url:"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",maxZoom:20}),a&&(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(n,{position:a,heading:i?.heading??0}),(0,e.jsx)(h.Marker,{position:a,icon:(t=i?.heading??0,o=`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="44" viewBox="0 0 28 44" style="transform: rotate(${90-t}deg); transform-origin: center;">
      <!-- glow -->
      <ellipse cx="14" cy="22" rx="13" ry="21" fill="#10b981" opacity="0.4" filter="url(#blur)"/>
      <!-- body -->
      <rect x="3" y="5" width="22" height="34" rx="4" fill="#10b981"/>
      <!-- windshield -->
      <rect x="5" y="6" width="18" height="10" rx="2" fill="rgba(255,255,255,0.6)"/>
      <!-- rear window -->
      <rect x="5" y="32" width="18" height="6" rx="2" fill="rgba(255,255,255,0.4)"/>
      <!-- sensor bar on roof -->
      <rect x="8" y="17" width="12" height="3" rx="1" fill="#0f172a"/>
      <circle cx="14" cy="18.5" r="1.5" fill="#fbbf24"/>
      <!-- side sensors -->
      <circle cx="4"  cy="22" r="1.5" fill="#3b82f6"/>
      <circle cx="24" cy="22" r="1.5" fill="#3b82f6"/>
      <!-- front bumper / direction indicator -->
      <rect x="5" y="3" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.9)"/>
      <!-- headlights -->
      <rect x="5"  y="4" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
      <rect x="18" y="4" width="5" height="2" rx="1" fill="#fde68a" opacity="0.9"/>
      <!-- wheels -->
      <rect x="0"  y="8"  width="4" height="8" rx="1" fill="#0f172a"/>
      <rect x="24" y="8"  width="4" height="8" rx="1" fill="#0f172a"/>
      <rect x="0"  y="28" width="4" height="8" rx="1" fill="#0f172a"/>
      <rect x="24" y="28" width="4" height="8" rx="1" fill="#0f172a"/>
      <defs><filter id="blur"><feGaussianBlur stdDeviation="3"/></filter></defs>
    </svg>
  `,s.default.divIcon({className:"av-car-marker",html:o,iconSize:[28,44],iconAnchor:[14,22],popupAnchor:[0,-22]})),children:(0,e.jsx)(c.Popup,{children:(0,e.jsxs)("div",{className:"text-sm",children:[(0,e.jsx)("p",{className:"font-bold",children:"AV Ego Vehicle"}),(0,e.jsxs)("p",{children:["Scene: ",i?.scene]}),(0,e.jsxs)("p",{children:["Speed: ",i?.speedKph?.toFixed(1)," km/h"]}),(0,e.jsxs)("p",{children:["Heading: ",i?.heading?.toFixed(1),"°"]})]})})})]})]})}])},99591,i=>{i.n(i.i(18043))}]);