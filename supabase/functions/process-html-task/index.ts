import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

console.log("Process HTML Task function started");

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook payload received:", payload);

    // Get the newly inserted or updated task record
    const task = payload.record;

    // Only process if it has content and status is processing
    if (!task || task.html_summary_status !== 'processing' || !task.html_content) {
      console.log("Task does not need processing or missing content, skipping.", task?.uuid);
      return new Response("Skipped", { status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the owner (User) to get their API key and model config
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('ai_api_key, ai_api_url, ai_model')
      .eq('id', task.owner_id)
      .single();

    if (userError || !user) {
      console.error("User not found or error fetching user:", userError);
      
      // Mark as failed
      await supabase
        .from('tasks')
        .update({ html_summary_status: 'failed' })
        .eq('id', task.id);
        
      return new Response("User API config missing", { status: 400 });
    }

    const content = task.html_content;
    const prompt = `你是一个智能助手。请仔细阅读以下HTML内容（可能包含试卷、问卷或表单题目），并用不超过300字简要概述其中的内容。

**重要要求：**
1. 如果HTML中包含题目，请列出每道题目的内容
2. 如果HTML中包含答案信息（例如：value属性、data-correct属性、checked属性、或注释中的答案），请务必提取并标注每道题的正确答案
3. 如果是选择题，请列出所有选项及正确答案
4. 如果是填空题或简答题，请说明题目要求
5. 概述格式应清晰，便于后续进行数据分析（如计算正确率）

HTML内容：
${content.substring(0, 20000)}`;

    let apiUrl = user.ai_api_url || "https://api.deepseek.com/v1/chat/completions";
    if (!apiUrl.endsWith("/chat/completions")) {
      apiUrl = apiUrl.endsWith("/") ? apiUrl + "chat/completions" : apiUrl + "/chat/completions";
    }

    const aiPayload = {
      model: user.ai_model || "deepseek-chat",
      messages: [
        { role: "system", "content": "You are a helpful assistant." },
        { role: "user", "content": prompt }
      ],
      stream: false
    };

    console.log(`Calling AI API: ${apiUrl} for task ${task.uuid}`);

    const aiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${user.ai_api_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(aiPayload)
    });

    if (!aiResponse.ok) {
      console.error("AI API Error:", aiResponse.status, await aiResponse.text());
      await supabase
        .from('tasks')
        .update({ html_summary_status: 'failed' })
        .eq('id', task.id);
      return new Response("AI Request Failed", { status: 502 });
    }

    const aiResult = await aiResponse.json();
    const summary = aiResult?.choices?.[0]?.message?.content || '';

    if (!summary) {
      console.error("Empty summary returned by AI");
      await supabase
        .from('tasks')
        .update({ html_summary_status: 'failed' })
        .eq('id', task.id);
      return new Response("Empty AI Response", { status: 502 });
    }

    // Update the task with the summary
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ 
        html_summary: summary, 
        html_summary_status: 'completed' 
      })
      .eq('id', task.id);

    if (updateError) {
      console.error("Error updating task summary:", updateError);
      return new Response("Error updating task", { status: 500 });
    }

    console.log(`Successfully completed AI summary for task ${task.uuid}`);
    return new Response("Success", { status: 200 });
    
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
