import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { Filter } from './types'

function parseArgs(): Filter {
  const argv = yargs(hideBin(process.argv))
    .array('whitelist')
    .array('blacklist')
    .alias('w', 'whitelist')
    .alias('b', 'blacklist')
    .alias('s', 'salary')
    .number('salary')
    .usage('Usage: npx manfred-filter [options]')
    .describe('whitelist', 'List of skills to filter by')
    .describe('blacklist', 'List of skills to discard by')
    .describe('salary', 'Min salary')
    .help('help')
    .alias('h', 'help')
    .example([
      [
        'Multiple args',
        "npx manfred-filter -s 40000 -w TypeScript -w JavaScript -w Node.js -w Python -w Vue -b Java -b Ruby -b 'Ruby on Rails'",
      ],
      [
        'Comma separated args',
        "npx manfred-filter -s 40000 -w TypeScript JavaScript Node.js Python Vue -b Java Ruby 'Ruby on Rails'",
      ],
      ['Optional parameters', 'npx manfred-filter -s 40000'],
    ])
    .parseSync()
  return {
    minSalary: argv.salary as number,
    preferredSkills: argv.whitelist as string[],
    unwantedSkills: argv.blacklist as string[],
  }
}

export const filter = parseArgs()
