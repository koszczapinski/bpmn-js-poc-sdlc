import { createRoot } from 'react-dom/client'
import App from './App'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import './styles.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<App />)
}
