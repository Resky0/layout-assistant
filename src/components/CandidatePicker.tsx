import type {
  FigureProjectV1,
  LayoutCandidate,
  SolvedLayout,
} from '../types'
import { FigureCanvas } from './FigureCanvas'

interface CandidatePickerProps {
  project: FigureProjectV1
  candidates: LayoutCandidate[]
  solvedCandidates: Map<string, SolvedLayout>
  onSelect: (candidate: LayoutCandidate) => void
}

export function CandidatePicker({
  project,
  candidates,
  solvedCandidates,
  onSelect,
}: CandidatePickerProps) {
  return (
    <section className="candidate-section" aria-labelledby="candidate-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">一键排版</span>
          <h2 id="candidate-title">选择一个布局起点</h2>
        </div>
        <span className="section-note">所有方案都保持图片顺序</span>
      </div>
      <div className="candidate-grid">
        {candidates.map((candidate) => {
          const solved = solvedCandidates.get(candidate.id)
          if (!solved) return null
          const selected = project.layoutProfile === candidate.profile
          return (
            <button
              type="button"
              className={`candidate-card${selected ? ' is-selected' : ''}`}
              onClick={() => onSelect(candidate)}
              aria-pressed={selected}
              key={candidate.id}
            >
              <div className="candidate-preview checkerboard">
                <FigureCanvas project={project} solved={solved} />
              </div>
              <span className="candidate-copy">
                <strong>{candidate.name}</strong>
                <small>{candidate.description}</small>
              </span>
              <span className="candidate-check" aria-hidden="true">
                {selected ? '✓' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
