import {set} from 'sanity'
import {PatchEvent} from 'sanity'

export const aiAutoFillAction = {
  name: 'aiAutoFill',
  title: 'Generate AI Content',
  icon: () => '🤖',
  
  // Only show this action if there's an image uploaded and mediaType is 'image'
  hidden: ({document}) => !document?.poster?.asset || document?.mediaType !== 'image',
  
  onHandle: async ({draft, published, patch}) => {
    try {
      // Get the current document (draft or published)
      const currentDoc = draft || published
      
      if (!currentDoc?.poster?.asset) {
        throw new Error('Please upload an image first')
      }

      // Only process AI for images, not for videos
      if (currentDoc?.mediaType !== 'image') {
        throw new Error('AI processing is only available for images')
      }

      // Check if AI fields are already filled
      const hasAiDescription = currentDoc.aiDescription && currentDoc.aiDescription.trim() !== ''
      const hasAiMoodTags = currentDoc.aiMoodTags && currentDoc.aiMoodTags.length > 0
      
      if (hasAiDescription && hasAiMoodTags) {
        // Both fields are filled, ask user if they want to replace
        const shouldReplace = confirm('AI fields already have content. Do you want to replace them with new AI-generated content?')
        if (!shouldReplace) {
          return
        }
      }

      // Get the image URL from Sanity asset
      const imageUrl = currentDoc.poster.asset.url
      
      // Fetch the image file
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image from Sanity')
      }
      
      const imageBlob = await imageResponse.blob()
      const imageFile = new File([imageBlob], currentDoc.poster.asset.originalFilename || 'image.jpg', {
        type: imageBlob.type
      })

      // Call our AI service
      const formData = new FormData()
      formData.append('file', imageFile)

      const response = await fetch('/api/generate-metadata', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API call failed: ${response.status}`)
      }

      const aiResult = await response.json()

      // Create patches to update the document
      const patches = []

      // Update AI description field (only if empty or user wants to replace)
      if (aiResult.description && (!hasAiDescription || shouldReplace)) {
        patches.push(set(aiResult.description, ['aiDescription']))
      }

      // Update AI mood tags (only if empty or user wants to replace)
      if (aiResult.mood_tags && Array.isArray(aiResult.mood_tags) && (!hasAiMoodTags || shouldReplace)) {
        patches.push(set(aiResult.mood_tags, ['aiMoodTags']))
      }

      // Apply all patches
      if (patches.length > 0) {
        patch.execute(patches)
      }

    } catch (error) {
      console.error('AI Auto-fill error:', error)
      alert(`Error: ${error.message}`)
    }
  }
}
