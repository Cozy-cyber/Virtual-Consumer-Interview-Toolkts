import { GoogleGenAI, Chat, Type, Schema, GenerateContentResponse } from "@google/genai";
import { PersonaProfile, GroundingSource, ClarifyingQuestion, ChatMessage, InterviewSummary, ReferenceMaterial } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

// Helper function for exponential backoff retry
// Increased defaults to handle stricter rate limits
const runWithRetry = async <T>(operation: () => Promise<T>, retries = 5, delay = 4000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
    if (isRateLimit && retries > 0) {
      console.warn(`Rate limit exceeded. Retrying in ${delay}ms... (Remaining retries: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return runWithRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Analyze input to see if we need clarification.
 */
export const analyzeRequirements = async (
  industry: string,
  targetAudience: string
): Promise<ClarifyingQuestion[] | null> => {
  
  const prompt = `
    你是一位专业的市场研究员。用户想要建立一个虚拟消费者画像。
    
    行业: "${industry}"
    目标受众: "${targetAudience}"
    
    画像必须包含四个核心维度：
    1. 人口统计学特征 (Demographics)
    2. 心理特征 (Psychographics)
    3. 行为特征 (Behavioral)
    4. 需求与痛点 (Needs & Pain Points)
    
    任务：评估用户描述是否足以支撑这四个维度的构建。
    如果描述过于宽泛或缺失某个关键维度，请生成 2-3 个选择题来完善它。
    
    例如：
    - 如果缺少人口统计学，问年龄、收入或居住地。
    - 如果缺少心理特征，问价值观或生活态度。
    
    如果描述已经足够具体，请返回空列表。
    请严格遵循 JSON 格式返回。
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      needsClarification: { type: Type.BOOLEAN },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["question", "options"]
        }
      }
    },
    required: ["needsClarification", "questions"]
  };

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }), 5, 5000); // Explicitly set high retries for initial check

    const result = JSON.parse(response.text || "{}");
    if (result.needsClarification && result.questions && result.questions.length > 0) {
      return result.questions;
    }
    return null;
  } catch (e) {
    console.error("Clarification check failed", e);
    return null; // Fallback to proceeding without clarification
  }
};

/**
 * Generate the persona profile with optional reference materials
 */
export const generatePersonaProfile = async (
  industry: string,
  targetAudience: string,
  clarifications: string[] = [],
  materials: ReferenceMaterial[] = []
): Promise<{ profile: PersonaProfile; sources: GroundingSource[] }> => {
  
  let audienceContext = targetAudience;
  if (clarifications.length > 0) {
    audienceContext += ` (补充细节: ${clarifications.join(", ")})`;
  }

  // --- Step 1: Text Profile Generation ---
  
  const contentParts: any[] = [];
  
  let promptText = `
    你是一位定性市场研究专家。
    行业: "${industry}"。
    目标受众: "${audienceContext}"。

    请使用 Google 搜索查找该受众在该行业中的当前趋势。
    
    任务 1：构建虚拟人物画像
    请生成一个详细的 Markdown 格式画像。
    
    🔥 **关键要求：**
    **请给这位消费者起一个生动、具体、有代表性的名字** (例如："极客小王"、"精致妈妈Sarah"、"养生达人老李")。
    **Markdown 的一级标题必须是这个名字** (例如 '# 极客小王')。

    必须包含以下四个章节：
    1. 人口统计学特征 (姓名, 年龄, 职业, 收入, 居住地)
    2. 心理特征 (价值观, 生活态度, 个性)
    3. 行为特征 (购买习惯, 品牌偏好, 技术使用)
    4. 需求与痛点 (未满足的需求, 挫折感, 动机)
    还包括：
    5. 访谈风格 (说话方式)

    任务 2：完成度评分
    请对以上四个维度的数据完整性进行打分（满分 5 分）。
    - 结合了公开数据搜索，分数应该至少达到 3 分。
    - 如果用户提供了详细资料，分数可以更高。
    
    重要：请严格按照以下 JSON 格式输出结果。如果包含 Markdown 代码块，请使用 \`\`\`json 包裹。
    {
      "markdownProfile": "这里是完整的 markdown 格式画像内容",
      "scores": {
        "demographics": 3,
        "psychographics": 3,
        "behaviors": 3,
        "needs": 3
      }
    }
  `;

  if (materials.length > 0) {
    promptText += `\n\n请优先结合以下参考资料构建。`;
  }

  contentParts.push({ text: promptText });

  materials.forEach(mat => {
    if (mat.type === 'file' && mat.content) {
      contentParts.push({
        inlineData: {
          mimeType: mat.mimeType || 'application/pdf',
          data: mat.content
        }
      });
    } else if (mat.type === 'text') {
      contentParts.push({
        text: `[参考资料 - ${mat.name}]:\n${mat.content}\n`
      });
    }
  });

  try {
    // 1. Generate Text Content
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: { parts: contentParts },
      config: {
        tools: [{ googleSearch: {} }],
      },
    }), 5, 5000); // Robust retry for main generation

    let jsonString = response.text || "{}";
    const jsonMatch = jsonString.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (e) {
      console.warn("JSON parse failed, falling back to raw text", e);
      result = {
        markdownProfile: response.text || "# 生成失败",
        scores: { demographics: 3, psychographics: 3, behaviors: 3, needs: 3 }
      };
    }

    const markdown = result.markdownProfile || "# 生成失败";
    const scores = result.scores || { demographics: 3, psychographics: 3, behaviors: 3, needs: 3 };
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!web);

    const nameMatch = markdown.match(/^#\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : "消费者";
    const summary = markdown.substring(0, 200) + "...";

    // 2. Generate Pixel Art Image
    let imageData: string | undefined = undefined;
    try {
        const imagePrompt = `
          Cute pixel art avatar of ${name}, ${industry} consumer.
          Simple headshot, minimal details, white background.
          Style: 8-bit, colorful, clean, distinct features matching personality.
        `;
        
        // Image generation can fail silently if rate limited, that's okay.
        const imageResponse = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: { parts: [{ text: imagePrompt }] }
        }), 2, 5000);

        if (imageResponse.candidates?.[0]?.content?.parts) {
            for (const part of imageResponse.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    imageData = part.inlineData.data;
                    break;
                }
            }
        }
    } catch (imgError) {
        console.error("Image generation failed", imgError);
    }

    return {
      profile: {
        rawMarkdown: markdown,
        name,
        summary,
        scores,
        imageUrl: imageData
      },
      sources
    };
  } catch (error) {
    console.error("Error generating persona:", error);
    throw error;
  }
};

