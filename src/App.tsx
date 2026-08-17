import React, { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';

const DulpickHome = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F8F9FA' }}>
    <h1 style={{ fontSize: 32, fontWeight: 'bold', color: '#130537' }}>Dulpick</h1>
    <p style={{ marginTop: 16, color: '#4E5968', fontSize: 16 }}>커플을 위한 데이트 코스 앱 (MVP 준비 중)</p>
    <div style={{ marginTop: 40, padding: 24, backgroundColor: '#FFF', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', textAlign: 'center' }}>
      <p style={{ margin: 0, fontWeight: 600 }}>스레드 자동화 어드민은 아래 주소로 접속하세요!</p>
      <a href="/admin" style={{ display: 'inline-block', marginTop: 16, padding: '12px 24px', backgroundColor: '#3182F6', color: '#FFF', textDecoration: 'none', fontWeight: 'bold', borderRadius: 8 }}>/admin 이동하기 →</a>
    </div>
  </div>
);

const App = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (currentPath === '/admin') {
    return <AdminPanel />;
  }

  return <DulpickHome />;
};

export default App;
