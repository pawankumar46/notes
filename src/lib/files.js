import imageCompression from 'browser-image-compression'
import { supabase } from './supabase'

export const ACCEPT_ATTR = '*/*'

const MAX_BYTES = 12 * 1024 * 1024
const MAX_RAW_BYTES = 40 * 1024 * 1024

const KIND_BY_MIME = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/avif': 'image',
  'image/heic': 'image',
  'image/heif': 'image',
  'application/pdf': 'pdf',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'text/csv': 'excel',
}

function classifyMime(mime, fileName = '') {
  if (KIND_BY_MIME[mime]) return KIND_BY_MIME[mime]
  if (mime?.startsWith('image/')) return 'image'
  const lower = fileName.toLowerCase()
  if (/\.(png|jpe?g|gif|webp|avif|heic|heif|bmp|tiff?)$/.test(lower)) return 'image'
  if (/\.pdf$/.test(lower)) return 'pdf'
  if (/\.(xlsx?|csv|ods)$/.test(lower)) return 'excel'
  if (/\.(doc|docx|ppt|pptx|txt|md|rtf|json|xml)$/.test(lower)) return 'doc'
  if (/\.(zip|rar|7z|gz|tar)$/.test(lower)) return 'archive'
  if (/\.(mp4|mov|webm|mkv|avi)$/.test(lower)) return 'video'
  if (/\.(mp3|wav|aac|m4a|ogg)$/.test(lower)) return 'audio'
  return 'file'
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

function supportsGzip() {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'
}

function shouldSkipGzip(mime, fileName = '') {
  const lower = fileName.toLowerCase()
  if (/\.(zip|gz|tgz|rar|7z|bz2|xz|jpg|jpeg|png|webp|gif|avif|mp4|mov|webm|mp3|aac|m4a|woff2?)$/.test(lower)) {
    return true
  }
  if (!mime) return false
  if (/^(image|video|audio)\//.test(mime)) return true
  if (/zip|gzip|compress|octet-stream|font\//i.test(mime)) return true
  return false
}

async function gzipFile(file) {
  const stream = file.stream().pipeThrough(new CompressionStream('gzip'))
  const blob = await new Response(stream).blob()
  return new File([blob], `${file.name}.gz`, {
    type: 'application/gzip',
    lastModified: Date.now(),
  })
}

async function gunzipBlob(blob) {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).blob()
}

export async function compressForUpload(file) {
  const kind = classifyMime(file.type, file.name)
  const originalSize = file.size

  if (originalSize > MAX_RAW_BYTES) {
    throw new Error('File is too large to upload (max about 40 MB before compression).')
  }

  if (kind === 'image' && file.type !== 'image/gif') {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.2,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      })
      const out =
        compressed instanceof File
          ? compressed
          : new File(
              [compressed],
              file.name.replace(/\.\w+$/, '') + (file.type === 'image/png' ? '.png' : '.jpg'),
              {
                type: compressed.type || 'image/jpeg',
                lastModified: Date.now(),
              },
            )
      if (out.size > MAX_BYTES) {
        throw new Error('Image is still too large after compression.')
      }
      return {
        file: out,
        kind,
        originalSize,
        compressedSize: out.size,
        gzipped: false,
        originalMime: file.type || out.type || 'application/octet-stream',
        displayName: file.name,
      }
    } catch (err) {
      if (err?.message?.includes('too large')) throw err
      // fall through to gzip / raw for formats the compressor cannot handle
    }
  }

  let uploadFile = file
  let gzipped = false

  if (supportsGzip() && !shouldSkipGzip(file.type, file.name)) {
    try {
      const gz = await gzipFile(file)
      if (gz.size < file.size * 0.95) {
        uploadFile = gz
        gzipped = true
      }
    } catch {
      // keep original if gzip fails
    }
  }

  if (uploadFile.size > MAX_BYTES) {
    throw new Error('File is too large after compression (max 12 MB).')
  }

  return {
    file: uploadFile,
    kind,
    originalSize,
    compressedSize: uploadFile.size,
    gzipped,
    originalMime: file.type || 'application/octet-stream',
    displayName: file.name,
  }
}

function safeFileName(name) {
  return name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 120)
}

