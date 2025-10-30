import React, {useState, useCallback} from 'react'
import {set} from 'sanity'
import {PatchEvent} from 'sanity'
import {ImageInput} from 'sanity'
import {Button, Card, Flex, Spinner, Text, Stack} from '@sanity/ui'
import {useFormValue, useFormBuilder} from 'sanity'

// For now, we'll just store mood tags as strings instead of creating tag references
// This avoids permission issues with creating new tags

export const ImageWithAIButton = React.forwardRef((props, ref) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [lastProcessed, setLastProcessed] = useState(null)
  
  // Get the current document value to check if AI fields are empty
  const documentValue = useFormValue([])
  const currentAiDescription = documentValue?.aiDescription
  const currentAiMoodTags = documentValue?.aiMoodTags
  
  // Get the form builder to access document-level onChange
  const formBuilder = useFormBuilder()

  const handleAIProcess = useCallback(async () => {
    const currentValue = props.value
    if (!currentValue || !currentValue.asset) {
      setError('Please upload an image first')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Get the image URL from Sanity asset
      const imageUrl = currentValue.asset.url
      
      // Fetch the image file
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image from Sanity')
      }
      
      const imageBlob = await imageResponse.blob()
      const imageFile = new File([imageBlob], currentValue.asset.originalFilename || 'image.jpg', {
        type: imageBlob.type
      })

      // Call our AI service
      const formData = new FormData()
      formData.append('file', imageFile)

      const response = await fetch('/api/test-ai', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API call failed: ${response.status}`)
      }

      const data = await response.json()
      const aiResult = data.aiResponse

      console.log('🤖 AI Result:', aiResult)
      
      // Check if AI fields are empty and auto-fill them
      const patches = []
      let autoFilled = false
      
      // Auto-fill AI description if it's empty
      if (aiResult.description && (!currentAiDescription || currentAiDescription.trim() === '')) {
        console.log('📝 Auto-filling AI description (field was empty)')
        patches.push(set(aiResult.description, ['aiDescription']))
        autoFilled = true
      }
      
      // Auto-fill AI mood tags if they're empty
      if (aiResult.mood_tags && Array.isArray(aiResult.mood_tags) && (!currentAiMoodTags || currentAiMoodTags.length === 0)) {
        console.log('🏷️ Auto-filling AI mood tags (field was empty)')
        patches.push(set(aiResult.mood_tags, ['aiMoodTags']))
        autoFilled = true
      }
      
      // Apply patches if we auto-filled anything
      if (patches.length > 0) {
        console.log('✅ Auto-filling empty fields')
        console.log('🔧 Patches being applied:', patches)
        const patchEvent = PatchEvent.from(patches)
        console.log('🔧 PatchEvent created:', patchEvent)
        
        // Try using form builder's onChange for document-level updates
        if (formBuilder && formBuilder.onChange) {
          console.log('🔧 Using form builder onChange for document-level update')
          formBuilder.onChange(patchEvent)
        } else {
          console.log('🔧 Fallback: Using props.onChange (field-level only)')
          console.log('🔧 This will only update the poster field, not the AI fields')
          props.onChange(patchEvent)
        }
        console.log('🔧 onChange called')
      }
      
      // Store the AI result for display
      setLastProcessed({
        description: aiResult.description,
        moodTags: aiResult.mood_tags,
        timestamp: new Date().toLocaleTimeString(),
        autoFilled: autoFilled
      })

    } catch (err) {
      setError(err.message)
      console.error('AI processing error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [props])

  const hasImage = props.value && props.value.asset
  const canProcess = hasImage && !isProcessing

  return (
    <Stack space={3}>
      <ImageInput
        {...props}
        ref={ref}
      />
      
      {hasImage && (
        <Card padding={3} tone="primary">
          <Stack space={2}>
            <Text size={1} weight="medium">AI Processing</Text>
            <Text size={1}>Click the button below to generate AI description and mood tags from the uploaded image.</Text>
            
            <Button
              mode="ghost"
              tone="primary"
              text={isProcessing ? "Processing..." : "Generate AI Content"}
              onClick={handleAIProcess}
              disabled={!canProcess}
            />
            
            {isProcessing && (
              <Flex align="center" gap={2}>
                <Spinner />
                <Text size={1}>Calling AI service...</Text>
              </Flex>
            )}
            
            {error && (
              <Card tone="critical" padding={2}>
                <Text size={1}>Error: {error}</Text>
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
                    <Text size={1} weight="medium">AI Description:</Text>
                    <Text size={1} style={{fontStyle: 'italic', marginTop: '4px', display: 'block'}}>
                      {lastProcessed.description}
                    </Text>
                    {currentAiDescription && currentAiDescription.trim() !== '' && (
                      <Text size={0} style={{color: '#666', marginTop: '2px'}}>
                        (Field already had content, not auto-filled)
                      </Text>
                    )}
                  </div>
                  
                  <div>
                    <Text size={1} weight="medium">AI Mood Tags:</Text>
                    <Text size={1} style={{marginTop: '4px', display: 'block'}}>
                      {lastProcessed.moodTags.join(', ')}
                    </Text>
                    {currentAiMoodTags && currentAiMoodTags.length > 0 && (
                      <Text size={0} style={{color: '#666', marginTop: '2px'}}>
                        (Field already had content, not auto-filled)
                      </Text>
                    )}
                  </div>
                  
                  {!lastProcessed.autoFilled && (
                    <Text size={0} style={{color: '#666', marginTop: '8px'}}>
                      Fields already had content. Copy these values if you want to replace them.
                    </Text>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
})

ImageWithAIButton.displayName = 'ImageWithAIButton'
