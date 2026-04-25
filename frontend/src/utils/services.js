import { getCurrentUser } from './auth';

export const DEFAULT_SERVICE_BACKGROUND = 'https://images.openai.com/static-rsc-4/aMF6yfUacXWNU326dNEtZOm0Epe1hDm9ot18K-e8hLSVuXUFPwPGefc6ioebEyCOUvSfG1x15R5MWEoPeAsdck3B6FSgyzu9QnzibFNBgEF-M9sgzq25OA0ed0O6uxeru5nCuyt0-kBXsZZPxTuEqT9DRVfxFmIINIvquRdnNSd2Hk0XsZ_SyRVuVxYrjbpE?purpose=fullsize';
export const SERVICES_REGISTRY_EVENT = 'vaultrix:services-updated';

const SERVICES_CACHE_PREFIX = 'vaultrix_services_cache';

const DEFAULT_SERVICES = [
  {
    id: 'cleaning',
    name: 'Home Cleaning',
    icon: '\u{1F9F9}',
    description: 'Professional deep-clean for your home, office, or apartment.',
    priceFrom: 499,
    category: 'Home',
    backgroundImage: 'https://cdn.mos.cms.futurecdn.net/CRSQiBvET2uwKdQK97E4Ad.jpg',
    reviewCriteria: ['Cleanliness', 'Timeliness', 'Professionalism'],
    isCustom: false,
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '\u{1F527}',
    description: 'Leak repairs, pipe installation, and full plumbing services.',
    priceFrom: 299,
    category: 'Home',
    backgroundImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQil4s8KJptLyqlk4j-mmB5-jYLHM89sIiBfrtHL_LKOQ&s',
    reviewCriteria: ['Workmanship', 'Timeliness', 'Value for Money'],
    isCustom: false,
  },
  {
    id: 'carpentry',
    name: 'Carpentry',
    icon: '\u{1FAB5}',
    description: 'Custom furniture, repairs, and all woodwork solutions.',
    priceFrom: 599,
    category: 'Home',
    backgroundImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTAvAQaQhvw1em5iqpxRaTUIkCqehIYHamKog&s',
    reviewCriteria: ['Workmanship', 'Quality', 'Timeliness'],
    isCustom: false,
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: '\u{1F3A8}',
    description: 'Interior and exterior painting with premium-quality finishes.',
    priceFrom: 799,
    category: 'Home',
    backgroundImage: 'https://s3-blog.homelane.com/design-ideas-pre/wp-content/uploads/2022/11/slate-grey-wall-paint.jpg',
    reviewCriteria: ['Neatness', 'Quality', 'Timeliness'],
    isCustom: false,
  },
  {
    id: 'electronics',
    name: 'Electronics Repair',
    icon: '\u{1F50C}',
    description: 'AC, TV, washing machine, and all home appliance repairs.',
    priceFrom: 199,
    category: 'Tech',
    backgroundImage: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6BmZt5eHe96kw5MQR7gKpcNHqHHd9MlsZMQ&s',
    reviewCriteria: ['Quality', 'Speed', 'Value for Money'],
    isCustom: false,
  },
  {
    id: 'tutoring',
    name: 'Tutoring',
    icon: '\u{1F4DA}',
    description: 'One-on-one tutoring for school, college, and entrance exams.',
    priceFrom: 399,
    category: 'Education',
    backgroundImage: 'https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvNDQtay04My1jaGltLTg1MzUxNi5qcGc.jpg',
    reviewCriteria: ['Clarity', 'Patience', 'Knowledge'],
    isCustom: false,
  },
  {
    id: 'design',
    name: 'Graphic Design',
    icon: '\u270F\uFE0F',
    description: 'Logos, branding, UI/UX, and all creative design tasks.',
    priceFrom: 999,
    category: 'Creative',
    backgroundImage: 'https://planbcreative.org/wp-content/uploads/2021/02/pexels-tranmautritam-326501-2-1024x682.jpg',
    reviewCriteria: ['Creativity', 'Quality', 'Communication'],
    isCustom: false,
  },
  {
    id: 'moving',
    name: 'Moving & Shifting',
    icon: '\u{1F69A}',
    description: 'Safe packing, loading, transport, and unpacking service.',
    priceFrom: 1499,
    category: 'Logistics',
    backgroundImage: 'https://5.imimg.com/data5/BA/FY/QO/SELLER-94934398/furniture-shifting-service-500x500.jpg',
    reviewCriteria: ['Care', 'Timeliness', 'Professionalism'],
    isCustom: false,
  },
];

