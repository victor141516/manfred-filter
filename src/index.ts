import fetch from 'node-fetch'
import { DOMWindow, JSDOM } from 'jsdom'

import { ApiJob } from './types'
import { filter } from './filter'
import { ALL_SKILLS, JOB_BASE_URL } from './constants'
import { xpath } from './html'

function getSkills(window: DOMWindow) {
  const headerMatchers = {
    top1: 'Sí o sí',
    top2: 'Estaría bien',
    top3: 'Da puntos extra',
  }
  const top4 = {
    top4: Array.from<HTMLElement>(
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
        [top]: Array.from<HTMLElement>(header.parentElement!.querySelectorAll('ul > li')).map((e) => ({
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

async function main() {
  const jobs = await fetch('https://www.getmanfred.com/ofertas-empleo')
    .then((r) => r.text())
    .then((h) => new JSDOM(h))
    .then((jsdom) => jsdom.window.document.getElementById('__NEXT_DATA__')!.textContent!)
    .then((s) => JSON.parse(s))
    .then((j) => j.props.pageProps.offers as ApiJob[])
  
  jobs
    .map(async (j) => {
      const html = await fetch(`${JOB_BASE_URL}${j.id}/${Object.values(j.slug)[0]}`).then((r) => r.text())
      const skills = getSkills(new JSDOM(html).window)
      return {
        ...j,
        html,
        skills,
      }
    })
    .map(async (prom) => {
      // act as filter
      const { salaryFrom, status, skills, slug } = await prom

      const jobSkills = skills.top1.concat(skills.top2).map(({ skill }) => skill)
      if (jobSkills.length === 0) {
        jobSkills.push(
          ...skills.top3
            .concat(skills.top4)
            .concat(skills.top5)
            .map(({ skill }) => skill),
        )
      }

      const isActive = status === 'ACTIVE'
      const salaryOk = salaryFrom > filter.minSalary
      const hasPreferredSkill = filter.preferredSkills !== undefined
      const containsPreferredSkill = filter.preferredSkills?.some((s) =>
        jobSkills.map((e) => e.toLowerCase()).includes(s.toLowerCase()),
      )
      const hasUnwantedSkill = filter.unwantedSkills !== undefined
      const containsUnwantedSkill = filter.unwantedSkills?.some((s) =>
        jobSkills.map((e) => e.toLowerCase()).includes(s.toLowerCase()),
      )

      if (!isActive) return null
      else if (!salaryOk) return null
      else if (hasPreferredSkill && hasUnwantedSkill)
        return containsPreferredSkill && !containsUnwantedSkill ? prom : null
      else if (hasPreferredSkill) return containsPreferredSkill ? prom : null
      else if (hasUnwantedSkill) return !containsUnwantedSkill ? prom : null
      else return prom
    })
    .forEach(async (prom) => {
      prom.catch((err) => console.error('Error:', err))
      if (!(await prom)) return
      const { id, salaryFrom, salaryTo, companyName, position, skills } = (await prom)!

      console.log(
        `<-----------------------
      ${Object.values(position)[0]} @ ${companyName}
      💸💸 ${salaryFrom / 1000}k - ${salaryTo / 1000}k
      Must: ${skills.top1.map(({ skill }) => skill).join(', ')}
      Nice2Have: ${skills.top2.map(({ skill }) => skill).join(', ')}
      Extra: ${skills.top3.map(({ skill }) => skill).join(', ')}
      
      Bullets: ${skills.top4.map(({ skill }) => skill).join('; ')}
      Text: ${skills.top5.map(({ skill }) => skill).join(', ')}

      URL: ${JOB_BASE_URL}${id}/${Object.values((await prom)!.slug)[0]}
----------------------->`,
      )
    })
  // const skills = Array.from(new Set(skills=>skills.top1.concat(skills.top2).concat(skills.top3).map(({skill})=>skill)).flat()))
  // const ALL_SKILLS = ['Flutter', 'Android', 'iOS', 'SQL', 'C++', 'Go', 'AWS', 'MongoDB', 'Vue', 'JavaScript', 'Node', 'Python', 'Kafka', 'React', 'Ruby', 'Microsoft WPF', '.NET', 'C#', 'Angular', 'Ruby', 'PostgreSQL', 'GraphQL', 'PHP', 'MySQL', 'Laravel', 'Symfony', 'Java', 'Typescript', 'Terraform', 'Docker', 'Kubernetes', 'Jenkins']
}

main()
