# 🅿️ HowParking - 실시간 주차장 모니터링 시스템

Discord 봇과 AI 이미지 분석을 활용한 실시간 주차장 현황 웹 애플리케이션

## 🌟 주요 기능

- 🗺️ **Google Maps 연동**: 실시간 주차장 위치 및 현황 표시
- 📸 **AI 이미지 분석**: Discord 봇을 통한 자동 주차 현황 분석
- ⭐ **즐겨찾기 & 알림**: 주차장 상태 변경 시 브라우저 알림
- 📋 **히스토리 관리**: Firebase Firestore를 통한 영구 히스토리 저장
- 🔍 **분석시간 검색**: 특정 시간대의 주차장 현황 조회
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 🔧 기술 스택

- **Frontend**: React 19, Google Maps API
- **Backend**: Railway (Node.js/Express)
- **Database**: Firebase Firestore
- **AI/Bot**: Discord Bot + AI 이미지 분석
- **Styling**: CSS3

## 📦 설치 방법

### 1. 저장소 클론
```bash
git clone https://github.com/your-repo/parking-monitor-web.git
cd parking-monitor-web
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정

`.env` 파일을 생성하고 다음 값을 설정하세요:

```env
# Google Maps API Key
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Backend API URL
REACT_APP_API_URL=your_backend_api_url

# Firebase Configuration (히스토리 저장용)
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase 설정

Firebase Firestore 설정이 필요합니다. 자세한 가이드는 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)를 참고하세요.

### 5. 개발 서버 실행
```bash
npm start
```

앱이 [http://localhost:3002](http://localhost:3002)에서 실행됩니다.

## 🚀 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
```

`build` 폴더에 최적화된 프로덕션 빌드가 생성됩니다.

## 📖 사용 방법

1. **로그인**: 우측 상단 "로그인" 버튼으로 사용자명 입력
2. **주차장 검색**: 상단 검색바에서 주차장 이름 검색
3. **즐겨찾기 추가**: 주차장 마커 클릭 → ⭐ 버튼 클릭
4. **히스토리 조회**: 주차장 마커 클릭 → "📋 상세보기 (히스토리)" 버튼
5. **알림 설정**: 우측 상단 🔔 버튼으로 알림 시간대 설정

## 🗂️ 프로젝트 구조

```
parking-monitor-web/
├── public/
│   └── logo.png
├── src/
│   ├── App.js          # 메인 컴포넌트
│   ├── App.css         # 스타일
│   ├── firebase.js     # Firebase 설정
│   └── index.js        # 진입점
├── .env                # 환경 변수
├── package.json
├── README.md
└── FIREBASE_SETUP.md   # Firebase 설정 가이드
```

## 🔄 데이터 흐름

```
Discord Bot → AI 분석 → Backend (Railway) → Frontend (React) → Firestore (히스토리)
```

## 🛠️ 주요 기능 상세

### 1. 실시간 주차장 모니터링
- 30초마다 자동 업데이트
- 상태별 컬러 마커 (🟢 여유 / 🟡 보통 / 🔴 만차)

### 2. 히스토리 관리
- 로그인한 사용자별로 히스토리 저장
- Firebase Firestore를 통한 영구 저장
- 브라우저/기기 변경 시에도 데이터 유지
- 분석시간 기준 검색 기능

### 3. 알림 시스템
- 즐겨찾기한 주차장 상태 변경 시 알림
- 알림 시간대 설정 가능
- 브라우저 알림 권한 필요

## 📝 개발자 가이드

### 주차장 추가/수정
1. 우측 상단 ✏️ 버튼 클릭
2. "➕ 추가" 버튼으로 새 주차장 추가
3. 지도에서 마커를 드래그하여 위치 조정

### localStorage 사용
- 주차장 위치 정보
- 로그인 상태
- 즐겨찾기 목록
- 알림 설정

### Firestore 사용
- 주차장 히스토리 (사용자별)

## 🐛 문제 해결

### Firebase 연결 실패
- `.env` 파일의 Firebase 설정 확인
- Firebase Console에서 프로젝트 상태 확인
- 개발 서버 재시작

### 알림이 작동하지 않음
- 브라우저 알림 권한 확인
- HTTPS 환경에서만 알림 작동 (localhost 제외)

### 히스토리가 저장되지 않음
- 로그인 상태 확인
- Firebase 연결 확인
- 브라우저 콘솔(F12)에서 에러 로그 확인

## 📄 라이선스

MIT License

## 👥 기여자

- 개발자: [Your Name]
- Backend: Railway
- Database: Firebase Firestore

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
