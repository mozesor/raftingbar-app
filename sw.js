// רפטינג בר - Service Worker
// גרסה 1.0.0

const CACHE_NAME = 'raftingbar-attendance-v1.0.1';
const STATIC_CACHE_NAME = 'raftingbar-static-v1.0.1';
const DYNAMIC_CACHE_NAME = 'raftingbar-dynamic-v1.0.1';

// קבצים לשמירה במטמון
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// התקנת Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 מתקין Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // יצירת מטמון סטטי
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('📦 יוצר מטמון סטטי');
        return cache.addAll(STATIC_FILES.map(url => new Request(url, {
          cache: 'reload'
        })));
      }),
      
      // דילוג על המתנה ל-activate
      self.skipWaiting()
    ])
  );
});

// הפעלת Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 מפעיל Service Worker...');
  
  event.waitUntil(
    Promise.all([
      // ניקוי מטמונים ישנים
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName.startsWith('raftingbar-')
            )
            .map(cacheName => {
              console.log('🗑️ מוחק מטמון ישן:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // השתלטות על כל הלקוחות
      self.clients.claim()
    ])
  );
});

// התאמת בקשות רשת
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // בדיקה אם זו בקשה להורדת קובץ
  if (request.method === 'GET' && 
      (url.pathname.endsWith('.csv') || 
       request.headers.get('content-disposition'))) {
    // אל תתערב בהורדות
    return;
  }
  
  // אסטרטגיית Cache First לקבצים סטטיים
  if (request.method === 'GET' && 
      (url.origin === location.origin || 
       url.pathname.endsWith('.png') || 
       url.pathname.endsWith('.jpg') || 
       url.pathname.endsWith('.css') || 
       url.pathname.endsWith('.js'))) {
    
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // מצא במטמון - החזר מהמטמון ועדכן ברקע
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }).catch(() => {
            // שגיאת רשת - זה בסדר, נשתמש במטמון
          });
          
          return cachedResponse;
        }
        
        // לא נמצא במטמון - נסה לטעון מהרשת
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            throw new Error('תגובת רשת לא תקינה');
          }
          
          // שמור במטמון דינמי
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          
          return networkResponse;
        }).catch(() => {
          // אם זו בקשה לעמוד הראשי ואין אינטרנט, החזר עמוד אופליין
          if (request.mode === 'navigate') {
            return caches.match('./');
          }
          throw new Error('לא זמין אופליין');
        });
      })
    );
    return;
  }
  
  // אסטרטגיית Network First ל-APIs
  if (request.method === 'GET' && 
      (url.hostname.includes('googleapis.com') || 
       url.hostname.includes('google.com'))) {
    
    event.respondWith(
      fetch(request, {
        // זמן קצוב של 8 שניות
        signal: AbortSignal.timeout(8000)
      }).then((networkResponse) => {
        // שמור תגובות מוצלחות במטמון
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // נסה לטעון מהמטמון
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📱 טוען מהמטמון (אופליין):', request.url);
            return cachedResponse;
          }
          throw new Error('לא זמין אופליין');
        });
      })
    );
    return;
  }
  
  // לבקשות POST (שמירת נתונים) - תמיד נסה רשת
  if (request.method === 'POST') {
    event.respondWith(
      fetch(request).catch((error) => {
        console.log('❌ שגיאה בשמירה:', error);
        // החזר תגובה שמציינת שהנתונים נשמרו מקומית
        return new Response(JSON.stringify({
          success: false,
          offline: true,
          message: 'נתונים נשמרו מקומית ויסונכרנו כשהחיבור יחזור'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // ברירת מחדל - רשת בלבד
  event.respondWith(fetch(request));
});

// טיפול בהודעות מהאפליקציה
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_SIZE':
      Promise.all([
        caches.open(STATIC_CACHE_NAME).then(cache => cache.keys()),
        caches.open(DYNAMIC_CACHE_NAME).then(cache => cache.keys())
      ]).then(([staticKeys, dynamicKeys]) => {
        event.ports[0].postMessage({
          staticCount: staticKeys.length,
          dynamicCount: dynamicKeys.length,
          totalCount: staticKeys.length + dynamicKeys.length
        });
      });
      break;
      
    case 'CLEAR_CACHE':
      Promise.all([
        caches.delete(DYNAMIC_CACHE_NAME),
        caches.open(DYNAMIC_CACHE_NAME) // יצירה מחדש
      ]).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    default:
      console.log('הודעה לא מזוהה:', type);
  }
});

// הודעות רקע (Background Sync)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncAttendanceData());
  }
});

// פונקצית סנכרון נתונים
async function syncAttendanceData() {
  try {
    // קרא נתונים ממתין לסנכרון מ-localStorage
    const pendingData = localStorage.getItem('raftingbar_pending');
    if (!pendingData) return;
    
    const pending = JSON.parse(pendingData);
    if (pending.length === 0) return;
    
    console.log('📤 מסנכרן', pending.length, 'רשומות...');
    
    // נסה לשלוח כל רשומה
    const successful = [];
    for (const record of pending) {
      try {
        const response = await fetch(record.scriptUrl || 'https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec', {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            values: [[
              record.employee,
              record.action,
              record.timestamp,
              record.date,
              record.time,
              'PWA Sync'
            ]]
          })
        });
        
        successful.push(record);
      } catch (error) {
        console.log('❌ שגיאה בסנכרון רשומה:', error);
      }
    }
    
    // עדכן רשימת ממתינים
    if (successful.length > 0) {
      const remaining = pending.filter(record => 
        !successful.some(s => 
          s.employee === record.employee && 
          s.timestamp === record.timestamp
        )
      );
      
      localStorage.setItem('raftingbar_pending', JSON.stringify(remaining));
      console.log('✅ סונכרנו', successful.length, 'רשומות,', remaining.length, 'נותרו');
    }
    
  } catch (error) {
    console.log('❌ שגיאה בסנכרון כללי:', error);
  }
}

// הודעת push (עתידי)
self.addEventListener('push', (event) => {
  console.log('📨 הודעת Push מתקבלת...');
  
  const options = {
    body: 'יש לך עדכון חדש באפליקציית הנוכחות',
    icon: './icon-192x192.png',
    badge: './icon-72x72.png',
    tag: 'attendance-update',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'פתח אפליקציה',
        icon: './icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'סגור',
        icon: './icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('רפטינג בר - עדכון', options)
  );
});

// טיפול בלחיצה על הודעה
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // אם האפליקציה פתוחה, התמקד בה
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // אחרת פתח חלון חדש
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
    );
  }
});

console.log('🏄‍♂️ Service Worker של רפטינג בר מוכן!');
