import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { TaskGenerationProvider } from './context/TaskGenerationContext'

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TaskGenerationProvider>
        <App />
      </TaskGenerationProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
