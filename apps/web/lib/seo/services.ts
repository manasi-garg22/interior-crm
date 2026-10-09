/**
 * Service landing pages — one per search intent ("modular kitchen Vadodara",
 * "office interior designer Vadodara", ...). Each becomes /services/<slug>.
 *
 * Copy is written for people, not keyword stuffing: the city and the service
 * appear naturally in the title, H1 and first paragraph, which is what Google
 * actually rewards.
 */

export type ServicePage = {
  slug: string
  /** Short label for nav and cards. */
  name: string
  /** <title> — kept under ~60 characters. */
  title: string
  /** Meta description — kept under ~155 characters. */
  description: string
  h1: string
  intro: string
  image: string
  imageAlt: string
  includes: string[]
  /** Who it is for / typical projects. */
  idealFor: string[]
  faqs: { q: string; a: string }[]
}

export const SERVICES: ServicePage[] = [
  {
    slug: 'home-interiors',
    name: 'Home Interiors',
    title: 'Home Interior Designer in Vadodara',
    description:
      'Complete home interiors in Vadodara — living rooms, bedrooms, wardrobes and kitchens, designed and built by one team. Book a free consultation with OM Arch Designs.',
    h1: 'Home interiors in Vadodara, designed and built end to end.',
    intro:
      'From a new 2BHK in Vasna-Bhayli to a villa in Alkapuri, we plan every room around how your family actually lives — then build it with our own site team, so the finished home matches the 3D design.',
    image: '/images/residence.jpg',
    imageAlt: 'A finished living room designed by OM Arch Designs',
    includes: [
      'Space planning and furniture layouts',
      '3D visuals before any work starts',
      'False ceilings, lighting and electrical planning',
      'Wardrobes, TV units and storage joinery',
      'Flooring, wall finishes and paint',
      'Site supervision through to handover',
    ],
    idealFor: [
      'New flats and bungalows awaiting possession',
      'Complete renovation of an existing home',
      'Single rooms — master bedroom, living or pooja room',
    ],
    faqs: [
      {
        q: 'How long does a full home interior take?',
        a: 'Most apartments are completed in 6–10 weeks after the design is approved. Bungalows and full renovations take longer; we give you a written schedule before work starts.',
      },
      {
        q: 'Do you work only in Vadodara?',
        a: 'Vadodara is our base, and we are now taking projects in more cities across Gujarat. Share your location in the enquiry form and we will confirm.',
      },
      {
        q: 'Can I see the design before you start?',
        a: 'Yes. You approve layouts and 3D visuals for every room before any material is ordered.',
      },
    ],
  },
  {
    slug: 'modular-kitchen',
    name: 'Modular Kitchens',
    title: 'Modular Kitchen Designer in Vadodara',
    description:
      'Modular kitchens in Vadodara designed for Indian cooking — smart storage, durable finishes and clean installation. Get a free design consultation from OM Arch Designs.',
    h1: 'Modular kitchens in Vadodara, built for the way you cook.',
    intro:
      'An Indian kitchen works harder than most — tadka, steam, heavy vessels, daily cleaning. We design layouts, storage and finishes that handle it, and install them with the plumbing and electrical work done properly.',
    image: '/images/kitchen.jpg',
    imageAlt: 'A modern modular kitchen with warm wood finishes',
    includes: [
      'L-shaped, U-shaped, parallel and island layouts',
      'Tall units, corner solutions and pull-out storage',
      'Moisture-resistant carcass and long-life hardware',
      'Countertop, backsplash and chimney planning',
      'Lighting under and inside cabinets',
      'Coordinated plumbing and electrical points',
    ],
    idealFor: [
      'New homes fitting a kitchen for the first time',
      'Replacing an old carpentry kitchen',
      'Kitchen-and-dining open plan remodels',
    ],
    faqs: [
      {
        q: 'How long does a modular kitchen take?',
        a: 'Typically 3–5 weeks from final design approval to installation, depending on finishes.',
      },
      {
        q: 'Can you work around existing plumbing?',
        a: 'Yes. We survey on site first and design around existing points, or relocate them where it makes the kitchen work better.',
      },
    ],
  },
  {
    slug: 'office-interiors',
    name: 'Office Interiors',
    title: 'Office Interior Designer in Vadodara',
    description:
      'Office and workspace interiors in Vadodara — planned for productivity, built to schedule. Cabins, workstations, meeting rooms and reception by OM Arch Designs.',
    h1: 'Office interiors in Vadodara that work as hard as your team.',
    intro:
      'Workstations, cabins, meeting rooms and a reception that says who you are. We plan for headcount, acoustics, cabling and future growth — and schedule the build so your business loses as little time as possible.',
    image: '/images/office.jpg',
    imageAlt: 'A bright, open-plan office interior',
    includes: [
      'Workspace planning for current and future headcount',
      'Cabins, workstations and meeting rooms',
      'Reception and brand-led feature walls',
      'Acoustic treatment and lighting design',
      'Data, power and AC coordination',
      'Phased execution to minimise downtime',
    ],
    idealFor: [
      'New office fit-outs',
      'Expanding or reorganising an existing office',
      'Clinics, studios and professional practices',
    ],
    faqs: [
      {
        q: 'Can you work outside business hours?',
        a: 'Yes. For running offices we can phase the work and schedule noisy jobs for evenings or weekends.',
      },
      {
        q: 'Do you handle the electrical and networking layout?',
        a: 'We plan power, data and lighting points as part of the design and coordinate the trades on site.',
      },
    ],
  },
  {
    slug: 'cafe-restaurant-interiors',
    name: 'Café & Restaurant Interiors',
    title: 'Café & Restaurant Interior Designer in Vadodara',
    description:
      'Café, restaurant and retail interiors in Vadodara designed to attract customers and work for your staff. Concept to opening by OM Arch Designs.',
    h1: 'Café and restaurant interiors in Vadodara, designed to fill tables.',
    intro:
      'A space people want to photograph, and a layout your staff can actually work in. We design the customer experience and the back-of-house flow together, then build to your opening date.',
    image: '/images/cafe.jpg',
    imageAlt: 'A warm, inviting specialty café interior',
    includes: [
      'Concept, mood and material palette',
      'Seating plans that maximise covers',
      'Counter, bar and kitchen workflow',
      'Feature lighting and signage integration',
      'Durable, easy-clean commercial finishes',
      'Build schedule planned around your opening date',
    ],
    idealFor: [
      'New cafés, restaurants and cloud-kitchen fronts',
      'Refreshing a tired outlet',
      'Retail stores and showrooms',
    ],
    faqs: [
      {
        q: 'Can you help with the concept and theme?',
        a: 'Yes. We start with your menu, audience and brand, and develop the look and layout from there.',
      },
      {
        q: 'How do you handle tight opening deadlines?',
        a: 'We agree the opening date up front and plan the design approvals and site work backwards from it.',
      },
    ],
  },
]

export function findService(slug: string): ServicePage | undefined {
  return SERVICES.find((service) => service.slug === slug)
}
