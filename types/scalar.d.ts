declare global {
  interface Window {
    Scalar: {
      createApiReference: (selector: string, config: {
        url: string
        theme?: string
        customCss?: string
      }) => void
    }
  }
}

export {}
