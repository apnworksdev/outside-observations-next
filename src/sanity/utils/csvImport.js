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
  
  'excelid': 'metadata.excelID',
  'excel id': 'metadata.excelID',
  'excel_id': 'metadata.excelID',
  'id': 'metadata.excelID',
  
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
  'medium': 'metadata.medium',
  'exhibition': 'metadata.exhibition',
  'languages': 'metadata.languages',
  'language': 'metadata.languages',
  'main language(s) present in the piece, if textual.': 'metadata.languages',
  'main language(s)': 'metadata.languages',
  'externallinks': 'metadata.externalLinks',
  'external links': 'metadata.externalLinks',
  'external_links': 'metadata.externalLinks',
  'links': 'metadata.externalLinks',
  'urls': 'metadata.externalLinks',
  'external links: wiki links...': 'metadata.externalLinks',
  'external links: wiki links, exhibition catalogs, critical essays, news coverage': 'metadata.externalLinks',
  'fonttype': 'metadata.fontType',
  'font type': 'metadata.fontType',
  'font_type': 'metadata.fontType',
  'countryregion': 'metadata.countryRegion',
  'country / region': 'metadata.countryRegion',
  'country_region': 'metadata.countryRegion',
  'country': 'metadata.countryRegion',
  'region': 'metadata.countryRegion',
  'artistcontactinfo': 'metadata.artistContactInfo',
  'artist contact info': 'metadata.artistContactInfo',
  'artist_contact_info': 'metadata.artistContactInfo',
  'artist contact': 'metadata.artistContactInfo',
  'contact info': 'metadata.artistContactInfo',
  'copyrightstatus': 'metadata.copyright.status',
  'copyright status': 'metadata.copyright.status',
  'copyright_status': 'metadata.copyright.status',
  'copyrightinfo': 'metadata.copyright.info',
  'copyright info': 'metadata.copyright.info',
  'copyright_info': 'metadata.copyright.info',
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

// Parse CSV (simple parser with edge case handling)
export function parseCSV(csvText) {
  // Remove BOM (Byte Order Mark) if present
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1)
  }
  
  // Normalize line endings (handle Windows \r\n, Mac \r, Unix \n)
  csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  
  const lines = csvText.split('\n')
  const nonEmptyLines = lines.filter(line => line.trim())
  
  if (nonEmptyLines.length === 0) {
    return {headers: [], rows: [], warnings: ['CSV file appears to be empty']}
  }

  const headers = parseCSVLine(nonEmptyLines[0])
  const headerCount = headers.length
  const rows = []
  const warnings = []
  let emptyRowCount = 0
  let columnMismatchCount = 0
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    
    // Track empty rows (but don't skip them silently)
    if (!line.trim()) {
      emptyRowCount++
      continue
    }
    
    const values = parseCSVLine(line)
    
    // Warn about column count mismatches
    if (values.length !== headerCount) {
      columnMismatchCount++
      if (columnMismatchCount <= 5) {
        warnings.push(`Row ${i + 1}: Column count mismatch (expected ${headerCount}, got ${values.length})`)
      }
    }
    
    // Skip rows with no values
    if (values.length === 0 || values.every(v => !v.trim())) {
      emptyRowCount++
      continue
    }
    
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }
  
  // Add summary warnings
  if (emptyRowCount > 0) {
    warnings.push(`Skipped ${emptyRowCount} empty row${emptyRowCount === 1 ? '' : 's'}`)
  }
  if (columnMismatchCount > 5) {
    warnings.push(`Found ${columnMismatchCount} rows with column count mismatches (showing first 5)`)
  }
  
  return {headers, rows, warnings: warnings.length > 0 ? warnings : undefined}
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

// Resolve tags (lookup or create) - optimized with batch lookup
export async function resolveTags(tagNames, client) {
  if (!tagNames || tagNames.length === 0) return []
  
  // Step 1: Normalize and create slug map (preserve original name -> slug mapping)
  const tagMap = new Map() // slug -> {name, slug}
  const validSlugs = []
  
  for (const tagName of tagNames) {
    if (!tagName || tagName.trim() === '') continue
    
    const normalized = tagName.trim().toLowerCase()
    const tagSlug = slugify(normalized)
    
    if (!tagSlug) continue
    
    // Store mapping and collect valid slugs
    tagMap.set(tagSlug, {
      name: tagName.trim(),
      slug: tagSlug,
    })
    validSlugs.push(tagSlug)
  }
  
  if (validSlugs.length === 0) return []
  
  // Step 2: Batch fetch all existing tags in one query
  const existingTags = await client.fetch(
    `*[_type == "tag" && slug.current in $slugs]`,
    {slugs: validSlugs}
  )
  
  // Step 3: Create a map of existing tags by slug for quick lookup
  const existingTagsMap = new Map()
  existingTags.forEach(tag => {
    if (tag.slug?.current) {
      existingTagsMap.set(tag.slug.current, tag)
    }
  })
  
  // Step 4: Identify missing tags and create them
  const tagsToCreate = []
  for (const [slug, tagInfo] of tagMap.entries()) {
    if (!existingTagsMap.has(slug)) {
      tagsToCreate.push({
        _type: 'tag',
        name: tagInfo.name,
        slug: {current: slug},
      })
    }
  }
  
  // Create missing tags (one by one, as Sanity doesn't have batch create)
  // But this is still better than the old approach since we batch the lookups
  for (const tagDoc of tagsToCreate) {
    const newTag = await client.create(tagDoc)
    existingTagsMap.set(tagDoc.slug.current, newTag)
  }
  
  // Step 5: Build references array in the same order as input
  const tagReferences = []
  for (const [slug, tagInfo] of tagMap.entries()) {
    const tag = existingTagsMap.get(slug)
    if (tag) {
      tagReferences.push({
        _type: 'reference',
        _ref: tag._id,
        _key: generateTagKey(),
      })
    }
  }
  
  return tagReferences
}

