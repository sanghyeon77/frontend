# 🚀 Vercel 배포 및 Firebase 연결 가이드

이 가이드는 Vercel에 배포된 앱이 Firebase와 올바르게 연결되어 데이터가 사라지지 않도록 설정하는 방법을 설명합니다.

## 1. 문제 원인 파악

"컴퓨터를 끄거나 창을 닫으면 데이터가 사라지는 현상"은 대부분 다음 이유 때문에 발생합니다:

1. **Vercel에 환경 변수 미설정**: 로컬(`.env`)에만 설정하고 배포 환경(Vercel)에는 설정하지 않아서, 배포된 앱이 Firebase에 연결되지 못함.
2. **보안 규칙 문제**: Firebase 보안 규칙이 읽기/쓰기를 차단함.
3. **브라우저 설정**: 브라우저가 닫힐 때 로컬 스토리지를 삭제하도록 설정됨 (하지만 Firebase가 연결되면 해결됨).

---

## 2. Vercel 환경 변수 설정 (필수!)

Vercel은 `.env` 파일을 보안상의 이유로 업로드하지 않습니다. 따라서 Vercel 대시보드에서 직접 설정해야 합니다.

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인합니다.
2. 해당 프로젝트(**parking-monitor-web**)를 선택합니다.
3. 상단 메뉴에서 **Settings** > **Environment Variables**로 이동합니다.
4. `.env` 파일에 있는 내용을 하나씩 추가합니다:

| Key (키) | Value (값) |
|---|---|
| `REACT_APP_FIREBASE_API_KEY` | (Firebase 콘솔에서 복사한 apiKey) |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | (Firebase 콘솔에서 복사한 authDomain) |
| `REACT_APP_FIREBASE_PROJECT_ID` | (Firebase 콘솔에서 복사한 projectId) |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | (Firebase 콘솔에서 복사한 storageBucket) |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | (Firebase 콘솔에서 복사한 messagingSenderId) |
| `REACT_APP_FIREBASE_APP_ID` | (Firebase 콘솔에서 복사한 appId) |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | (사용 중인 Google Maps API Key) |
| `REACT_APP_API_URL` | /api |

> **중요**: `REACT_APP_API_URL`을 `/api`로 설정해야 프록시(CORS 해결)가 정상 작동합니다. 기존에 전체 URL을 넣었다면 꼭 수정해주세요.

## 5. 로컬 실행 시 주의사항 (localhost)

로컬에서 `npm start`로 실행할 때도 `.env` 파일의 `REACT_APP_API_URL`이 `/api`로 되어 있어야 합니다.
만약 `https://...` 전체 주소가 들어있으면 CORS 에러가 발생하여 이미지가 안 뜨거나 API 호출이 실패할 수 있습니다.

1. 프로젝트 폴더의 `.env` 파일을 엽니다.
2. `REACT_APP_API_URL=/api` 로 되어 있는지 확인합니다.
3. 수정했다면 개발 서버를 껐다가 다시 켭니다 (`Ctrl+C` 후 `npm start`).


5. 모든 변수를 추가한 후, **Deployments** 탭으로 가서 최신 배포를 **Redeploy** 하거나, 코드를 조금 수정해서 다시 푸시하여 **재배포**해야 적용됩니다. (재배포 필수!)

---

## 3. Firebase 보안 규칙 업데이트

현재 앱은 로그인 기능 없이 닉네임만 사용하므로, Firebase 인증 규칙이 너무 엄격하면 저장이 안 될 수 있습니다.

1. [Firebase Console](https://console.firebase.google.com/) > **Firestore Database** > **규칙(Rules)** 탭으로 이동.
2. 아래 규칙을 복사해서 붙여넣고 **게시(Publish)** 클릭:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 모든 사용자에게 읽기/쓰기 허용 (개발 및 테스트용)
    // 주의: 실제 서비스 런칭 시에는 Firebase Authentication을 연동하는 것이 좋습니다.
    match /parkingHistory/{document=**} {
      allow read, write: if true;
    }
    
    // 다른 컬렉션에 대한 규칙도 필요하다면 추가
  }
}
```

> **참고**: `allow read, write: if true;`는 누구나 데이터를 읽고 쓸 수 있는 상태입니다. 현재처럼 간단한 프로젝트나 테스트 단계에서는 가장 확실한 해결책입니다. 추후 보안이 중요해지면 Firebase Auth를 연동하세요.

---

## 4. 확인 방법

1. Vercel에서 재배포가 완료되면 웹사이트에 접속합니다.
2. **F12** 키를 눌러 개발자 도구(Console)를 엽니다.
3. `✅ Firebase 연결 성공` 메시지가 뜨는지 확인합니다.
   - 만약 `❌ Firebase 설정 오류` 또는 `⚠️ Firebase가 초기화되지 않았습니다`가 뜨면 환경 변수가 제대로 설정되지 않은 것입니다.
4. 주차장 마커를 클릭하고 데이터를 저장해봅니다.
5. 브라우저를 완전히 닫았다가 다시 열어서 데이터가 남아있는지 확인합니다.
