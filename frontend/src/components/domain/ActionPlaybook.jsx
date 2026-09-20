import { IconCheck, IconX } from '../ui/Icons'

/**
 * What to do next. This is the part that actually protects someone, so it is
 * given equal visual weight to the score itself rather than tucked below it.
 */
export default function ActionPlaybook({ playbook }) {
  if (!playbook) return null

  return (
    <div className="playbook">
      <div className="playbook__col playbook__col--do">
        <p className="playbook__title">
          <IconCheck size={16} /> Do this
        </p>
        <ul className="playbook__list">
          {playbook.do.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="playbook__col playbook__col--dont">
        <p className="playbook__title">
          <IconX size={16} /> Do not do this
        </p>
        <ul className="playbook__list">
          {playbook.dont.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
