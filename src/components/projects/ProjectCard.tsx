import Link from 'next/link'
import type { ProjectCardData } from '@/server/project.actions'

// Card de projeto — capa em aspecto retrato, nome e localização. Todo o card é
// um link para a página dedicada (/projetos/[slug]). Usado na listagem e nos
// cards menores da home.
export function ProjectCard({ name, slug, location, cover_image }: ProjectCardData) {
  return (
    <Link href={`/projetos/${slug}`} className="project-card group">
      <div className="project-card-img">
        {cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover_image} alt={name} loading="lazy" />
        ) : (
          <span className="project-card-img-empty" aria-hidden="true" />
        )}
      </div>
      <div className="project-card-body">
        <h3 className="project-card-name">{name}</h3>
        {location && <p className="project-card-location">{location}</p>}
      </div>
    </Link>
  )
}
