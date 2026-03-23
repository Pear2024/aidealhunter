import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getConnection } from '@/lib/db';

export const fetchPendingDealsForQaTool = tool(
  async () => {
    try {
        const connection = await getConnection();
        // Fetch up to 5 pending deals at once to review efficiently
        const [deals] = await connection.execute(
            `SELECT id, title, brand, original_price, discount_price, discount_percentage, image_url, url 
             FROM normalized_deals 
             WHERE status = 'pending' 
             ORDER BY RAND() LIMIT 5`
        );
        if (deals.length === 0) return "No pending deals awaiting QA review.";
        return JSON.stringify(deals);
    } catch (e) {
        return `Error fetching pending deals: ${e.message}`;
    }
  },
  {
    name: "fetch_pending_deals_for_qa",
    description: "Fetches a batch of unverified deals that are currently pending QA approval.",
  }
);

export const approveDealTool = tool(
  async ({ dealId, justification }) => {
    try {
        console.log(`✅ Approving Deal ID ${dealId}: ${justification}`);
        const connection = await getConnection();
        await connection.execute(`UPDATE normalized_deals SET status = 'approved' WHERE id = ?`, [dealId]);
        return `Successfully APPROVED deal ${dealId}.`;
    } catch (e) {
        return `Error approving deal ${dealId}: ${e.message}`;
    }
  },
  {
    name: "approve_deal",
    description: "Approves a deal, promoting it to the active pool for the copywriters.",
    schema: z.object({
        dealId: z.number().describe("The numeric ID of the deal to approve."),
        justification: z.string().describe("Why this deal was approved (e.g., strong discount, clear image).")
    })
  }
);

export const rejectDealTool = tool(
  async ({ dealId, reason_for_rejection }) => {
    try {
        console.log(`❌ Rejecting Deal ID ${dealId}: ${reason_for_rejection}`);
        const connection = await getConnection();
        await connection.execute(`UPDATE normalized_deals SET status = 'rejected' WHERE id = ?`, [dealId]);
        return `Successfully REJECTED deal ${dealId}.`;
    } catch (e) {
        return `Error rejecting deal ${dealId}: ${e.message}`;
    }
  },
  {
    name: "reject_deal",
    description: "Rejects a deal, removing it from the pipeline.",
    schema: z.object({
        dealId: z.number().describe("The numeric ID of the deal to reject."),
        reason_for_rejection: z.string().describe("Why this deal was rejected (e.g., missing price, scammy title).")
    })
  }
);
