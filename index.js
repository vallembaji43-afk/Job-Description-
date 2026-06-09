const express = require("express");
const twilio = require("twilio");
const axios = require("axios");

const app = express();
app.use(express.urlencoded({ extended: false }));

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.FROM_WHATSAPP;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// Generate proposal using Claude AI
async function generateProposal(jobDescription) {
  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-opus-4-6",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are an expert Upwork freelancer specializing in Content Writing. 
Write a compelling, personalized Upwork proposal for this job:

${jobDescription}

Requirements:
- Start with a hook that shows you understand their problem
- Mention relevant experience in content writing
- Keep it under 200 words
- Sound natural and professional
- End with a clear call to action
- Do NOT use generic templates

Write the proposal now:`
          }
        ]
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        }
      }
    );
    return response.data.content[0].text;
  } catch (err) {
    console.error("AI error:", err.message);
    return "Sorry, proposal generation failed. Please try again!";
  }
}

// Send WhatsApp message
async function sendMessage(to, body) {
  await client.messages.create({ from: FROM, to, body });
}

// WhatsApp webhook
app.post("/webhook", async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const from = req.body.From || "";

  console.log("Message from:", from);
  console.log("Message:", incomingMsg.substring(0, 50));

  res.sendStatus(200);

  if (incomingMsg.toLowerCase().includes("help")) {
    await sendMessage(from, 
      `🤖 *Upwork Proposal Bot*\n\n` +
      `ఎలా వాడాలి:\n` +
      `1. Upwork లో job description copy చేయండి\n` +
      `2. ఇక్కడ paste చేయండి\n` +
      `3. 30 seconds లో proposal వస్తుంది!\n\n` +
      `Try చేయండి! 💪`
    );
    return;
  }

  if (incomingMsg.length < 20) {
    await sendMessage(from,
      `👋 *Proposal Bot కి Welcome!*\n\n` +
      `Job description paste చేయండి — AI proposal రాస్తుంది!\n\n` +
      `Help కోసం "help" type చేయండి.`
    );
    return;
  }

  // Generate proposal
  await sendMessage(from, "⏳ Generating your proposal... 30 seconds wait చేయండి!");
  
  const proposal = await generateProposal(incomingMsg);
  
  await sendMessage(from,
    `✅ *Your Upwork Proposal:*\n\n${proposal}\n\n` +
    `---\n` +
    `💡 Copy చేసి Upwork లో paste చేయండి!\n` +
    `🔄 వేరే proposal కావాలంటే మళ్ళీ job description పంపండి.`
  );
});

app.get("/", (req, res) => {
  res.send("🤖 Upwork Proposal Bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proposal Bot running on port ${PORT}`);
});
