import express from 'express'
import { loadData, saveData } from '../services/storage.js'

const router = express.Router()

/**
 * GET /api/settings
 * 获取设置
 */
router.get('/', (req, res) => {
  const settings = loadData('settings.json', {})
  // 隐藏 API Key 的中间部分
  if (settings.aiApiKey) {
    const key = settings.aiApiKey
    if (key.length > 8) {
      settings.aiApiKeyMasked = key.slice(0, 4) + '****' + key.slice(-4)
      delete settings.aiApiKey
    }
  }
  res.json(settings)
})

/**
 * PUT /api/settings
 * 更新设置
 */
router.put('/', (req, res) => {
  const current = loadData('settings.json', {})
  const updates = req.body

  // 如果有新的api key，直接保存
  if (updates.aiApiKey) {
    current.aiApiKey = updates.aiApiKey
  }

  // 更新其他字段
  Object.keys(updates).forEach(key => {
    if (key !== 'aiApiKey') {
      current[key] = updates[key]
    }
  })

  saveData('settings.json', current)
  res.json({ success: true })
})

/**
 * POST /api/settings/test-ai
 * 测试AI连接
 */
router.post('/test-ai', async (req, res) => {
  const settings = loadData('settings.json', {})
  
  if (!settings.aiApiKey) {
    return res.status(400).json({ error: '请先配置 API Key' })
  }

  try {
    const response = await fetch(settings.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.aiApiKey}`
      },
      body: JSON.stringify({
        model: settings.aiModel || 'gpt-4o-mini',
        messages: [{ role: 'user', content: '请回复"连接成功"' }],
        max_tokens: 20
      })
    })

    if (response.ok) {
      const result = await response.json()
      res.json({ success: true, message: result.choices?.[0]?.message?.content || '连接成功' })
    } else {
      const errText = await response.text()
      res.status(400).json({ error: `连接失败 (${response.status}): ${errText}` })
    }
  } catch (error) {
    res.status(500).json({ error: `连接失败: ${error.message}` })
  }
})

export default router
