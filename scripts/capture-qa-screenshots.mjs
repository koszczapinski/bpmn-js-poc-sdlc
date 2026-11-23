import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('.ai/qa', { recursive: true })

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9222
const chrome = spawn(
  chromePath,
  [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=/tmp/chrome-cdp-qa',
    '--window-size=1440,900',
    'http://127.0.0.1:4173/',
  ],
  { stdio: 'ignore' },
)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await res.json()
      if (list[0]?.webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl
      }
    } catch {
      // wait
    }
    await sleep(200)
  }
  throw new Error('Could not connect to Chrome DevTools port')
}

async function run() {
  try {
    const wsUrl = await getWsUrl()
    const ws = new WebSocket(wsUrl)
    await new Promise((resolve) => ws.addEventListener('open', resolve))

    let id = 1
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++
        const handler = (event) => {
          const data = JSON.parse(event.data)
          if (data.id === msgId) {
            ws.removeEventListener('message', handler)
            if (data.error) reject(data.error)
            else resolve(data.result)
          }
        }
        ws.addEventListener('message', handler)
        ws.send(JSON.stringify({ id: msgId, method, params }))
      })
    }

    await sleep(1500)

    // Screenshot 1: Overview
    const shot1 = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync('.ai/qa/01-overview.png', Buffer.from(shot1.data, 'base64'))
    console.log('Saved .ai/qa/01-overview.png')

    // Click User Task (Manager approval) to show Form ID in Properties Panel
    await send('Runtime.evaluate', {
      expression: `(() => {
        const shape = document.querySelector('[data-element-id="Task_ManagerApprove"]');
        if (shape) {
          shape.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    })
    await sleep(600)
    const shot2 = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync('.ai/qa/02-user-task-form-id.png', Buffer.from(shot2.data, 'base64'))
    console.log('Saved .ai/qa/02-user-task-form-id.png')

    // Click Service Task (Automatic approval) to show Job Type in Properties Panel
    await send('Runtime.evaluate', {
      expression: `(() => {
        const shape = document.querySelector('[data-element-id="Task_AutoApprove"]');
        if (shape) {
          shape.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    })
    await sleep(600)
    const shot3 = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync('.ai/qa/03-service-task-job-type.png', Buffer.from(shot3.data, 'base64'))
    console.log('Saved .ai/qa/03-service-task-job-type.png')

    // Click Simulation button to activate token simulation
    await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const simBtn = buttons.find(b => b.textContent.includes('Simulation') || b.textContent.includes('Symulacja'));
        if (simBtn) simBtn.click();
      })()`,
    })
    await sleep(800)
    const shot4 = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync('.ai/qa/04-token-simulation-active.png', Buffer.from(shot4.data, 'base64'))
    console.log('Saved .ai/qa/04-token-simulation-active.png')

    // Switch theme to dark
    await send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const moonBtn = buttons.find(b => b.getAttribute('aria-label') === 'Dark theme' || b.getAttribute('aria-label') === 'Ciemny motyw');
        if (moonBtn) moonBtn.click();
      })()`,
    })
    await sleep(600)
    const shot5 = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync('.ai/qa/05-dark-theme-simulation.png', Buffer.from(shot5.data, 'base64'))
    console.log('Saved .ai/qa/05-dark-theme-simulation.png')

    ws.close()
  } finally {
    chrome.kill()
  }
}

run().catch((err) => {
  console.error(err)
  chrome.kill()
  process.exit(1)
})
