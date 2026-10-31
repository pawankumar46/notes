import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

export const ACCEPTED_FILE_TYPES = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/pdf': 'pdf',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'text/csv': 'excel',
}

export const ACCEPT_ATTR = Object.keys(ACCEPTED_FILE_TYPES).join(',')

const MAX_BYTES = 12 * 1024 * 1024

function classifyMime(mime, fileName = '') {
  if (ACCEPTED_FILE_TYPES[mime]) return ACCEPTED_FILE_TYPES[mime]
  const lower = fileName.toLowerCase()
  if (/\.(png|jpe?g|gif|webp)$/.test(lower)) return 'image'
  if (/\.pdf$/.test(lower)) return 'pdf'
  if (/\.(xlsx?|csv)$/.test(lower)) return 'excel'
  return null
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export async function compressForUpload(file) {
  const kind = classifyMime(file.type, file.name)
  if (!kind) {
    throw new Error('Only photos, PDF, and Excel/CSV files are supported.')
  }
  if (file.size > MAX_BYTES * 2) {
    throw new Error('File is too large. Keep uploads under about 12 MB after compression.')
  }

  if (kind !== 'image') {
    if (file.size > MAX_BYTES) {
      throw new Error('This file is too large (max 12 MB).')
    }
    return { file, kind, originalSize: file.size, compressedSize: file.size }
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 1.2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
  })

  const out =
    compressed instanceof File
      ? compressed
      : new File([compressed], file.name.replace(/\.\w+$/, '') + (file.type === 'image/png' ? '.png' : '.jpg'), {
          type: compressed.type || 'image/jpeg',
          lastModified: Date.now(),
        })

  if (out.size > MAX_BYTES) {
    throw new Error('Image is still too large after compression.')
  }

  return {
    file: out,
    kind,
    originalSize: file.size,
    compressedSize: out.size,
  }
}

function safeFileName(name) {
  return name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120)
}

export async function listSpaceFiles(spaceId) {
  const { data, error } = await supabase
    .from('space_files')
    .select('id, space_id, uploaded_by, file_name, file_type, mime_type, file_size, storage_path, created_at')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadSpaceFile(spaceId, userId, rawFile) {
  const { file, kind, originalSize, compressedSize } = await compressForUpload(rawFile)
  const fileId = crypto.randomUUID()
  const path = `${spaceId}/${fileId}-${safeFileName(file.name)}`

  const { error: uploadError } = await supabase.storage
    .from('space-files')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('space_files')
    .insert({
      id: fileId,
      space_id: spaceId,
      uploaded_by: userId,
      file_name: file.name,
      file_type: kind,
      mime_type: file.type || 'application/octet-stream',
      file_size: compressedSize,
      storage_path: path,
    })
    .select('id, space_id, uploaded_by, file_name, file_type, mime_type, file_size, storage_path, created_at')
    .single()

  if (error) {
    await supabase.storage.from('space-files').remove([path])
    throw error
  }

  return { record: data, originalSize, compressedSize }
}

export async function getSpaceFileUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from('space-files')
    .createSignedUrl(storagePath, 60 * 60 * 6)
  if (error) throw error
  return data.signedUrl
}

export function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function buildEmbedHtml(record, url) {
  const name = escapeAttr(record.file_name)
  const path = escapeAttr(record.storage_path)
  const id = escapeAttr(record.id)
  const safeUrl = escapeAttr(url)

  if (record.file_type === 'image') {
    return `<figure class="space-embed space-embed-image" contenteditable="false" data-file-id="${id}" data-storage-path="${path}" data-file-type="image"><img src="${safeUrl}" alt="${name}" /><figcaption>${name}</figcaption></figure><p><br></p>`
  }

  const label =
    record.file_type === 'pdf'
      ? 'PDF'
      : record.file_type === 'excel'
        ? 'Spreadsheet'
        : 'File'

  return `<div class="space-embed space-embed-doc" contenteditable="false" data-file-id="${id}" data-storage-path="${path}" data-file-type="${escapeAttr(record.file_type)}"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer"><span class="embed-doc-kind">${label}</span><span class="embed-doc-name">${name}</span></a></div><p><br></p>`
}

export async function refreshContentEmbeds(html) {
  if (!html || !html.includes('data-storage-path')) return html
  const div = document.createElement('div')
  div.innerHTML = html
  const nodes = [...div.querySelectorAll('[data-storage-path]')]
  await Promise.all(
    nodes.map(async (node) => {
      const path = node.getAttribute('data-storage-path')
      if (!path) return
      try {
        const url = await getSpaceFileUrl(path)
        const img = node.querySelector('img')
        if (img) img.setAttribute('src', url)
        const link = node.matches('a') ? node : node.querySelector('a')
        if (link) link.setAttribute('href', url)
      } catch {
        // leave previous url if refresh fails
      }
    }),
  )
  return div.innerHTML
}

export function stripEmbedsForFile(html, fileId) {
  if (!html || !fileId) return html || ''
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll(`[data-file-id="${CSS.escape(fileId)}"]`).forEach((node) => {
    node.remove()
  })
  return div.innerHTML
}

export async function deleteSpaceFile(file) {
  const { error } = await supabase.from('space_files').delete().eq('id', file.id)
  if (error) throw error

  if (file.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('space-files')
      .remove([file.storage_path])
    if (storageError && !/not.?found|404/i.test(storageError.message || '')) {
      // Row is already gone; storage cleanup is best-effort
      console.warn('Storage delete failed:', storageError.message)
    }
  }
}
