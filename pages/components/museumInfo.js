// Practical museum information shown on the Visit and About pages.
// Fill these in — any field left empty is simply hidden on the site.
export default {
  fullName: 'Enns Entomology Museum',
  university: 'University of Missouri',
  college: 'College of Agriculture, Food and Natural Resources',
  city: 'Columbia, Missouri',

  // e.g. '1-87 Agriculture Building, 600 Hitt St, Columbia, MO 65211'
  address: '',
  // e.g. 'ennsmuseum@missouri.edu'
  email: '',
  phone: '',
  // e.g. 'Monday–Friday, 9 am – 4 pm, by appointment'
  hours: '',

  director: {
    name: 'Davide Dal Pos',
    role: 'Director',
    email: 'davide.dalpos@missouri.edu'
  },

  // Online giving page for the Enns Endowment (leave empty to hide the button)
  givingUrl: '',

  // GBIF. The collection is already registered in GRSciColl; add the dataset key
  // and DOI once the specimen data are published to GBIF, and the site shows them.
  gbif: {
    grscicollKey: '02c807d4-c06c-40cc-a0ee-beac2d8b1b7e',
    datasetKey: '',
    doi: ''
  },

  // Rough size of the holdings, used in the text
  holdings: 'more than 7 million specimens'
}
