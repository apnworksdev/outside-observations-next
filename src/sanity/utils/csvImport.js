// Shared CSV import utilities for archive entries and visual essay images

// Slugify function (matches schema)
export const slugify = (input) => {
  if (!input) return ''
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

// Column mapping with aliases
export const COLUMN_MAPPINGS = {
  'artname': 'metadata.artName',
  'art name': 'metadata.artName',
  'art_name': 'metadata.artName',
  'title': 'metadata.artName',
  'name': 'metadata.artName',
  
  'filename': 'metadata.fileName',
  'file name': 'metadata.fileName',
  'file_name': 'metadata.fileName',
  
  'source': 'metadata.source',
  'author': 'metadata.source',
  'source / author': 'metadata.source',
  
  'year': 'metadata.year',
  
  'tags': 'metadata.tags',
  'tag': 'metadata.tags',
  
  'credit': 'metadata.credit',
  'photo credit': 'metadata.credit',
  
  'action': 'metadata.action',
  'color': 'metadata.color',
  'timeofday': 'metadata.timeOfDay',
  'time of day': 'metadata.timeOfDay',
  'time_of_day': 'metadata.timeOfDay',
  'season': 'metadata.season',
  'subject': 'metadata.subject',
  'image subject (landscape, protrait, urban, study)': 'metadata.subject',
  'image subject': 'metadata.subject',
  'landscapetype': 'metadata.landscapeType',
  'landscape type': 'metadata.landscapeType',
  'landscape_type': 'metadata.landscapeType',
  'subjecttype': 'metadata.subjectType',
  'subject type': 'metadata.subjectType',
  'subject_type': 'metadata.subjectType',
  'gender': 'metadata.gender',
  'humanstructure1': 'metadata.humanStructure1',
  'human structure 1': 'metadata.humanStructure1',
  'human_structure_1': 'metadata.humanStructure1',
  'human structure 1/2': 'metadata.humanStructure1',
  'humanstructure2': 'metadata.humanStructure2',
  'human structure 2': 'metadata.humanStructure2',
  'human_structure_2': 'metadata.humanStructure2',
  'human structure 2/2': 'metadata.humanStructure2',
  'maindrivefolder': 'metadata.mainDriveFolder',
  'main drive folder': 'metadata.mainDriveFolder',
  'main_drive_folder': 'metadata.mainDriveFolder',
  'drive folder': 'metadata.mainDriveFolder',
  'typeofwork': 'metadata.typeOfWork',
  'type of work': 'metadata.typeOfWork',
  'type_of_work': 'metadata.typeOfWork',
  'type of work (llm-generated)': 'metadata.typeOfWork',
  'dimensions': 'metadata.dimensions',
  'dimensions ×': 'metadata.dimensions',
  'seriestitle': 'metadata.seriesTitle',
  'series title': 'metadata.seriesTitle',
  'series_title': 'metadata.seriesTitle',
  'publication': 'metadata.publication',
  'publisher': 'metadata.publisher',
  'artcontextbackground': 'metadata.artContextBackground',
  'art context background': 'metadata.artContextBackground',
  'art_context_background': 'metadata.artContextBackground',
  'context': 'metadata.artContextBackground',
  'background': 'metadata.artContextBackground',
  'short, 2-3 sentence summary/description that gives background or narrative context if there is': 'metadata.artContextBackground',
  'medium': 'metadata.medium',
  'exhibition': 'metadata.exhibition',
  'languages': 'metadata.languages',
  'language': 'metadata.languages',
  'main language(s) present in the piece, if textual.': 'metadata.languages',
  'main language(s)': 'metadata.languages',
  'alttitles': 'metadata.altTitles',
  'alternative titles': 'metadata.altTitles',
  'alt titles': 'metadata.altTitles',
  'alt_titles': 'metadata.altTitles',
  'alternate titles (llm-generated)': 'metadata.altTitles',
  'externallinks': 'metadata.externalLinks',
  'external links': 'metadata.externalLinks',
  'external_links': 'metadata.externalLinks',
  'links': 'metadata.externalLinks',
  'urls': 'metadata.externalLinks',
  'external links: wiki links...': 'metadata.externalLinks',
  'external links: wiki links, exhibition catalogs, critical essays, news coverage': 'metadata.externalLinks',
}

export function mapColumnToField(columnName) {
  if (!columnName) return null
  const normalized = columnName.toLowerCase().trim()
  return COLUMN_MAPPINGS[normalized] || null
}

// Parse a single CSV line (handles quoted fields)
export function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  values.push(current.trim())
  return values
}

// Parse CSV (simple parser)
export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return {headers: [], rows: []}

  const headers = parseCSVLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0) continue
    
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return {headers, rows}
}

