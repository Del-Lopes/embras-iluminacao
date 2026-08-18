import Link from 'next/link'
import { Star } from 'lucide-react'
import { formatProjectDateShort } from '@/lib/utils/project-date'
import type { ProjectCardData } from '@/server/project.actions'

// Card de projeto — capa em aspecto retrato, nome e localização. Todo o card é
// um link para a página dedicada (/projetos/[slug]). Usado na listagem e nos
// cards menores da home.
export function ProjectCard({
  name,
  slug,
  location,
  cover_image,
  is_featured,
  project_date,
}: ProjectCardData) {
  const shortDate = formatProjectDateShort(project_date)

  return (
    <Link href={`/projetos/${slug}`} className="project-card group">
      <div className="project-card-img">
        {cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover_image} alt={name} loading="lazy" />
        ) : (
          <span className="project-card-img-empty" aria-hidden="true" />
        )}
        {/* Selo do destaque. A posição no grid da home fica de fora: é
            informação de bastidor, que não diz nada a quem visita o site. */}
        {is_featured && (
          <span className="project-card-badge" title="Projeto em destaque">
            <Star size={13} strokeWidth={0} fill="currentColor" aria-hidden />
            <span className="sr-only">Projeto em destaque</span>
          </span>
        )}
      </div>
      <div className="project-card-body">
        <h3 className="project-card-name">{name}</h3>
        {(location || shortDate) && (
          <div className="project-card-meta">
            <span className="project-card-location">{location}</span>
            {shortDate && <span className="project-card-date">{shortDate}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
