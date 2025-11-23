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

// Firebase 초기화
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('✅ Firebase 연결 성공');
} catch (error) {
  console.error('❌ Firebase 연결 실패:', error);
  console.log('💡 .env 파일에 Firebase 설정을 추가해주세요');
}

export { db };
