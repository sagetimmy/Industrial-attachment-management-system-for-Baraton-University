const supabase = require('../config/db');

/**
 * Log an audit event
 * @param {object} actor  - req.user (the person performing the action)
 * @param {string} action - e.g. 'ASSIGN_SUPERVISOR', 'APPROVE_ORG'
 * @param {string} entity - table/resource e.g. 'attachments', 'users'
 * @param {string} entityId - the ID of the affected record
 * @param {string} description - human-readable summary
 * @param {object} metadata - any extra data (optional)
 * @param {string} ip - req.ip (optional)
 */
const audit = async (actor, action, entity, entityId, description, metadata = {}, ip = null) => {
  try {
    await supabase.from('audit_logs').insert({
      actor_id:    actor?.user_id || null,
      actor_email: actor?.email   || null,
      actor_role:  actor?.role    || null,
      action,
      entity,
      entity_id:   String(entityId || ''),
      description,
      metadata,
      ip_address:  ip,
    });
  } catch (err) {
    // Never let audit logging crash the main request
    console.error('Audit log failed:', err.message);
  }
};

module.exports = audit;