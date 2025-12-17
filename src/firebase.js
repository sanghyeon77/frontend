import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// 환경 변수 확인
const checkEnvVars = () => {
  const missing = [];
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (!value) missing.push(key);
  });
  
  if (missing.length > 0) {
    console.error('❌ Firebase 설정 오류: 다음 환경 변수가 누락되었습니다:', missing.join(', '));
    console.error('💡 .env 파일 또는 Vercel 환경 변수 설정을 확인해주세요.');
    return false;
  }
  return true;
};

// Firebase 초기화
let app;
let db;

try {
  if (checkEnvVars()) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('✅ Firebase 연결 성공');
  } else {
    console.warn('⚠️ Firebase가 초기화되지 않았습니다. 로컬 저장소만 사용됩니다.');
  }
} catch (error) {
  console.error('❌ Firebase 연결 실패:', error);
  console.log('💡 .env 파일에 Firebase 설정을 추가해주세요');
}

export { db };
