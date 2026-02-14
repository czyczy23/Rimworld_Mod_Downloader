interface PendingDownloadItem {
  id: string
  name: string
  isCollection: boolean
  modName?: string
}

interface PendingQueueDialogProps {
  isOpen: boolean
  queue: PendingDownloadItem[]
  onConfirm: () => void
  onCancel: () => void
}

export function PendingQueueDialog({ isOpen, queue, onConfirm, onCancel }: PendingQueueDialogProps) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '500px',
        maxHeight: '600px',
        background: '#1b2838',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        {/* 标题 */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #2a475e'
        }}>
          <h3 style={{ margin: 0, color: '#c6d4df', fontSize: '18px' }}>
            确认下载队列
          </h3>
          <p style={{ margin: '8px 0 0', color: '#8f98a0', fontSize: '13px' }}>
            共 {queue.length} 个 mod 待下载
          </p>
        </div>

        {/* 列表区域 - 可滚动 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          minHeight: '300px'
        }}>
          {queue.map(item => (
            <div key={item.id} style={{
              padding: '12px',
              background: '#243447',
              borderRadius: '6px',
              marginBottom: '8px',
              borderLeft: '3px solid #e6b800'
            }}>
              <div style={{
                color: '#c6d4df',
                fontWeight: 500,
                fontSize: '14px'
              }}>
                {item.modName || item.name}
              </div>
              <div style={{
                color: '#8f98a0',
                fontSize: '12px',
                marginTop: '4px'
              }}>
                ID: {item.id} • {item.isCollection ? 'Collection' : 'Mod'}
              </div>
            </div>
          ))}
        </div>

        {/* 按钮区域 - 固定在底部 */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #2a475e',
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
            取消
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#4CAF50'}
          >
            开始下载 ({queue.length})
          </button>
        </div>
      </div>
    </div>
  )
}
