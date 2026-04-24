// Service catalog — each entry defines a bookable service
export const SERVICES = [
  { id: 'cleaning',    name: 'Home Cleaning',       icon: '🧹', description: 'Professional deep-clean for your home, office, or apartment.', priceFrom: 499,  category: 'Home' },
  { id: 'plumbing',   name: 'Plumbing',             icon: '🔧', description: 'Leak repairs, pipe installation, and full plumbing services.', priceFrom: 299,  category: 'Home' },
  { id: 'carpentry',  name: 'Carpentry',            icon: '🪵', description: 'Custom furniture, repairs, and all woodwork solutions.',        priceFrom: 599,  category: 'Home' },
  { id: 'painting',   name: 'Painting',             icon: '🎨', description: 'Interior and exterior painting with premium-quality finishes.', priceFrom: 799,  category: 'Home' },
  { id: 'electronics',name: 'Electronics Repair',   icon: '🔌', description: 'AC, TV, washing machine, and all home appliance repairs.',      priceFrom: 199,  category: 'Tech' },
  { id: 'tutoring',   name: 'Tutoring',             icon: '📚', description: 'One-on-one tutoring for school, college, and entrance exams.',  priceFrom: 399,  category: 'Education' },
  { id: 'design',     name: 'Graphic Design',       icon: '✏️', description: 'Logos, branding, UI/UX, and all creative design tasks.',        priceFrom: 999,  category: 'Creative' },
  { id: 'moving',     name: 'Moving & Shifting',    icon: '🚚', description: 'Safe packing, loading, transport, and unpacking service.',      priceFrom: 1499, category: 'Logistics' },
];

export const REVIEW_CRITERIA = {
  cleaning:    ['Cleanliness', 'Timeliness', 'Professionalism'],
  plumbing:    ['Workmanship', 'Timeliness', 'Value for Money'],
  carpentry:   ['Workmanship', 'Quality', 'Timeliness'],
  painting:    ['Neatness', 'Quality', 'Timeliness'],
  electronics: ['Quality', 'Speed', 'Value for Money'],
  tutoring:    ['Clarity', 'Patience', 'Knowledge'],
  design:      ['Creativity', 'Quality', 'Communication'],
  moving:      ['Care', 'Timeliness', 'Professionalism'],
  default:     ['Quality', 'Timeliness', 'Professionalism'],
};
