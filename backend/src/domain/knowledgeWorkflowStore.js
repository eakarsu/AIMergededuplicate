import pool from '../db/connection.js';
import { validateTransition } from './knowledgePolicy.js';

export function nextRetryAt(attempt, nowMs, baseMs=1000, capMs=300000){if(!Number.isInteger(attempt)||attempt<1||!Number.isFinite(nowMs))throw new Error('invalid retry state');return new Date(nowMs+Math.min(capMs,baseMs*(2**(attempt-1)))).toISOString();}
export function requirePrincipal(actor,tenantId){if(!actor?.id||!actor?.role||!tenantId)throw new Error('authenticated tenant actor required');if(actor.tenant_id&&String(actor.tenant_id)!==String(tenantId))throw Object.assign(new Error('source not found'),{code:'NOT_FOUND'});}

export async function transitionSource(input,db=pool){
  requirePrincipal(input.actor,input.tenantId); for(const f of ['sourceRef','to','reason','correlationId'])if(!input[f])throw new Error(`${f} is required`);
  const client=await db.connect();
  try{await client.query('BEGIN');
    const replay=await client.query('SELECT to_status FROM knowledge_workflow_audit WHERE tenant_id=$1 AND source_ref=$2 AND correlation_id=$3',[input.tenantId,input.sourceRef,input.correlationId]);
    if(replay.rows[0]){await client.query('COMMIT');return{status:replay.rows[0].to_status,replayed:true};}
    const found=await client.query('SELECT status,created_by,permission_version FROM knowledge_sources WHERE tenant_id=$1 AND source_ref=$2 FOR UPDATE',[input.tenantId,input.sourceRef]);
    if(!found.rows[0])throw Object.assign(new Error('source not found'),{code:'NOT_FOUND'});
    validateTransition(found.rows[0].status,input.to,{...(input.context||{}),actorId:String(input.actor.id),createdBy:found.rows[0].created_by,role:input.actor.role,permissionVersion:found.rows[0].permission_version});
    await client.query('UPDATE knowledge_sources SET status=$1,updated_at=now() WHERE tenant_id=$2 AND source_ref=$3',[input.to,input.tenantId,input.sourceRef]);
    await client.query(`INSERT INTO knowledge_workflow_audit(tenant_id,source_ref,from_status,to_status,actor_id,actor_role,reason,evidence,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)`,[input.tenantId,input.sourceRef,found.rows[0].status,input.to,String(input.actor.id),input.actor.role,input.reason,JSON.stringify(input.context||{}),input.correlationId]);
    await client.query('COMMIT');return{status:input.to,replayed:false};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function queueDeletion({tenantId,sourceRef,provider,idempotencyKey,actor},db=pool){
  requirePrincipal(actor,tenantId); if(!sourceRef||!provider||!idempotencyKey)throw new Error('deletion identity required');
  const source=await db.query('SELECT legal_hold,status FROM knowledge_sources WHERE tenant_id=$1 AND source_ref=$2',[tenantId,sourceRef]);
  if(!source.rows[0])throw Object.assign(new Error('source not found'),{code:'NOT_FOUND'}); if(source.rows[0].legal_hold)throw Object.assign(new Error('source is on legal hold'),{code:'LEGAL_HOLD'});
  return (await db.query(`INSERT INTO knowledge_deletion_receipts(tenant_id,source_ref,provider,idempotency_key) VALUES($1,$2,$3,$4) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET source_ref=EXCLUDED.source_ref RETURNING *`,[tenantId,sourceRef,provider,idempotencyKey])).rows[0];
}
