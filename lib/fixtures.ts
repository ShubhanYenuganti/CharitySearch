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
  severity_summary: 'Sudan is experiencing one of the world\'s most severe humanitarian crises, with over 6 million children out of school due to ongoing conflict. The national risk score of 8.7/10 reflects extreme vulnerability across all dimensions, with fighting in Khartoum and Darfur displacing entire school populations.'
}

export const mockResearcherOutput: ResearcherOutput = {
  orgs: [
    {
      name: 'UNICEF',
      acronym: 'UNICEF',
      description: 'Provides education in emergencies including temporary learning spaces and teacher training in conflict-affected Sudan.',
      sector: 'Education',
      country: 'Sudan',
      evidence_quality: 'high',
      donate_url: 'https://www.unicef.org/donate',
      recent_context: 'UNICEF reached 280,000 children with emergency education support in Sudan in Q1 2025.',
      source: 'operational_presence'
    },
    {
      name: 'Save the Children',
      acronym: 'SCI',
      description: 'Runs child-friendly spaces and accelerated education programs for displaced children in Darfur.',
      sector: 'Education',
      country: 'Sudan',
      evidence_quality: 'high',
      donate_url: 'https://www.savethechildren.org/donate',
      recent_context: 'Save the Children reported a 40% increase in out-of-school children in Darfur since January 2024.',
      source: 'globalgiving'
    },
    {
      name: 'Against Malaria Foundation',
      acronym: 'AMF',
      description: 'Distributes insecticide-treated nets — GiveWell\'s top-rated charity by cost-effectiveness.',
      sector: 'Health',
      country: 'Sudan',
      evidence_quality: 'high',
      donate_url: 'https://www.againstmalaria.com/donate',
      recent_context: 'GiveWell estimates $3,500 per life saved through AMF net distribution programs.',
      source: 'givewell'
    },
    {
      name: 'Norwegian Refugee Council',
      acronym: 'NRC',
      description: 'Delivers education, shelter, and legal aid to internally displaced people across Sudan, with a focus on restoring access to schooling.',
      sector: 'Education',
      country: 'Sudan',
      evidence_quality: 'medium',
      donate_url: 'https://www.nrc.no/donate',
      recent_context: 'NRC enrolled over 45,000 displaced children in accelerated learning programs in Sudan during 2024.',
      source: 'operational_presence'
    }
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
