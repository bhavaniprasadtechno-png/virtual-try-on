import { TopNav } from './components/AppShell/TopNav';
import { SideRail } from './components/AppShell/SideRail';
import { SceneViewer } from './components/SceneViewer/SceneViewer';
import './App.css';

export function App() {
  return (
    <div className="app">
      <TopNav />
      <div className="app__body">
        <SideRail />
        <SceneViewer />
      </div>
    </div>
  );
}
