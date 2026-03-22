import { useTranslation } from 'react-i18next'

interface UpdateDialogProps {
  isOpen: boolean
  newVersion: string
  releaseNotes: string
  isDownloading: boolean
  isDownloaded: boolean
  downloadProgress: number
  onDownload: () => void
  onInstall: () => void
  onClose: () => void
}

export const UpdateDialog: React.FC<UpdateDialogProps> = ({
  isOpen,
  newVersion,
  releaseNotes,
  isDownloading,
  isDownloaded,
  downloadProgress,
  onDownload,
  onInstall,
  onClose
}) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1b2838',
        borderRadius: '6px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        border: '1px solid #3d6c8d'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#66c0f4', fontSize: '18px' }}>
          {t('update.newVersion', { version: newVersion })}
        </h2>

        {releaseNotes && (
          <div style={{
            background: '#16202d',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            maxHeight: '200px',
            overflow: 'auto',
            color: '#c6d4df',
            fontSize: '13px',
            whiteSpace: 'pre-wrap'
          }}>
            {releaseNotes}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#3d6c8d',
              border: 'none',
              borderRadius: '3px',
              color: '#c6d4df',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {t('update.later')}
          </button>

          {isDownloaded ? (
            <button
              onClick={onInstall}
              style={{
                padding: '8px 16px',
                background: '#66c0f4',
                border: 'none',
                borderRadius: '3px',
                color: '#1b2838',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              {t('update.installNow')}
            </button>
          ) : isDownloading ? (
            <button
              disabled
              style={{
                padding: '8px 16px',
                background: '#2a475e',
                border: 'none',
                borderRadius: '3px',
                color: '#8f98a0',
                cursor: 'not-allowed',
                fontSize: '13px'
              }}
            >
              {t('update.downloading', { progress: Math.round(downloadProgress) })}%
            </button>
          ) : (
            <button
              onClick={onDownload}
              style={{
                padding: '8px 16px',
                background: '#66c0f4',
                border: 'none',
                borderRadius: '3px',
                color: '#1b2838',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              {t('update.download')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
