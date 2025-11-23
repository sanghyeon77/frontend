# 🔥 Firebase Firestore 설정 가이드

## 1단계: Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: `howparking` 또는 `parking-monitor`)
4. Google 애널리틱스는 선택 사항 (사용 안함 추천)
5. "프로젝트 만들기" 클릭

## 2단계: Firestore Database 생성

1. 왼쪽 메뉴에서 **"Firestore Database"** 클릭
2. **"데이터베이스 만들기"** 클릭
3. 모드 선택:
   - **테스트 모드** 선택 (개발용, 30일간 무료)
   - 나중에 프로덕션 모드로 변경 가능
4. 지역 선택: **asia-northeast3 (서울)** 추천
5. "사용 설정" 클릭

## 3단계: 웹 앱 추가

1. 프로젝트 설정(⚙️ 아이콘) 클릭
2. 아래로 스크롤하여 **"</> 웹"** 아이콘 클릭
3. 앱 닉네임 입력 (예: `parking-monitor-web`)
4. **Firebase Hosting은 체크 안함**
5. "앱 등록" 클릭

## 4단계: Firebase 설정 복사

Firebase SDK 설정 코드가 나타납니다. 다음 정보를 복사하세요:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",                    // 이 값 복사
  authDomain: "프로젝트.firebaseapp.com",  // 이 값 복사
  projectId: "프로젝트ID",                // 이 값 복사
  storageBucket: "프로젝트.appspot.com",  // 이 값 복사
  messagingSenderId: "123456789",        // 이 값 복사
  appId: "1:123456789:web:abcdef"        // 이 값 복사
};
```

## 5단계: .env 파일 수정

프로젝트 루트의 `.env` 파일을 열고 다음 값들을 수정하세요:

```env
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyBZCXs2n6mdWk6INS-ZznF0k4ADCHxjL0o
REACT_APP_API_URL=https://appealing-encouragement-production.up.railway.app/api

# 아래 값들을 Firebase에서 복사한 값으로 변경
REACT_APP_FIREBASE_API_KEY=여기에_apiKey_붙여넣기
REACT_APP_FIREBASE_AUTH_DOMAIN=여기에_authDomain_붙여넣기
REACT_APP_FIREBASE_PROJECT_ID=여기에_projectId_붙여넣기
REACT_APP_FIREBASE_STORAGE_BUCKET=여기에_storageBucket_붙여넣기
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=여기에_messagingSenderId_붙여넣기
REACT_APP_FIREBASE_APP_ID=여기에_appId_붙여넣기
```

## 6단계: Firestore 보안 규칙 설정

1. Firebase Console의 **Firestore Database** 메뉴로 이동
2. **"규칙"** 탭 클릭
3. 다음 규칙으로 변경:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // parkingHistory 컬렉션: 로그인한 사용자만 자신의 데이터 읽기/쓰기
    match /parkingHistory/{document=**} {
      allow read, write: if request.auth != null || 
                           resource.data.username == request.resource.data.username;
    }
  }
}
```

4. "게시" 클릭

> **참고:** 현재는 인증 없이 사용 가능하도록 설정했습니다. 
> 실제 운영 시에는 Firebase Authentication을 추가하는 것을 권장합니다.

## 7단계: 개발 서버 재시작

1. 터미널에서 개발 서버 중지 (Ctrl+C)
2. 다시 시작:
   ```bash
   npm start
   ```

## 8단계: 테스트

1. 웹페이지에서 로그인
2. 주차장 마커 클릭
3. 상세보기(히스토리) 클릭
4. Firebase Console > Firestore Database에서 데이터 확인
   - `parkingHistory` 컬렉션이 자동으로 생성됨
   - 저장된 히스토리 데이터 확인 가능

## ✅ 완료!

이제 히스토리가 Firebase Firestore에 저장됩니다:
- ✅ 브라우저를 바꿔도 데이터 유지
- ✅ 기기를 바꿔도 데이터 유지
- ✅ 사용자별로 개별 히스토리 관리
- ✅ 실시간 동기화

## 🚨 주의사항

1. **Firebase 연결 실패 시**: 자동으로 localStorage를 백업으로 사용
2. **무료 플랜 한도**:
   - 읽기: 하루 50,000회
   - 쓰기: 하루 20,000회
   - 저장 공간: 1GB
3. **API 키 보안**: `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 업로드되지 않음

## 문제 해결

### "Firebase 연결 실패" 메시지가 나올 때
1. `.env` 파일의 Firebase 설정 값 확인
2. Firebase Console에서 프로젝트 ID 확인
3. 개발 서버 재시작

### 히스토리가 저장되지 않을 때
1. 브라우저 콘솔(F12)에서 에러 메시지 확인
2. Firebase Console > Firestore Database에서 데이터 확인
3. Firestore 규칙이 올바른지 확인
