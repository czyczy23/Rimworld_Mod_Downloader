import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModsPath } from '../utils/modsPathUtils'
import { getDefaultModsPath } from '../utils/modsPathUtils'

interface ModsPathManagerDialogProps {
  isOpen: boolean
  onClose: () => void
  modsPaths: ModsPath[]
  onSave: (paths: ModsPath[]) => void
}

export function ModsPathManagerDialog({ isOpen, onClose, modsPaths, onSave }: ModsPathManagerDialogProps) {
  const { t } = useTranslation()
  const [localPaths, setLocalPaths] = useState<ModsPath[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 初始化本地路径
  useEffect(() => {
    if (isOpen) {
      setLocalPaths([...modsPaths])
    }
  }, [isOpen, modsPaths])

  // 自动聚焦输入框
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const handleAddDefault = () => {
    const defaultPath = getDefaultModsPath()
    const newPath: ModsPath = {
      id: crypto.randomUUID(),
      name: 'RimWorld Default Mods',
      path: defaultPath,
      isActive: localPaths.length === 0
    }
    setLocalPaths([...localPaths, newPath])
  }

  const handleAddCustom = async () => {
    if (!window.api) return
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      const newPath: ModsPath = {
        id: crypto.randomUUID(),
        name: 'Custom Path',
        path: folderPath,
        isActive: localPaths.length === 0
      }
      setLocalPaths([...localPaths, newPath])
    }
  }

  const handleRemove = (id: string) => {
    const filtered = localPaths.filter(p => p.id !== id)
    if (filtered.length > 0 && !filtered.some(p => p.isActive)) {
      filtered[0].isActive = true
    }
    setLocalPaths(filtered)
  }

  const handleSetActive = (id: string) => {
    setLocalPaths(localPaths.map(p => ({
      ...p,
      isActive: p.id === id
    })))
  }

  const handleStartEdit = (path: ModsPath) => {
    setEditingId(path.id)
    setEditName(path.name)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    const trimmed = editName.trim()
    if (trimmed) {
      setLocalPaths(localPaths.map(p => 
        p.id === editingId ? { ...p, name: trimmed } : p
      ))
    }
    setEditingId(null)
    setEditName('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const handleSaveAll = () => {
    onSave(localPaths)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: '#1b2838',
        borderRadius: '8px',
        border: '1px solid #2a475e',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        {/* 标题栏 */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #2a475e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#c6d4df', fontSize: '18px' }}>
            📁 {t('modsPathManager.title')}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8f98a0',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>

        {/* 路径列表 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 24px'
        }}>
          {localPaths.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#8f98a0',
              border: '2px dashed #2a475e',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
              <div>{t('modsPathManager.noFolders')}</div>
            </div>
          ) : (
            localPaths.map((path) => (
              <div
                key={path.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: path.isActive ? 'rgba(102, 192, 244, 0.15)' : '#1b2838',
                  border: `1px solid ${path.isActive ? '#66c0f4' : '#2a475e'}`,
                  borderRadius: '6px',
                  marginBottom: '10px'
                }}
              >
                {/* 星标 */}
                <button
                  onClick={() => handleSetActive(path.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: path.isActive ? '#66c0f4' : '#5a6875',
                    padding: '2px 4px'
                  }}
                  title={path.isActive ? t('modsPathManager.default') : t('modsPathManager.setAsDefault')}
                >
                  {path.isActive ? '★' : '☆'}
                </button>

                {/* 名称和路径 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === path.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      onBlur={handleSaveEdit}
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        padding: '4px 8px',
                        background: '#2a475e',
                        color: '#c6d4df',
                        border: '1px solid #66c0f4',
                        borderRadius: '4px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEdit(path)}
                      style={{
                        fontSize: '13px',
                        fontWeight: path.isActive ? 500 : 'normal',
                        color: path.isActive ? '#66c0f4' : '#c6d4df',
                        marginBottom: '3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {path.name}
                      {path.isActive && <span style={{ fontSize: '11px', opacity: 0.7 }}>({t('modsPathManager.default')})</span>}
                      <span style={{ fontSize: '11px', color: '#66c0f4', marginLeft: '4px' }}>✎</span>
                    </div>
                  )}
                  <div style={{
                    fontSize: '11px',
                    color: '#8f98a0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'monospace'
                  }}>
                    {path.path}
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => handleRemove(path.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f44336',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                  title={t('modsPathManager.delete')}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* 添加按钮 */}
        <div style={{
          padding: '0 24px 16px',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={handleAddDefault}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#2a475e',
              color: '#c6d4df',
              border: '1px solid #3d6c8d',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🏠 {t('modsPathManager.useDefaultPath')}
          </button>
          <button
            onClick={handleAddCustom}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#3d6c8d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            📂 {t('modsPathManager.customPath')}
          </button>
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid #2a475e',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#2a475e',
              color: '#c6d4df',
              border: '1px solid #3d6c8d',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {t('modsPathManager.cancel')}
          </button>
          <button
            onClick={handleSaveAll}
            style={{
              padding: '10px 24px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {t('modsPathManager.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
