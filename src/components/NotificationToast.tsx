/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';

export interface NotificationItem {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

interface Props {
  notifications: NotificationItem[];
}

export const NotificationToast: React.FC<Props> = ({ notifications }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none select-none max-w-lg w-full px-4">
      {notifications.map((n) => {
        let borderClass = 'border-cyan-500/40 bg-slate-950/90 text-cyan-200 shadow-cyan-950/50';
        let Icon = Info;
        let iconColor = 'text-cyan-400';

        if (n.type === 'warning') {
          borderClass = 'border-amber-500/50 bg-slate-950/90 text-amber-200 shadow-amber-950/50';
          Icon = AlertTriangle;
          iconColor = 'text-amber-400';
        } else if (n.type === 'success') {
          borderClass = 'border-emerald-500/50 bg-slate-950/90 text-emerald-200 shadow-emerald-950/50';
          Icon = CheckCircle;
          iconColor = 'text-emerald-400';
        }

        return (
          <div
            key={n.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-mono shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${borderClass}`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
            <span className="tracking-wide font-medium">{n.message}</span>
          </div>
        );
      })}
    </div>
  );
};
