import { useState, useEffect, useRef } from 'react';
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
import MapView from './pages/Map';
import IndiaInDepth from './pages/IndiaInDepth';
import CovidBacktest from './pages/CovidBacktest';
import HormuzTracker from './pages/Hormuz';
import MarketSignals from './pages/MarketSignals';
import Globe from './pages/Globe';
import EnergyWatch from './pages/EnergyWatch';
import FAQ from './pages/FAQ';
import OnboardingTour from './components/OnboardingTour';

export default function App() {
  const [sectors, setSectors] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('shockmap_sectors') || 'null'); }
    catch { return null; }
  });
  const [guest, setGuest] = useState(() => sessionStorage.getItem('shockmap_guest') === '1');

  // Tour: show if never completed. tourReady adds the 700ms delay so dashboard renders first.
  const [toured, setTouredState] = useState(() => !!localStorage.getItem('shockmap_toured'));
  const [tourReady, setTourReady] = useState(false);
  const timerRef = useRef(null);

  // When the user is on the dashboard (guest or sectors set) and hasn't toured yet,
  // wait 700ms then show the tour overlay.
  useEffect(() => {
    const onDashboard = guest || !!sectors;
    if (onDashboard && !toured) {
      timerRef.current = setTimeout(() => setTourReady(true), 700);
    }
    return () => clearTimeout(timerRef.current);
  }, [guest, sectors, toured]);

  function dismissTour() {
    localStorage.setItem('shockmap_toured', '1');
    setTouredState(true);
    setTourReady(false);
  }

  function enterGuest() {
    sessionStorage.setItem('shockmap_guest', '1');
    setGuest(true);
    // Reset toured so first-timers always get the tour
    // (existing users already have localStorage set so toured stays true)
  }

  function selectSectors(s) {
    sessionStorage.setItem('shockmap_sectors', JSON.stringify(s));
    setSectors(s);
  }

  const showTour = !toured && tourReady;

  return (
    <>
      {/* Tour overlay — rendered at root level, above everything */}
      {showTour && <OnboardingTour onComplete={dismissTour} />}

      <Routes>
        {/* Public landing */}
        <Route
          path="/"
          element={
            guest || sectors
              ? (
                <AppShell selectedSectors={sectors || ['pharma', 'rare_earth', 'energy']}>
                  <Dashboard sectors={sectors || ['pharma', 'rare_earth', 'energy']} />
                </AppShell>
              )
              : <Landing onGuest={enterGuest} />
          }
        />

        {/* Sector selection */}
        <Route path="/sectors" element={<SectorSelect onSelect={selectSectors} />} />

        {/* App shell routes */}
        <Route element={<AppShell selectedSectors={sectors || ['pharma', 'rare_earth', 'energy']} />}>
          <Route path="dashboard"      element={<Dashboard sectors={sectors || ['pharma', 'rare_earth', 'energy']} />} />
          <Route path="shocks/:id"     element={<ShockDetail />} />
          <Route path="drugs"          element={<Drugs />} />
          <Route path="drugs/:id"      element={<Drugs />} />
          <Route path="alerts"         element={<Alerts />} />
          <Route path="graph"          element={<Graph />} />
          <Route path="query"          element={<Query />} />
          <Route path="simulate"       element={<Simulate />} />
          <Route path="map"            element={<MapView />} />
          <Route path="india"          element={<IndiaInDepth />} />
          <Route path="backtest"       element={<CovidBacktest />} />
          <Route path="hormuz"         element={<HormuzTracker />} />
          <Route path="stocks"         element={<MarketSignals />} />
          <Route path="globe"          element={<Globe />} />
          <Route path="energy"         element={<EnergyWatch />} />
          <Route path="faq"            element={<FAQ />} />
        </Route>
      </Routes>
    </>
  );
}
