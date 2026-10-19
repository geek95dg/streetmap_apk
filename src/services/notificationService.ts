import { StorageService } from './storage';
import { Territory, Assignment } from '../types';

export interface OverdueTerritoryInfo {
  nr: string;
  address: string;
  city: string;
  lastCompletedDate: string | null;
  monthsSince: number;
  currentPerson?: string;
  isCurrentlyAssigned: boolean;
}

export const NotificationService = {
  /**
   * Check if the browser supports notifications
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  /**
   * Current notification permission status: 'default' | 'granted' | 'denied'
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  /**
   * Request permission from the user on Android/browser
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  },

  /**
   * Find territories with old completion dates or overdue assignments
   */
  getOverdueTerritories(thresholdMonths: number = 4): OverdueTerritoryInfo[] {
    const territories = StorageService.getTerritories();
    const assignments = StorageService.getAssignments();
    const now = new Date();

    const results: OverdueTerritoryInfo[] = [];

    for (const t of territories) {
      const tAssignments = assignments.filter(a => a.territory_nr === t.nr);
      const active = tAssignments.find(a => a.completed_on === null);
      
      // Completed assignments sorted newest first
      const completedList = tAssignments
        .filter(a => a.completed_on !== null)
        .sort((a, b) => (b.completed_on || '').localeCompare(a.completed_on || ''));
      
      const lastCompleted = completedList[0];
      const lastDateStr = lastCompleted?.completed_on || null;

      let monthsSince = 999; // Never completed

      if (lastDateStr) {
        const lastDate = new Date(lastDateStr);
        const diffMs = now.getTime() - lastDate.getTime();
        monthsSince = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.43));
      } else if (active) {
        // If never completed but assigned long ago
        const assignedDate = new Date(active.assigned_on);
        const diffMs = now.getTime() - assignedDate.getTime();
        monthsSince = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.43));
      }

      if (monthsSince >= thresholdMonths) {
        results.push({
          nr: t.nr,
          address: t.address,
          city: t.city,
          lastCompletedDate: lastDateStr,
          monthsSince,
          currentPerson: active?.person,
          isCurrentlyAssigned: !!active,
        });
      }
    }

    // Sort by longest without completion first
    return results.sort((a, b) => b.monthsSince - a.monthsSince);
  },

  /**
   * Check if 1 week (7 days) has passed and trigger notification if overdue territories exist
   */
  async checkAndSendWeeklyNotification(force: boolean = false): Promise<{ sent: boolean; reason?: string; overdueCount: number }> {
    if (!this.isSupported()) {
      return { sent: false, reason: 'Powiadomienia nie są wspierane w tej przeglądarce', overdueCount: 0 };
    }

    const settings = StorageService.getSettings();
    if (!settings.notificationsEnabled && !force) {
      return { sent: false, reason: 'Powiadomienia są wyłączone w ustawieniach', overdueCount: 0 };
    }

    if (Notification.permission !== 'granted') {
      return { sent: false, reason: 'Brak uprawnień systemowych do powiadomień', overdueCount: 0 };
    }

    const threshold = settings.notificationThresholdMonths || 4;
    const overdueList = this.getOverdueTerritories(threshold);

    if (overdueList.length === 0) {
      return { sent: false, reason: 'Brak przeterminowanych terenów', overdueCount: 0 };
    }

    // Check if 7 days (1 week) passed since last notification
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const lastNotifTime = settings.lastNotificationDate ? new Date(settings.lastNotificationDate).getTime() : 0;

    if (!force && now - lastNotifTime < oneWeekMs) {
      const daysLeft = Math.ceil((oneWeekMs - (now - lastNotifTime)) / (24 * 60 * 60 * 1000));
      return { 
        sent: false, 
        reason: `Powiadomienie cotygodniowe wysłane niedawno. Kolejne za ${daysLeft} dni.`, 
        overdueCount: overdueList.length 
      };
    }

    // Prepare notification content
    const sample = overdueList[0];
    const title = `Karty Terenów: ${overdueList.length} terenów z dawną datą opracowania`;
    const body = overdueList.length === 1
      ? `Teren nr ${sample.nr} (${sample.address}) nie był opracowywany od ${sample.monthsSince >= 900 ? 'początku' : sample.monthsSince + ' mies.'}.`
      : `M.in. Teren nr ${sample.nr} (${sample.address}) i ${overdueList.length - 1} innych wymaga uwagi (ponad ${threshold} m-ce bez opracowania).`;

    await this.dispatchNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      tag: 'weekly-overdue-territories',
      data: { url: '/?tab=przydzialy' }
    });

    // Update last notification timestamp
    StorageService.saveSettings({ lastNotificationDate: new Date().toISOString() });

    return { sent: true, overdueCount: overdueList.length };
  },

  /**
   * Send a test notification immediately to confirm phone sound/vibration works
   */
  async sendTestNotification(): Promise<boolean> {
    const granted = await this.requestPermission();
    if (!granted) return false;

    const overdueList = this.getOverdueTerritories(4);
    const count = overdueList.length;

    const title = `Karty Terenów: Cotygodniowe przypomnienie`;
    const body = count > 0
      ? `Test powiadomienia: masz obecnie ${count} terenów nieopracowywanych od ponad 4 miesięcy (np. Teren nr ${overdueList[0].nr}).`
      : `Test powiadomienia: wszystkie tereny w kartotece są aktualnie opracowywane na bieżąco!`;

    return await this.dispatchNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      tag: 'test-notification',
      data: { url: '/?tab=przydzialy' }
    });
  },

  /**
   * Helper to dispatch notification through Service Worker or standard API
   */
  async dispatchNotification(title: string, options: any): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, {
            ...options,
            vibrate: [200, 100, 200],
          });
          return true;
        }
      }

      // Fallback
      new Notification(title, options);
      return true;
    } catch (err) {
      console.warn('Failed to dispatch notification:', err);
      return false;
    }
  }
};
