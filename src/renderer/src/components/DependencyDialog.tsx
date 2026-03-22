import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Dependency } from '../../../shared/types'

interface DependencyDialogProps {
  isOpen: boolean
  modName: string
  dependencies: Dependency[]
  onConfirm: (selectedIds: string[]) => void
  onCancel: () => void
}

export function DependencyDialog({ isOpen, modName, dependencies, onConfirm, onCancel }: DependencyDialogProps) {
  const { t } = useTranslation()
  const [selectedDeps, setSelectedDeps] = useState<Dependency[]>(
    dependencies.map(dep => ({ ...dep, willDownload: true }))
  )

  // Handle checkbox toggle
  const handleToggle = (depId: string) => {
    setSelectedDeps(prev => prev.map(dep =>
      dep.id === depId ? { ...dep, willDownload: !dep.willDownload } : dep
    ))
  }

  // Select all
  const handleSelectAll = () => {
    setSelectedDeps(prev => prev.map(dep => ({ ...dep, willDownload: true })))
  }

  // Select none
  const handleSelectNone = () => {
    setSelectedDeps(prev => prev.map(dep => ({ ...dep, willDownload: false })))
  }

  // Handle confirm
  const handleConfirm = () => {
    const selectedIds = selectedDeps.filter(dep => dep.willDownload).map(dep => dep.id)
    onConfirm(selectedIds)
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#1b2838',
        borderRadius: '6px',
        border: '1px solid #2a475e',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a475e',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            color: '#c6d4df',
            margin: 0,
            fontSize: '16px',
            fontWeight: 500
          }}>
            {t('dependencyDialog.title')}
          </h3>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#8f98a0',
              fontSize: '18px',
              cursor: 'pointer',
              padding: 0,
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1
        }}>
          <p style={{
            color: '#8f98a0',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {t('dependencyDialog.requiresDependencies')} <strong style={{ color: '#66c0f4' }}>{modName}</strong>
          </p>

          {/* Dependencies list */}
          <div style={{
            background: '#171a21',
            borderRadius: '4px',
            border: '1px solid #2a475e',
            padding: '12px',
            marginBottom: '16px'
          }}>
            {selectedDeps.length === 0 ? (
              <p style={{ color: '#8f98a0', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                {t('dependencyDialog.noDependencies')}
              </p>
            ) : (
              selectedDeps.map(dep => (
                <div key={dep.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 0',
                  borderBottom: '1px solid #2a475e'
                }}>
                  <input
                    type="checkbox"
                    checked={dep.willDownload}
                    onChange={() => handleToggle(dep.id)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: '#4CAF50'
                    }}
                  />
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <span style={{ color: '#c6d4df', fontSize: '14px', fontWeight: 500 }}>
                      {dep.name}
                    </span>
                    <span style={{ color: '#66c0f4', fontSize: '12px', fontFamily: 'monospace' }}>
                      ID: {dep.id}
                    </span>
                  </div>
                  {dep.isOptional && (
                    <span style={{
                      background: '#3d6c8d',
                      color: 'white',
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: '3px'
                    }}>
                      {t('dependencyDialog.optional')}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={handleSelectNone}
              style={{
                background: '#2a475e',
                color: '#c6d4df',
                border: '1px solid #3d6c8d',
                padding: '8px 12px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}>
              {t('dependencyDialog.cancelAll')}
            </button>
            <button
              onClick={handleSelectAll}
              style={{
                background: '#2a475e',
                color: '#c6d4df',
                border: '1px solid #3d6c8d',
                padding: '8px 12px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}>
              {t('dependencyDialog.selectAll')}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #2a475e',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              background: '#2a475e',
              color: '#c6d4df',
              border: '1px solid #3d6c8d',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
            {t('dependencyDialog.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}>
            {t('dependencyDialog.downloadSelected')}
          </button>
        </div>
      </div>
    </div>
  )
}
