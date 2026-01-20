import {useState} from 'react'
import {useToast} from '@sanity/ui'
import {useClient} from 'sanity'

import {apiVersion} from '../env'
import {removeFromVectorStore, upsertInVectorStore} from '../lib/vectorStore'

const normalizeId = (id) => {
  if (!id) return ''
  return id.startsWith('drafts.') ? id.slice(7) : id
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

/**
 * Wraps the publish action for visualEssayImage. When an archiveEntry references this
 * image by its draft id, Sanity blocks publish ("cannot delete draft – references exist").
 * We temporarily remove that reference so publish can run, then restore it pointing to
 * the published id. Also adds/updates the image in the vector store when aiDescription
 * is present.
 */
const wrapPublishWithReferenceRewrite = (OriginalAction) => {
  const Wrapped = (props) => {
    const client = useClient({apiVersion})
    const toast = useToast()
    const original = OriginalAction(props)
    if (!original) return original

    const originalOnHandle = original.onHandle
    return {
      ...original,
      onHandle: async () => {
        const draftId = props.draft?._id
        const publishedId =
          draftId && typeof draftId === 'string' && draftId.startsWith('drafts.')
            ? draftId.slice(7)
            : draftId

        const toRestore = []
        if (draftId && typeof draftId === 'string') {
          const referring = await client.fetch(
            `*[_type == "archiveEntry" && defined(visualEssayImages) && count(visualEssayImages[_ref == $draftId]) > 0]{ _id, visualEssayImages }`,
            {draftId}
          )
          for (const doc of referring) {
            const arr = doc.visualEssayImages || []
            const filtered = arr.filter((it) => it?._ref !== draftId)
            const newArr = arr.map((it) =>
              it?._ref === draftId ? {...it, _ref: publishedId, _weak: true} : {...it, _weak: true}
            )
            await client.patch(doc._id).set({visualEssayImages: filtered}).commit()
            toRestore.push({id: doc._id, originalArr: arr, newArr})
          }
        }

        try {
          if (typeof originalOnHandle === 'function') {
            const res = originalOnHandle()
            if (res && typeof res.then === 'function') await res
          }
        } catch (publishErr) {
          for (const {id, originalArr} of toRestore) {
            try {
              await client.patch(id).set({visualEssayImages: originalArr}).commit()
            } catch (rollbackErr) {
              console.error('Rollback after publish fail:', rollbackErr)
            }
          }
          throw publishErr
        }

        if (publishedId && toRestore.length > 0) {
          for (const {id, newArr} of toRestore) {
            await client.patch(id).set({visualEssayImages: newArr}).commit()
          }
          for (const {id, newArr} of toRestore) {
            const docPublishedId = id.replace(/^drafts\./, '')
            if (docPublishedId === id) continue
            const published = await client.getDocument(docPublishedId)
            if (!published) continue
            try {
              const {_rev, ...rest} = published
              await client.createOrReplace({
                ...rest,
                _id: docPublishedId,
                visualEssayImages: newArr,
              })
            } catch (e) {
              console.error('Updating published archiveEntry ref:', e)
              toast?.push({
                status: 'warning',
                title: 'Reference updated in draft only',
                description: 'Open the archive entry and publish it to update the live version.',
              })
            }
          }
        }

        // Vector store: add/update when aiDescription is present (covers first publish and re-publish after edit)
        if (publishedId) {
          const doc = props.draft || props.published
          const description = doc?.aiDescription
          const hasDescription =
            typeof description === 'string' && description.trim() !== ''
          if (hasDescription) {
            try {
              await upsertInVectorStore({id: publishedId, description: description.trim()})
              toast?.push({
                status: 'success',
                title: 'Vector store updated',
                description: 'Image indexed for semantic search.',
              })
            } catch (err) {
              console.error('Vector store add failed:', err)
              toast?.push({
                status: 'warning',
                title: 'Vector store sync failed',
                description: err.message,
              })
            }
          } else {
            toast?.push({
              status: 'info',
              title: 'Vector store skipped',
              description: 'Add an AI description to sync with the vector store.',
            })
          }
        }
      },
    }
  }
  Wrapped.action = OriginalAction.action
  return Wrapped
}

export const vectorStoreDocumentActions = (prev, context) => {
  if (context.schemaType === 'archiveEntry') {
    return prev.map((OriginalAction) => {
      if (!OriginalAction?.action) return OriginalAction

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

          await upsertInVectorStore({id: canonicalId, description: description.trim()})
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

          try {
            await removeFromVectorStore(canonicalId)
            toast?.push({
              status: 'success',
              title: 'Vector store updated',
              description: 'Image removed from semantic search.',
            })
          } catch (error) {
            console.error('Vector store removal failed:', error)
            toast?.push({
              status: 'warning',
              title: 'Vector store removal failed',
              description: error.message,
            })
          }
        })
      }

      if (OriginalAction.action === 'delete') {
        return wrapAction(
          OriginalAction,
          async ({props, toast, docBeforeAction}) => {
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

  if (context.schemaType === 'visualEssayImage') {
    return prev.map((OriginalAction) => {
      if (!OriginalAction?.action) return OriginalAction

      if (OriginalAction.action === 'publish') {
        return wrapPublishWithReferenceRewrite(OriginalAction)
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

          try {
            await removeFromVectorStore(canonicalId)
            toast?.push({
              status: 'success',
              title: 'Vector store updated',
              description: 'Image removed from semantic search.',
            })
          } catch (error) {
            console.error('Vector store removal failed:', error)
            toast?.push({
              status: 'warning',
              title: 'Vector store removal failed',
              description: error.message,
            })
          }
        })
      }

      if (OriginalAction.action === 'delete') {
        return wrapAction(
          OriginalAction,
          async ({props, toast, docBeforeAction}) => {
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

  return prev
}
