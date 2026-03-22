import { useTranslation } from 'react-i18next'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  selectedCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({ isOpen, selectedCount, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const { t } = useTranslation()
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '400px',
        background: '#1b2838',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{
          margin: '0 0 12px',
          color: '#c6d4df',
          fontSize: '18px'
        }}>
          {t('deleteConfirmDialog.title')}
        </h3>
        <p style={{
          margin: '0 0 20px',
          color: '#8f98a0',
          fontSize: '14px',
          lineHeight: 1.5
        }}>
          {t('deleteConfirmDialog.confirmDelete')} {selectedCount} {t('deleteConfirmDialog.items')}
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#2a475e',
              color: '#c6d4df',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#3d6c8d'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2a475e'}
          >
            {t('deleteConfirmDialog.cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              background: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d32f2f'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f44336'}
          >
            {t('deleteConfirmDialog.confirmDeleteBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
