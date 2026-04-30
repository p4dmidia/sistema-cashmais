import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  console.log("Keep-alive ping received");
  
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      } 
    }
  );
});
