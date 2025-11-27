import { GoogleGenAI, Type } from "@google/genai";
import { Message, Sender } from "../types";

// Helper to get client
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const CHAT_MODEL = 'gemini-3-pro-preview';

/**
 * Generates or edits an image based on a prompt and an input image.
 */
export const generateRoomDesign = async (
  imageBase64: string,
  prompt: string
): Promise<string> => {
  const ai = getClient();
  
  // Clean base64 string if needed
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity, or detect from header
              data: cleanBase64,
            },
          },
        ],
      },
      // Note: responseMimeType is not supported for nano banana models (gemini-2.5-flash-image)
    });

    // Extract image from response
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated in response.");
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};

/**
 * Chat with the assistant about the design, using Google Search for shopping links.
 */
export const chatWithDesigner = async (
  history: Message[],
  newMessage: string,
  currentContextImage?: string
): Promise<{ text: string; groundingUrls: Array<{uri: string, title: string}> }> => {
  const ai = getClient();

  // Convert internal history to Gemini format
  // Note: We are doing a single turn generation here for simplicity to include the image context efficiently each time, 
  // or we could use a Chat session. Given we might want to inject the *current* image state which changes, 
  // a stateless request with history included manually is often more robust for "context-aware" image apps.
  // However, gemini-3-pro-preview supports multi-turn well. Let's use generateContent with history constructed.

  const contents = [];
  
  // 1. Add System Instruction-like context at the start
  contents.push({
    role: 'user',
    parts: [{ text: "You are an expert interior design consultant. Help the user refine their room design, find furniture, and answer questions about style. If the user asks for products, use Google Search to find real shoppable links." }]
  });

  // 2. Add history (filtered to text only for simplicity, or simple structure)
  // We'll skip passing the full image history to save tokens/bandwidth, 
  // only passing the *current* active design image in the final turn.
  history.forEach(msg => {
    contents.push({
      role: msg.sender === Sender.User ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  // 3. Add current user message + Current Image Context
  const finalUserParts: any[] = [{ text: newMessage }];
  
  if (currentContextImage) {
    const cleanBase64 = currentContextImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    finalUserParts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64
      }
    });
    finalUserParts.push({ text: "\n[Context: This is the current room design we are discussing.]" });
  }

  contents.push({
    role: 'user',
    parts: finalUserParts
  });

  try {
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: contents,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text || "I couldn't generate a text response.";
    
    // Extract grounding chunks for links
    const groundingUrls: Array<{uri: string, title: string}> = [];
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          groundingUrls.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
      });
    }

    return { text, groundingUrls };

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};
