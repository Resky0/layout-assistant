import './test/setup'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Layout Assistant app', () => {
  it('imports six images and presents three layout candidates', async () => {
    const user = userEvent.setup()
    render(<App />)
    const files = Array.from(
      { length: 6 },
      (_, index) =>
        new File([`image-${index}`], `panel-${index}.png`, { type: 'image/png' }),
    )

    await user.upload(screen.getByTestId('image-input'), files)

    await waitFor(() => {
      expect(screen.getAllByText('\u7ecf\u5178\u7f51\u683c')).toHaveLength(2)
      expect(screen.getByText('\u7d27\u51d1\u81ea\u9002\u5e94')).toBeInTheDocument()
      expect(screen.getByText('\u5747\u8861\u5e03\u5c40')).toBeInTheDocument()
    })
    expect(screen.getAllByTestId('figure-canvas')).toHaveLength(4)
    expect(screen.getByText('6 \u4e2a\u9762\u677f')).toBeInTheDocument()
  })
})