import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const syncFilePath = path.resolve(process.cwd(), '.cafe-sync-orders.json')

function readSyncedOrders() {
  try {
    if (!fs.existsSync(syncFilePath)) return []
    const parsed = JSON.parse(fs.readFileSync(syncFilePath, 'utf-8'))
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

function writeSyncedOrders(orders) {
  try {
    fs.writeFileSync(syncFilePath, JSON.stringify(orders, null, 2), 'utf-8')
  } catch (_) {}
}

function cafeSyncPlugin() {
  return {
    name: 'cafe-sync-api',
    configureServer(server) {
      server.middlewares.use('/api/cafe-sync', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          res.end(JSON.stringify({ orders: readSyncedOrders() }))
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}')
              if (Array.isArray(data.orders)) {
                writeSyncedOrders(data.orders)
              }
            } catch (_) {}
            const current = readSyncedOrders()
            res.end(JSON.stringify({ ok: true, count: current.length }))
          })
          return
        }
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), cafeSyncPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  }
})