/**
 * Generate Discussion Guide based on objectives
 */
export const generateDiscussionGuide = async (
  industry: string,
  profile: PersonaProfile,
  objectives: string,
  userQuestions: string
): Promise<string[]> => {
  const prompt = `
    你是一位资深的用户研究员。
    
    背景：
    我们正在对一位名为 ${profile.name} 的虚拟消费者进行访谈。
    行业: ${industry}
    消费者画像摘要: ${profile.summary}
    
    我的额外研究目标: ${objectives}
    我预想的特定问题: ${userQuestions}
    
    任务：
    生成一份深度、结构化的访谈提纲。
    **必须包含**以下六个维度的逻辑，每个维度请设计 1-2 个具体、循序渐进的问题，不要生硬地罗列标题，要像真实的访谈对话：

    1. **现状与背景**：询问目前使用的品牌/产品、使用时长、频率及具体环境（工作/娱乐/学习等）。
    2. **情境与习惯**：挖掘每日使用时刻、常规操作路径（如购买、搜索信息）、以及遇到的任何干扰或障碍。
    3. **功能评价**：询问对主要功能的评价（优/良/差及原因），以及具体的技术问题或性能瓶颈。
    4. **痛点与挑战**：深入挖掘最常见的使用问题、困难点。
    5. **改进与期望**：询问对现有功能的改进建议、新增功能需求、以及对未来的期望。
    6. **情感与忠诚度**：询问总体情感体验（满意/失望）、期望值达成情况、以及持续使用或推荐的意愿。
    
    输出要求：
    只返回 JSON 格式的字符串数组，不包含任何 Markdown 标记或章节标题。直接列出具体的问题句子。
    Example: ["您目前主要使用什么品牌的咖啡机？用了多久了？", "在每天的什么时间段您使用得最频繁？"]
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    },
    required: ["questions"]
  };

  try {
    const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }));
    
    const res = JSON.parse(response.text || "{}");
    return res.questions || [];
  } catch (e) {
    console.error("Failed to generate guide", e);
    return ["请介绍一下您自己。", "您目前使用什么产品？", "您最大的痛点是什么？"];
  }
};

/**
 * AI Moderator logic to generate the next question
 */
export const getAIInterviewerNextQuestion = async (
  history: ChatMessage[],
  guide: string[],
  profile: PersonaProfile
): Promise<string | null> => {
  const relevantHistory = history.filter(h => h.role !== 'model' || !h.text.includes("自我介绍"));
  const transcript = history.map(m => `${m.role === 'user' ? (m.isAiInterviewer ? '主持人' : '观察员') : profile.name}: ${m.text}`).join('\n');

  const prompt = `
    你是一位专业的深度访谈主持人 (Moderator)。正在采访 ${profile.name}。
    
    访谈提纲 (这是我们的核心逻辑线索, 但不要被它死板限制):
    ${JSON.stringify(guide)}
    
    当前对话记录:
    ${transcript}
    
    任务：
    根据对话记录，生成【下一个】要问的问题。
    
    🔥 **核心追问策略 (关键)**：
    请仔细分析受访者的上一句回答。如果包含以下【高价值信息】，请**立即暂停**提纲推进，进行深挖追问：
    1. **潜在的产品改进点** (例如："如果这个功能再方便一点就好了...")
    2. **特定场景的痛点或障碍** (例如："有时候我在路上用会断连...")
    3. **对未来概念的想象或期望** (例如："我希望能有一个自动化的功能...")
    4. **能够启发产品研发(R&D)的具体细节**
    
    追问模板参考：
    - "您刚才提到[具体点]，能具体描述一下当时的场景吗？"
    - "关于这个改进想法，您心目中理想的解决方案是怎样的？"
    - "为什么这对您来说特别重要？"
    
    如果上一句回答比较常规，或者当前话题已充分讨论，请根据【访谈提纲】自然过渡到下一个未讨论的话题。
    
    约束：
    - 保持语气专业、亲切、像真人在对话。
    - 每次只问一个问题。
    - 如果提纲中的问题都已经涵盖了，且没有新的挖掘点，请仅返回字符串: "[INTERVIEW_COMPLETE]"。
    
    请直接返回问题文本。
  `;

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt
  }));
  
  const text = response.text?.trim();
  if (text?.includes("INTERVIEW_COMPLETE")) {
    return null;
  }
  return text || null;
};

/**
 * Initialize chat session.
 */
export const createInterviewSession = (profile: PersonaProfile, industry: string): Chat => {
  const systemInstruction = `
    你正在参与一次消费者研究访谈。
    
    角色扮演指令：
    你【不是】一个 AI。你是一个名为 "${profile.name}" 的人类消费者。
    你必须严格保持在这个角色中。请使用中文进行对话。
    
    你的资料数据：
    ${profile.rawMarkdown}
    
    背景：
    你正在接受关于 "${industry}" 行业的访谈。
    
    行为准则：
    - 说话自然，使用你资料中定义的“访谈风格”。
    - 如果用户询问你的需求或痛点，请根据生成的资料回答。
    - 诚实地表达你的挫折感。
    - 如果被问及对未来的期望或改进建议，请大胆提出符合你角色设定的想法。
    - 不要像助手一样主动提供帮助。你是受访者。
    - 保持回答相对简练，像真实的聊天信息（主要是 1-3 句话，除非在讲故事）。
  `;

  return ai.chats.create({
    model: TEXT_MODEL,
    config: {
      systemInstruction,
    },
  });
};

/**
 * Generate Interview Summary
 */
export const generateInterviewSummary = async (
  profile: PersonaProfile,
  industry: string,
  messages: ChatMessage[]
): Promise<InterviewSummary> => {
  // Convert chat history to string
  const transcript = messages.map(m => `${m.role === 'user' ? '采访者' : profile.name}: ${m.text}`).join('\n');

  const prompt = `
    请根据以下关于 "${industry}" 行业的访谈记录，生成一份总结报告。
    
    受访者资料: ${profile.rawMarkdown}
    
    访谈记录:
    ${transcript}
    
    请提取以下关键信息并以 JSON 格式返回：
    1. keyInsights (关键洞察 - 3点)
    2. painPoints (主要痛点)
    3. wantsNeeds (核心需求)
    4. verdict (受访者对当前市场产品的总体态度/评价)
    
    请确保使用中文回答。
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      keyInsights: { type: Type.STRING },
      painPoints: { type: Type.STRING },
      wantsNeeds: { type: Type.STRING },
      verdict: { type: Type.STRING }
    },
    required: ["keyInsights", "painPoints", "wantsNeeds", "verdict"]
  };

  const response = await runWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  }));

  return JSON.parse(response.text || "{}") as InterviewSummary;
}