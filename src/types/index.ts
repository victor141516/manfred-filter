export interface ApiJob {
  salaryFrom: number
  salaryTo: number
  id: number
  status: string
  position: Record<string, string>
  companyName: string
  slug: Record<string, string>
}

export interface Filter {
  minSalary: number
  preferredSkills: string[] | undefined
  unwantedSkills: string[] | undefined
}
