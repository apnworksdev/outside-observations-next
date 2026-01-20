/**
 * Shared vector store client for Sanity Studio.
 * Used by document actions (archiveEntry, visualEssayImage) and VectorStoreSyncTool.
 *
 * - add: create only (fails if id exists)
 * - update: update only (requires existing id; backend must implement /api/vector_store/update_item)
 * - upsert: add, or update if add fails with "already exists"
 * - remove: delete; 404 is treated as success (idempotent)
 */

export async function addToVectorStore({ id, description }) {
  const response = await fetch('/api/vector-store/add-new-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, description }),
  })

  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch {
      // ignore
    }
    const message = payload.error || payload.message || `Vector store add failed (${response.status})`
    const err = new Error(message)
    err.status = response.status
    err.payload = payload
    throw err
  }
}

export async function updateInVectorStore({ id, description }) {
  const response = await fetch('/api/vector-store/update-item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, description }),
  })

  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch {
      // ignore
    }
    const message = payload.error || payload.message || `Vector store update failed (${response.status})`
    throw new Error(message)
  }
}

function isDuplicateAddError(err) {
  const msg = (err?.message || '') + (err?.payload?.error || '') + (err?.payload?.message || '')
  return err?.status === 409 || /already exists|duplicate|already in|conflict/i.test(msg)
}

export async function upsertInVectorStore({ id, description }) {
  try {
    await addToVectorStore({ id, description })
  } catch (err) {
    if (isDuplicateAddError(err)) {
      await updateInVectorStore({ id, description })
    } else {
      throw err
    }
  }
}

/**
 * Remove an item from the vector store by id.
 * 404 is treated as success (idempotent: "already gone").
 */
export async function removeFromVectorStore(id) {
  const response = await fetch(`/api/vector-store/delete-item/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (response.status === 404) {
    return
  }

  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch {
      // ignore
    }
    const message =
      payload.error || payload.message || `Vector store delete failed (${response.status})`
    throw new Error(message)
  }
}
