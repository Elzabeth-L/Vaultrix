export const DEFAULT_SERVICE_BACKGROUND = 'https://images.openai.com/static-rsc-4/aMF6yfUacXWNU326dNEtZOm0Epe1hDm9ot18K-e8hLSVuXUFPwPGefc6ioebEyCOUvSfG1x15R5MWEoPeAsdck3B6FSgyzu9QnzibFNBgEF-M9sgzq25OA0ed0O6uxeru5nCuyt0-kBXsZZPxTuEqT9DRVfxFmIINIvquRdnNSd2Hk0XsZ_SyRVuVxYrjbpE?purpose=fullsize';

export const SERVICE_BACKGROUNDS = {
  cleaning: 'https://cdn.mos.cms.futurecdn.net/CRSQiBvET2uwKdQK97E4Ad.jpg',
  plumbing: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQil4s8KJptLyqlk4j-mmB5-jYLHM89sIiBfrtHL_LKOQ&s',
  carpentry: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAvAQaQhvw1em5iqpxRaTUIkCqehIYHamKog&s',
  painting: 'https://s3-blog.homelane.com/design-ideas-pre/wp-content/uploads/2022/11/slate-grey-wall-paint.jpg',
  electronics: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6BmZt5eHe96kw5MQR7gKpcNHqHHd9MlsZMQ&s',
  tutoring: 'https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvNDQtay04My1jaGltLTg1MzUxNi5qcGc.jpg',
  design: 'https://planbcreative.org/wp-content/uploads/2021/02/pexels-tranmautritam-326501-2-1024x682.jpg',
  moving: 'https://5.imimg.com/data5/BA/FY/QO/SELLER-94934398/furniture-shifting-service-500x500.jpg',
};

const SERVICES_STORAGE_KEY = 'vaultrix_services';
const REVIEW_CRITERIA_STORAGE_KEY = 'vaultrix_review_criteria';
const SERVICES_UPDATED_EVENT = 'vaultrix:services-updated';

export const getServiceBackground = (serviceId) => SERVICE_BACKGROUNDS[serviceId] || DEFAULT_SERVICE_BACKGROUND;

const DEFAULT_SERVICES = [
  {
    id: 'cleaning',
    name: 'Home Cleaning',
    icon: '\u{1F9F9}',
    description: 'Professional deep-clean for your home, office, or apartment.',
    priceFrom: 499,
    category: 'Home',
    backgroundImage: getServiceBackground('cleaning'),
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '\u{1F527}',
    description: 'Leak repairs, pipe installation, and full plumbing services.',
    priceFrom: 299,
    category: 'Home',
    backgroundImage: getServiceBackground('plumbing'),
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: '\u{1FAB5}',
    description: 'Custom furniture, repairs, and all woodwork solutions.',
    priceFrom: 599,
    category: 'Home',
    backgroundImage: getServiceBackground('carpentry'),
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: '\u{1F3A8}',
    description: 'Interior and exterior painting with premium-quality finishes.',
    priceFrom: 799,
    category: 'Home',
    backgroundImage: getServiceBackground('painting'),
  },
  {
    id: 'electronics',
    name: 'Electronics Repair',
    icon: '\u{1F50C}',
    description: 'AC, TV, washing machine, and all home appliance repairs.',
    priceFrom: 199,
    category: 'Tech',
    backgroundImage: getServiceBackground('electronics'),
  },
  {
    id: 'tutoring',
    name: 'Tutoring',
    icon: '\u{1F4DA}',
    description: 'One-on-one tutoring for school, college, and entrance exams.',
    priceFrom: 399,
    category: 'Education',
    backgroundImage: getServiceBackground('tutoring'),
  },
  {
    id: 'design',
    name: 'Graphic Design',
    icon: '\u270F\uFE0F',
    description: 'Logos, branding, UI/UX, and all creative design tasks.',
    priceFrom: 999,
    category: 'Creative',
    backgroundImage: getServiceBackground('design'),
  },
  {
    id: 'moving',
    name: 'Moving & Shifting',
    icon: '\u{1F69A}',
    description: 'Safe packing, loading, transport, and unpacking service.',
    priceFrom: 1499,
    category: 'Logistics',
    backgroundImage: getServiceBackground('moving'),
  },
];

