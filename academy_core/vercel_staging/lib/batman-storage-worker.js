const { ensurePrivateFolder } = require('./yandex-disk')

function resolveStoragePath(rootPath, folderPath) {
  const root = String(rootPath || '').trim().replace(/^\/+|\/+$/g, '')
  const folder = String(folderPath || '').trim().replace(/^\/+|\/+$/g, '')
  if (!folder) throw new Error('candidate_folder_path_not_configured')
  if (!root || folder === root || folder.startsWith(`${root}/`)) return folder
  return `${root}/${folder}`
}

function safeErrorCode(error) {
  return String(error?.code || error?.message || 'storage_worker_failed')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '_')
    .slice(0, 120)
}

function createStorageRepository(pool) {
  return {
    async leaseNext() {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const selected = await client.query(`
          select o.id, o.profile_id, o.operation, o.payload, o.attempt_count,
                 s.folder_name, s.folder_path
          from batman_storage_outbox o
          join batman_candidate_storage s on s.profile_id = o.profile_id
          where o.delivery_state = 'queued' and o.available_at <= now()
          order by o.created_at
          for update of o skip locked
          limit 1
        `)
        const job = selected.rows[0]
        if (!job) {
          await client.query('commit')
          return null
        }
        await client.query(`
          update batman_storage_outbox
          set delivery_state = 'processing', attempt_count = attempt_count + 1,
              last_error_code = null
          where id = $1
        `, [job.id])
        await client.query(`
          update batman_candidate_storage
          set provision_state = 'provisioning', updated_at = now(), last_error_code = null
          where profile_id = $1
        `, [job.profile_id])
        await client.query('commit')
        return { ...job, attempt_count: Number(job.attempt_count) + 1 }
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },

    async markFolderDelivered(job, resource) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        await client.query(`
          update batman_candidate_storage
          set provision_state = 'ready', provider_resource_id = $2,
              folder_url = null, last_error_code = null, updated_at = now()
          where profile_id = $1
        `, [job.profile_id, resource.resourceId])
        await client.query(`
          update batman_storage_outbox
          set delivery_state = 'delivered', delivered_at = now(), last_error_code = null
          where id = $1 and delivery_state = 'processing'
        `, [job.id])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },

    async markFailed(job, errorCode) {
      const state = job.attempt_count >= 3 ? 'manual_review' : 'failed'
      const client = await pool.connect()
      try {
        await client.query('begin')
        await client.query(`
          update batman_candidate_storage
          set provision_state = $2, last_error_code = $3, updated_at = now()
          where profile_id = $1
        `, [job.profile_id, state, errorCode])
        await client.query(`
          update batman_storage_outbox
          set delivery_state = $2, last_error_code = $3
          where id = $1 and delivery_state = 'processing'
        `, [job.id, state, errorCode])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },
  }
}

async function processStorageJob({ job, repository, oauthToken, rootPath, fetchImpl = fetch }) {
  if (job.operation !== 'create_candidate_folder') {
    const error = new Error('storage_operation_not_implemented')
    error.code = 'operation_not_implemented'
    await repository.markFailed(job, safeErrorCode(error))
    return { state: 'failed', jobId: job.id, error: safeErrorCode(error) }
  }
  try {
    const targetPath = resolveStoragePath(rootPath, job.folder_path)
    const resource = await ensurePrivateFolder(targetPath, oauthToken, fetchImpl)
    await repository.markFolderDelivered(job, resource)
    return {
      state: 'delivered',
      jobId: job.id,
      profileId: job.profile_id,
      folderPath: resource.path,
      resourceId: resource.resourceId,
      created: resource.created,
      readback: true,
    }
  } catch (error) {
    const code = safeErrorCode(error)
    await repository.markFailed(job, code)
    return { state: 'failed', jobId: job.id, error: code }
  }
}

async function runStorageWorkerOnce({ repository, oauthToken, rootPath, fetchImpl = fetch }) {
  const job = await repository.leaseNext()
  if (!job) return { state: 'idle' }
  return processStorageJob({ job, repository, oauthToken, rootPath, fetchImpl })
}

module.exports = { safeErrorCode, resolveStoragePath, createStorageRepository, processStorageJob, runStorageWorkerOnce }
