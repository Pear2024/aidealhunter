import { getConnection } from './db';

export async function logAgent(agentId, agentName, action, status = 'success', details = '') {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO agent_logs (agent_id, agent_name, action, status, details) VALUES (?, ?, ?, ?, ?)`,
      [agentId, agentName, action, status, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (err) {
    console.error(`Failed to log agent action [${agentId}]:`, err);
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
}
