'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useGamificationStore, type GamificationNotification } from '@/stores/gamification-store';
import { RARITY_COLORS } from '@/lib/gamification/badges';
import { Sparkles, Trophy, Flame, Star, X } from 'lucide-react';

// ─── Single notification card ─────────────────────────────────────────────

function NotificationCard({ notification, onDismiss }: {
  notification: GamificationNotification;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss after 4 seconds
    const dismissTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 400);
    }, 4000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 400);
  };

  const bgColor = {
    xp: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    level_up: 'bg-gradient-to-r from-amber-500 to-orange-500',
    badge: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    streak: 'bg-gradient-to-r from-red-500 to-orange-500',
    perfect: 'bg-gradient-to-r from-yellow-400 to-amber-500',
  }[notification.type];

  const IconComponent = {
    xp: Sparkles,
    level_up: Star,
    badge: Trophy,
    streak: Flame,
    perfect: Sparkles,
  }[notification.type];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-2xl text-white transition-all duration-400 ease-out',
        bgColor,
        visible && !exiting
          ? 'translate-y-0 opacity-100 scale-100'
          : exiting
            ? 'translate-y-4 opacity-0 scale-95'
            : '-translate-y-8 opacity-0 scale-95',
      )}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      
      <div className="relative flex items-center gap-3 px-5 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
          {notification.icon ? (
            <span className="text-2xl">{notification.icon}</span>
          ) : (
            <IconComponent className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">{notification.title}</p>
          <p className="text-xs opacity-90 mt-0.5">{notification.description}</p>
        </div>
        {notification.xp_amount && notification.type !== 'xp' && (
          <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold shrink-0">
            +{notification.xp_amount} XP
          </span>
        )}
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-white/20 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Notification Stack (renders in fixed position) ───────────────────────

export function GamificationToastStack() {
  const notifications = useGamificationStore(s => s.pending_notifications);
  const dismissNotification = useGamificationStore(s => s.dismissNotification);

  // Show max 3 at a time
  const visibleNotifications = notifications.slice(0, 3);

  if (visibleNotifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-80 max-w-[calc(100vw-2rem)]">
      {visibleNotifications.map((n) => (
        <NotificationCard
          key={n.id}
          notification={n}
          onDismiss={() => dismissNotification(n.id)}
        />
      ))}
    </div>
  );
}

// ─── Confetti Burst (CSS-only, lightweight) ─────────────────────────────

export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 1.5 + Math.random() * 1.5;
        const size = 6 + Math.random() * 8;
        const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899'];
        const color = colors[i % colors.length];
        const rotation = Math.random() * 360;

        return (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left: `${left}%`,
              top: '-10px',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Level Up Modal ─────────────────────────────────────────────────────

export function LevelUpModal({ level, title, onClose }: {
  level: number;
  title: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className={cn(
        'bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm mx-4 transition-all duration-500',
        visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      )}>
        <div className="text-7xl mb-4">🎉</div>
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-3xl font-black mb-4 shadow-lg">
          {level}
          <div className="absolute inset-0 rounded-full animate-ping bg-amber-400/30" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-1">Niveau {level} !</h2>
        <p className="text-navy-500 text-sm mb-4">{title}</p>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 400);
          }}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:shadow-lg transition-all"
        >
          Continuer
        </button>
      </div>
    </div>
  );
}