export const REVIEW_CRITERIA = {
  default: ['Quality', 'Timeliness', 'Professionalism'],
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getViewerCacheKey = () => {
  const viewer = getCurrentUser();
  if (!viewer?.id) return `${SERVICES_CACHE_PREFIX}_guest`;
  if (viewer.role === 'ADMIN') return `${SERVICES_CACHE_PREFIX}_admin`;
  return `${SERVICES_CACHE_PREFIX}_${viewer.id}`;
};

const normalizeService = (service = {}) => ({
  id: String(service.id || service.serviceId || '').trim().toLowerCase(),
  name: String(service.name || '').trim(),
  icon: String(service.icon || '\u{1F6E0}\uFE0F').trim(),
  description: String(service.description || '').trim(),
  priceFrom: Math.max(0, Number(service.priceFrom) || 0),
  category: String(service.category || 'General').trim(),
  backgroundImage: String(service.backgroundImage || '').trim() || DEFAULT_SERVICE_BACKGROUND,
  reviewCriteria: Array.isArray(service.reviewCriteria) && service.reviewCriteria.length
    ? service.reviewCriteria.map((item) => String(item || '').trim()).filter(Boolean)
    : REVIEW_CRITERIA.default,
  isCustom: Boolean(service.isCustom),
  visibility: service.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
  ownerUserId: service.ownerUserId || null,
  ownerUserName: service.ownerUserName || null,
  ownerUserEmail: service.ownerUserEmail || null,
  publishedAt: service.publishedAt || null,
  publishedBy: service.publishedBy || null,
  createdBy: service.createdBy || null,
});

const emitServicesUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SERVICES_REGISTRY_EVENT));
  }
};

const readCache = () => {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(getViewerCacheKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const cacheServices = (services = []) => {
  const normalized = services.map(normalizeService);
  if (canUseStorage()) {
    window.localStorage.setItem(getViewerCacheKey(), JSON.stringify(normalized));
  }
  emitServicesUpdated();
  return normalized;
};

export const getDefaultServices = () => DEFAULT_SERVICES.map(normalizeService);

export const getServices = () => {
  const cached = readCache();
  if (Array.isArray(cached) && cached.length) {
    return cached.map(normalizeService);
  }
  return getDefaultServices();
};

export const getServiceById = (serviceId) => getServices().find((service) => service.id === serviceId) || null;

export const getReviewCriteriaForService = (serviceId) => {
  const service = getServiceById(serviceId);
  return service?.reviewCriteria?.length ? service.reviewCriteria : REVIEW_CRITERIA.default;
};

export const loadServices = async (api) => {
  const response = await api.get('/users/services');
  return cacheServices(response.data?.services || []);
};

export const createService = async (api, payload) => {
  const response = await api.post('/users/services', payload);
  const created = normalizeService(response.data?.service || {});
  const existing = getServices().filter((service) => service.id !== created.id);
  cacheServices([...existing, created]);
  return created;
};

export const createCustomService = async (api, payload) => {
  const response = await api.post('/users/services/custom', payload);
  const created = normalizeService(response.data?.service || {});
  const existing = getServices().filter((service) => service.id !== created.id);
  cacheServices([...existing, created]);
  return created;
};

export const updateService = async (api, serviceId, payload) => {
  const response = await api.patch(`/users/services/${serviceId}`, payload);
  const updated = normalizeService(response.data?.service || {});
  const existing = getServices().filter((service) => service.id !== updated.id);
  cacheServices([...existing, updated]);
  return updated;
};

export const publishService = async (api, serviceId, payload) => {
  const response = await api.patch(`/users/services/${serviceId}/publish`, payload);
  const updated = normalizeService(response.data?.service || {});
  const existing = getServices().filter((service) => service.id !== updated.id);
  cacheServices([...existing, updated]);
  return updated;
};

export const SERVICES = DEFAULT_SERVICES.map(normalizeService);
