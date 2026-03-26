import crypto from 'crypto';

/**
 * Brazilian city → state (UF) mapping for the most common cities.
 * Used when the unidade doesn't have " - UF" format.
 */
const CITY_STATE_MAP = {
  'brasilia': 'df', 'brasília': 'df',
  'sao paulo': 'sp', 'são paulo': 'sp',
  'rio de janeiro': 'rj',
  'belo horizonte': 'mg',
  'curitiba': 'pr',
  'porto alegre': 'rs',
  'salvador': 'ba',
  'recife': 'pe',
  'fortaleza': 'ce',
  'goiania': 'go', 'goiânia': 'go',
  'manaus': 'am',
  'belem': 'pa', 'belém': 'pa',
  'florianopolis': 'sc', 'florianópolis': 'sc',
  'vitoria': 'es', 'vitória': 'es',
  'natal': 'rn',
  'campinas': 'sp',
  'sao luis': 'ma', 'são luís': 'ma',
  'maceio': 'al', 'maceió': 'al',
  'joao pessoa': 'pb', 'joão pessoa': 'pb',
  'campo grande': 'ms',
  'teresina': 'pi',
  'cuiaba': 'mt', 'cuiabá': 'mt',
  'aracaju': 'se',
  'rio branco': 'ac',
  'macapa': 'ap', 'macapá': 'ap',
  'porto velho': 'ro',
  'boa vista': 'rr',
  'palmas': 'to',
};

/**
 * Hash a value with SHA-256 (Meta requirement)
 * Returns undefined if value is empty
 */
function hashSha256(val) {
  if (!val || !val.trim()) return undefined;
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

/**
 * Normalize a city name for Meta CAPI (lowercase, no accents, no spaces)
 * Example: "São Paulo" → "saopaulo", "Brasília" → "brasilia"
 */
function normalizeCity(city) {
  if (!city) return '';
  return city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');     // remove spaces, punctuation
}

/**
 * Get the 2-letter state code from a city or state string
 * Example: "SP" → "sp", "São Paulo" → "sp", "Brasília" → "df"
 */
function resolveState(estado, cidade) {
  // If estado is already a 2-letter code, use it
  if (estado && estado.trim().length === 2) {
    return estado.trim().toLowerCase();
  }
  // Try to resolve from the city name
  if (cidade) {
    const cityLower = cidade.trim().toLowerCase();
    if (CITY_STATE_MAP[cityLower]) {
      return CITY_STATE_MAP[cityLower];
    }
  }
  // If estado is a full name, try common mappings
  if (estado) {
    const estadoLower = estado.trim().toLowerCase();
    if (CITY_STATE_MAP[estadoLower]) {
      return CITY_STATE_MAP[estadoLower];
    }
  }
  return '';
}

/**
 * Normalize phone: remove non-digits, ensure Brazilian country code 55
 */
function normalizePhone(phone) {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '55' + p.slice(1);
  if (!p.startsWith('55')) p = '55' + p;
  return p;
}

/**
 * Send a Lead conversion event to Meta Conversions API
 * Maximized for Event Match Quality (EMQ)
 * 
 * @param {object} params
 * @param {string} params.pixelId - Meta Pixel ID
 * @param {string} params.accessToken - Meta CAPI access token
 * @param {string} params.nome - Lead full name
 * @param {string} params.whatsapp - Lead phone
 * @param {string} [params.email] - Lead email
 * @param {string} [params.cidade] - Lead city
 * @param {string} [params.estado] - Lead state
 * @param {string} params.sourceUrl - The form URL
 * @param {string} [params.clientIp] - Client IP address (NOT hashed)
 * @param {string} [params.clientUserAgent] - Client User Agent (NOT hashed)
 * @param {string} [params.fbc] - Facebook Click ID (_fbc cookie)
 * @param {string} [params.fbp] - Facebook Browser ID (_fbp cookie)
 * @param {string} [params.externalId] - External unique ID (aluno ID)
 * @param {string} [params.eventId] - Event ID for deduplication
 */
export async function sendMetaConversion({
  pixelId, accessToken, nome, whatsapp, email,
  cidade, estado, sourceUrl,
  clientIp, clientUserAgent, fbc, fbp, externalId, eventId
}) {
  if (!pixelId || !accessToken) return;

  try {
    // Parse name
    const nameParts = nome.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Normalize phone
    const phone = normalizePhone(whatsapp);

    // Resolve state code
    const stateCode = resolveState(estado, cidade);

    // Normalize city (lowercase, no accents, no spaces per Meta spec)
    const normalizedCity = normalizeCity(cidade);

    // Build user_data with ALL available parameters
    const userData = {};

    // === HASHED PARAMETERS ===

    // First name (fn) - REQUIRED for good EMQ
    if (firstName) userData.fn = hashSha256(firstName);

    // Last name (ln) - improves EMQ
    if (lastName) userData.ln = hashSha256(lastName);

    // Phone (ph) - REQUIRED, strongest matching signal
    userData.ph = hashSha256(phone);

    // Email (em) - STRONGEST matching signal per Meta
    if (email) userData.em = hashSha256(email);

    // City (ct) - lowercase, no accents, no spaces
    if (normalizedCity) userData.ct = hashSha256(normalizedCity);

    // State (st) - 2-letter code, lowercase
    if (stateCode) userData.st = hashSha256(stateCode);

    // Country (country) - always "br" for Brazil
    userData.country = hashSha256('br');

    // External ID (external_id) - aluno's database ID
    if (externalId) userData.external_id = hashSha256(externalId);

    // === NON-HASHED PARAMETERS (must NOT be hashed) ===

    // Client IP address - REQUIRED for website events per Meta
    if (clientIp) userData.client_ip_address = clientIp;

    // Client User Agent - REQUIRED for website events per Meta
    if (clientUserAgent) userData.client_user_agent = clientUserAgent;

    // Facebook Click ID (from _fbc cookie) - greatly improves EMQ
    if (fbc) userData.fbc = fbc;

    // Facebook Browser ID (from _fbp cookie) - greatly improves EMQ
    if (fbp) userData.fbp = fbp;

    // Build the event payload
    const eventPayload = {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: sourceUrl,
      action_source: 'website',
      user_data: userData
    };

    // Event ID for deduplication (prevents double-counting)
    if (eventId) eventPayload.event_id = eventId;

    const eventData = { data: [eventPayload] };

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI error:', result);
    } else {
      console.log(`✅ Meta CAPI Lead event sent (EMQ params: ${Object.keys(userData).length}):`, result);
    }
  } catch (error) {
    console.error('Error sending Meta conversion:', error);
  }
}
