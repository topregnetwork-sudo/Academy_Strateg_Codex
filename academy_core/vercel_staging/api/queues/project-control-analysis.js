const { QueueClient } = require('@vercel/queue')
const { analyse } = require('../../lib/project-control-analysis')

const { handleNodeCallback } = new QueueClient()

export default handleNodeCallback(
  async (message, metadata) => {
    try { return await analyse(message, metadata) }
    catch (error) {
      console.error(JSON.stringify({ event: 'project_control_analysis_failed', code: String(error?.message || 'unknown_error').replace(/[^a-z0-9_:-]/gi, '_').slice(0, 120) }))
      throw error
    }
  },
  {
    visibilityTimeoutSeconds: 60,
    retry: (_error, metadata) => {
      if (Number(metadata.deliveryCount || 0) >= 3) return { acknowledge: true }
      return { afterSeconds: Math.min(120, 10 * 2 ** Number(metadata.deliveryCount || 0)) }
    }
  }
)
