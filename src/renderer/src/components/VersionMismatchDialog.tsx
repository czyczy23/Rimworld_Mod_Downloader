import { useState } from 'react'

interface VersionMismatchDialogProps {
  isOpen: boolean
  modName: string
  modVersions: string[]
  gameVersion: string
  onConfirm: () => void
  onCancel: () => void
}

export function VersionMismatchDialog({
  isOpen,
  modName,
  modVersions,
  gameVersion,
  onConfirm,
  onCancel
}: VersionMismatchDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false)

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
        maxWidth: '450px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #2a475e',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <h3 style={{
            color: '#c6d4df',
            margin: 0,
            fontSize: '16px',
            fontWeight: 500
          }}>
            版本不匹配警告
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <p style={{
            color: '#c6d4df',
            fontSize: '14px',
            marginBottom: '16px',
            lineHeight: 1.5
          }}>
            模组 <strong style={{ color: '#66c0f4' }}>{modName}</strong> 可能不兼容您的游戏版本。
          </p>

          {/* Version Comparison */}
          <div style={{
            background: '#171a21',
            borderRadius: '4px',
            border: '1px solid #2a475e',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#8f98a0', fontSize: '13px' }}>您的游戏版本:</span>
              <span style={{ color: '#e6b800', fontSize: '13px', fontWeight: 500 }}>{gameVersion}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#8f98a0', fontSize: '13px' }}>模组支持版本:</span>
              <span style={{ color: '#66c0f4', fontSize: '13px', fontWeight: 500 }}>
                {modVersions.length > 0 ? modVersions.join(', ') : '未指定'}
              </span>
            </div>
          </div>

          {/* Warning Message */}
          <div style={{
            background: 'rgba(230, 184, 0, 0.1)',
            border: '1px solid rgba(230, 184, 0, 0.3)',
            borderRadius: '4px',
            padding: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span>💡</span>
            <p style={{
              color: '#e6b800',
              fontSize: '12px',
              margin: 0,
              lineHeight: 1.4
            }}>
              强制下载不兼容的模组可能导致游戏崩溃或存档损坏。请确保您知道自己在做什么。
            </p>
          </div>

          {/* Don't Ask Again Checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px'
          }}>
            <input
              type="checkbox"
              id="dontAskAgain"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label
              htmlFor="dontAskAgain"
              style={{
                color: '#8f98a0',
                fontSize: '13px',
                cursor: 'pointer'
                userSelect: 'none'
              }}
            >
              记住我的选择，下次不再询问
            </label>
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
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3d6c8d'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#2a475e'
              e.currentTarget.style.color = '#c6d4df'
            }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: '#e6b800',
              color: '#1b2838',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0c000')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#e6b800')}
          >
            强制下载
          </button>
        </div>
      </div>
    </div>
  )
}
