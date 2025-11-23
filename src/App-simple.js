import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <div className="header">
        <img src="/logo.png" alt="HowParking Logo" className="app-logo" />
        <h1 className="app-title">HowParking</h1>
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h2>🅿️ 주차장 모니터링 시스템</h2>
        <p>지도를 로딩 중입니다...</p>
      </div>
    </div>
  );
}

export default App;
