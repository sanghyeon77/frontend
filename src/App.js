import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import axios from 'axios';
import { db } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://appealing-encouragement-production.up.railway.app/api';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// 지도 기본 설정
const mapContainerStyle = {
  width: '100%',
  height: '100vh'
};

const center = {
  lat: 37.4746092, // 인천 재능대학교
  lng: 126.6498741
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// 검색 바 컴포넌트 (메모이제이션)
const SearchBar = memo(({ searchQuery, onSearchChange, onRefresh, onToggleSidebar, showSidebar, isLoading }) => {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="주차장 검색..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
      <button onClick={onRefresh} className="refresh-button" disabled={isLoading} title="새로고침">
        🔄
      </button>
      <button onClick={onToggleSidebar} className="edit-button" title={showSidebar ? '닫기' : '편집'}>
        {showSidebar ? '✖️' : '✏️'}
      </button>
    </div>
  );
});
SearchBar.displayName = 'SearchBar';

// Discord 봇 연동 주차장 데이터 (3개)
// 초기 데이터 - Discord에서 실시간 업데이트됨
const getDefaultParkingLots = () => {
  const currentTime = new Date().toLocaleString('ko-KR');
  return [
    { 
      id: 1, 
      name: '재능고 주차장', 
      lat: 37.4746, 
      lng: 126.6499, 
      status: '정보 없음', 
      available: 0, 
      total: 0,
      // Discord 봇 데이터 (실시간 업데이트)
      emptySpaces: 0,
      occupiedSpaces: 0,
      totalSpaces: 0,
      emptyRatio: '0',
      imageUrl: '', // Discord 봇에서 이미지 URL이 들어옴
      analysisTime: '',
      // 기본 정보
      address: '인천광역시 동구 재능로 178',
      fee: '시간당 1,000원',
      openTime: '24시간',
      lastUpdated: currentTime,
      contact: '032-890-7114'
    },
    { 
      id: 2, 
      name: '다이소 주차장', 
      lat: 37.3947, 
      lng: 126.6339, 
      status: '정보 없음', 
      available: 0, 
      total: 0,
      emptySpaces: 0,
      occupiedSpaces: 0,
      totalSpaces: 0,
      emptyRatio: '0',
      imageUrl: '', // Discord 봇에서 이미지 URL이 들어옴
      analysisTime: '',
      address: '인천광역시 연수구 송도동',
      fee: '시간당 2,000원',
      openTime: '06:00 - 24:00',
      lastUpdated: currentTime,
      contact: '032-123-4567'
    },
    { 
      id: 5, 
      name: '실시간 주차장', 
      lat: 37.4350, 
      lng: 126.6800, 
      status: '정보 없음', 
      available: 0, 
      total: 0,
      emptySpaces: 0,
      occupiedSpaces: 0,
      totalSpaces: 0,
      emptyRatio: '0',
      imageUrl: '', // Discord 봇에서 이미지 URL이 들어옴
      analysisTime: '',
      address: '인천광역시 남동구',
      fee: '시간당 500원',
      openTime: '24시간',
      lastUpdated: currentTime,
      contact: '032-123-9999'
    },
  ];
};

// localStorage 키
const STORAGE_KEY = 'howparking_locations';

