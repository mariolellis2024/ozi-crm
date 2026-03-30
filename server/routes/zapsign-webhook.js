import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// POST /api/zapsign/webhook — receive ZapSign webhook events (NO AUTH - public)
router.post('/webhook', async (req, res) => {
  try {
    const { event_type, doc, signer } = req.body;
    console.log(`[ZapSign Webhook] Event: ${event_type}`, JSON.stringify(req.body).substring(0, 500));

    const docToken = doc?.token || req.body?.token;
    if (!docToken) {
      return res.status(200).json({ received: true, message: 'No doc token' });
    }

    if (event_type === 'doc_signed') {
      // A signer signed the document
      const signerToken = signer?.token;
      const signedFileUrl = doc?.signed_file || null;

      // Check if ALL signers have signed (document fully signed)
      const allSigned = doc?.signers?.every(s => s.status === 'signed');

      const updateFields = [];
      const params = [docToken];

      if (allSigned || doc?.status === 'signed') {
        params.push('signed');
        updateFields.push(`status = $${params.length}`);
        updateFields.push(`signed_at = NOW()`);
      }

      if (signedFileUrl) {
        params.push(signedFileUrl);
        updateFields.push(`signed_file_url = $${params.length}`);
      }

      if (updateFields.length > 0) {
        await pool.query(
          `UPDATE contratos SET ${updateFields.join(', ')} WHERE zapsign_doc_token = $1`,
          params
        );
      }
    } else if (event_type === 'doc_refused') {
      await pool.query(
        `UPDATE contratos SET status = 'refused' WHERE zapsign_doc_token = $1`,
        [docToken]
      );
    } else if (event_type === 'doc_expired') {
      await pool.query(
        `UPDATE contratos SET status = 'expired' WHERE zapsign_doc_token = $1`,
        [docToken]
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('ZapSign webhook error:', error);
    // Always return 200 to avoid ZapSign retries
    res.status(200).json({ received: true, error: error.message });
  }
});

export default router;
