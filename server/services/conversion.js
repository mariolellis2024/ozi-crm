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

/**
 * Send a Purchase conversion event to Meta Conversions API
 * Triggered when a student is enrolled (status → enrolled)
 * Uses stored tracking data from the original Lead visit
 * 
 * @param {object} params
 * @param {string} params.pixelId - Meta Pixel ID
 * @param {string} params.accessToken - Meta CAPI access token
 * @param {string} params.nome - Student name
 * @param {string} params.whatsapp - Student phone
 * @param {string} [params.email] - Student email
 * @param {string} [params.cidade] - City
 * @param {string} [params.estado] - State
 * @param {number} params.value - Purchase value (course price)
 * @param {string} [params.cursoNome] - Course name
 * @param {string} [params.cursoId] - Course ID
 * @param {string} [params.sourceUrl] - Original form URL or site URL
 * @param {string} [params.clientIp] - Stored client IP from Lead visit
 * @param {string} [params.clientUserAgent] - Stored user agent from Lead visit
 * @param {string} [params.fbc] - Facebook Click ID (stored from Lead visit)
 * @param {string} [params.fbp] - Facebook Browser ID (stored from Lead visit)
 * @param {string} [params.externalId] - External unique ID (aluno ID)
 */
export async function sendMetaPurchase({
  pixelId, accessToken, nome, whatsapp, email,
  cidade, estado, value, cursoNome, cursoId, sourceUrl,
  clientIp, clientUserAgent, fbc, fbp, externalId,
  genero, dataNascimento, cep
}) {
  if (!pixelId || !accessToken) return;

  try {
    const nameParts = nome.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const phone = normalizePhone(whatsapp);
    const stateCode = resolveState(estado, cidade);
    const normalizedCity = normalizeCity(cidade);

    const userData = {};

    if (firstName) userData.fn = hashSha256(firstName);
    if (lastName) userData.ln = hashSha256(lastName);
    userData.ph = hashSha256(phone);
    if (email) userData.em = hashSha256(email);
    if (normalizedCity) userData.ct = hashSha256(normalizedCity);
    if (stateCode) userData.st = hashSha256(stateCode);
    userData.country = hashSha256('br');
    if (externalId) userData.external_id = hashSha256(externalId);

    // Gender: Meta expects 'f' or 'm', lowercase, hashed
    if (genero) {
      const g = genero.trim().toLowerCase().charAt(0); // 'f' or 'm'
      if (g === 'f' || g === 'm') userData.ge = hashSha256(g);
    }

    // Date of birth: Meta expects YYYYMMDD format, hashed
    if (dataNascimento) {
      // dataNascimento comes as ISO date: '1997-02-16' or '1997-02-16T...'
      const d = new Date(dataNascimento);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate() + 1).padStart(2, '0');
        userData.db = hashSha256(`${year}${month}${day}`);
      }
    }

    // CEP/Zip: Meta expects digits only, hashed
    if (cep) {
      const zipClean = cep.replace(/\D/g, '');
      if (zipClean) userData.zp = hashSha256(zipClean);
    }

    // Reuse stored tracking data from the original Lead visit
    if (clientIp) userData.client_ip_address = clientIp;
    if (clientUserAgent) userData.client_user_agent = clientUserAgent;
    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    const eventPayload = {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: userData,
      custom_data: {
        value: value || 0,
        currency: 'BRL',
        content_type: 'product',
        content_name: cursoNome || '',
        content_ids: cursoId ? [cursoId] : [],
      },
      event_id: `purchase_${externalId}_${cursoId}_${Date.now()}`
    };

    if (sourceUrl) eventPayload.event_source_url = sourceUrl;

    const eventData = { data: [eventPayload] };

    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI Purchase error:', result);
    } else {
      console.log(`✅ Meta CAPI Purchase event sent (R$${value}):`, result);
    }
  } catch (error) {
    console.error('Error sending Meta Purchase conversion:', error);
  }
}

/**
 * Send a CRM Event to Meta Conversions API
 * Triggered when a lead changes stages in the pipeline.
 * Uses action_source: "system_generated" and event_source: "crm"
 * per Meta's CRM integration guide.
 * 
 * @param {object} params
 * @param {string} params.datasetId - Meta Dataset ID (or Pixel ID)
 * @param {string} params.accessToken - Meta CAPI access token
 * @param {string} params.eventName - CRM stage event name (e.g. "Lead", custom stages)
 * @param {string} params.nome - Student name
 * @param {string} params.whatsapp - Student phone
 * @param {string} [params.email] - Student email
 * @param {string} [params.metaLeadId] - Facebook Lead ID (from Lead Ads)
 * @param {string} [params.externalId] - External unique ID (aluno ID)
 * @param {string} [params.genero] - Gender
 * @param {string} [params.dataNascimento] - Date of birth
 * @param {string} [params.cidade] - City
 * @param {string} [params.estado] - State
 * @param {string} [params.cep] - Zip code
 */
export async function sendMetaCRMEvent({
  datasetId, accessToken, eventName, nome, whatsapp, email,
  metaLeadId, externalId, genero, dataNascimento, cidade, estado, cep
}) {
  if (!datasetId || !accessToken) return;

  try {
    const nameParts = nome.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const phone = normalizePhone(whatsapp);
    const stateCode = resolveState(estado, cidade);
    const normalizedCity = normalizeCity(cidade);

    // Build user_data — CRM format uses arrays for em and ph
    const userData = {};

    // Hashed contact info (arrays per Meta CRM spec)
    const hashedPhone = hashSha256(phone);
    if (hashedPhone) userData.ph = [hashedPhone];

    const hashedEmail = hashSha256(email);
    if (hashedEmail) userData.em = [hashedEmail];

    // Lead ID from Facebook Lead Ads (NOT hashed)
    if (metaLeadId) userData.lead_id = parseInt(metaLeadId);

    // Additional matching parameters (hashed)
    if (firstName) userData.fn = [hashSha256(firstName)];
    if (lastName) userData.ln = [hashSha256(lastName)];
    if (normalizedCity) userData.ct = [hashSha256(normalizedCity)];
    if (stateCode) userData.st = [hashSha256(stateCode)];
    userData.country = [hashSha256('br')];

    if (externalId) userData.external_id = [hashSha256(externalId)];

    // Gender
    if (genero) {
      const g = genero.trim().toLowerCase().charAt(0);
      if (g === 'f' || g === 'm') userData.ge = [hashSha256(g)];
    }

    // Date of birth (YYYYMMDD)
    if (dataNascimento) {
      const d = new Date(dataNascimento);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        userData.db = [hashSha256(`${year}${month}${day}`)];
      }
    }

    // CEP/Zip
    if (cep) {
      const zipClean = cep.replace(/\D/g, '');
      if (zipClean) userData.zp = [hashSha256(zipClean)];
    }

    const eventPayload = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'system_generated',
      user_data: userData,
      custom_data: {
        event_source: 'crm',
        lead_event_source: 'OZI CRM'
      }
    };

    const eventData = { data: [eventPayload] };

    const url = `https://graph.facebook.com/v25.0/${datasetId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Meta CRM Event error (${eventName}):`, result);
    } else {
      console.log(`✅ Meta CRM Event "${eventName}" sent (lead_id: ${metaLeadId || 'none'}):`, result);
    }
  } catch (error) {
    console.error('Error sending Meta CRM event:', error);
  }
}