function App() {
  // localStorage에서 저장된 주차장 불러오기
  const loadParkingLots = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ 저장된 주차장 데이터 로드:', parsed.length, '개');
        return parsed;
      }
    } catch (error) {
      console.error('❌ localStorage 로드 실패:', error);
    }
    console.log('📋 초기 주차장 데이터 사용');
    return getDefaultParkingLots();
  };

  const [parkingLots, setParkingLots] = useState(loadParkingLots);
  const [selectedParking, setSelectedParking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingParking, setEditingParking] = useState(null);
  
  // 로그인 및 즐겨찾기 상태
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('username') || '';
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 히스토리 및 알림 설정
  const [parkingHistory, setParkingHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedParkingForHistory, setSelectedParkingForHistory] = useState(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationTimeRanges, setNotificationTimeRanges] = useState(() => {
    try {
      const saved = localStorage.getItem('notificationTimeRanges');
      return saved ? JSON.parse(saved) : [
        { id: 1, startTime: '08:00', endTime: '10:00', enabled: false },
        { id: 2, startTime: '12:00', endTime: '14:00', enabled: false },
        { id: 3, startTime: '18:00', endTime: '20:00', enabled: false }
      ];
    } catch {
      return [
        { id: 1, startTime: '08:00', endTime: '10:00', enabled: false },
        { id: 2, startTime: '12:00', endTime: '14:00', enabled: false },
        { id: 3, startTime: '18:00', endTime: '20:00', enabled: false }
      ];
    }
  });
  const [historySearchDate, setHistorySearchDate] = useState('');
  const [historySearchTime, setHistorySearchTime] = useState('');

  // 주차장 데이터가 변경될 때마다 localStorage에 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parkingLots));
      console.log('💾 주차장 데이터 저장 완료:', parkingLots.length, '개');
    } catch (error) {
      console.error('❌ localStorage 저장 실패:', error);
    }
  }, [parkingLots]);

  // 즐겨찾기 저장
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Firestore에서 히스토리 불러오기
  const loadHistoryFromFirestore = useCallback(async () => {
    try {
      const historyRef = collection(db, 'parkingHistory');
      const q = query(
        historyRef,
        where('username', '==', username),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(q);
      const historyData = [];
      querySnapshot.forEach((doc) => {
        historyData.push({ id: doc.id, ...doc.data() });
      });
      
      setParkingHistory(historyData);
      console.log('✅ Firestore에서 히스토리 로드:', historyData.length, '개');
    } catch (error) {
      console.error('❌ Firestore 히스토리 로드 실패:', error);
      // Firestore 연결 실패 시 localStorage 사용
      try {
        const saved = localStorage.getItem('parkingHistory');
        if (saved) {
          setParkingHistory(JSON.parse(saved));
          console.log('📦 localStorage에서 히스토리 로드 (백업)');
        }
      } catch (e) {
        console.error('localStorage 로드도 실패:', e);
      }
    }
  }, [username]);

  // Firestore에서 히스토리 로드 (로그인 시)
  useEffect(() => {
    if (isLoggedIn && username && db) {
      loadHistoryFromFirestore();
    }
  }, [isLoggedIn, username, loadHistoryFromFirestore]);

  // 알림 시간대 저장
  useEffect(() => {
    localStorage.setItem('notificationTimeRanges', JSON.stringify(notificationTimeRanges));
  }, [notificationTimeRanges]);

  // 히스토리에 추가 (Firestore)
  const addToHistory = async (parkingId, parkingName, imageUrl, status, data) => {
    if (!isLoggedIn || !username) return; // 로그인하지 않으면 저장 안함
    
    const historyItem = {
      parkingId,
      parkingName,
      imageUrl,
      status,
      data,
      username, // 사용자별로 저장
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('ko-KR'),
      time: new Date().toLocaleTimeString('ko-KR')
    };
    
    try {
      if (db) {
        // Firestore에 저장
        const docRef = await addDoc(collection(db, 'parkingHistory'), historyItem);
        console.log('✅ Firestore에 히스토리 저장:', docRef.id);
        
        // 로컬 state 업데이트
        setParkingHistory(prev => [{ id: docRef.id, ...historyItem }, ...prev].slice(0, 100));
      } else {
        // Firestore 연결 실패 시 localStorage에 저장 (백업)
        console.log('⚠️ Firestore 미연결, localStorage 사용');
        setParkingHistory(prev => {
          const updated = [{ id: Date.now(), ...historyItem }, ...prev].slice(0, 100);
          localStorage.setItem('parkingHistory', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('❌ 히스토리 저장 실패:', error);
      // 에러 시 localStorage 백업
      setParkingHistory(prev => {
        const updated = [{ id: Date.now(), ...historyItem }, ...prev].slice(0, 100);
        localStorage.setItem('parkingHistory', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // 현재 시간이 알림 시간대에 포함되는지 확인
  const isWithinNotificationTime = () => {
    const enabledRanges = notificationTimeRanges.filter(range => range.enabled);
    if (enabledRanges.length === 0) return true; // 설정된 시간대가 없으면 항상 알림
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return enabledRanges.some(range => {
      const [startHour, startMin] = range.startTime.split(':').map(Number);
      const [endHour, endMin] = range.endTime.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      return currentTime >= startTime && currentTime <= endTime;
    });
  };

  // 알림 시간대 토글
  const toggleTimeRange = (id) => {
    setNotificationTimeRanges(prev =>
      prev.map(range =>
        range.id === id ? { ...range, enabled: !range.enabled } : range
      )
    );
  };

  // 알림 시간대 추가
  const addTimeRange = () => {
    const newId = Math.max(...notificationTimeRanges.map(r => r.id), 0) + 1;
    setNotificationTimeRanges(prev => [
      ...prev,
      { id: newId, startTime: '09:00', endTime: '18:00', enabled: false }
    ]);
  };

  // 알림 시간대 삭제
  const deleteTimeRange = (id) => {
    setNotificationTimeRanges(prev => prev.filter(range => range.id !== id));
  };

  // 알림 시간대 업데이트
  const updateTimeRange = (id, field, value) => {
    setNotificationTimeRanges(prev =>
      prev.map(range =>
        range.id === id ? { ...range, [field]: value } : range
      )
    );
  };

  // 로그인 함수
  const handleLogin = (name) => {
    setUsername(name);
    setIsLoggedIn(true);
    localStorage.setItem('username', name);
    localStorage.setItem('isLoggedIn', 'true');
    setShowLoginModal(false);
    
    // 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification('🅿️ HowParking', {
            body: `${name}님, 환영합니다! 즐겨찾기 알림이 활성화되었습니다.`,
            icon: '/logo.png'
          });
        }
      });
    }
  };

  // 로그아웃 함수
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setFavorites([]);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('favorites');
  };

  // 즐겨찾기 토글
  const toggleFavorite = (parkingId) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    
    setFavorites(prev => {
      if (prev.includes(parkingId)) {
        return prev.filter(id => id !== parkingId);
      } else {
        // 즐겨찾기 추가 시 알림
        const parking = parkingLots.find(p => p.id === parkingId);
        if (parking && notificationPermission === 'granted') {
          new Notification('⭐ 즐겨찾기 추가', {
            body: `${parking.name}이(가) 즐겨찾기에 추가되었습니다.`,
            icon: '/logo.png'
          });
        }
        return [...prev, parkingId];
      }
    });
  };

  // 상태별 이모지 반환
  const getStatusEmoji = (status) => {
    switch (status) {
      case '여유':
        return '🟢';
      case '보통':
        return '🟡';
      case '만차':
      case '혼잡':
        return '🔴';
      default:
        return '🔵';
    }
  };

  // 주차장 상태 변경 감지 및 알림
  const checkAndNotify = (newLots) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const currentLots = stored ? JSON.parse(stored) : [];
    
    newLots.forEach(newLot => {
      // 이미지가 있으면 무조건 히스토리에 추가 (로그인 여부와 관계없이)
      if (newLot.imageUrl && isLoggedIn) {
        const oldLot = currentLots.find(p => p.id === newLot.id);
        
        // 이미지가 새로 추가되었거나 변경된 경우만 저장 (중복 방지)
        if (!oldLot || oldLot.imageUrl !== newLot.imageUrl) {
          console.log(`📸 새 이미지 감지: ${newLot.name}`);
          addToHistory(
            newLot.id,
            newLot.name,
            newLot.imageUrl,
            newLot.status,
            {
              emptySpaces: newLot.emptySpaces,
              totalSpaces: newLot.totalSpaces,
              emptyRatio: newLot.emptyRatio,
              analysisTime: newLot.analysisTime
            }
          );
        }
      }
    });
    
    // 알림 기능 (로그인 + 알림 권한 필요)
    if (!isLoggedIn || notificationPermission !== 'granted') return;
    
    // 알림 시간대 확인
    if (!isWithinNotificationTime()) {
      console.log('⏰ 현재 알림 시간대가 아닙니다.');
      return;
    }
    
    const currentFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    newLots.forEach(newLot => {
      // 즐겨찾기된 주차장만 알림 체크
      if (!currentFavorites.includes(newLot.id)) return;
      
      const oldLot = currentLots.find(p => p.id === newLot.id);
      if (!oldLot) return;
      
      // 상태가 변경되었는지 확인
      if (oldLot.status !== newLot.status) {
        const emoji = getStatusEmoji(newLot.status);
        new Notification(`${emoji} ${newLot.name}`, {
          body: `상태가 "${oldLot.status}"에서 "${newLot.status}"로 변경되었습니다.`,
          icon: '/logo.png',
          tag: `parking-${newLot.id}`
        });
      }
    });
  };

  // API에서 주차장 데이터 가져오기
  const fetchParkingData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 API 호출:', `${API_URL}/parking/list`);
      const response = await axios.get(`${API_URL}/parking/list`);
      console.log('📥 API 응답:', response.data);
      
      // 백엔드 응답 형식: {success: true, data: [...]}
      if (response.data && response.data.success && response.data.data) {
        const apiData = response.data.data;
        console.log(`✅ API 데이터 수신: ${apiData.length}개`);
        
        // localStorage에서 직접 읽어서 위치 보존 (무한 루프 방지)
        const stored = localStorage.getItem(STORAGE_KEY);
        const currentLots = stored ? JSON.parse(stored) : [];
        
        // 백엔드 데이터를 프론트 형식으로 변환하되, 위치는 localStorage 데이터 우선
        const formattedData = apiData.map(lot => {
          const existingLot = currentLots.find(l => l.id === parseInt(lot.id));
          
          // emptyRatio 계산
          const emptyRatio = lot.currentStatus?.emptyRatio?.toString() || existingLot?.emptyRatio || '0';
          const emptyRatioNum = parseFloat(emptyRatio);
          
          // 여유율에 따른 상태 결정 (20% 이하는 혼잡)
          let status;
          if (emptyRatioNum <= 20) {
            status = '혼잡';
          } else if (emptyRatioNum <= 50) {
            status = '보통';
          } else {
            status = '여유';
          }
          
          return {
            id: parseInt(lot.id),
            name: lot.name,
            // ⭐ 기존 위치 우선 사용 (사용자가 드래그한 위치 보존)
            lat: existingLot?.lat || lot.latitude || lot.lat || 37.4746,
            lng: existingLot?.lng || lot.longitude || lot.lng || 126.6499,
            // 여유율 기반으로 상태 재계산
            status: status,
            available: lot.currentStatus?.emptySpaces ?? existingLot?.available ?? 0,
            total: lot.currentStatus?.totalSpaces || lot.totalSpaces || existingLot?.total || 0,
            emptySpaces: lot.currentStatus?.emptySpaces ?? existingLot?.emptySpaces ?? 0,
            occupiedSpaces: lot.currentStatus?.occupiedSpaces ?? existingLot?.occupiedSpaces ?? 0,
            totalSpaces: lot.currentStatus?.totalSpaces || lot.totalSpaces || existingLot?.totalSpaces || 0,
            emptyRatio: emptyRatio,
            imageUrl: lot.currentStatus?.imageUrl || existingLot?.imageUrl || '',
            analysisTime: lot.currentStatus?.updatedAt || lot.currentStatus?.timestamp || existingLot?.analysisTime || '',
            // 기본 정보는 기존 데이터 우선
            address: existingLot?.address || lot.address || '주소 정보 없음',
            fee: existingLot?.fee || '시간당 1,000원',
            openTime: existingLot?.openTime || '24시간',
            lastUpdated: lot.lastUpdated || new Date().toLocaleString('ko-KR'),
            contact: existingLot?.contact || '032-123-4567'
          };
        });
        
        console.log('🎨 변환된 데이터 (위치 보존):', formattedData);
        
        // 상태 변경 감지 및 알림
        checkAndNotify(formattedData);
        
        setParkingLots(formattedData);
      }
    } catch (error) {
      console.error('❌ 주차장 데이터 로드 실패:', error);
      console.error('오류 상세:', error.response?.data || error.message);
      // 에러 시 기존 데이터 유지
    } finally {
      setIsLoading(false);
    }
  }, []); // 의존성 제거하여 무한 루프 방지

  useEffect(() => {
    fetchParkingData();
    // 5초마다 데이터 갱신 (빠른 업데이트)
    const interval = setInterval(fetchParkingData, 5000);
    return () => clearInterval(interval);
  }, []); // 빈 배열로 초기 1회만 실행

  // 마커 색상 결정
  const getMarkerColor = (status) => {
    switch (status) {
      case '여유':
        return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
      case '보통':
        return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      case '만차':
      case '혼잡':
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      default:
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
    }
  };

  // 라벨 색상 결정 (마커와 동일한 색상)
  const getLabelColor = (status) => {
    switch (status) {
      case '여유':
        return '#34a853'; // 초록색
      case '보통':
        return '#fbbc04'; // 노란색
      case '만차':
      case '혼잡':
        return '#ea4335'; // 빨간색
      default:
        return '#4285f4'; // 파란색
    }
  };

  // 주차장 편집 함수
  const updateParkingLot = (id, updatedData) => {
    setParkingLots(parkingLots.map(lot => 
      lot.id === id ? { ...lot, ...updatedData } : lot
    ));
    setEditingParking(null);
  };

  // 마커 드래그 이벤트 핸들러
  const handleMarkerDrag = (id, newPosition) => {
    const updatedLots = parkingLots.map(lot => {
      if (lot.id === id) {
        console.log(`🖱️ 마커 이동: ${lot.name}`);
        console.log(`   위도: ${lot.lat.toFixed(6)} → ${newPosition.lat.toFixed(6)}`);
        console.log(`   경도: ${lot.lng.toFixed(6)} → ${newPosition.lng.toFixed(6)}`);
        return { ...lot, lat: newPosition.lat, lng: newPosition.lng };
      }
      return lot;
    });
    setParkingLots(updatedLots);
  };

  const deleteParkingLot = (id) => {
    if (window.confirm('이 주차장을 삭제하시겠습니까?')) {
      setParkingLots(parkingLots.filter(lot => lot.id !== id));
    }
  };

  const addNewParkingLot = () => {
    const newId = Math.max(...parkingLots.map(lot => lot.id), 0) + 1;
    const currentTime = new Date().toLocaleString('ko-KR');
    const newLot = {
      id: newId,
      name: '새 주차장',
      lat: center.lat,
      lng: center.lng,
      status: '여유',
      available: 50,
      total: 100,
      // Discord 봇 데이터 필드
      emptySpaces: 50,
      occupiedSpaces: 50,
      totalSpaces: 100,
      emptyRatio: '50.0',
      imageUrl: '',
      analysisTime: currentTime,
      // 기본 정보
      address: '주소를 입력하세요',
      fee: '요금 정보',
      openTime: '운영 시간',
      lastUpdated: currentTime,
      contact: '연락처'
    };
    setParkingLots([...parkingLots, newLot]);
    setEditingParking(newLot);
  };

  // 초기화 함수
  const resetToDefault = () => {
    if (window.confirm('⚠️ 모든 변경사항이 초기화됩니다. 계속하시겠습니까?')) {
      localStorage.removeItem(STORAGE_KEY);
      setParkingLots(getDefaultParkingLots());
      console.log('🔄 초기 상태로 복원됨');
    }
  };

  // 검색 필터 (메모이제이션)
  const filteredParkingLots = useMemo(() => {
    return parkingLots.filter(lot =>
      lot.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parkingLots, searchQuery]);

  // 콜백 함수들 (메모이제이션)
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  return (
    <div className="App">
      {/* 로고 헤더 */}
      <div className="header">
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <img src="/logo.png" alt="HowParking" className="app-logo" onError={(e) => e.target.style.display = 'none'} />
          <h1 className="app-title">HowParking</h1>
        </div>
        {isLoggedIn ? (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <button
              onClick={() => setShowNotificationSettings(true)}
              style={{
                background: '#fbbc04',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              title="알림 설정"
            >
              🔔
            </button>
            <span style={{fontSize: '14px', color: '#666'}}>
              👤 {username}님
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: '#ea4335',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              background: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            로그인
          </button>
        )}
      </div>

      {/* 검색 바 */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onRefresh={fetchParkingData}
        onToggleSidebar={handleToggleSidebar}
        showSidebar={showSidebar}
        isLoading={isLoading}
      />

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }} onClick={() => setShowLoginModal(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            minWidth: '300px'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{margin: '0 0 20px 0', fontSize: '20px', textAlign: 'center'}}>
              🅿️ 로그인
            </h2>
            <input
              type="text"
              placeholder="이름을 입력하세요"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleLogin(e.target.value.trim());
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                marginBottom: '15px',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <button
              onClick={(e) => {
                const input = e.target.previousSibling;
                if (input.value.trim()) {
                  handleLogin(input.value.trim());
                }
              }}
              style={{
                width: '100%',
                background: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              로그인
            </button>
            <p style={{
              margin: '15px 0 0 0',
              fontSize: '12px',
              color: '#666',
              textAlign: 'center'
            }}>
              즐겨찾기 알림을 받으려면 로그인하세요
            </p>
          </div>
        </div>
      )}

      {/* 상세 히스토리 모달 */}
      {showHistoryModal && selectedParkingForHistory && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          zIndex: 10000
        }}>
          {/* 헤더 */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={{margin: 0, fontSize: '18px'}}>
              📋 {selectedParkingForHistory.name} 히스토리
            </h2>
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedParkingForHistory(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '4px 8px',
                lineHeight: 1,
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
              title="닫기"
            >
              ✕
            </button>
          </div>
          
          {/* 검색 필터 - 분석시간 기준 */}
          <div style={{marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'}}>
            <label style={{fontSize: '14px', color: '#666', fontWeight: 'bold'}}>
              🕐 분석시간 검색:
            </label>
            <input
              type="datetime-local"
              value={historySearchDate}
              onChange={(e) => setHistorySearchDate(e.target.value)}
                style={{
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  flex: 1,
                  minWidth: '200px'
                }}
                placeholder="분석시간으로 검색"
              />
              <button
                onClick={() => {
                  setHistorySearchDate('');
                  setHistorySearchTime('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ea4335',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                초기화
              </button>
          </div>
          
          {/* 히스토리 목록 - 해당 주차장만 필터링, 최신순 정렬 */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            {parkingHistory
              .filter(item => {
                // 해당 주차장의 히스토리만 표시
                if (item.parkingId !== selectedParkingForHistory.id) return false;
                
                // 분석시간 기준 검색 (analysisTime 또는 timestamp 기준)
                if (historySearchDate) {
                  const searchDateTime = new Date(historySearchDate).getTime();
                  const itemDateTime = new Date(item.data.analysisTime || item.timestamp).getTime();
                  
                  // 검색한 시간 이후의 데이터만 표시
                  if (itemDateTime < searchDateTime) return false;
                }
                
                return true;
              })
              .sort((a, b) => {
                // 최신순 정렬 (timestamp 기준)
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
              })
              .map(item => (
                <div key={item.id} style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  background: '#f9f9f9'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                    <h3 style={{margin: 0, fontSize: '16px', color: '#333'}}>
                      {getStatusEmoji(item.status)} {item.parkingName}
                    </h3>
                    <span style={{fontSize: '12px', color: '#666'}}>
                      {item.date} {item.time}
                    </span>
                  </div>
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt="주차장 현황"
                      style={{
                        width: '100%',
                        maxHeight: '160px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        marginBottom: '10px'
                      }}
                    />
                  )}
                  <div style={{fontSize: '14px', color: '#666'}}>
                    <p style={{margin: '5px 0'}}>
                      🅿️ 빈 공간: {item.data.emptySpaces}대 / {item.data.totalSpaces}대
                    </p>
                    <p style={{margin: '5px 0'}}>
                      📊 여유율: {item.data.emptyRatio}%
                    </p>
                    {item.data.analysisTime && (
                      <p style={{margin: '5px 0'}}>
                        🕐 분석 시간: {item.data.analysisTime}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            {parkingHistory.filter(item => item.parkingId === selectedParkingForHistory.id).length === 0 && (
              <p style={{textAlign: 'center', color: '#999', padding: '40px 0'}}>
                저장된 히스토리가 없습니다
              </p>
            )}
          </div>
          
          <button
            onClick={() => {
              setShowHistoryModal(false);
              setSelectedParkingForHistory(null);
            }}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '12px',
              background: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            닫기
          </button>
        </div>
      )}

      {/* 알림 설정 모달 */}
      {showNotificationSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }} onClick={() => setShowNotificationSettings(false)}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{margin: '0 0 20px 0', fontSize: '20px'}}>
              🔔 알림 시간대 설정
            </h2>
            <p style={{margin: '0 0 20px 0', fontSize: '14px', color: '#666'}}>
              알림을 받을 시간대를 설정하세요. 설정하지 않으면 항상 알림을 받습니다.
            </p>
            
            {/* 시간대 목록 */}
            <div style={{marginBottom: '20px'}}>
              {notificationTimeRanges.map(range => (
                <div key={range.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px',
                  padding: '12px',
                  background: range.enabled ? '#e8f5e9' : '#f5f5f5',
                  borderRadius: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={range.enabled}
                    onChange={() => toggleTimeRange(range.id)}
                    style={{width: '20px', height: '20px', cursor: 'pointer'}}
                  />
                  <input
                    type="time"
                    value={range.startTime}
                    onChange={(e) => updateTimeRange(range.id, 'startTime', e.target.value)}
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      flex: 1
                    }}
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={range.endTime}
                    onChange={(e) => updateTimeRange(range.id, 'endTime', e.target.value)}
                    style={{
                      padding: '6px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      flex: 1
                    }}
                  />
                  {notificationTimeRanges.length > 1 && (
                    <button
                      onClick={() => deleteTimeRange(range.id)}
                      style={{
                        background: '#ea4335',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button
              onClick={addTimeRange}
              style={{
                width: '100%',
                padding: '10px',
                background: '#34a853',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}
            >
              + 시간대 추가
            </button>
            
            <button
              onClick={() => setShowNotificationSettings(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      {showSidebar && (
        <div className="sidebar">
          <h3>주차장 관리</h3>
          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
            <button onClick={addNewParkingLot} className="add-button" style={{flex: 1}}>
              ➕ 추가
            </button>
            <button onClick={resetToDefault} className="reset-button" style={{flex: 1}}>
              🔄 초기화
            </button>
          </div>
          
          <div className="parking-list">
            {parkingLots.map(lot => (
              <div key={lot.id} className="parking-item">
                {editingParking?.id === lot.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editingParking.name}
                      onChange={(e) => setEditingParking({...editingParking, name: e.target.value})}
                      placeholder="주차장 이름"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={editingParking.lat}
                      onChange={(e) => setEditingParking({...editingParking, lat: parseFloat(e.target.value)})}
                      placeholder="위도 (마커를 드래그해도 변경됩니다)"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={editingParking.lng}
                      onChange={(e) => setEditingParking({...editingParking, lng: parseFloat(e.target.value)})}
                      placeholder="경도 (마커를 드래그해도 변경됩니다)"
                    />
                    <input
                      type="text"
                      value={editingParking.address || ''}
                      onChange={(e) => setEditingParking({...editingParking, address: e.target.value})}
                      placeholder="주소"
                    />
                    <select
                      value={editingParking.status}
                      onChange={(e) => setEditingParking({...editingParking, status: e.target.value})}
                    >
                      <option value="여유">여유</option>
                      <option value="보통">보통</option>
                      <option value="만차">만차</option>
                    </select>
                    <input
                      type="number"
                      value={editingParking.available}
                      onChange={(e) => setEditingParking({...editingParking, available: parseInt(e.target.value)})}
                      placeholder="가능"
                    />
                    <input
                      type="number"
                      value={editingParking.total}
                      onChange={(e) => setEditingParking({...editingParking, total: parseInt(e.target.value)})}
                      placeholder="총"
                    />
                    <input
                      type="text"
                      value={editingParking.fee || ''}
                      onChange={(e) => setEditingParking({...editingParking, fee: e.target.value})}
                      placeholder="요금"
                    />
                    <input
                      type="text"
                      value={editingParking.openTime || ''}
                      onChange={(e) => setEditingParking({...editingParking, openTime: e.target.value})}
                      placeholder="운영시간"
                    />
                    <input
                      type="text"
                      value={editingParking.contact || ''}
                      onChange={(e) => setEditingParking({...editingParking, contact: e.target.value})}
                      placeholder="연락처"
                    />
                    <button onClick={() => updateParkingLot(lot.id, editingParking)}>💾 저장</button>
                    <button onClick={() => setEditingParking(null)}>❌ 취소</button>
                  </div>
                ) : (
                  <div className="parking-info">
                    <strong>{lot.name}</strong>
                    <span className={`status-badge ${lot.status}`}>{lot.status}</span>
                    <p>📍 위도: {lot.lat.toFixed(4)}, 경도: {lot.lng.toFixed(4)}</p>
                    <p>🅿️ {lot.available} / {lot.total}</p>
                    <button onClick={() => setEditingParking(lot)}>✏️ 수정</button>
                    <button onClick={() => deleteParkingLot(lot.id)}>🗑️ 삭제</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Maps */}
      <LoadScript 
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        onLoad={() => setIsMapLoaded(true)}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={15}
          options={options}
        >
          {/* 주차장 마커 */}
          {isMapLoaded && filteredParkingLots.map((lot) => (
            <Marker
              key={lot.id}
              position={{ lat: lot.lat, lng: lot.lng }}
              onClick={() => setSelectedParking(lot)}
              draggable={true}
              onDragEnd={(e) => {
                handleMarkerDrag(lot.id, {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                });
              }}
              icon={{
                url: getMarkerColor(lot.status),
                scaledSize: new window.google.maps.Size(40, 40),
                labelOrigin: new window.google.maps.Point(20, -10)
              }}
              label={{
                text: lot.name,
                color: getLabelColor(lot.status),
                fontSize: '13px',
                fontWeight: 'bold',
                className: 'marker-label'
              }}
              title={lot.name}
            />
          ))}

          {/* 정보 창 */}
          {isMapLoaded && selectedParking && (
            <InfoWindow
              position={{ lat: selectedParking.lat, lng: selectedParking.lng }}
              onCloseClick={() => setSelectedParking(null)}
            >
              <div className="info-window">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                  <h3 style={{margin: 0, fontSize: '18px', color: '#333'}}>
                    {selectedParking.name}
                  </h3>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {isLoggedIn ? (
                      <>
                        <button
                          onClick={() => toggleFavorite(selectedParking.id)}
                          style={{
                            background: favorites.includes(selectedParking.id) ? '#fbbc04' : '#e0e0e0',
                            border: 'none',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            fontSize: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={favorites.includes(selectedParking.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                        >
                          {favorites.includes(selectedParking.id) ? '⭐' : '☆'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowLoginModal(true)}
                        style={{
                          background: '#4285f4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        로그인
                      </button>
                    )}
                  </div>
                </div>
                
                {/* 즐겨찾기 안내 */}
                {isLoggedIn && favorites.includes(selectedParking.id) && (
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '12px',
                    marginBottom: '12px',
                    color: '#856404'
                  }}>
                    ⭐ 즐겨찾기된 주차장입니다. 상태 변경 시 알림을 받습니다.
                  </div>
                )}
                
                {/* Discord 봇 이미지 */}
                {selectedParking.imageUrl && (
                  <div style={{marginBottom: '12px', borderRadius: '8px', overflow: 'hidden'}}>
                    <img 
                      src={selectedParking.imageUrl} 
                      alt="주차장 현황"
                      style={{
                        width: '100%',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        console.error('이미지 로드 실패:', selectedParking.imageUrl);
                      }}
                    />
                  </div>
                )}
                
                <div style={{marginBottom: '10px'}}>
                  <span className={`status-badge ${selectedParking.status}`} style={{
                    display: 'inline-block',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    background: selectedParking.status === '여유' ? '#34a853' : 
                               selectedParking.status === '보통' ? '#fbbc04' : '#ea4335'
                  }}>
                    {selectedParking.status}
                  </span>
                </div>

                <div style={{borderTop: '1px solid #eee', paddingTop: '12px'}}>
                  {/* Discord 봇 데이터 - 주차 현황 */}
                  <p style={{margin: '8px 0', fontSize: '14px', display: 'flex', alignItems: 'center'}}>
                    <span style={{marginRight: '8px'}}>🅿️</span>
                    <strong>주차 현황:</strong>&nbsp;
                    <span style={{color: '#4285f4', fontWeight: '600'}}>
                      {selectedParking.available || selectedParking.emptySpaces || 0}대 가능
                    </span>
                    <span style={{color: '#666'}}>
                      &nbsp;/ {selectedParking.total || selectedParking.totalSpaces || 0}대
                    </span>
                  </p>

                  {/* Discord 봇 데이터 - 주차 중 */}
                  {selectedParking.occupiedSpaces !== undefined && (
                    <p style={{margin: '8px 0', fontSize: '14px', display: 'flex', alignItems: 'center'}}>
                      <span style={{marginRight: '8px'}}>🚗</span>
                      <strong>주차 중:</strong>&nbsp;
                      <span style={{color: '#ea4335', fontWeight: '600'}}>
                        {selectedParking.occupiedSpaces}대
                      </span>
                    </p>
                  )}

                  {/* Discord 봇 데이터 - 빈 공간 비율 */}
                  {selectedParking.emptyRatio !== undefined && (
                    <p style={{margin: '8px 0', fontSize: '14px', display: 'flex', alignItems: 'center'}}>
                      <span style={{marginRight: '8px'}}>📊</span>
                      <strong>여유율:</strong>&nbsp;
                      <span style={{
                        color: parseFloat(selectedParking.emptyRatio) >= 30 ? '#34a853' :
                               parseFloat(selectedParking.emptyRatio) >= 10 ? '#fbbc04' : '#ea4335',
                        fontWeight: '600'
                      }}>
                        {selectedParking.emptyRatio}%
                      </span>
                    </p>
                  )}

                  {/* 상세보기 버튼 */}
                  {isLoggedIn && (
                    <button
                      onClick={() => {
                        setSelectedParkingForHistory(selectedParking);
                        setShowHistoryModal(true);
                      }}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px',
                        background: '#34a853',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      📋 상세보기 (히스토리)
                    </button>
                  )}

                  {/* Discord 봇 데이터 - 분석 시간 */}
                  {(selectedParking.lastUpdated || selectedParking.analysisTime) && (
                    <p style={{margin: '12px 0 0 0', fontSize: '12px', color: '#999', borderTop: '1px solid #eee', paddingTop: '8px'}}>
                      <span style={{marginRight: '4px'}}>🔄</span>
                      {selectedParking.analysisTime ? 
                        `분석 시간: ${selectedParking.analysisTime}` :
                        `마지막 업데이트: ${selectedParking.lastUpdated}`
                      }
                    </p>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

export default App;
