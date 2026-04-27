"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, History, BarChart2, Truck, Radio, FileText } from "lucide-react";

const navItems = [
  { href: "/",          icon: MapPin,    label: "Live Map"   },
  { href: "/history",   icon: History,   label: "History"    },
  { href: "/analytics", icon: BarChart2, label: "Analytics"  },
  { href: "/reports",   icon: FileText,  label: "Reports"    },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">FleetTrack</p>
            <p className="text-xs text-gray-500">Real-Time System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
          Dashboard
        </p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* MQTT status badge */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
          <Radio className="w-4 h-4 text-green-400" />
          <span className="text-xs text-gray-400">MQTT</span>
          <span className="ml-auto text-xs text-green-400 font-medium">Live</span>
        </div>
      </div>
    </aside>
  );
}