// Parse array field (comma-separated)
export function parseArrayField(value) {
  if (!value || typeof value !== 'string') return []
  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

// Generate unique key for tag references (similar to TagReferenceInput)
const generateTagKey = () => `tag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

// Resolve tags (lookup or create)
export async function resolveTags(tagNames, client) {
  const tagReferences = []
  
  for (const tagName of tagNames) {
    if (!tagName || tagName.trim() === '') continue
    
    const normalized = tagName.trim().toLowerCase()
    const tagSlug = slugify(normalized)
    
    if (!tagSlug) continue
    
    // Lookup existing tag by slug
    const existing = await client.fetch(
      `*[_type == "tag" && slug.current == $slug][0]`,
      {slug: tagSlug}
    )
    
    if (existing) {
      // Use existing tag - but still need a new _key for the array item
      tagReferences.push({
        _type: 'reference',
        _ref: existing._id,
        _key: generateTagKey(),
      })
    } else {
      // Create new tag
      const newTag = await client.create({
        _type: 'tag',
        name: tagName.trim(),
        slug: {current: tagSlug},
      })
      tagReferences.push({
        _type: 'reference',
        _ref: newTag._id,
        _key: generateTagKey(),
      })
    }
  }
  
  return tagReferences
}

// Build metadata object from CSV row
// mapper: optional custom column mapping function (defaults to mapColumnToField)
export async function buildMetadata(row, client, mapper = mapColumnToField) {
  const metadata = {}

  // Handle year object - check three columns in priority order
  let yearValue = ''
  let yearSpans = ''
  let yearEstimate = ''
  
  for (const [columnName, value] of Object.entries(row)) {
    const normalized = columnName.toLowerCase().trim()
    if (normalized === 'year' && !yearValue) {
      yearValue = value?.trim() || ''
    } else if ((normalized === 'year (spans)' || normalized === 'year spans') && !yearSpans) {
      yearSpans = value?.trim() || ''
    } else if ((normalized === 'year (estimate)' || normalized === 'year estimate') && !yearEstimate) {
      yearEstimate = value?.trim() || ''
    }
  }
  
  if (yearValue) {
    metadata.year = {
      value: yearValue,
      isEstimate: false,
    }
  } else if (yearSpans) {
    metadata.year = {
      value: yearSpans,
      isEstimate: false,
    }
  } else if (yearEstimate) {
    metadata.year = {
      value: yearEstimate,
      isEstimate: true,
    }
  }

  // Process each column
  for (const [columnName, value] of Object.entries(row)) {
    if (!value || value.trim() === '') continue

    const fieldPath = mapper(columnName)
    if (!fieldPath) continue

    const normalizedColumn = columnName.toLowerCase().trim()
    if (normalizedColumn === 'year' || 
        normalizedColumn === 'year (spans)' || 
        normalizedColumn === 'year spans' ||
        normalizedColumn === 'year (estimate)' || 
        normalizedColumn === 'year estimate') {
      continue
    }

    const [topLevel, nested] = fieldPath.split('.')

    // Handle tags
    if (fieldPath === 'metadata.tags') {
      const tagNames = parseArrayField(value)
      if (tagNames.length > 0) {
        metadata.tags = await resolveTags(tagNames, client)
      }
      continue
    }

    // Handle array fields
    const arrayFields = [
      'metadata.action',
      'metadata.color',
      'metadata.timeOfDay',
      'metadata.season',
      'metadata.subject',
      'metadata.landscapeType',
      'metadata.subjectType',
      'metadata.gender',
      'metadata.humanStructure1',
      'metadata.humanStructure2',
      'metadata.typeOfWork',
      'metadata.languages',
      'metadata.altTitles',
      'metadata.externalLinks',
    ]

    if (arrayFields.includes(fieldPath)) {
      let arrayValue = parseArrayField(value)
      
      if (fieldPath === 'metadata.season') {
        const validSeasons = ['spring', 'summer', 'fall', 'winter']
        arrayValue = arrayValue
          .map(item => item.toLowerCase().trim())
          .filter(item => validSeasons.includes(item))
      } else if (fieldPath === 'metadata.timeOfDay') {
        const validTimeOfDay = ['day', 'night']
        arrayValue = arrayValue
          .map(item => item.toLowerCase().trim())
          .filter(item => validTimeOfDay.includes(item))
      } else if (fieldPath === 'metadata.subject') {
        const validSubjects = ['landscape', 'portrait', 'urban', 'study']
        arrayValue = arrayValue
          .map(item => item.toLowerCase().trim())
          .filter(item => validSubjects.includes(item))
      } else if (fieldPath === 'metadata.gender') {
        const validGenders = ['man', 'woman']
        arrayValue = arrayValue
          .map(item => item.toLowerCase().trim())
          .filter(item => validGenders.includes(item))
      } else {
        arrayValue = arrayValue.map(item => item.trim())
      }
      
      if (arrayValue.length > 0) {
        metadata[nested] = arrayValue
      }
      continue
    }

    // Handle string fields
    if (nested) {
      metadata[nested] = value.trim()
    }
  }

  // Generate slug from fileName or artName
  if (metadata.fileName) {
    const slug = slugify(metadata.fileName)
    if (slug) {
      metadata.slug = {current: slug}
    }
  } else if (metadata.artName) {
    const slug = slugify(metadata.artName)
    if (slug) {
      metadata.slug = {current: slug}
    }
  }

  return metadata
}
