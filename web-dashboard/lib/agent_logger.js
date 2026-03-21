import { getConnection } from './db';

export async function logAgent(agentId, agentName, action, status = 'success', details = '') {
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO agent_logs (agent_id, agent_name, action, status, details) VALUES (?, ?, ?, ?, ?)`,
      [agentId, agentName, action, status, typeof details === 'object' ? JSON.stringify(details) : details]
    );
    
    // Auto-purge logs older than 3 days (rolling history cap)
    await connection.execute(`DELETE FROM agent_logs WHERE created_at < NOW() - INTERVAL 3 DAY`);
  } catch (err) {
    console.error(`Failed to log agent action [${agentId}]:`, err);
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
}
