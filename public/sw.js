// Service Worker for HowParking Push Notifications

const CACHE_NAME = 'howparking-v1';

// 설치 이벤트
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker 설치됨');
  self.skipWaiting();
});

// 활성화 이벤트
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker 활성화됨');
  event.waitUntil(clients.claim());
});

// 푸시 알림 수신 (백그라운드에서도 작동)
self.addEventListener('push', (event) => {
  console.log('📬 푸시 알림 수신');
  
  let data = {
    title: '🅿️ HowParking',
    body: '주차장 상태가 업데이트되었습니다',
    icon: '/logo.png',
    badge: '/logo.png'
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // 📱 헤드업 알림 설정 (화면 상단에 배너로 표시)
  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [300, 100, 300], // 진동 패턴 (헤드업 알림 트리거)
    tag: data.tag || 'howparking-notification',
    renotify: true,
    requireInteraction: false,
    silent: false, // 소리 활성화
    actions: [], // 액션 버튼
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ 알림 클릭됨');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // 없으면 새 창 열기
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// 메시지 수신 (앱에서 알림 요청)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data;
    
    self.registration.showNotification(title, {
      body: body,
      icon: icon || '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      tag: tag || 'howparking-' + Date.now(),
      renotify: true,
      requireInteraction: false
    });
  }
});