// Extract excelID from CSV row (checks multiple column name variations)
export function extractExcelID(row) {
  return row['id'] || row['ID'] || row['excelID'] || row['excelid'] || 
         row['excel id'] || row['Excel ID'] || row['excel_id'] || ''
}

// Validate CSV row before processing
export function validateRow(row, rowNum, requiredFields = []) {
  const errors = []
  const warnings = []
  
  // Check required fields
  for (const field of requiredFields) {
    const value = row[field] || row[field.toLowerCase()] || row[field.toUpperCase()]
    if (!value || value.trim() === '') {
      errors.push(`Row ${rowNum}: Missing required field "${field}"`)
    }
  }
  
  // Validate excelID if present
  const excelID = extractExcelID(row)
  if (excelID && excelID.trim() !== '') {
    // Check for reasonable length (not too long)
    if (excelID.trim().length > 100) {
      warnings.push(`Row ${rowNum}: excelID is very long (${excelID.trim().length} chars), may cause issues`)
    }
  }
  
  // Check if we have at least one identifier (fileName or artName)
  const hasFileName = row['filename'] || row['file name'] || row['file_name'] || row['fileName']
  const hasArtName = row['artname'] || row['art name'] || row['art_name'] || row['title'] || row['name'] || row['artName']
  
  if (!hasFileName && !hasArtName && !excelID) {
    errors.push(`Row ${rowNum}: Missing identifier (need fileName, artName, or excelID)`)
  }
  
  return { errors, warnings, isValid: errors.length === 0 }
}

// Build metadata object from CSV row
// mapper: optional custom column mapping function (defaults to mapColumnToField)
export async function buildMetadata(row, client, mapper = mapColumnToField) {
  const metadata = {}

  // Handle year object - check three columns in priority order
  let yearValue = ''
  let yearSpans = ''
  let yearEstimate = ''
  
  // Handle copyright object - check two columns
  let copyrightStatus = ''
  let copyrightInfo = ''
  
  for (const [columnName, value] of Object.entries(row)) {
    const normalized = columnName.toLowerCase().trim()
    if (normalized === 'year' && !yearValue) {
      yearValue = value?.trim() || ''
    } else if ((normalized === 'year (spans)' || normalized === 'year spans') && !yearSpans) {
      yearSpans = value?.trim() || ''
    } else if ((normalized === 'year (estimate)' || normalized === 'year estimate') && !yearEstimate) {
      yearEstimate = value?.trim() || ''
    } else if ((normalized === 'copyright status' || normalized === 'copyright_status') && !copyrightStatus) {
      copyrightStatus = value?.trim() || ''
    } else if ((normalized === 'copyright info' || normalized === 'copyright_info' || normalized === 'copyrightinfo') && !copyrightInfo) {
      copyrightInfo = value?.trim() || ''
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
  
  // Build copyright object if at least one field has a value
  if (copyrightStatus || copyrightInfo) {
    metadata.copyright = {}
    if (copyrightStatus) {
      metadata.copyright.status = copyrightStatus
    }
    if (copyrightInfo) {
      metadata.copyright.info = copyrightInfo
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
        normalizedColumn === 'year estimate' ||
        normalizedColumn === 'copyright status' ||
        normalizedColumn === 'copyright_status' ||
        normalizedColumn === 'copyright info' ||
        normalizedColumn === 'copyright_info' ||
        normalizedColumn === 'copyrightinfo') {
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
      'metadata.externalLinks',
      'metadata.fontType',
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

    // Handle nested object fields (like copyright.status, copyright.info)
    if (fieldPath.startsWith('metadata.copyright.')) {
      const copyrightField = fieldPath.replace('metadata.copyright.', '')
      if (!metadata.copyright) {
        metadata.copyright = {}
      }
      metadata.copyright[copyrightField] = value.trim()
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
