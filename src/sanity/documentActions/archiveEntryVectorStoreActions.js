import {useState} from 'react'
import {useToast} from '@sanity/ui'
const normalizeId = (id) => {
  if (!id) return ''
  return id.startsWith('drafts.') ? id.slice(7) : id
}

async function addToVectorStore({id, description}) {
  const response = await fetch('/api/vector-store/add-new-item', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({id, description}),
  })

  if (!response.ok) {
    let errorPayload = {}
    try {
      errorPayload = await response.json()
    } catch (parseError) {
      // ignore
    }
    const message =
      errorPayload.error || errorPayload.message || `Vector store add failed (${response.status})`
    throw new Error(message)
  }
}

async function removeFromVectorStore(id) {
  const response = await fetch(`/api/vector-store/delete-item/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    let errorPayload = {}
    try {
      errorPayload = await response.json()
    } catch (parseError) {
      // ignore
    }
    const message =
      errorPayload.error || errorPayload.message || `Vector store delete failed (${response.status})`
    throw new Error(message)
  }
}

const wrapAction = (OriginalAction, handler, options = {}) => {
  const {checkCancellation = false} = options
  const WrappedAction = (props) => {
    const toast = useToast()
    const [busy, setBusy] = useState(false)
    const original = OriginalAction(props)

    if (!original) {
      return original
    }

    const originalOnHandle = original.onHandle
    const originalLabel = original.label

    return {
      ...original,
      label: busy && originalLabel ? `${originalLabel}…` : originalLabel,
      disabled: original.disabled || busy,
      onHandle: async () => {
        if (busy) return
        setBusy(true)

        try {
          // For delete actions, capture document state before deletion
          let docBeforeAction = null
          if (checkCancellation) {
            docBeforeAction = props.published || props.draft
          }

          if (typeof originalOnHandle === 'function') {
            const maybePromise = originalOnHandle()
            if (maybePromise && typeof maybePromise.then === 'function') {
              await maybePromise
            }
          }

          // For delete actions, check if document still exists (cancellation check)
          if (checkCancellation) {
            const docAfterAction = props.published || props.draft
            if (docAfterAction) {
              // Document still exists, action was cancelled - don't call handler
              return
            }
          }

          await handler({props, toast, docBeforeAction})
        } catch (error) {
          console.error('Vector store sync error:', error)
          toast?.push({
            status: 'warning',
            title: 'Vector store sync failed',
            description: error.message,
          })
        } finally {
          setBusy(false)
        }
      },
    }
  }

  WrappedAction.action = OriginalAction.action
  return WrappedAction
}

export const archiveEntryVectorStoreActions = (prev, context) => {
  if (context.schemaType !== 'archiveEntry') {
    return prev
  }

  return prev.map((OriginalAction) => {
    if (!OriginalAction?.action) {
      return OriginalAction
    }

    if (OriginalAction.action === 'publish') {
      return wrapAction(OriginalAction, async ({props, toast}) => {
        const doc = props.draft || props.published
        const canonicalId = normalizeId(doc?._id)
        const description = doc?.aiDescription || doc?.description || ''

        if (!canonicalId) {
          toast?.push({
            status: 'warning',
            title: 'Vector store skipped',
            description: 'Document ID missing, unable to sync.',
          })
          return
        }

        if (!description || typeof description !== 'string' || description.trim() === '') {
          toast?.push({
            status: 'info',
            title: 'Vector store skipped',
            description: 'Add an AI description to sync with the vector store.',
          })
          return
        }

        await addToVectorStore({id: canonicalId, description: description.trim()})
        toast?.push({
          status: 'success',
          title: 'Vector store updated',
          description: 'Image indexed for semantic search.',
        })
      })
    }

    if (OriginalAction.action === 'unpublish') {
      return wrapAction(OriginalAction, async ({props, toast}) => {
        const doc = props.published || props.draft
        const canonicalId = normalizeId(doc?._id)

        if (!canonicalId) {
          toast?.push({
            status: 'warning',
            title: 'Vector store removal skipped',
            description: 'Document ID missing, unable to remove entry.',
          })
          return
        }

        await removeFromVectorStore(canonicalId)
        toast?.push({
          status: 'success',
          title: 'Vector store updated',
          description: 'Image removed from semantic search.',
        })
      })
    }

    if (OriginalAction.action === 'delete') {
      return wrapAction(
        OriginalAction,
        async ({props, toast, docBeforeAction}) => {
          // docBeforeAction is captured before the delete action runs
          // If delete was cancelled, wrapAction will return early and this won't be called
          const canonicalId = normalizeId(docBeforeAction?._id)

          if (!canonicalId) {
            return
          }

          try {
            await removeFromVectorStore(canonicalId)
          } catch (error) {
            console.error('Vector store delete failed:', error)
            toast?.push({
              status: 'warning',
              title: 'Vector store removal failed',
              description: error.message,
            })
          }
        },
        {checkCancellation: true}
      )
    }

    return OriginalAction
  })
}

