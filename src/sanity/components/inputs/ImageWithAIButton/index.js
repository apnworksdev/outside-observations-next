import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Button, Card, Flex, Spinner, Stack, Text} from '@sanity/ui'
import {PatchEvent, set} from 'sanity'
import {ImageInput, useClient, useFormBuilder, useFormValue} from 'sanity'

import {urlFor} from '../../../lib/image'

export const ImageWithAIButton = React.forwardRef((props, ref) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [lastProcessed, setLastProcessed] = useState(null)

  const processedAssetRef = useRef(null)
  const isInitializedRef = useRef(false)
  const propsRef = useRef(props)

  const documentValue = useFormValue([])
  const currentAiDescription = documentValue?.aiDescription
  const currentAiMoodTags = documentValue?.aiMoodTags

  const formBuilder = useFormBuilder()
  const client = useClient({apiVersion: '2025-09-22'})

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
      setError('Please upload an image first')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const currentAsset = currentValue.asset
      let imageUrl = currentAsset?.url

      if (!imageUrl) {
        imageUrl = urlFor(currentValue).url()
      }

      if (!imageUrl) {
        throw new Error('Cannot determine image URL. Please check that the image is properly uploaded.')
      }

      if (!imageUrl.includes('dl=') && !imageUrl.includes('download')) {
        try {
          const urlObj = new URL(imageUrl)
          urlObj.searchParams.set('dl', '')
          imageUrl = urlObj.toString()
        } catch {
          imageUrl = imageUrl.includes('?') ? `${imageUrl}&dl=` : `${imageUrl}?dl=`
        }
      }

      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from Sanity: ${imageResponse.status}`)
      }

      const contentType = imageResponse.headers.get('content-type')
      if (!contentType?.startsWith('image/')) {
        throw new Error(`Failed to fetch image: received ${contentType} instead of image.`)
      }

      const imageBlob = await imageResponse.blob()
      const imageType = contentType || imageBlob.type || 'image/jpeg'
      const extension = imageType.split('/')[1]?.split(';')[0] || 'jpg'
      const filename =
        currentAsset.originalFilename ||
        currentAsset._ref?.replace('image-', '').replace('-', '.') ||
        `image.${extension}`

      const imageFile = new File([imageBlob], filename, {type: imageType})

      const formData = new FormData()
      formData.append('image', imageFile)

      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`API call failed: ${response.status} - ${errorText}`)
        }
        throw new Error(errorData.error || errorData.message || `API call failed: ${response.status}`)
      }

      const data = await response.json()
      const aiResult = {
        description: data.description,
        mood_tags: data.mood_tags,
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
    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [currentAiDescription, currentAiMoodTags, formBuilder, client])

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

    // Only process if asset ID actually changed
    if (currentAssetId && currentAssetId !== processedAssetRef.current && !isProcessing) {
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
  }, [assetId, isProcessing, handleAIProcess])

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

  const hasImage = props.value && props.value.asset
  const canProcess = hasImage && !isProcessing

  return (
    <Stack space={3}>
      <ImageInput {...props} ref={ref} />

      {hasImage && (
        <Card padding={3} tone="primary">
          <Stack space={2}>
            <Text size={1} weight="medium">
              AI Processing
            </Text>

            {isProcessing && (
              <Flex align="center" gap={2}>
                <Spinner />
                <Text size={1}>Generating AI description and tags...</Text>
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

ImageWithAIButton.displayName = 'ImageWithAIButton'
