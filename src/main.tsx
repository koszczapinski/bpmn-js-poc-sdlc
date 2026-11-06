import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root is missing.')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
