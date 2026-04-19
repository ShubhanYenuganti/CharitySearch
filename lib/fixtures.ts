import { InterpreterOutput, ResearcherOutput } from './types'

export const mockInterpreterOutput: InterpreterOutput = {
  issue: 'education',
  country_name: 'Sudan',
  location_code: 'SDN',
  hdx_data: {
    humanitarian_needs: [
      { sector_name: 'Education', population: 4200000,
        population_status: 'INN', admin1_name: 'Khartoum' },
      { sector_name: 'Education', population: 1800000,
        population_status: 'INN', admin1_name: 'Darfur' },
    ],
    national_risk: {
      overall_risk: 8.7,
      hazard_exposure_risk: 9.1,
      vulnerability_risk: 8.4,
      coping_capacity_risk: 8.9,
      location_name: 'Sudan'
    },
    conflict_events: [
      { event_type: 'battles', events: 312, fatalities: 1840,
        admin1_name: 'Khartoum', reference_period_start: '2024-01-01' },
    ],
    operational_presence: [
      { org_name: 'UNICEF', org_acronym: 'UNICEF',
        sector_name: 'Education', admin1_name: 'Khartoum' },
      { org_name: 'Save the Children',
        org_acronym: 'SCI', sector_name: 'Education',
        admin1_name: 'Darfur' },
    ]
  },
  severity_summary: 'Sudan is experiencing one of the world\'s most severe education emergencies. Over 6 million children are out of school as ongoing conflict has shuttered classrooms across Khartoum and Darfur, displaced teachers, and destroyed or repurposed learning spaces. Entire school districts have been non-operational since fighting escalated in April 2023, with no near-term resolution in sight.'
}

export const mockResearcherOutput: ResearcherOutput = {
  orgs: [
    {
      org_name: 'UNICEF',
      sector: 'Education',
      country: 'SDN',
      reason: 'UNICEF operates emergency education programs across Khartoum, running temporary learning spaces and distributing materials to displaced children.',
      blurb: null,
      donate_url: null,
      org_impact_stats: [],
      sector_tags: [],
      grade_label: null,
      alignment_score: null,
      verified_badge: null,
    },
    {
      org_name: 'Save the Children',
      sector: 'Education',
      country: 'SDN',
      reason: 'Runs child-friendly spaces and accelerated education programs for displaced children in Darfur, combining psychosocial support with literacy and numeracy.',
      blurb: null,
      donate_url: null,
      org_impact_stats: [],
      sector_tags: [],
      grade_label: null,
      alignment_score: null,
      verified_badge: null,
    },
    {
      org_name: 'Against Malaria Foundation',
      sector: 'Health',
      country: 'SDN',
      reason: 'Distributes insecticide-treated bed nets in high-burden regions with rigorous independent monitoring.',
      blurb: null,
      donate_url: null,
      org_impact_stats: [],
      sector_tags: [],
      grade_label: null,
      alignment_score: null,
      verified_badge: null,
    },
    {
      org_name: 'Norwegian Refugee Council',
      sector: 'Education',
      country: 'SDN',
      reason: 'Delivers education, shelter, and legal aid to internally displaced people across Sudan, restoring access to schooling for out-of-school children.',
      blurb: null,
      donate_url: null,
      org_impact_stats: [],
      sector_tags: [],
      grade_label: null,
      alignment_score: null,
      verified_badge: null,
    },
  ]
}

export const mockNarratorStream = `## The situation in Sudan

More than **6 million children** are out of school in Sudan — the largest education crisis on the continent. Since fighting escalated in April 2023, entire school districts in Khartoum and Darfur have been shuttered, teachers displaced, and learning spaces destroyed or occupied by armed groups.

Sudan's national humanitarian risk score of **8.7 out of 10** places it among the world's most vulnerable countries across every dimension: hazard exposure, societal vulnerability, and critically low coping capacity.

## Where your money goes

### UNICEF — Highest confidence
UNICEF is operating emergency education programs across Khartoum state, running temporary learning spaces and distributing learning materials to displaced children. In Q1 2025 alone they reached 280,000 children. Donating directly to UNICEF's Sudan Emergency fund ensures funds reach active programs on the ground.

### Save the Children — Darfur-focused
Save the Children's child-friendly spaces in Darfur provide psychosocial support alongside basic literacy and numeracy for children who have missed one or more years of schooling. Their accelerated education model is specifically designed for crisis contexts.

## What to do

Your $50 to UNICEF's Sudan Emergency fund is estimated to provide one child with three months of emergency education support — materials, a trained teacher, and a safe learning space.

[Donate to UNICEF Sudan →](https://www.unicef.org/donate)
[Donate to Save the Children →](https://www.savethechildren.org/donate)`
