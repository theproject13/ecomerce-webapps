import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
  stack: string | null
}

/**
 * Tanpa boundary ini, exception saat render membuat React melepas seluruh
 * pohon komponen. Hasilnya hanya layar putih tanpa penjelasan, dan itu
 * sempat terjadi saat development. Boundary ini menampilkan detail error-nya
 * langsung di halaman supaya bisa langsung dibaca.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ stack: info.componentStack ?? null })
    console.error('[storefront] render error', error, info.componentStack)
  }

  render(): ReactNode {
    const { error, stack } = this.state

    if (!error) {
      return this.props.children
    }

    return (
      <div className="container section">
        <div className="surface" style={{ padding: 24 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 20, color: '#d93025' }}>
            Halaman gagal dirender
          </h1>
          <p style={{ margin: '0 0 16px', color: '#3d3d4b' }}>
            Ada error di sisi React. Salin detail di bawah ini ke laporan bug.
          </p>
          <pre
            style={{
              margin: 0,
              padding: 16,
              borderRadius: 10,
              background: '#1f1f29',
              color: '#f6f6f8',
              fontSize: 12,
              lineHeight: 1.5,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
            {stack ? `\n\n${stack}` : ''}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '10px 16px',
              border: 0,
              borderRadius: 999,
              background: '#00aa5b',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Muat ulang
          </button>
        </div>
      </div>
    )
  }
}