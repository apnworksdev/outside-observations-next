/**
 * MediaWithAIButton - Unified component for image and video uploads with AI processing
 * 
 * Supports both image and video files. Automatically detects field type and processes accordingly.
 * Note: Video processing depends on API support - currently images work, videos are pending API update.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {PatchEvent, set} from 'sanity'
import {ImageInput, FileInput, useClient, useFormBuilder, useFormValue} from 'sanity'

import {urlFor} from '../../../lib/image'
import {projectId, dataset} from '../../../env'

export const MediaWithAIButton = React.forwardRef((props, ref) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [lastProcessed, setLastProcessed] = useState(null)
  const [progressMessage, setProgressMessage] = useState(null)

  const processedAssetRef = useRef(null)
  const isInitializedRef = useRef(false)
  const propsRef = useRef(props)

  const documentValue = useFormValue([])
  const currentAiDescription = documentValue?.aiDescription
  const currentAiMoodTags = documentValue?.aiMoodTags
  const mediaType = documentValue?.mediaType

  const formBuilder = useFormBuilder()
  const client = useClient({apiVersion: '2025-09-22'})

  // Determine if this is an image or file field based on schema type
  const isImageField = props.schemaType?.name === 'image'
  const isVideoField = props.schemaType?.name === 'file'
  
  // Determine expected media type based on field type and document mediaType
  const expectedMediaType = isImageField ? 'image' : 'video'
  const shouldProcessAI = mediaType === expectedMediaType

  // Media type labels
  const mediaLabel = isImageField ? 'image' : 'video'
  const mediaLabelCapitalized = isImageField ? 'Image' : 'Video'

  // Keep props ref updated - only update when value actually changes
  const prevValueRef = useRef(props.value)
  useEffect(() => {
    // Only update if the actual value changed, not just the props object reference
    if (prevValueRef.current !== props.value) {
      propsRef.current = props
      prevValueRef.current = props.value
    } else {
      // Still update the ref object
      propsRef.current = props
    }
  }, [props, props.value])

  const handleAIProcess = useCallback(async () => {
    const currentValue = propsRef.current.value
    if (!currentValue || !currentValue.asset) {
      setError(`Please upload a ${mediaLabel} first`)
      return
    }

    // Verify media type matches
    const currentMediaType = documentValue?.mediaType
    if (currentMediaType !== expectedMediaType) {
      setError(`AI processing is only available for ${mediaLabel}s when media type is set to "${mediaLabelCapitalized}"`)
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const currentAsset = currentValue.asset
      let mediaUrl = currentAsset?.url

      // For images, try using urlFor helper first
      if (isImageField && !mediaUrl) {
        mediaUrl = urlFor(currentValue).url()
      }

      // For file assets (videos), we need to fetch the asset document to get the URL
      if (!isImageField && !mediaUrl) {
        const assetRef = currentAsset?._ref || currentAsset?._id
        
        if (assetRef) {
          try {
            // Fetch the asset document to get the URL
            const assetDoc = await client.fetch(
              `*[_id == $ref][0]{url, originalFilename, mimeType}`,
              {ref: assetRef}
            )
            
            if (assetDoc?.url) {
              mediaUrl = assetDoc.url
            } else if (projectId && dataset) {
              // Fallback: construct URL from asset reference
              // Sanity file URLs follow pattern: https://cdn.sanity.io/files/{projectId}/{dataset}/{assetId}
              const assetId = assetRef.replace('file-', '').replace('sanity-fileAsset-', '')
              mediaUrl = `https://cdn.sanity.io/files/${projectId}/${dataset}/${assetId}`
            }
          } catch (fetchError) {
            console.error('Error fetching file asset:', fetchError)
            // Last resort: try constructing URL from asset reference
            if (projectId && dataset) {
              const assetId = assetRef.replace('file-', '').replace('sanity-fileAsset-', '')
              mediaUrl = `https://cdn.sanity.io/files/${projectId}/${dataset}/${assetId}`
            }
          }
        }
      }

      if (!mediaUrl) {
        throw new Error(`Cannot determine ${mediaLabel} URL. Please check that the ${mediaLabel} is properly uploaded.`)
      }

      // Ensure we get the download URL
      if (!mediaUrl.includes('dl=') && !mediaUrl.includes('download')) {
        try {
          const urlObj = new URL(mediaUrl)
          urlObj.searchParams.set('dl', '')
          mediaUrl = urlObj.toString()
        } catch {
          mediaUrl = mediaUrl.includes('?') ? `${mediaUrl}&dl=` : `${mediaUrl}?dl=`
        }
      }

      const mediaResponse = await fetch(mediaUrl)
      if (!mediaResponse.ok) {
        throw new Error(`Failed to fetch ${mediaLabel} from Sanity: ${mediaResponse.status}`)
      }

      const contentType = mediaResponse.headers.get('content-type')
      const expectedContentType = isImageField ? 'image/' : 'video/'
      
      if (!contentType?.startsWith(expectedContentType)) {
        throw new Error(`Failed to fetch ${mediaLabel}: received ${contentType} instead of ${mediaLabel}.`)
      }

      const mediaBlob = await mediaResponse.blob()
      const mediaMimeType = contentType || mediaBlob.type || (isImageField ? 'image/jpeg' : 'video/mp4')
      const extension = mediaMimeType.split('/')[1]?.split(';')[0] || (isImageField ? 'jpg' : 'mp4')
      const assetRefPattern = isImageField ? 'image-' : 'file-'
      const defaultFilename = isImageField ? `image.${extension}` : `video.${extension}`
      
      const filename =
        currentAsset.originalFilename ||
        currentAsset._ref?.replace(assetRefPattern, '').replace('-', '.') ||
        defaultFilename

      const mediaFile = new File([mediaBlob], filename, {type: mediaMimeType})

      const formData = new FormData()
      // API accepts both image and video in the "file" key
      formData.append('file', mediaFile)

      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        body: formData,
      })

      if (!response.body) {
        throw new Error('No response body received from server')
      }

      // Read the stream for progress updates
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let aiResult = null
      let streamError = null

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue
            
            try {
              const message = JSON.parse(line)
              
              if (message.type === 'progress') {
                setProgressMessage(message.message)
              } else if (message.type === 'result') {
                aiResult = {
                  description: message.data.description,
                  mood_tags: message.data.mood_tags,
                }
              } else if (message.type === 'error') {
                streamError = message.error
                break
              }
            } catch (parseError) {
              console.error('Error parsing stream message:', parseError, line)
            }
          }

          // If we got an error, break out of the loop
          if (streamError) {
            break
          }
        }

        // Process any remaining buffer
        if (buffer.trim() && !streamError) {
          try {
            const message = JSON.parse(buffer)
            if (message.type === 'result') {
              aiResult = {
                description: message.data.description,
                mood_tags: message.data.mood_tags,
              }
            } else if (message.type === 'error') {
              streamError = message.error
            }
          } catch (parseError) {
            console.error('Error parsing final buffer:', parseError)
          }
        }

        // If we got an error from the stream, throw it
        if (streamError) {
          throw new Error(streamError)
        }

        // If we didn't get a result, throw an error
        if (!aiResult) {
          throw new Error('No result received from AI service')
        }
      } finally {
        reader.releaseLock()
      }

      const documentPatches = []
      let autoFilled = false

      if (aiResult.description && (!currentAiDescription || currentAiDescription.trim() === '')) {
        documentPatches.push(set(aiResult.description, ['aiDescription']))
        autoFilled = true
      }

      if (
        aiResult.mood_tags &&
        Array.isArray(aiResult.mood_tags) &&
        (!currentAiMoodTags || currentAiMoodTags.length === 0)
      ) {
        try {
          const tagReferences = []
          const baseTimestamp = Date.now()
          let keyCounter = 0

          for (let i = 0; i < aiResult.mood_tags.length; i += 1) {
            const tagName = aiResult.mood_tags[i]
            if (!tagName || typeof tagName !== 'string') continue

            const trimmedName = tagName.trim()
            if (!trimmedName) continue

            try {
              const existingTag = await client.fetch(
                `*[_type == "tag" && name == $name][0]`,
                {name: trimmedName}
              )

              const uniqueKey = `tag-${baseTimestamp}-${keyCounter++}-${Math.random()
                .toString(36)
                .substr(2, 9)}`

              if (!existingTag) {
                const newTag = await client.create({
                  _type: 'tag',
                  name: trimmedName,
                })
                tagReferences.push({
                  _type: 'reference',
                  _ref: newTag._id,
                  _key: uniqueKey,
                })
              } else {
                tagReferences.push({
                  _type: 'reference',
                  _ref: existingTag._id,
                  _key: uniqueKey,
                })
              }
            } catch (tagError) {
              console.error(`Error processing tag "${trimmedName}":`, tagError)
            }
          }

          if (tagReferences.length > 0) {
            documentPatches.push(set(tagReferences, ['aiMoodTags']))
            autoFilled = true
          }
        } catch (tagError) {
          console.error('Error processing tags:', tagError)
          setError(`Failed to process tags: ${tagError.message}`)
        }
      }

      if (documentPatches.length > 0) {
        const patchEvent = PatchEvent.from(documentPatches)

        const documentOnChange =
          formBuilder?.__internal?.form?.onChange || formBuilder?.__internal?.onChange

        if (documentOnChange) {
          documentOnChange(patchEvent)
        } else if (propsRef.current.onChange) {
          propsRef.current.onChange(patchEvent)
        }
      }

      setLastProcessed({
        description: aiResult.description,
        moodTags: aiResult.mood_tags,
        timestamp: new Date().toLocaleTimeString(),
        autoFilled,
      })
      setProgressMessage(null)
    } catch (err) {
      setError(err.message)
      setProgressMessage(null)
    } finally {
      setIsProcessing(false)
    }
  }, [currentAiDescription, currentAiMoodTags, formBuilder, client, documentValue, isImageField, expectedMediaType, mediaLabel, mediaLabelCapitalized])

  // Track the last asset ID to prevent unnecessary effect runs
  const lastAssetIdRef = useRef(null)
  
  // Extract asset ID as a primitive string and memoize it
  const assetId = useMemo(() => {
    return props.value?.asset?._ref || props.value?.asset?._id || null
  }, [props.value?.asset?._ref, props.value?.asset?._id])
  
  useEffect(() => {
    const currentAssetId = assetId

    // Early return if asset ID hasn't actually changed
    if (currentAssetId === lastAssetIdRef.current && isInitializedRef.current) {
      return
    }

    if (!isInitializedRef.current) {
      return
    }

    // Only process if asset ID actually changed and mediaType matches
    if (currentAssetId && currentAssetId !== processedAssetRef.current && !isProcessing && shouldProcessAI) {
      lastAssetIdRef.current = currentAssetId
      processedAssetRef.current = currentAssetId

      setTimeout(() => {
        handleAIProcess()
      }, 500)
    } else if (!currentAssetId) {
      // Reset when asset is removed
      if (lastAssetIdRef.current !== null) {
        lastAssetIdRef.current = null
      }
    }
  }, [assetId, isProcessing, handleAIProcess, shouldProcessAI])

  useEffect(() => {
    const currentValue = props.value
    const currentAssetId = currentValue?.asset?._ref || currentValue?.asset?._id

    if (!isInitializedRef.current) {
      if (currentAssetId) {
        processedAssetRef.current = currentAssetId
      }
      isInitializedRef.current = true
    }
  }, [props.value])

  const hasMedia = props.value && props.value.asset
  const canProcess = hasMedia && !isProcessing && shouldProcessAI

  // Select the appropriate input component
  const InputComponent = isImageField ? ImageInput : FileInput

  return (
    <Stack space={3}>
      <InputComponent {...props} ref={ref} />

      {hasMedia && shouldProcessAI && (
        <Card padding={3} tone="primary">
          <Stack space={2}>
            <Text size={1} weight="medium">
              AI Processing
            </Text>

            {isProcessing && (
              <Flex align="center" gap={2}>
                <Spinner />
                <Text size={1}>
                  {progressMessage || 'Generating AI description and tags...'}
                </Text>
              </Flex>
            )}

            {error && (
              <Card tone="critical" padding={2}>
                <Stack space={2}>
                  <Text size={1}>Error: {error}</Text>
                  <Button
                    mode="ghost"
                    tone="critical"
                    text="Retry"
                    onClick={() => {
                      setError(null)
                      handleAIProcess()
                    }}
                    disabled={isProcessing}
                  />
                </Stack>
              </Card>
            )}

            {lastProcessed && !isProcessing && (
              <Card tone="positive" padding={3}>
                <Stack space={2}>
                  <Text size={1} weight="medium">
                    ✓ AI content generated at {lastProcessed.timestamp}
                    {lastProcessed.autoFilled && ' (auto-filled empty fields)'}
                  </Text>

                  <div>
                    <Text size={1} weight="medium">
                      AI Description:
                    </Text>
                    <Text
                      size={1}
                      style={{fontStyle: 'italic', marginTop: '4px', display: 'block'}}
                    >
                      {lastProcessed.description}
                    </Text>
                    {currentAiDescription && currentAiDescription.trim() !== '' && (
                      <Text size={0} style={{color: '#666', marginTop: '2px'}}>
                        (Field already had content, not auto-filled)
                      </Text>
                    )}
                  </div>

                  <div>
                    <Text size={1} weight="medium">
                      AI Mood Tags:
                    </Text>
                    <Text size={1} style={{marginTop: '4px', display: 'block'}}>
                      {Array.isArray(lastProcessed.moodTags)
                        ? lastProcessed.moodTags.join(', ')
                        : 'Processing...'}
                    </Text>
                    {currentAiMoodTags && currentAiMoodTags.length > 0 && (
                      <Text size={0} style={{color: '#666', marginTop: '2px'}}>
                        (Field already had content, not auto-filled)
                      </Text>
                    )}
                  </div>
                </Stack>
              </Card>
            )}

            <Button
              text={isProcessing ? 'Processing…' : 'Generate AI Content'}
              tone="primary"
              mode="ghost"
              onClick={handleAIProcess}
              disabled={!canProcess || isProcessing}
            />
          </Stack>
        </Card>
      )}
    </Stack>
  )
})

MediaWithAIButton.displayName = 'MediaWithAIButton'

