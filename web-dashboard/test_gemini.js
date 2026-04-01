const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const prompt = "Can you identify which 'Three International' product corresponds to the PDR druglabelid 24466, 24467, 24469, 24468, 24470, 24511, 24555, 24471 and 24563?";
  const result = await model.generateContent(prompt);
  console.log(result.response.text());
}
run();