const DEFAULT_REVIEW_CRITERIA = {
  cleaning: ['Cleanliness', 'Timeliness', 'Professionalism'],
  plumbing: ['Workmanship', 'Timeliness', 'Value for Money'],
  carpentry: ['Workmanship', 'Quality', 'Timeliness'],
  painting: ['Neatness', 'Quality', 'Timeliness'],
  electronics: ['Quality', 'Speed', 'Value for Money'],
  tutoring: ['Clarity', 'Patience', 'Knowledge'],
  design: ['Creativity', 'Quality', 'Communication'],
  moving: ['Care', 'Timeliness', 'Professionalism'],
  default: ['Quality', 'Timeliness', 'Professionalism'],
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readJson = (key, fallback) => {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const emitServicesUpdated = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SERVICES_UPDATED_EVENT));
};

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `service-${Date.now()}`;

const normalizeService = (service = {}) => {
  const id = slugify(service.id || service.name);
  return {
    id,
    name: String(service.name || '').trim(),
    icon: String(service.icon || '\u{1F6E0}\uFE0F').trim(),
    description: String(service.description || '').trim(),
    priceFrom: Math.max(0, Number(service.priceFrom) || 0),
    category: String(service.category || 'General').trim(),
    backgroundImage: String(service.backgroundImage || getServiceBackground(id)).trim() || DEFAULT_SERVICE_BACKGROUND,
    isCustom: Boolean(service.isCustom),
  };
};

const parseCriteria = (criteria) => {
  if (Array.isArray(criteria)) {
    return criteria.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(criteria || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getCustomServices = () => readJson(SERVICES_STORAGE_KEY, []).map((service) => normalizeService({ ...service, isCustom: true }));

export const getServices = () => {
  const base = DEFAULT_SERVICES.map((service) => ({ ...service, isCustom: false }));
  const custom = getCustomServices();
  return [...base, ...custom];
};

export const getServiceById = (serviceId) => getServices().find((service) => service.id === serviceId) || null;

export const getReviewCriteriaMap = () => ({
  ...DEFAULT_REVIEW_CRITERIA,
  ...readJson(REVIEW_CRITERIA_STORAGE_KEY, {}),
});

export const getReviewCriteriaForService = (serviceId) => getReviewCriteriaMap()[serviceId] || DEFAULT_REVIEW_CRITERIA.default;

export const addCustomService = (serviceInput, reviewCriteriaInput) => {
  const service = normalizeService({ ...serviceInput, isCustom: true });
  if (!service.name || !service.description || !service.priceFrom) {
    throw new Error('Name, description, and price are required.');
  }

  const services = getServices();
  if (services.some((existing) => existing.id === service.id)) {
    throw new Error('A service with this ID already exists.');
  }

  const customServices = getCustomServices();
  customServices.push(service);
  writeJson(SERVICES_STORAGE_KEY, customServices);

  const criteria = parseCriteria(reviewCriteriaInput);
  if (criteria.length) {
    const reviewCriteria = readJson(REVIEW_CRITERIA_STORAGE_KEY, {});
    reviewCriteria[service.id] = criteria;
    writeJson(REVIEW_CRITERIA_STORAGE_KEY, reviewCriteria);
  }

  emitServicesUpdated();
  return service;
};

export const SERVICES = DEFAULT_SERVICES;
export const REVIEW_CRITERIA = DEFAULT_REVIEW_CRITERIA;
export const SERVICES_REGISTRY_EVENT = SERVICES_UPDATED_EVENT;
