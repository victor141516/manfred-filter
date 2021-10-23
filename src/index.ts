import fetch from 'node-fetch'
import { DOMWindow, JSDOM } from 'jsdom'

interface ApiJob {
  salaryFrom: number
  salaryTo: number
  id: number
  status: string
  position: Record<string, string>
  companyName: string
}

const JOB_BASE_URL = 'https://www.getmanfred.com/ofertas-empleo/'
const ALL_SKILLS = [
  '.NET',
  'Android',
  'Angular',
  'AWS',
  'C#',
  'C++',
  'Docker',
  'Flutter',
  'Go',
  'GraphQL',
  'iOS',
  'Java',
  'JavaScript',
  'Jenkins',
  'Kafka',
  'Kubernetes',
  'Laravel',
  'Microsoft WPF',
  'MongoDB',
  'MySQL',
  'Node',
  'PHP',
  'PostgreSQL',
  'Python',
  'React',
  'Ruby',
  'Ruby',
  'SQL',
  'Symfony',
  'Terraform',
  'Typescript',
  'Vue',
]

const filter = {
  minSalary: 40000,
  preferredSkills: ['TypeScript', 'JavaScript', 'Node.js', 'Python', 'Vue'] as string[] | null,
  unwantedSkills: ['Java', 'Ruby', 'Ruby on Rails'] as string[] | null,
  // preferredSkills: null as string[] | null,
  // unwantedSkills: null as string[] | null,
}

function xpath(window: DOMWindow, selector: string) {
  const document = window.document
  const matchingElement = document.evaluate(selector, document, null, 9, null).singleNodeValue
  return matchingElement as HTMLElement | null
}

function getSkills(window: DOMWindow) {
  const headerMatchers = {
    top1: 'Sí o sí',
    top2: 'Estaría bien',
    top3: 'Da puntos extra',
  }
  const top4 = {
    top4: Array.from(
      xpath(window, "//h2[contains(text(),'Qué piden')]/parent::header/parent::div//li")?.querySelectorAll('strong') ??
        [],
    ).map((s) => ({ skill: s.textContent!.trim(), level: -1 })),
  }
  const top5 = {
    top5: ALL_SKILLS.filter((s) => window.document.body.innerHTML.includes(s)).map((skill) => ({ skill, level: -1 })),
  }
  const levelMatchers = {
    Básico: 0,
    Intermedio: 1,
    Experto: 2,
  }
  const requirements = Object.entries(headerMatchers)
    .map(([top, headerText]) => {
      const header = xpath(
        window,
        `//h3[contains(text(),'Tecnologías')]/parent::section//h4[contains(text(),'${headerText}')]`,
      )!
      if (!header) return {}
      return {
        [top]: Array.from(header.parentElement!.querySelectorAll('ul > li')).map((e) => ({
          skill: e.querySelector('h5')!.textContent!,
          level: levelMatchers[e.querySelector('figcaption')!.textContent as keyof typeof levelMatchers],
        })),
      }
    })
    .concat([top4, top5])
    .reduce((acc, e) => Object.assign({}, acc, e), { top1: [], top2: [], top3: [] }) as unknown as {
    top1: Array<{ skill: string; level: number }>
    top2: Array<{ skill: string; level: number }>
    top3: Array<{ skill: string; level: number }>
    top4: Array<{ skill: string; level: -1 }>
    top5: Array<{ skill: string; level: -1 }>
  }

  return requirements
}

;(async () => {
  const jobs = await fetch('https://www.getmanfred.com/ofertas-empleo')
    .then((r) => r.text())
    .then((h) => new JSDOM(h))
    .then((jsdom) => jsdom.window.document.getElementById('__NEXT_DATA__')!.textContent!)
    .then((s) => JSON.parse(s))
    .then((j) => j.props.pageProps.data.offers as ApiJob[])

  const jobsWithPages = await Promise.all(
    jobs.map(async (j) => {
      const html = await fetch(`${JOB_BASE_URL}${j.id}`).then((r) => r.text())
      const skills = getSkills(new JSDOM(html).window)
      return {
        ...j,
        html,
        skills,
      }
    }),
  )

  const filteredPages = jobsWithPages
    .filter(({ salaryFrom, status, skills }) => {
      const jobSkills = skills.top1.concat(skills.top2).map(({ skill }) => skill)

      const isActive = status === 'ACTIVE'
      const salaryOk = salaryFrom > filter.minSalary
      const hasPreferredSkill = filter.preferredSkills !== null
      const containsPreferredSkill = filter.preferredSkills?.some((s) =>
        jobSkills.map((e) => e.toLowerCase()).includes(s.toLowerCase()),
      )
      const hasUnwantedSkill = filter.unwantedSkills !== null
      const containsUnwantedSkill = filter.unwantedSkills?.some((s) =>
        jobSkills.map((e) => e.toLowerCase()).includes(s.toLowerCase()),
      )

      if (!isActive) return false
      else if (!salaryOk) return false
      else if (hasPreferredSkill && hasUnwantedSkill) return containsPreferredSkill && !containsUnwantedSkill
      else if (hasPreferredSkill) return containsPreferredSkill
      else if (hasUnwantedSkill) return !containsUnwantedSkill
      else return true
    })
    .map((f: Partial<typeof jobsWithPages[0]>) => {
      delete f.html
      return f as typeof jobsWithPages[0]
    })

  filteredPages.forEach(({ id, salaryFrom, salaryTo, companyName, position, skills }) =>
    console.log(
      `<-----------------------
      ${Object.values(position)[0]} @ ${companyName}
      💸💸 ${salaryFrom / 1000}k - ${salaryTo / 1000}k
      Must: ${skills.top1.map(({ skill }) => skill).join(', ')}
      Nice2Have: ${skills.top2.map(({ skill }) => skill).join(', ')}
      Extra: ${skills.top3.map(({ skill }) => skill).join(', ')}
      
      Bullets: ${skills.top4.map(({ skill }) => skill).join('; ')}
      Text: ${skills.top5.map(({ skill }) => skill).join(', ')}

      URL: ${JOB_BASE_URL}${id}
----------------------->`,
    ),
  )
  // const skills = Array.from(new Set(filteredPages.map(({skills})=>skills.top1.concat(skills.top2).concat(skills.top3).map(({skill})=>skill)).flat()))
  // const ALL_SKILLS = ['Flutter', 'Android', 'iOS', 'SQL', 'C++', 'Go', 'AWS', 'MongoDB', 'Vue', 'JavaScript', 'Node', 'Python', 'Kafka', 'React', 'Ruby', 'Microsoft WPF', '.NET', 'C#', 'Angular', 'Ruby', 'PostgreSQL', 'GraphQL', 'PHP', 'MySQL', 'Laravel', 'Symfony', 'Java', 'Typescript', 'Terraform', 'Docker', 'Kubernetes', 'Jenkins']
})()
