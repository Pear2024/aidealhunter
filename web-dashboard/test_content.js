require('dotenv').config({ path: '.env.local' });
const { contentAgent } = require('./lib/agents/content_agent');
const { HumanMessage } = require('@langchain/core/messages');

async function test() {
    const initialState = {
        messages: [
            new HumanMessage(`Please fetch 1 pending approved deal. Write a 400+ word SEO blog post detailing its amazing features, and draft a viral Facebook caption promoting the deal. Be incredibly charismatic and convincing. Publish both to the database and Facebook! If there are no approved deals, just announce that your mission was aborted due to lack of deals.`)
        ]
    };
    
    console.log("Invoking Content Agent...");
    const result = await contentAgent.invoke(initialState);
    console.log(result.messages[result.messages.length - 1].content);
}
test();
