
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

export const initGemini = (apiKey: string) => {
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

export async function askAI(prompt: string): Promise<string> {
  if (!model) throw new Error("Gemini API Key not set");
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Gemini Text Error:", error);
    return `Sorry, I couldn't process that request. Error: ${error.message || error}`;
  }
}

export async function generateScheduleFromImage(apiKey: string, base64Image: string): Promise<any[]> {
  if (!genAI) initGemini(apiKey);
  
  const prompt = `
    Analyze this timetable image. Extract all the classes/events.
    Return ONLY a valid JSON array with no extra text or markdown formatting.
    The start date for "Monday" is ${new Date().toISOString().split('T')[0]}.
    Calculate the correct date for each day of the week based on this start date.
    Format each object exactly like this:
    { "title": "Class Name", "date": "YYYY-MM-DD", "time": "HH:MM", "type": "Academic", "priority": "Medium", "description": "Extracted from timetable" }
  `;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response
    let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBracket = cleanJson.indexOf('[');
    const lastBracket = cleanJson.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
    }
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error;
  }
}
