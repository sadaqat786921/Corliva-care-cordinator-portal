import type { ReactElement } from 'react'
import { HashRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { StoreProvider, useStore } from './data/store'
import Shell from './components/Shell'
import { EmptyState } from './components/ui'
import { Login, Forgot } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Referrals from './pages/Referrals'
import ReferralDetail from './pages/ReferralDetail'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Requests from './pages/Requests'
import Schedule from './pages/Schedule'
import Cover from './pages/Cover'
import Today from './pages/Today'
import Caregivers from './pages/Caregivers'
import Incidents from './pages/Incidents'
import Settings from './pages/Settings'

function Guard({ children }: { children: ReactElement }) {
  const s = useStore()
  if (!s.signedIn) return <Navigate to="/login" replace />
  return children
}

function NotFound() {
  return <div className="card"><EmptyState icon={Compass} tone="info" title="We can’t find that page" text="The link may be old, or you may not have access to it." action={<Link className="btn btn-primary" to="/">Go to My work</Link>} /></div>
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route element={<Guard><Shell /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="referrals/:id" element={<ReferralDetail />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="requests" element={<Requests />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="cover" element={<Cover />} />
            <Route path="today" element={<Today />} />
            <Route path="caregivers" element={<Caregivers />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