function isGzipPath(path = '') {
  return /\.gz$/i.test(path)
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
  const {
    file,
    kind,
    originalSize,
    compressedSize,
    gzipped,
    originalMime,
    displayName,
  } = await compressForUpload(rawFile)

  const fileId = crypto.randomUUID()
  const baseName = safeFileName(displayName)
  const path = `${spaceId}/${fileId}-${baseName}${gzipped && !baseName.endsWith('.gz') ? '.gz' : ''}`

  const { error: uploadError } = await supabase.storage.from('space-files').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: gzipped ? 'application/gzip' : file.type || 'application/octet-stream',
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('space_files')
    .insert({
      id: fileId,
      space_id: spaceId,
      uploaded_by: userId,
      file_name: displayName,
      file_type: kind,
      mime_type: originalMime,
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

export async function getSpaceFileBlob(fileOrPath, mimeType) {
  const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.storage_path
  const mime =
    typeof fileOrPath === 'string'
      ? mimeType || 'application/octet-stream'
      : fileOrPath.mime_type || 'application/octet-stream'

  const { data, error } = await supabase.storage.from('space-files').download(path)
  if (error) throw error

  if (isGzipPath(path)) {
    const raw = await gunzipBlob(data)
    return new Blob([raw], { type: mime })
  }
  return data.type ? data : new Blob([data], { type: mime })
}

export async function getSpaceFileUrl(fileOrPath, mimeType) {
  const path = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath?.storage_path
  if (!path) throw new Error('Missing storage path')

  if (isGzipPath(path)) {
    const blob = await getSpaceFileBlob(fileOrPath, mimeType)
    return URL.createObjectURL(blob)
  }

  const { data, error } = await supabase.storage
    .from('space-files')
    .createSignedUrl(path, 60 * 60 * 6)
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

export function fileTypeLabel(type) {
  if (type === 'image') return 'Photo'
  if (type === 'pdf') return 'PDF'
  if (type === 'excel') return 'Spreadsheet'
  if (type === 'doc') return 'Document'
  if (type === 'archive') return 'Archive'
  if (type === 'video') return 'Video'
  if (type === 'audio') return 'Audio'
  return 'File'
}

export function buildEmbedHtml(record, url) {
  const name = escapeAttr(record.file_name)
  const path = escapeAttr(record.storage_path)
  const id = escapeAttr(record.id)
  const safeUrl = escapeAttr(url)

  if (record.file_type === 'image') {
    return `<figure class="space-embed space-embed-image" contenteditable="false" data-file-id="${id}" data-storage-path="${path}" data-file-type="image" data-mime-type="${escapeAttr(record.mime_type || '')}"><img src="${safeUrl}" alt="${name}" /><figcaption>${name}</figcaption></figure><p><br></p>`
  }

  const label = fileTypeLabel(record.file_type)
  return `<div class="space-embed space-embed-doc" contenteditable="false" data-file-id="${id}" data-storage-path="${path}" data-file-type="${escapeAttr(record.file_type)}" data-mime-type="${escapeAttr(record.mime_type || '')}"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" download="${name}"><span class="embed-doc-kind">${label}</span><span class="embed-doc-name">${name}</span></a></div><p><br></p>`
}

export async function refreshContentEmbeds(html) {
  if (!html || !html.includes('data-storage-path')) return html
  const div = document.createElement('div')
  div.innerHTML = html
  const nodes = [...div.querySelectorAll('[data-storage-path]')]
  await Promise.all(
    nodes.map(async (node) => {
      const path = node.getAttribute('data-storage-path')
      const mime = node.getAttribute('data-mime-type') || 'application/octet-stream'
      if (!path) return
      try {
        const url = await getSpaceFileUrl(path, mime)
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

export function stripOrphanEmbeds(html, files) {
  const ids = new Set((files || []).map((f) => f.id))
  const div = document.createElement('div')
  div.innerHTML = html || ''
  let changed = false
  div.querySelectorAll('[data-file-id]').forEach((node) => {
    const id = node.getAttribute('data-file-id')
    if (id && !ids.has(id)) {
      node.remove()
      changed = true
    }
  })
  return { html: div.innerHTML, changed }
}

export function spacePreviewText(html) {
  const div = document.createElement('div')
  div.innerHTML = html || ''
  div.querySelectorAll('.space-embed, [data-file-id]').forEach((node) => node.remove())
  return (div.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export async function deleteSpaceFile(file) {
  const { error } = await supabase.from('space_files').delete().eq('id', file.id)
  if (error) throw error

  if (file.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('space-files')
      .remove([file.storage_path])
    if (storageError && !/not.?found|404/i.test(storageError.message || '')) {
      console.warn('Storage delete failed:', storageError.message)
    }
  }
}
