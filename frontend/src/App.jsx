import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import SectorSelect from './pages/SectorSelect';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import ShockDetail from './pages/ShockDetail';
import Drugs from './pages/Drugs';
import Alerts from './pages/Alerts';
import Graph from './pages/Graph';
import Query from './pages/Query';
import Simulate from './pages/Simulate';

export default function App() {
  // Track whether user has selected sectors (persisted in sessionStorage)
  const [sectors, setSectors] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('shockmap_sectors') || 'null'); }
    catch { return null; }
  });
  const [guest, setGuest] = useState(() => sessionStorage.getItem('shockmap_guest') === '1');

  function enterGuest() {
    sessionStorage.setItem('shockmap_guest', '1');
    setGuest(true);
  }

  function selectSectors(s) {
    sessionStorage.setItem('shockmap_sectors', JSON.stringify(s));
    setSectors(s);
  }

  return (
    <Routes>
      {/* Public landing — always accessible */}
      <Route
        path="/"
        element={
          guest || sectors
            ? <AppShell selectedSectors={sectors || ['pharma', 'rare_earth']}>
                <Dashboard sectors={sectors || ['pharma', 'rare_earth']} />
              </AppShell>
            : <Landing onGuest={enterGuest} />
        }
      />

      {/* Sector selection */}
      <Route
        path="/sectors"
        element={<SectorSelect onSelect={selectSectors} />}
      />

      {/* App shell routes */}
      <Route element={<AppShell selectedSectors={sectors || ['pharma', 'rare_earth']} />}>
        <Route path="dashboard"      element={<Dashboard sectors={sectors || ['pharma', 'rare_earth']} />} />
        <Route path="shocks/:id"     element={<ShockDetail />} />
        <Route path="drugs"          element={<Drugs />} />
        <Route path="drugs/:id"      element={<Drugs />} />
        <Route path="alerts"         element={<Alerts />} />
        <Route path="graph"          element={<Graph />} />
        <Route path="query"          element={<Query />} />
        <Route path="simulate"       element={<Simulate />} />
      </Route>
    </Routes>
  );
}
