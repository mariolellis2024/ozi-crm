import crypto from 'crypto';

/**
 * Send a Lead conversion event to Meta Conversions API
 * @param {object} params
 * @param {string} params.pixelId - Meta Pixel ID
 * @param {string} params.accessToken - Meta CAPI access token
 * @param {string} params.nome - Lead name
 * @param {string} params.whatsapp - Lead phone
 * @param {string} [params.cidade] - Lead city
 * @param {string} [params.estado] - Lead state
 * @param {string} params.sourceUrl - The form URL
 */
export async function sendMetaConversion({ pixelId, accessToken, nome, whatsapp, cidade, estado, sourceUrl }) {
  if (!pixelId || !accessToken) return;

  try {
    // Hash user data per Meta requirements (SHA-256)
    const hashSha256 = (val) => crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');

    // Normalize phone: remove non-digits, ensure country code
    let phone = whatsapp.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '55' + phone.slice(1);
    if (!phone.startsWith('55')) phone = '55' + phone;

    const userData = {
      fn: hashSha256(nome.split(' ')[0]),
      ln: nome.split(' ').length > 1 ? hashSha256(nome.split(' ').slice(1).join(' ')) : undefined,
      ph: hashSha256(phone),
      country: hashSha256('br'),
    };

    // Add city if available
    if (cidade) {
      userData.ct = hashSha256(cidade);
    }

    // Add state if available
    if (estado) {
      userData.st = hashSha256(estado);
    }

    const eventData = {
      data: [{
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: sourceUrl,
        action_source: 'website',
        user_data: userData
      }]
    };

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI error:', result);
    } else {
      console.log('Meta CAPI Lead event sent:', result);
    }
  } catch (error) {
    console.error('Error sending Meta conversion:', error);
  }
}
