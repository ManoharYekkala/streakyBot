import { initGemini, generateLoveMessage } from "./services/geminiService";
import dotenv from "dotenv";

dotenv.config();

async function verify() {
  const initialized = initGemini();
  if (!initialized) {
    console.error("Failed to initialize Groq");
    return;
  }

  console.log("Testing generation with Groq...");
  // Mock names
  const result = await generateLoveMessage("Tester", "Partner");
  if (result) {
    console.log("Success! Generated message:");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error("Failed to generate message.");
  }
}

verify();
