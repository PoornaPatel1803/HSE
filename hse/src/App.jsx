import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProjectList from './components/ProjectList.jsx'
import HSECharterForm from './components/HSECharterForm.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ProjectList />} />
        <Route path="/" element={<ProjectList />} />
        <Route path="charter/new/:projectId" element={<HSECharterForm />} />
        <Route path="charter/:charterId" element={<HSECharterForm />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
