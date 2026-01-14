/**
 * Tasks Module - Attachment Repository
 *
 * Database operations and file handling for task attachments.
 */

import { existsSync, mkdirSync, unlinkSync, copyFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { getDb, generateId, now, getConfig } from '../core'
import type { Attachment, AttachmentRow, CreateAttachmentInput } from './types'

// Helper to convert database row to Attachment
function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    taskId: row.task_id,
    filename: row.filename,
    storedName: row.stored_name,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.created_at,
  }
}

/**
 * Get the attachments directory path
 */
function getAttachmentsDir(): string {
  const config = getConfig()
  return join(config.dataDir, 'attachments')
}

/**
 * Ensure attachments directory exists
 */
function ensureAttachmentsDir(): string {
  const dir = getAttachmentsDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Generate a unique stored filename
 */
export function generateStoredName(originalFilename: string): string {
  const ext = extname(originalFilename)
  return `${generateId()}${ext}`
}

/**
 * Get the full path to an attachment file
 */
export function getAttachmentPath(storedName: string): string {
  return join(getAttachmentsDir(), storedName)
}

/**
 * Save an attachment file to storage
 */
export async function saveAttachmentFile(
  file: File,
  storedName: string
): Promise<void> {
  const dir = ensureAttachmentsDir()
  const filePath = join(dir, storedName)
  const buffer = await file.arrayBuffer()
  await Bun.write(filePath, buffer)
}

/**
 * Delete an attachment file from storage
 */
export function deleteAttachmentFile(storedName: string): boolean {
  const filePath = getAttachmentPath(storedName)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
    return true
  }
  return false
}

/**
 * Copy an attachment file to a destination directory
 */
export function copyAttachmentFile(
  storedName: string,
  destDir: string,
  destFilename: string
): void {
  const sourcePath = getAttachmentPath(storedName)
  if (!existsSync(sourcePath)) {
    throw new Error(`Attachment file not found: ${storedName}`)
  }

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const destPath = join(destDir, destFilename)
  copyFileSync(sourcePath, destPath)
}

/**
 * Check if an attachment file exists
 */
export function attachmentFileExists(storedName: string): boolean {
  return existsSync(getAttachmentPath(storedName))
}

export const attachmentRepository = {
  /**
   * Find all attachments for a task
   */
  findByTaskId(taskId: string): Attachment[] {
    const db = getDb()
    const rows = db
      .query<AttachmentRow, [string]>(
        'SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at ASC'
      )
      .all(taskId)
    return rows.map(rowToAttachment)
  },

  /**
   * Find an attachment by ID
   */
  findById(id: string): Attachment | null {
    const db = getDb()
    const row = db
      .query<AttachmentRow, [string]>('SELECT * FROM attachments WHERE id = ?')
      .get(id)
    return row ? rowToAttachment(row) : null
  },

  /**
   * Create a new attachment record
   */
  create(taskId: string, data: CreateAttachmentInput): Attachment {
    const db = getDb()
    const id = generateId()
    const timestamp = now()

    db.run(
      `INSERT INTO attachments (id, task_id, filename, stored_name, mime_type, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        taskId,
        data.filename,
        data.storedName,
        data.mimeType ?? null,
        data.size,
        timestamp,
      ]
    )

    return {
      id,
      taskId,
      filename: data.filename,
      storedName: data.storedName,
      mimeType: data.mimeType ?? null,
      size: data.size,
      createdAt: timestamp,
    }
  },

  /**
   * Delete an attachment record (also deletes the file)
   */
  delete(id: string): boolean {
    const attachment = this.findById(id)
    if (!attachment) {
      return false
    }

    // Delete the file
    deleteAttachmentFile(attachment.storedName)

    // Delete the record
    const db = getDb()
    const result = db.run('DELETE FROM attachments WHERE id = ?', [id])
    return result.changes > 0
  },

  /**
   * Delete all attachments for a task (also deletes files)
   */
  deleteByTaskId(taskId: string): number {
    const attachments = this.findByTaskId(taskId)

    // Delete all files
    for (const attachment of attachments) {
      deleteAttachmentFile(attachment.storedName)
    }

    // Delete all records
    const db = getDb()
    const result = db.run('DELETE FROM attachments WHERE task_id = ?', [taskId])
    return result.changes
  },

  /**
   * Count attachments for a task
   */
  countByTaskId(taskId: string): number {
    const db = getDb()
    const result = db
      .query<{ count: number }, [string]>(
        'SELECT COUNT(*) as count FROM attachments WHERE task_id = ?'
      )
      .get(taskId)
    return result?.count ?? 0
  },
}
