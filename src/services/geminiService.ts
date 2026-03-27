import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY });

export async function generateBlendedImage(
  productImageBase64: string,
  productMimeType: string,
  referenceImageBase64: string,
  referenceMimeType: string,
  prompt: string = "Adapt the style, lighting, and composition of the second reference image to the first product image. Ensure subtle variations to avoid direct copying.",
  blendStrength: number = 50
): Promise<string> {
  const strengthInstruction = `\n\nBlend Strength: ${blendStrength}/100. ${
    blendStrength < 30 ? "Keep the product exactly as it is, only applying very subtle lighting or color grading from the reference image." :
    blendStrength > 70 ? "Heavily transform the product to match the reference style, completely adopting its textures, mood, and artistic composition." :
    "Adapt the style, lighting, and composition of the reference image to the product image while maintaining the original product's core identity."
  }`;

  const finalPrompt = prompt + strengthInstruction;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: productImageBase64,
              mimeType: productMimeType,
            },
          },
          {
            inlineData: {
              data: referenceImageBase64,
              mimeType: referenceMimeType,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data returned from the model.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}
