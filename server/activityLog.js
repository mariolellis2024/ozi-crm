import pool from './db.js';

/**
 * Log an activity to the audit trail
 * @param {object} params
 * @param {string} params.userId - UUID of the user performing the action
 * @param {string} params.userEmail - Email of the user
 * @param {string} params.action - 'create', 'update', 'delete', 'enroll', 'unenroll', 'block', 'unblock', 'login'
 * @param {string} params.entityType - 'turma', 'aluno', 'curso', 'professor', 'sala', 'user', 'interest'
 * @param {string} [params.entityId] - UUID of the entity
 * @param {string} [params.entityName] - Human-readable name of the entity
 * @param {object} [params.details] - Additional details (JSON)
 */
export async function logActivity({ userId, userEmail, action, entityType, entityId, entityName, details }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_email, action, entity_type, entity_id, entity_name, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, userEmail || null, action, entityType, entityId || null, entityName || null, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    // Never let logging fail break the main operation
    console.error('Failed to log activity:', error.message);
  }
}
