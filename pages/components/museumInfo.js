// Practical museum information shown on the Visit and About pages.
// Fill these in — any field left empty is simply hidden on the site.
export default {
  fullName: 'Enns Entomology Museum',
  university: 'University of Missouri',
  college: 'College of Agriculture, Food and Natural Resources',
  city: 'Columbia, Missouri',

  // Unit responsible for the website (shown in the footer, required by the Mizzou
  // web guidelines). Add unitUrl to link it to the Division's website.
  unit: 'Division of Plant Science & Technology',
  unitUrl: '',

  // e.g. '1-87 Agriculture Building, 600 Hitt St, Columbia, MO 65211'
  // From the museum's old site (museum.insecta.missouri.edu/map.htm) — check it is still current
  address: 'Room 3-38, Agriculture Building, University of Missouri, Columbia, MO 65211',
  mailing: '1-33 Agriculture Building, Division of Plant Science & Technology, University of Missouri, Columbia, MO 65211',
  directions:
    'The Agriculture Building is on the NE corner of Hitt St and Rollins St. Use the Rollins Street entrance and take the stairs up to the third floor.',
  parking: 'Metered parking on Hitt St in front of the building, or on the west side of Virginia Ave by the parking garage.',
  // Pin on the About page map (Agriculture Building, from OpenStreetMap — adjust if needed)
  location: { lat: 38.94285, lng: -92.32533 },
  mapUrl: 'https://www.openstreetmap.org/search?query=Agriculture%20Building%2C%20University%20of%20Missouri%2C%20Columbia',
  // Contact email (footer, Visit and About pages). The museum has no general address.
  email: 'davide.dalpos@missouri.edu',
  // The museum has no phone line; leave empty and the footer simply omits it.
  phone: '',
  // e.g. 'Monday–Friday, 9 am – 4 pm, by appointment'
  hours: '',

  director: {
    name: 'Davide Dal Pos',
    role: 'Director',
    email: 'davide.dalpos@missouri.edu'
  },

  // Online giving page for "Friends of the Museum" donations.
  // While empty, every Donate button leads to the Donate page, which says online giving opens soon.
  // Paste the University's giving link here when it is ready.
  givingUrl: '',

  // GBIF. The collection is registered in GRSciColl and the museum is an endorsed
  // GBIF data publisher (October 2026). Add the dataset key and DOI once the
  // specimen data are published to GBIF, and the site shows them.
  gbif: {
    grscicollKey: '02c807d4-c06c-40cc-a0ee-beac2d8b1b7e',
    publisherKey: '794e6aee-90b8-4b53-8740-ef897a4a5496',
    datasetKey: 'a6a90206-efc3-4a7c-9449-ea4f9255bc5d',
    doi: '10.15468/eqzfmb',
    // Official GBIF logo (saved under public/images/);
    // without the file a plain text mark is shown instead.
    logo: 'images/GBIF.png'
  },

  // Digitization progress (home page and Holdings): the month digitizing started,
  // and a goal of specimens to digitize per year — e.g. goals: { 2027: 10000 }.
  // A year without a goal simply shows no goal bar.
  digitization: {
    since: '2026-09',
    goals: {}
  },

  // Rough size of the holdings, used in the text
  holdings: 'more than 7 million specimens'
}
