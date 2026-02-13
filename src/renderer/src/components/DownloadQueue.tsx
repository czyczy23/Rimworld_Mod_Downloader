import { useState, useEffect } from 'react'

interface DownloadItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error'
  error?: string
}

export function DownloadQueue() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  // Listen for download updates from main process
  useEffect(() => {
    // This would normally be set up via IPC
    // For now, we'll use a placeholder
    const handleDownloadUpdate = (event: CustomEvent) => {
      const { id, name, progress, status, error } = event.detail
      setDownloads((prev) => {
        const existing = prev.find((d) => d.id === id)
        if (existing) {
          return prev.map((d) =>
            d.id === id ? { ...d, progress, status, error } : d
          )
        }
        return [...prev, { id, name, progress, status, error }]
      })
    }

    window.addEventListener(
      'download-update' as any,
      handleDownloadUpdate as any
    )

    return () => {
      window.removeEventListener(
        'download-update' as any,
        handleDownloadUpdate as any
      )
    }
  }, [])

  // Calculate summary stats
  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'checking' || d.status === 'moving'
  )
  const completedDownloads = downloads.filter((d) => d.status === 'completed')
  const errorDownloads = downloads.filter((d) => d.status === 'error')

  // Get status display info
  const getStatusInfo = () => {
    if (activeDownloads.length > 0) {
      const avgProgress = Math.round(
        activeDownloads.reduce((sum, d) => sum + d.progress, 0) / activeDownloads.length
      )
      return {
        text: `Downloading ${activeDownloads.length} mod${activeDownloads.length > 1 ? 's' : ''}...`,
        progress: avgProgress,
        color: '#66c0f4'
      }
    }
    if (errorDownloads.length > 0) {
      return {
        text: `${errorDownloads.length} download${errorDownloads.length > 1 ? 's' : ''} failed`,
        progress: 0,
        color: '#f44336'
      }
    }
    if (completedDownloads.length > 0 && downloads.length > 0) {
      return {
        text: `${completedDownloads.length} completed`,
        progress: 100,
        color: '#4CAF50'
      }
    }
    return {
      text: 'Ready',
      progress: 0,
      color: '#8f98a0'
    }
  }

  const statusInfo = getStatusInfo()

  // Clear completed downloads
  const clearCompleted = () => {
    setDownloads((prev) => prev.filter((d) => d.status !== 'completed'))
  }

  // Clear all downloads
  const clearAll = () => {
    setDownloads([])
  }

  return (
    <div
      className="download-queue"
      style={{
        background: '#171a21',
        borderTop: '1px solid #2a475e',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header - Click to expand/collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#1b2838',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 500, color: '#c6d4df' }}>
            📥 Queue
          </span>

          {downloads.length > 0 && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 500,
                background: activeDownloads.length > 0 ? '#66c0f4' : '#4CAF50',
                color: activeDownloads.length > 0 ? '#171a21' : 'white'
              }}
            >
              {activeDownloads.length > 0
                ? `${activeDownloads.length} downloading`
                : `${completedDownloads.length} completed`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status text */}
          <span style={{ color: statusInfo.color, fontSize: '13px' }}>
            {statusInfo.text}
          </span>

          {/* Progress bar for active downloads */}
          {activeDownloads.length > 0 && (
            <div
              style={{
                width: '100px',
                height: '4px',
                background: '#2a475e',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${statusInfo.progress}%`,
                  height: '100%',
                  background: statusInfo.color,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          )}

          {/* Expand/Collapse icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              fill: '#8f98a0'
            }}
          >
            <path d="M6 8L1 3h10z" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            padding: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {downloads.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8f98a0'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
              <p>No downloads yet</p>
              <p style={{ fontSize: '13px', color: '#5a6875' }}>
                Browse Steam Workshop and click "Download to Local" on any mod
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <span style={{ color: '#8f98a0', fontSize: '13px' }}>
                  {downloads.length} item{downloads.length > 1 ? 's' : ''} in queue
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {completedDownloads.length > 0 && (
                    <button
                      onClick={clearCompleted}
                      style={{
                        background: 'transparent',
                        border: '1px solid #3d6c8d',
                        color: '#8f98a0',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Clear completed
                    </button>
                  )}

                  <button
                    onClick={clearAll}
                    style={{
                      background: 'transparent',
                      border: '1px solid #3d6c8d',
                      color: '#8f98a0',
                      padding: '4px 10px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {downloads.map((download) => (
                  <div
                    key={download.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#243447',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${
                        download.status === 'error'
                          ? '#f44336'
                          : download.status === 'completed'
                          ? '#4CAF50'
                          : '#66c0f4'
                      }`
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#2a475e',
                        borderRadius: '50%',
                        fontSize: '16px'
                      }}
                    >
                      {download.status === 'error'
                        ? '❌'
                        : download.status === 'completed'
                        ? '✅'
                        : download.status === 'downloading'
                        ? '⬇️'
                        : download.status === 'moving'
                        ? '📦'
                        : download.status === 'checking'
                        ? '🔍'
                        : '⏳'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: '#c6d4df',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {download.name || `Mod ${download.id}`}
                      </div>

                      <div style={{ fontSize: '12px', color: '#8f98a0' }}>
                        {download.status === 'error'
                          ? `Error: ${download.error || 'Unknown error'}`
                          : download.status === 'completed'
                          ? 'Completed'
                          : download.status === 'downloading'
                          ? 'Downloading...'
                          : download.status === 'moving'
                          ? 'Moving files...'
                          : download.status === 'checking'
                          ? 'Checking compatibility...'
                          : 'Pending...'}
                      </div>

                      {/* Progress bar for active downloads */}
                      {(download.status === 'downloading' ||
                        download.status === 'moving' ||
                        download.status === 'checking') && (
                        <div
                          style={{
                            width: '100%',
                            height: '4px',
                            background: '#2a475e',
                            borderRadius: '2px',
                            marginTop: '8px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${download.progress}%`,
                              height: '100%',
                              background:
                                'linear-gradient(90deg, #66c0f4, #4CAF50)',
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress percentage */}
                    {(download.status === 'downloading' ||
                      download.status === 'moving' ||
                      download.status === 'checking') && (
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: '#66c0f4',
                          minWidth: '40px',
                          textAlign: 'right'
                        }}
                      >
                        {download.progress}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
